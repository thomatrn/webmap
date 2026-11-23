import { NextResponse } from "next/server";
import { unstable_rethrow } from "next/navigation";
import { ZodError } from "zod";
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

/** Enveloppe un handler : gère auth/validation/erreurs de façon uniforme. */
export function handle<A extends unknown[]>(fn: (...args: A) => Promise<Response>) {
  return async (...args: A): Promise<Response> => {
    try {
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
