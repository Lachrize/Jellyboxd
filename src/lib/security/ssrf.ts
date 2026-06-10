import { isIP } from "node:net";
import { lookup } from "node:dns/promises";

/** Thrown when a URL targets an address we refuse to fetch server-side. */
export class SsrfError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SsrfError";
  }
}

export interface SsrfPolicy {
  /** Allow RFC1918 / CGNAT private ranges (needed for a LAN Jellyfin server). */
  allowPrivate?: boolean;
  /** Allow 127.0.0.0/8 and ::1 (a Jellyfin on the same host). */
  allowLoopback?: boolean;
  /** If set, the hostname must equal one of these or be a subdomain of one. */
  allowedHosts?: string[];
}

/**
 * Returns a human reason if `ip` must be blocked under `policy`, else null.
 * Link-local (169.254/16, fe80::/10) is ALWAYS blocked — that's the cloud
 * metadata range (169.254.169.254) and the prime SSRF target.
 */
function blockReason(ip: string, policy: SsrfPolicy): string | null {
  const version = isIP(ip);

  if (version === 4) {
    const [a, b] = ip.split(".").map(Number) as [number, number];
    if (a === 169 && b === 254) return "link-local/metadata";
    if (a === 0) return "reserved";
    if (a === 127) return policy.allowLoopback ? null : "loopback";
    if (!policy.allowPrivate) {
      if (a === 10) return "private";
      if (a === 172 && b >= 16 && b <= 31) return "private";
      if (a === 192 && b === 168) return "private";
      if (a === 100 && b >= 64 && b <= 127) return "CGNAT";
    }
    return null;
  }

  if (version === 6) {
    const low = ip.toLowerCase();
    // IPv4-mapped (::ffff:a.b.c.d) — re-check as IPv4.
    const mapped = low.match(/::ffff:(\d{1,3}(?:\.\d{1,3}){3})$/);
    if (mapped) return blockReason(mapped[1]!, policy);
    if (low === "::1") return policy.allowLoopback ? null : "loopback";
    if (low.startsWith("fe80")) return "link-local";
    if (low.startsWith("fc") || low.startsWith("fd")) return policy.allowPrivate ? null : "unique-local";
    return null;
  }

  return null;
}

function hostAllowed(hostname: string, allowedHosts: string[]): boolean {
  const host = hostname.toLowerCase().replace(/\.$/, "");
  return allowedHosts.some((allowed) => {
    const a = allowed.toLowerCase();
    return host === a || host.endsWith(`.${a}`);
  });
}

/**
 * Validate a URL before fetching it server-side. Resolves the hostname (to
 * catch names that point at internal IPs) and rejects blocked targets.
 * Throws {@link SsrfError} on any violation.
 */
export async function assertSafeUrl(rawUrl: string, policy: SsrfPolicy = {}): Promise<URL> {
  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    throw new SsrfError("URL invalide.");
  }

  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new SsrfError("Protocole non autorisé.");
  }
  if (policy.allowedHosts && !hostAllowed(url.hostname, policy.allowedHosts)) {
    throw new SsrfError("Hôte non autorisé.");
  }

  let addresses: { address: string }[];
  if (isIP(url.hostname)) {
    addresses = [{ address: url.hostname }];
  } else {
    try {
      addresses = await lookup(url.hostname, { all: true });
    } catch {
      throw new SsrfError("Hôte introuvable.");
    }
  }
  if (!addresses.length) throw new SsrfError("Hôte introuvable.");

  for (const { address } of addresses) {
    const reason = blockReason(address, policy);
    if (reason) throw new SsrfError(`Adresse interne interdite (${reason}).`);
  }

  return url;
}

/**
 * Jellyfin runs on the LAN (or even the same host) — allow private/loopback
 * ranges but never link-local/cloud-metadata.
 */
export function assertSafeJellyfinUrl(rawUrl: string): Promise<URL> {
  return assertSafeUrl(rawUrl, { allowPrivate: true, allowLoopback: true });
}
