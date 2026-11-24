/**
 * Chiffrement des cookies de session (JWE, A256GCM) — partagé entre le serveur et src/proxy.ts.
 * Chiffré (et pas seulement signé) car la session Discord contient le jeton d'accès Discord.
 */
import { EncryptJWT, jwtDecrypt } from "jose";

export const SESSION_COOKIE = "webmap_session";
export const SESSION_MAX_AGE = 60 * 60 * 24 * 7; // 7 jours (= durée de vie d'un jeton Discord)

export type Session = {
  provider: "discord";
  /** Nom affiché (utilisé dans les logs) */
  username: string;
  discordId: string;
  avatar: string | null;
  accessToken: string;
};

let cachedKey: { secret: string; key: Uint8Array } | null = null;

/** Clé AES-256 dérivée de SESSION_SECRET (SHA-256). */
async function key(): Promise<Uint8Array> {
  const secret = process.env.SESSION_SECRET;
  if (!secret) throw new Error("SESSION_SECRET manquant");
  if (cachedKey?.secret !== secret) {
    const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(secret));
    cachedKey = { secret, key: new Uint8Array(digest) };
  }
  return cachedKey.key;
}

export async function encryptSession(session: Session): Promise<string> {
  return new EncryptJWT(session as unknown as Record<string, unknown>)
    .setProtectedHeader({ alg: "dir", enc: "A256GCM" })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_MAX_AGE}s`)
    .encrypt(await key());
}

export async function decryptSession(token: string | undefined): Promise<Session | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtDecrypt(token, await key());
    // Seules les sessions Discord sont valides (les anciennes sessions "mot de passe" sont refusées).
    if (
      payload.provider !== "discord" ||
      typeof payload.username !== "string" ||
      typeof payload.discordId !== "string" ||
      typeof payload.accessToken !== "string"
    ) {
      return null;
    }
    return {
      provider: "discord",
      username: payload.username,
      discordId: payload.discordId,
      avatar: typeof payload.avatar === "string" ? payload.avatar : null,
      accessToken: payload.accessToken,
    };
  } catch {
    return null;
  }
}
