"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth/current-user";
import { getMediaProvider } from "@/lib/media";
import { ensureMovieFromSummary, ensureMovieFromLetterboxd } from "@/lib/media/upsert";
import { ensureSeenMedia, upsertRatingWatchEntry } from "@/lib/services/seen";
import { pushToJellyfin } from "@/lib/jellyfin/outbound";
import { slugify } from "@/lib/utils";

export type LetterboxdImportState =
  | {
      error?: string;
      success?: boolean;
      imported?: number;
      updated?: number;
      skipped?: number;
      total?: number;
      examples?: string[];
    }
  | null;

function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;

  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];
    const next = text[i + 1];

    if (char === '"') {
      if (quoted && next === '"') {
        cell += '"';
        i += 1;
      } else {
        quoted = !quoted;
      }
      continue;
    }

    if (char === "," && !quoted) {
      row.push(cell);
      cell = "";
      continue;
    }

    if ((char === "\n" || char === "\r") && !quoted) {
      if (char === "\r" && next === "\n") i += 1;
      row.push(cell);
      if (row.some((value) => value.trim() !== "")) rows.push(row);
      row = [];
      cell = "";
      continue;
    }

    cell += char;
  }

  row.push(cell);
  if (row.some((value) => value.trim() !== "")) rows.push(row);
  return rows;
}

function normaliseHeader(value: string) {
  return value.trim().replace(/^\uFEFF/, "").toLowerCase();
}

function letterboxdRatingToValue(value: string): number | null {
  const parsed = Number(value.replace(",", "."));
  if (!Number.isFinite(parsed) || parsed <= 0) return null;
  const rating = Math.round(parsed * 2);
  return Math.min(10, Math.max(1, rating));
}

function parseLetterboxdDate(value: string | undefined): Date | null {
  if (!value) return null;
  const parsed = new Date(`${value.trim()}T12:00:00.000Z`);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

async function resolveLetterboxdMovie(title: string, year: number | null) {
  const provider = getMediaProvider();
  const results = (await provider.search(title)).filter((item) => item.kind === "MOVIE");
  if (!results.length) return null;

  const targetSlug = slugify(title);
  const titleMatches = (item: (typeof results)[number]) =>
    slugify(item.title) === targetSlug || slugify(item.originalTitle ?? "") === targetSlug;
  const yearDistance = (itemYear: number | null) =>
    year == null || itemYear == null ? 4 : Math.abs(itemYear - year);

  const exact =
    results.find((item) => item.year === year && titleMatches(item)) ??
    results.find((item) => yearDistance(item.year) <= 1 && titleMatches(item)) ??
    results.find((item) => item.year === year) ??
    results.find(titleMatches) ??
    [...results].sort((a, b) => {
      const yearScore = yearDistance(a.year) - yearDistance(b.year);
      if (yearScore !== 0) return yearScore;
      return (b.popularity ?? 0) - (a.popularity ?? 0);
    })[0];

  return exact ?? null;
}

async function runWithConcurrency<T, R>(
  items: T[],
  concurrency: number,
  worker: (item: T) => Promise<R>,
): Promise<R[]> {
  const results = new Array<R>(items.length);
  let cursor = 0;

  async function runWorker() {
    while (cursor < items.length) {
      const index = cursor;
      cursor += 1;
      results[index] = await worker(items[index]!);
    }
  }

  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, runWorker));
  return results;
}

