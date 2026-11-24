import "server-only";
import { cookies } from "next/headers";
import { stillAllowed } from "./discord";
import { SESSION_COOKIE, SESSION_MAX_AGE, decryptSession, encryptSession, type Session } from "./session-crypto";

export { SESSION_COOKIE, type Session };

export async function createSession(session: Session) {
  const token = await encryptSession(session);
  const store = await cookies();
  store.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_MAX_AGE,
  });
}

export async function destroySession() {
  const store = await cookies();
  store.delete(SESSION_COOKIE);
}

/**
 * Session courante, ou null. Pour une session Discord, revérifie (toutes les 10 min max)
 * que l'utilisateur est toujours sur le serveur avec un rôle autorisé.
 */
export async function getSession(): Promise<Session | null> {
  const store = await cookies();
  const session = await decryptSession(store.get(SESSION_COOKIE)?.value);
  if (!session) return null;
  if (!(await stillAllowed(session.discordId, session.accessToken))) return null;
  return session;
}
