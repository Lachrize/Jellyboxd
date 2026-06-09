export interface JellyfinSystemInfo {
  Id: string;
  ServerName: string;
  Version: string;
}

export interface JellyfinUser {
  Id: string;
  Name: string;
}

export interface JellyfinAuthResponse {
  User: JellyfinUser;
  AccessToken: string;
}

export interface JellyfinProviderIds {
  Tmdb?: string;
  Imdb?: string;
  Tvdb?: string;
}

export interface JellyfinUserData {
  Played?: boolean;
  IsFavorite?: boolean;
  Rating?: number | null;
  LastPlayedDate?: string | null;
  PlayedPercentage?: number;
}

export interface JellyfinItem {
  Id: string;
  Name: string;
  Type: string;
  ProductionYear?: number;
  ProviderIds?: JellyfinProviderIds;
  UserData?: JellyfinUserData;
  ParentIndexNumber?: number;
  IndexNumber?: number;
  SeriesId?: string;
  SeriesName?: string;
}

export interface JellyfinItemsResponse {
  Items: JellyfinItem[];
  TotalRecordCount: number;
}

export class JellyfinClient {
  constructor(
    private readonly baseUrl: string,
    private readonly apiKey: string,
  ) {}

  private url(path: string, params?: Record<string, string | number | boolean | undefined>): string {
    const normalized = this.baseUrl.replace(/\/+$/, "");
    const u = new URL(`${normalized}${path.startsWith("/") ? path : `/${path}`}`);
    if (params) {
      for (const [key, value] of Object.entries(params)) {
        if (value !== undefined && value !== "") u.searchParams.set(key, String(value));
      }
    }
    return u.toString();
  }

  private async request<T>(path: string, init?: RequestInit & { params?: Record<string, string | number | boolean | undefined> }): Promise<T> {
    const { params, ...fetchInit } = init ?? {};
    const res = await fetch(this.url(path, params), {
      ...fetchInit,
      headers: {
        "X-Emby-Token": this.apiKey,
        Accept: "application/json",
        ...(fetchInit.body ? { "Content-Type": "application/json" } : {}),
        ...fetchInit.headers,
      },
      signal: AbortSignal.timeout(30_000),
    });
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      throw new JellyfinApiError(res.status, body || res.statusText);
    }
    if (res.status === 204) return undefined as T;
    return (await res.json()) as T;
  }

  getSystemInfo(): Promise<JellyfinSystemInfo> {
    return this.request<JellyfinSystemInfo>("/System/Info");
  }

  getUsers(): Promise<JellyfinUser[]> {
    return this.request<JellyfinUser[]>("/Users");
  }

  getUserItems(
    userId: string,
    options: {
      startIndex?: number;
      limit?: number;
      includeItemTypes?: string;
      fields?: string;
      recursive?: boolean;
    } = {},
  ): Promise<JellyfinItemsResponse> {
    return this.request<JellyfinItemsResponse>(`/Users/${userId}/Items`, {
      params: {
        StartIndex: options.startIndex ?? 0,
        Limit: options.limit ?? 100,
        Recursive: options.recursive ?? true,
        IncludeItemTypes: options.includeItemTypes ?? "Movie,Series,Season,Episode",
        Fields: options.fields ?? "ProviderIds,UserData,ParentIndexNumber,IndexNumber,SeriesId,SeriesName",
      },
    });
  }

  getItem(userId: string, itemId: string): Promise<JellyfinItem> {
    return this.request<JellyfinItem>(`/Users/${userId}/Items/${itemId}`, {
      params: { Fields: "ProviderIds" },
    });
  }

  findItemByTmdb(
    userId: string,
    tmdbId: string,
    kind: "Movie" | "Series" | "Season" | "Episode",
    extras?: { seriesTmdb?: string; seasonNumber?: number; episodeNumber?: number },
  ): Promise<JellyfinItem | null> {
    if (kind === "Episode" && extras?.seriesTmdb && extras.seasonNumber != null && extras.episodeNumber != null) {
      const res = this.request<JellyfinItemsResponse>(`/Users/${userId}/Items`, {
        params: {
          Recursive: true,
          IncludeItemTypes: "Episode",
          ProviderIds: `TMDB:${extras.seriesTmdb}`,
          ParentIndexNumber: extras.seasonNumber,
          IndexNumber: extras.episodeNumber,
          Limit: 1,
          Fields: "ProviderIds",
        },
      });
      return res.then((r) => r.Items[0] ?? null);
    }

    const providerKey = kind === "Movie" || kind === "Series" ? `TMDB:${tmdbId}` : undefined;
    if (!providerKey) return Promise.resolve(null);

    return this.request<JellyfinItemsResponse>(`/Users/${userId}/Items`, {
      params: {
        Recursive: true,
        IncludeItemTypes: kind,
        AnyProviderIdEquals: providerKey,
        Limit: 1,
        Fields: "ProviderIds",
      },
    }).then((r) => r.Items[0] ?? null);
  }

  setPlayed(userId: string, itemId: string, played: boolean): Promise<void> {
    return this.request<void>(`/UserData/${userId}`, {
      method: "POST",
      body: JSON.stringify({ ItemId: itemId, Played: played }),
    });
  }

  setRating(userId: string, itemId: string, rating: number | null): Promise<void> {
    return this.request<void>(`/UserData/${userId}`, {
      method: "POST",
      body: JSON.stringify({ ItemId: itemId, Rating: rating ?? 0 }),
    });
  }

  setFavorite(userId: string, itemId: string, favorite: boolean): Promise<void> {
    const method = favorite ? "POST" : "DELETE";
    return this.request<void>(`/Users/${userId}/FavoriteItems/${itemId}`, { method });
  }
}

export class JellyfinApiError extends Error {
  constructor(
    readonly status: number,
    readonly body: string,
  ) {
    super(`Jellyfin API ${status}: ${body}`);
    this.name = "JellyfinApiError";
  }
}

/** Normalize user input (strip trailing slash, default http if missing). */
export function normalizeJellyfinUrl(raw: string): string {
  const trimmed = raw.trim().replace(/\/+$/, "");
  if (!/^https?:\/\//i.test(trimmed)) return `http://${trimmed}`;
  return trimmed;
}

/** Authenticate a Jellyfin user with their normal Jellyfin username/password. */
export async function authenticateJellyfinUser(
  baseUrl: string,
  username: string,
  password: string,
): Promise<JellyfinAuthResponse> {
  const normalized = normalizeJellyfinUrl(baseUrl);
  const res = await fetch(`${normalized}/Users/AuthenticateByName`, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      "X-Emby-Authorization":
        'MediaBrowser Client="Jellyboxd", Device="Jellyboxd Web", DeviceId="jellyboxd-web", Version="1.0.0"',
    },
    body: JSON.stringify({ Username: username, Pw: password }),
    signal: AbortSignal.timeout(30_000),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new JellyfinApiError(res.status, body || res.statusText);
  }

  return (await res.json()) as JellyfinAuthResponse;
}
