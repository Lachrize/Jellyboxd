import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/** Tailwind-aware className combiner. */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** URL-safe slug. */
export function slugify(input: string): string {
  return input
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

/** Stable slug for a media item, e.g. `the-bear-2022-series`. */
export function mediaSlug(title: string, year: number | null, kind: string, externalId?: string) {
  const base = [slugify(title), year ?? "", kind.toLowerCase()].filter(Boolean).join("-");
  return externalId ? `${base}-${externalId}` : base;
}

export function formatRuntime(minutes: number | null | undefined): string | null {
  if (!minutes || minutes <= 0) return null;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m} min`;
  if (m === 0) return `${h} h`;
  return `${h} h ${m.toString().padStart(2, "0")}`;
}

export function formatYearRange(start?: number | null, end?: number | null): string {
  if (!start) return "";
  if (!end || end === start) return `${start}`;
  return `${start}–${end}`;
}

/** Compact counts: 1200 -> 1,2 k. */
export function formatCount(n: number): string {
  if (n < 1000) return `${n}`;
  if (n < 1_000_000) return `${(n / 1000).toFixed(n % 1000 === 0 ? 0 : 1).replace(".", ",")} k`;
  return `${(n / 1_000_000).toFixed(1).replace(".", ",")} M`;
}

export function initials(name: string): string {
  return name
    .split(/\s+/)
    .map((p) => p[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

/** Deterministic accent color from a string (avatars / fallbacks). */
export function hueFromString(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) % 360;
  return h;
}

export function pluralize(n: number, singular: string, plural?: string): string {
  return `${n} ${n <= 1 ? singular : plural ?? `${singular}s`}`;
}

export function safeJsonParse<T>(value: string | null | undefined, fallback: T): T {
  if (!value) return fallback;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

export function truncate(text: string, max: number): string {
  if (text.length <= max) return text;
  return `${text.slice(0, max).trimEnd()}…`;
}
