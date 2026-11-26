import { randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import { DISCORD_SCOPES, OAUTH_COOKIE, appOrigin, callbackUrl, discordConfig } from "@/lib/discord";

// Chemin interne uniquement : refuse "//x" et "/\x" (les navigateurs lisent \ comme /, donc vers un autre site)
const safeNext = (n: string | null) => (n && n.startsWith("/") && !/^\/[/\\]/.test(n) ? n : "/admin");

/** Démarre la connexion Discord : redirige vers la page d'autorisation Discord. */
export async function GET(req: Request) {
  const cfg = discordConfig();
  const url = new URL(req.url);
  if (!cfg) return NextResponse.redirect(new URL("/login?error=discord_disabled", appOrigin(req)));

  const state = randomBytes(24).toString("base64url");
  const authorize = new URL("https://discord.com/oauth2/authorize");
  authorize.search = new URLSearchParams({
    client_id: cfg.clientId,
    redirect_uri: callbackUrl(req),
    response_type: "code",
    scope: DISCORD_SCOPES,
    state,
    prompt: "none", // pas de re-demande d'autorisation si déjà accordée
  }).toString();

  const res = NextResponse.redirect(authorize);
  res.cookies.set(OAUTH_COOKIE, `${state}|${safeNext(url.searchParams.get("next"))}`, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/api/auth/discord",
    maxAge: 600,
  });
  return res;
}
