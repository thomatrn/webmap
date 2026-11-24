import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import {
  appOrigin,
  avatarUrl,
  callbackUrl,
  checkAccess,
  discordConfig,
  exchangeCode,
  OAUTH_COOKIE,
  fetchUser,
  rememberAllowed,
} from "@/lib/discord";
import { createSession } from "@/lib/session";

/** Retour de Discord : vérifie le state, récupère le profil, contrôle serveur + rôles, ouvre la session. */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const origin = appOrigin(req);
  const fail = (error: string) => {
    const res = NextResponse.redirect(new URL(`/login?error=${error}`, origin));
    res.cookies.delete({ name: OAUTH_COOKIE, path: "/api/auth/discord" });
    return res;
  };

  if (!discordConfig()) return fail("discord_disabled");
  if (url.searchParams.get("error")) return fail("discord_cancelled"); // refus sur la page Discord

  const cookie = req.headers.get("cookie")?.match(new RegExp(`${OAUTH_COOKIE}=([^;]+)`))?.[1];
  const [expected, next = "/admin"] = decodeURIComponent(cookie ?? "").split("|");
  const state = url.searchParams.get("state") ?? "";
  const code = url.searchParams.get("code");
  const sameState =
    !!expected && expected.length === state.length && timingSafeEqual(Buffer.from(expected), Buffer.from(state));
  if (!code || !sameState) return fail("discord_state");

  try {
    const accessToken = await exchangeCode(code, callbackUrl(req));
    const [user, access] = await Promise.all([fetchUser(accessToken), checkAccess(accessToken)]);
    if (access.status === "not_member") return fail("not_member");
    if (access.status === "missing_role") return fail("missing_role");
    if (access.status !== "ok") return fail("discord_error");

    await createSession({
      provider: "discord",
      username: user.global_name || user.username,
      discordId: user.id,
      avatar: avatarUrl(user),
      accessToken,
    });
    rememberAllowed(user.id);
    const res = NextResponse.redirect(new URL(next, origin));
    res.cookies.delete({ name: OAUTH_COOKIE, path: "/api/auth/discord" });
    return res;
  } catch (err) {
    console.error("[Discord] connexion échouée", err);
    return fail("discord_error");
  }
}
