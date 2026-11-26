import { NextResponse, type NextRequest } from "next/server";
import { publicOrigin } from "@/lib/origin";
import { SESSION_COOKIE, decryptSession } from "@/lib/session-crypto";

// Vérification "optimiste" : redirige vers /login si pas de session valide.
// Les pages admin et les routes API revérifient la session (et les rôles Discord) elles-mêmes.
export async function proxy(request: NextRequest) {
  const session = await decryptSession(request.cookies.get(SESSION_COOKIE)?.value);
  if (!session) {
    // Adresse publique (pas request.url : derrière le reverse proxy, c'est l'adresse interne)
    const url = new URL("/login", publicOrigin(request));
    url.searchParams.set("next", request.nextUrl.pathname);
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = { matcher: ["/admin/:path*"] };
