import "server-only";
import { publicOrigin } from "./origin";

/**
 * Connexion Discord OAuth2 + vérification serveur/rôles.
 *
 * Variables d'environnement :
 *   DISCORD_CLIENT_ID / DISCORD_CLIENT_SECRET  application Discord (fournie par l'opérateur)
 *   DISCORD_GUILD_ID                       serveur Discord dont il faut être membre
 *   DISCORD_ALLOWED_ROLES                  IDs de rôles autorisés, séparés par des virgules
 *                                          (au moins un requis ; vide = tout membre du serveur)
 *   SITE_URL                               URL publique du site (pour l'URL de retour OAuth2)
 */

const API = "https://discord.com/api";
export const DISCORD_SCOPES = "identify guilds.members.read";
/** Cookie temporaire (10 min) qui garde le state OAuth2 et la page de retour. */
export const OAUTH_COOKIE = "webmap_oauth";

export function discordConfig() {
  const clientId = process.env.DISCORD_CLIENT_ID || process.env.AUTH_DISCORD_ID; // AUTH_DISCORD_* : anciens noms
  const clientSecret = process.env.DISCORD_CLIENT_SECRET || process.env.AUTH_DISCORD_SECRET;
  const guildId = process.env.DISCORD_GUILD_ID;
  const allowedRoles = (process.env.DISCORD_ALLOWED_ROLES ?? "")
    .split(",")
    .map((r) => r.trim())
    .filter(Boolean);
  if (!clientId || !clientSecret || !guildId) return null;
  return { clientId, clientSecret, guildId, allowedRoles };
}

export function isDiscordEnabled() {
  return discordConfig() !== null;
}

/** URL publique du site (SITE_URL) : voir src/lib/origin.ts. */
export const appOrigin = publicOrigin;

export const callbackUrl = (req: Request) => `${appOrigin(req)}/api/auth/discord/callback`;

export async function exchangeCode(code: string, redirectUri: string): Promise<string> {
  const cfg = discordConfig()!;
  const res = await fetch(`${API}/oauth2/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: cfg.clientId,
      client_secret: cfg.clientSecret,
      grant_type: "authorization_code",
      code,
      redirect_uri: redirectUri,
    }),
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`Échange du code Discord refusé (${res.status})`);
  const data = (await res.json()) as { access_token?: string };
  if (!data.access_token) throw new Error("Pas de jeton Discord");
  return data.access_token;
}

export type DiscordUser = { id: string; username: string; global_name: string | null; avatar: string | null };

export async function fetchUser(accessToken: string): Promise<DiscordUser> {
  const res = await fetch(`${API}/users/@me`, {
    headers: { Authorization: `Bearer ${accessToken}` },
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`Profil Discord indisponible (${res.status})`);
  return (await res.json()) as DiscordUser;
}

export type AccessCheck =
  | { status: "ok"; roles: string[] }
  | { status: "not_member" }
  | { status: "missing_role" }
  | { status: "token_invalid" }
  | { status: "error" };

/** Vérifie que l'utilisateur est membre du serveur et possède au moins un des rôles autorisés. */
export async function checkAccess(accessToken: string): Promise<AccessCheck> {
  const cfg = discordConfig();
  if (!cfg) return { status: "error" };
  try {
    const res = await fetch(`${API}/users/@me/guilds/${cfg.guildId}/member`, {
      headers: { Authorization: `Bearer ${accessToken}` },
      cache: "no-store",
    });
    if (res.status === 404) return { status: "not_member" };
    if (res.status === 401) return { status: "token_invalid" };
    if (!res.ok) {
      console.error(`[Discord] vérification du membre échouée (${res.status})`);
      return { status: "error" };
    }
    const member = (await res.json()) as { roles?: string[] };
    const roles = member.roles ?? [];
    if (cfg.allowedRoles.length > 0 && !roles.some((r) => cfg.allowedRoles.includes(r))) {
      return { status: "missing_role" };
    }
    return { status: "ok", roles };
  } catch (err) {
    console.error("[Discord] vérification du membre échouée", err);
    return { status: "error" };
  }
}

// --- Revérification périodique (un rôle retiré / un kick s'applique sans attendre l'expiration) ---

const RECHECK_MS = 10 * 60 * 1000;
const lastChecks = new Map<string, { ok: boolean; at: number }>();

/**
 * true si l'utilisateur a toujours accès. Résultat gardé 10 min en mémoire par utilisateur.
 * En cas d'erreur Discord passagère, on garde le dernier résultat connu.
 */
export async function stillAllowed(discordId: string, accessToken: string): Promise<boolean> {
  const cached = lastChecks.get(discordId);
  if (cached && Date.now() - cached.at < RECHECK_MS) return cached.ok;
  const check = await checkAccess(accessToken);
  if (check.status === "error") {
    const ok = cached?.ok ?? true; // vérifiée à la connexion : on ne bloque pas sur une panne Discord
    lastChecks.set(discordId, { ok, at: Date.now() });
    return ok;
  }
  const ok = check.status === "ok";
  lastChecks.set(discordId, { ok, at: Date.now() });
  return ok;
}

export function rememberAllowed(discordId: string) {
  lastChecks.set(discordId, { ok: true, at: Date.now() });
}

export function avatarUrl(user: DiscordUser): string | null {
  if (!user.avatar) return null;
  const ext = user.avatar.startsWith("a_") ? "gif" : "png";
  return `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.${ext}?size=64`;
}