export async function importLetterboxdRatingsAction(
  _prev: LetterboxdImportState,
  formData: FormData,
): Promise<LetterboxdImportState> {
  const user = await requireUser();
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { error: "Ajoutez le fichier ratings.csv exporté depuis Letterboxd." };
  }

  const rows = parseCsv(await file.text());
  if (!rows.length) return { error: "Le fichier CSV est vide." };

  const headerRowIndex = rows.findIndex((row) => row.map(normaliseHeader).includes("name"));
  if (headerRowIndex === -1) return { error: "Impossible de trouver l'en-tête Letterboxd (Date, Name, Year, Rating)." };

  const headerRow = rows[headerRowIndex];
  if (!headerRow) return { error: "Impossible de lire l'en-tête du fichier CSV." };

  const headers = headerRow.map(normaliseHeader);
  const dateIndex = headers.indexOf("date");
  const nameIndex = headers.indexOf("name");
  const yearIndex = headers.indexOf("year");
  const ratingIndex = headers.indexOf("rating");

  if (nameIndex === -1 || ratingIndex === -1) {
    return { error: "Le CSV doit contenir au minimum les colonnes Name et Rating." };
  }

  const entries = rows.slice(headerRowIndex + 1);
  // Resolve each distinct (title, year) once. When a TMDB key is configured we
  // do a single cached search per film (rich spine + poster + a TMDB id the
  // plugin can match in the Jellyfin library). With NO key, the search returns
  // nothing instantly (no network) and we fall back to a minimal spine from the
  // CSV row alone — so the import is fully zero-config, like the rest of the app.
  const summaryCache = new Map<string, ReturnType<typeof resolveLetterboxdMovie>>();
  const mediaItemCache = new Map<string, Promise<string | null>>();

  const results = await runWithConcurrency(entries, 16, async (row) => {
    const title = row[nameIndex]?.trim();
    const rating = letterboxdRatingToValue(row[ratingIndex]?.trim() ?? "");
    const ratedOn = parseLetterboxdDate(dateIndex >= 0 ? row[dateIndex] : undefined) ?? new Date();
    const yearRaw = yearIndex >= 0 ? Number(row[yearIndex]?.trim()) : NaN;
    const year = Number.isFinite(yearRaw) ? yearRaw : null;

    if (!title || rating == null) {
      return { status: "skipped" as const };
    }

    const searchKey = `${slugify(title)}:${year ?? ""}`;
    let matchPromise = summaryCache.get(searchKey);
    if (!matchPromise) {
      matchPromise = resolveLetterboxdMovie(title, year);
      summaryCache.set(searchKey, matchPromise);
    }
    const match = await matchPromise;

    // TMDB match -> rich, Jellyfin-matchable; otherwise a minimal zero-config spine.
    const mediaKey = match ? `TMDB:${match.externalId}` : `LBX:${searchKey}`;
    let mediaItemPromise = mediaItemCache.get(mediaKey);
    if (!mediaItemPromise) {
      mediaItemPromise = match ? ensureMovieFromSummary(match) : ensureMovieFromLetterboxd(title, year);
      mediaItemCache.set(mediaKey, mediaItemPromise);
    }
    const mediaItemId = await mediaItemPromise;
    if (!mediaItemId) {
      return { status: "skipped" as const, title, year };
    }

    const existing = await db.rating.findUnique({
      where: { userId_mediaItemId: { userId: user.id, mediaItemId } },
      select: { id: true },
    });

    await db.rating.upsert({
      where: { userId_mediaItemId: { userId: user.id, mediaItemId } },
      update: { value: rating, createdAt: ratedOn, sourceTitle: title, importSource: "LETTERBOXD" },
      create: {
        userId: user.id,
        mediaItemId,
        value: rating,
        createdAt: ratedOn,
        sourceTitle: title,
        importSource: "LETTERBOXD",
      },
    });
    await ensureSeenMedia(user.id, mediaItemId);
    // A rating is a viewing: add the journal line (dated to the Letterboxd date).
    await upsertRatingWatchEntry(user.id, mediaItemId, rating, { watchedOn: ratedOn });
    // Mirror to Jellyfin only when we have a TMDB id — that's how the plugin
    // finds the film in the Jellyfin library. Minimal/seed spines can't be matched.
    if (match?.provider === "TMDB") await pushToJellyfin(user.id, mediaItemId, { rating, played: true });

    return { status: existing ? ("updated" as const) : ("imported" as const) };
  });

  const imported = results.filter((result) => result.status === "imported").length;
  const updated = results.filter((result) => result.status === "updated").length;
  const skipped = results.filter((result) => result.status === "skipped").length;
  const examples = results
    .filter((result): result is { status: "skipped"; title: string; year: number | null } => result.status === "skipped" && "title" in result)
    .slice(0, 5)
    .map((result) => `${result.title}${result.year ? ` (${result.year})` : ""}`);

  revalidatePath("/import");
  revalidatePath("/stats");
  revalidatePath("/journal");
  revalidatePath(`/u/${user.username}`);
  revalidatePath("/home");

  return {
    success: true,
    imported,
    updated,
    skipped,
    total: entries.length,
    examples,
  };
}
