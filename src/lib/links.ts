/** Centralised URL builders so routes are defined in exactly one place. */

export const mediaHref = (kind: string, externalId: string) =>
  kind === "SERIES"
    ? `/serie/${encodeURIComponent(externalId)}`
    : `/film/${encodeURIComponent(externalId)}`;

export const seriesHref = (externalId: string) => `/serie/${encodeURIComponent(externalId)}`;
export const seasonHref = (seriesExternalId: string, n: number) =>
  `/serie/${encodeURIComponent(seriesExternalId)}/saison/${n}`;
export const episodeHref = (seriesExternalId: string, n: number, e: number) =>
  `/serie/${encodeURIComponent(seriesExternalId)}/saison/${n}/episode/${e}`;

export const profileHref = (username: string) => `/u/${username}`;
export const personHref = (externalId: string) => `/personne/${encodeURIComponent(externalId)}`;
export const listHref = (id: string) => `/liste/${id}`;
