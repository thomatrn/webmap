import { NextResponse } from "next/server";
import { unstable_rethrow } from "next/navigation";
import { ZodError } from "zod";
import { isSameOrigin } from "./origin";
import { getSession, type Session } from "./session";

export class HttpError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

export async function requireAdmin(): Promise<Session> {
  const session = await getSession();
  if (!session) throw new HttpError(401, "Non authentifié");
  return session;
}

const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

/**
 * Enveloppe un handler : gère auth/validation/erreurs de façon uniforme, et refuse (403) toute requête
 * qui modifie des données (POST/PATCH/PUT/DELETE) venant d'une autre origine que le site (CSRF).
 */
export function handle<A extends [Request, ...unknown[]]>(fn: (...args: A) => Promise<Response>) {
  return async (...args: A): Promise<Response> => {
    try {
      const req = args[0];
      if (!SAFE_METHODS.has(req.method) && !isSameOrigin(req)) {
        throw new HttpError(403, "Origine refusée");
      }
      return await fn(...args);
    } catch (err) {
      unstable_rethrow(err); // laisser passer les erreurs internes de Next (prerender, redirect…)
      if (err instanceof HttpError) {
        return NextResponse.json({ error: err.message }, { status: err.status });
      }
      if (err instanceof ZodError) {
        return NextResponse.json({ error: err.issues.map((i) => i.message).join(", ") }, { status: 400 });
      }
      console.error(err);
      return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
    }
  };
}
