/**
 * Composite external-id encoding for the TV hierarchy. A season/episode ref
 * carries its full path so the upsert pipeline can materialise parents on demand.
 * `::` never appears in TMDB numeric ids or seed slugs, so it is a safe separator.
 */
export const seasonExternalId = (seriesExternalId: string, seasonNumber: number) =>
  `${seriesExternalId}::s${seasonNumber}`;

export const episodeExternalId = (
  seriesExternalId: string,
  seasonNumber: number,
  episodeNumber: number,
) => `${seriesExternalId}::s${seasonNumber}e${episodeNumber}`;

export function parseSeasonExternalId(id: string) {
  const m = id.match(/^(.*)::s(\d+)$/);
  if (!m) return null;
  return { seriesExternalId: m[1]!, seasonNumber: Number(m[2]) };
}

export function parseEpisodeExternalId(id: string) {
  const m = id.match(/^(.*)::s(\d+)e(\d+)$/);
  if (!m) return null;
  return {
    seriesExternalId: m[1]!,
    seasonNumber: Number(m[2]),
    episodeNumber: Number(m[3]),
  };
}
