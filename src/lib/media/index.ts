import { seedProvider } from "./seed";
import { tmdbProvider } from "./tmdb";
import type { MediaProvider } from "./provider";

/**
 * Selects the active media source.
 * - MEDIA_PROVIDER env forces a choice ("tmdb" | "seed").
 * - Otherwise: TMDB when a key is present, else the offline seed catalogue.
 */
export function getMediaProvider(): MediaProvider {
  const forced = process.env.MEDIA_PROVIDER?.toLowerCase();
  if (forced === "seed") return seedProvider;
  if (forced === "tmdb") return tmdbProvider;
  return process.env.TMDB_API_KEY ? tmdbProvider : seedProvider;
}

export const activeProviderName = () => getMediaProvider().name;

export type { MediaProvider } from "./provider";
export * from "./types";
export { tmdbImage } from "./images";
export * from "./refs";
