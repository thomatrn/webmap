import { NextResponse, type NextRequest } from "next/server";
import { jwtVerify } from "jose";

// Vérification "optimiste" : redirige vers /login si pas de session valide.
// Les routes API revérifient la session elles-mêmes (requireAdmin).
export async function proxy(request: NextRequest) {
  const token = request.cookies.get("webmap_session")?.value;
  let ok = false;
  if (token && process.env.SESSION_SECRET) {
    try {
      await jwtVerify(token, new TextEncoder().encode(process.env.SESSION_SECRET));
      ok = true;
    } catch {}
  }
  if (!ok) {
    const url = new URL("/login", request.url);
    url.searchParams.set("next", request.nextUrl.pathname);
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = { matcher: ["/admin/:path*"] };
