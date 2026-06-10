import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from "node:crypto";

/** Salt used by the legacy v1 format (single static salt, no per-record salt). */
const LEGACY_SALT = "jellyboxd-jellyfin-v1";

/** Known-insecure defaults shipped in example env files — never accept these. */
const WEAK_SECRETS = new Set([
  "dev-secret-change-me",
  "dev-insecure",
  "change-me",
  "change-me-in-production",
  "change-me-before-deploy",
]);

/**
 * Return the configured AUTH_SECRET or throw. Refusing to operate with a
 * missing/default/short secret prevents a silently-vulnerable deployment where
 * the AES key encrypting Jellyfin API keys would be public and predictable.
 */
function requireSecret(): string {
  const secret = process.env.AUTH_SECRET;
  if (!secret || WEAK_SECRETS.has(secret) || secret.length < 32) {
    throw new Error(
      "AUTH_SECRET manquant, par défaut ou trop faible (>= 32 caractères requis). " +
        "Générez-en un avec: openssl rand -base64 32",
    );
  }
  return secret;
}

function deriveKey(salt: Buffer | string): Buffer {
  return scryptSync(requireSecret(), salt, 32);
}

/** Encrypt a Jellyfin API key for storage in ImportSource.config (v2 format). */
export function encryptSecret(plain: string): string {
  const salt = randomBytes(16);
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", deriveKey(salt), iv);
  const enc = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `v2:${salt.toString("base64")}:${iv.toString("base64")}:${tag.toString("base64")}:${enc.toString("base64")}`;
}

export function decryptSecret(stored: string): string {
  const parts = stored.split(":");

  // v2: per-record salt. Format: v2:salt:iv:tag:data
  if (parts[0] === "v2" && parts.length === 5) {
    const salt = Buffer.from(parts[1]!, "base64");
    const iv = Buffer.from(parts[2]!, "base64");
    const tag = Buffer.from(parts[3]!, "base64");
    const data = Buffer.from(parts[4]!, "base64");
    const decipher = createDecipheriv("aes-256-gcm", deriveKey(salt), iv);
    decipher.setAuthTag(tag);
    return Buffer.concat([decipher.update(data), decipher.final()]).toString("utf8");
  }

  // v1 (legacy): static salt. Format: v1:iv:tag:data
  if (parts[0] === "v1" && parts.length === 4) {
    const iv = Buffer.from(parts[1]!, "base64");
    const tag = Buffer.from(parts[2]!, "base64");
    const data = Buffer.from(parts[3]!, "base64");
    const decipher = createDecipheriv("aes-256-gcm", deriveKey(LEGACY_SALT), iv);
    decipher.setAuthTag(tag);
    return Buffer.concat([decipher.update(data), decipher.final()]).toString("utf8");
  }

  throw new Error("invalid_secret_format");
}
