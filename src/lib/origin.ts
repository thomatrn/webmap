/**
 * Adresse publique du site et contrôle d'origine (CSRF).
 * Utilisable partout, y compris dans src/proxy.ts (pas de "server-only").
 *
 * Derrière le reverse proxy, `request.url` contient l'adresse INTERNE (ex. http://127.0.0.1:3000) :
 * toute adresse absolue (redirection, URL de retour Discord) est donc construite depuis SITE_URL.
 */

/** Origine publique : SITE_URL, sinon (dev) déduite des en-têtes X-Forwarded-* / Host. */
export function publicOrigin(req: Request): string {
  // APP_URL : ancien nom, toujours accepté pour ne pas casser un déploiement existant.
  const configured = process.env.SITE_URL || process.env.APP_URL;
  if (configured) return new URL(configured).origin;
  const h = req.headers;
  const url = new URL(req.url);
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? url.host;
  const proto = h.get("x-forwarded-proto") ?? url.protocol.replace(":", "");
  return `${proto}://${host}`;
}

/**
 * true si la requête vient bien du site lui-même (en-tête Origin, ou à défaut Referer).
 * Les navigateurs envoient Origin sur les POST/PATCH/DELETE : une requête sans aucun des deux est refusée.
 */
export function isSameOrigin(req: Request): boolean {
  const expected = publicOrigin(req);
  const origin = req.headers.get("origin");
  if (origin) return origin === expected;
  const referer = req.headers.get("referer");
  if (!referer) return false;
  try {
    return new URL(referer).origin === expected;
  } catch {
    return false;
  }
}
