/**
 * Per-connection Jellyfin REST client (multi-tenant). Every call takes the
 * caller's connection ({ baseUrl, token }). Best-effort: returns boolean/null
 * and never throws, so a user action never fails because their server is down.
 */

const TIMEOUT_MS = 5000;
const EMBY_AUTH =
  'MediaBrowser Client="Jellyboxd", Device="Jellyboxd", DeviceId="jellyboxd-web", Version="1.0.0"';

export interface JfConnection {
  baseUrl: string;
  token: string;
}

const trimUrl = (url: string) => url.trim().replace(/\/+$/, "");

async function jf(conn: JfConnection, path: string, init: RequestInit = {}): Promise<Response | null> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    return await fetch(`${conn.baseUrl}${path}`, {
      ...init,
      signal: controller.signal,
      headers: {
        "X-Emby-Token": conn.token,
        ...(init.body ? { "Content-Type": "application/json" } : {}),
        ...(init.headers ?? {}),
      },
    });
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

/** Public server info (no auth) — used to validate a URL when connecting. */
export async function getJellyfinServerInfo(baseUrl: string): Promise<{ serverName: string; version: string } | null> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(`${trimUrl(baseUrl)}/System/Info/Public`, { signal: controller.signal });
    if (!res.ok) return null;
    const d = (await res.json()) as { ServerName?: string; Version?: string };
    return { serverName: d.ServerName ?? "Jellyfin", version: d.Version ?? "" };
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

/** Verify credentials against a server and return an access token + user id. */
export async function authenticateJellyfin(
  baseUrl: string,
  username: string,
  password: string,
): Promise<{ accessToken: string; jellyfinUserId: string; name: string } | null> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(`${trimUrl(baseUrl)}/Users/AuthenticateByName`, {
      method: "POST",
      signal: controller.signal,
      headers: { "Content-Type": "application/json", Authorization: EMBY_AUTH },
      body: JSON.stringify({ Username: username, Pw: password }),
    });
    if (!res.ok) return null;
    const d = (await res.json()) as { AccessToken?: string; User?: { Id: string; Name: string } };
    if (!d.AccessToken || !d.User) return null;
    return { accessToken: d.AccessToken, jellyfinUserId: d.User.Id, name: d.User.Name };
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

export async function findJellyfinItemIdByTmdb(
  conn: JfConnection,
  jellyfinUserId: string,
  tmdbId: string,
  itemType: "Movie" | "Series",
): Promise<string | null> {
  const params = new URLSearchParams({
    userId: jellyfinUserId,
    recursive: "true",
    includeItemTypes: itemType,
    fields: "ProviderIds",
    anyProviderIdEquals: `tmdb.${tmdbId}`,
  });
  const res = await jf(conn, `/Items?${params.toString()}`);
  if (!res?.ok) return null;
  try {
    const data = (await res.json()) as { Items?: Array<{ Id: string; ProviderIds?: { Tmdb?: string } }> };
    const items = data.Items ?? [];
    const exact = items.find((i) => String(i.ProviderIds?.Tmdb ?? "") === String(tmdbId));
    return exact?.Id ?? items[0]?.Id ?? null;
  } catch {
    return null;
  }
}

export async function findJellyfinEpisodeId(
  conn: JfConnection,
  jellyfinUserId: string,
  jellyfinSeriesId: string,
  seasonNumber: number,
  episodeNumber: number,
): Promise<string | null> {
  const params = new URLSearchParams({ userId: jellyfinUserId, season: String(seasonNumber) });
  const res = await jf(conn, `/Shows/${jellyfinSeriesId}/Episodes?${params.toString()}`);
  if (!res?.ok) return null;
  try {
    const data = (await res.json()) as { Items?: Array<{ Id: string; IndexNumber?: number }> };
    return (data.Items ?? []).find((i) => i.IndexNumber === episodeNumber)?.Id ?? null;
  } catch {
    return null;
  }
}

export async function findJellyfinSeasonId(
  conn: JfConnection,
  jellyfinUserId: string,
  jellyfinSeriesId: string,
  seasonNumber: number,
): Promise<string | null> {
  const params = new URLSearchParams({ userId: jellyfinUserId });
  const res = await jf(conn, `/Shows/${jellyfinSeriesId}/Seasons?${params.toString()}`);
  if (!res?.ok) return null;
  try {
    const data = (await res.json()) as { Items?: Array<{ Id: string; IndexNumber?: number }> };
    return (data.Items ?? []).find((i) => i.IndexNumber === seasonNumber)?.Id ?? null;
  } catch {
    return null;
  }
}

export async function setJellyfinPlayed(conn: JfConnection, jellyfinUserId: string, itemId: string, played: boolean): Promise<boolean> {
  const res = await jf(conn, `/Users/${jellyfinUserId}/PlayedItems/${itemId}`, { method: played ? "POST" : "DELETE" });
  return Boolean(res?.ok);
}

export async function setJellyfinFavorite(conn: JfConnection, jellyfinUserId: string, itemId: string, favorite: boolean): Promise<boolean> {
  const res = await jf(conn, `/Users/${jellyfinUserId}/FavoriteItems/${itemId}`, { method: favorite ? "POST" : "DELETE" });
  return Boolean(res?.ok);
}

export async function setJellyfinRating(conn: JfConnection, jellyfinUserId: string, itemId: string, rating: number | null): Promise<boolean> {
  if (rating == null) {
    const res = await jf(conn, `/Users/${jellyfinUserId}/Items/${itemId}/Rating`, { method: "DELETE" });
    return Boolean(res?.ok);
  }
  const res = await jf(conn, `/Users/${jellyfinUserId}/Items/${itemId}/UserData`, {
    method: "POST",
    body: JSON.stringify({ Rating: rating }),
  });
  return Boolean(res?.ok);
}
