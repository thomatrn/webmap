# Carte interactive GTA RP

Next.js 16 · React 19 · Leaflet (+ Geoman pour dessiner) · Prisma + PostgreSQL · Tailwind 4

- **Node.js ≥ 20.9** (développé et testé avec Node 20) · **pnpm 10** (via `corepack enable`)
- **PostgreSQL ≥ 14** (testé avec PostgreSQL 16)
- Site **web uniquement** (pas d'affichage en jeu). Connexion admin **par Discord uniquement** (aucun mot de passe).
- **Aucun envoi ni stockage de fichier** : les seules images sont celles du dépôt (carte, icônes).

## Hébergement (serveur partagé, derrière un reverse proxy HTTPS)

Le site tourne avec Node directement (Docker non nécessaire). Toute la configuration est dans le `.env`
(voir `.env.example`, commenté) : rien n'est en dur dans le code.

| Variable | Rôle |
|---|---|
| `SITE_URL` | Adresse publique, sans barre finale (ex. `https://carte.fbfa.fr`) |
| `PORT` | Port d'écoute. Le site écoute sur `127.0.0.1:PORT` |
| `DATABASE_URL` | Connexion PostgreSQL (base et utilisateur dédiés) |
| `SESSION_SECRET` | Chiffrement des sessions admin : `openssl rand -hex 32` |
| `DISCORD_CLIENT_ID`, `DISCORD_CLIENT_SECRET` | Application Discord (OAuth2) |
| `DISCORD_GUILD_ID` | Serveur Discord dont il faut être membre |
| `DISCORD_ALLOWED_ROLES` | IDs des rôles autorisés, séparés par des virgules (au moins un requis) |

**Installation**

```bash
corepack enable
pnpm install --frozen-lockfile   # le postinstall lance `prisma generate` (génère le client de base de données)
pnpm db:deploy                   # applique les migrations (prisma/migrations)
pnpm build
pnpm start                       # écoute sur 127.0.0.1:$PORT
```

**Mise à jour**

```bash
git pull
pnpm install --frozen-lockfile
pnpm db:deploy
pnpm build
# puis redémarrer le processus (pnpm start)
```

**Discord** : callback OAuth2 à déclarer dans l'application : `<SITE_URL>/api/auth/discord/callback`.
Scopes : `identify guilds.members.read`. **Aucun bot**, aucun salon utilisé.

**Réseau et sécurité**

- HTTPS géré par le reverse proxy. Les adresses absolues (redirections, URL de retour Discord) sont
  construites depuis `SITE_URL`, jamais depuis l'adresse interne de la requête (`src/lib/origin.ts`).
- Les routes qui modifient des données exigent une session admin **et** une origine égale à `SITE_URL`
  (contrôle CSRF dans `src/lib/api.ts`).
- Cookies de session `HttpOnly; Secure; SameSite=Lax`, contenu chiffré (il contient le jeton Discord).
- Base : uniquement via Prisma (requêtes paramétrées), aucune requête SQL brute.
- Aucun `child_process`, `eval`, ni appel réseau sortant autre que l'API Discord (`discord.com`).
- Les outils de développement (`scripts/` : tuiles, île, catalogue) restent sur la machine du développeur et
  ne sont pas dans le dépôt. Les fichiers qu'ils génèrent (tuiles, `src/lib/catalog.ts`) sont commités.

Une variante Docker (Dokploy) existe aussi : voir *Déploiement (Dokploy)* plus bas.

## Développement local

```bash
pnpm install
cp .env.example .env        # puis remplir SESSION_SECRET (openssl rand -hex 32) et les variables Discord
pnpm run db:setup           # lance Postgres (Docker, port 5433) et applique les migrations
pnpm dev
```

- Carte publique : http://localhost:3000
- Panel admin : http://localhost:3000/admin
- Logs : http://localhost:3000/admin/logs

Base locale : `pnpm db:up` / `pnpm db:down`. Après une modification de `prisma/schema.prisma` :
`pnpm db:migrate` (crée une migration dans `prisma/migrations/`, à committer).

## Ta carte

La source est `public/map.svg`, mais le site affiche des **tuiles** (`public/tiles/`) générées à partir
de ce SVG : c'est ce qui rend le zoom fluide (le SVG brut est trop lourd pour être redessiné à chaque zoom).

**Après chaque modification de `public/map.svg`, régénère les tuiles** (script local, hors dépôt) :

```bash
pip install pillow numpy        # une seule fois
python3 scripts/build-tiles.py
```

Toutes les coordonnées sont en unités du `viewBox` SVG : si tu changes de carte avec le **même viewBox**,
les zones et icônes restent bien placées. La carte d'origine est gardée dans `assets/map.original.svg`.

Zoom à l'arrivée sur le site : `INITIAL_ZOOM_BOOST` dans `src/components/map/StableMapContainer.tsx`.

## Admin

- **Dessiner une zone** : clique les points, clique le 1er point (ou double-clic) pour fermer.
  Ensuite nom, catégorie (= filtre dans la légende publique), couleur, remplissage, épaisseur, pointillés.
- **Modifier une zone** : sélectionne-la → `✎ Points` (glisser les sommets, glisser un point du milieu pour
  en ajouter, clic droit pour supprimer) ou `✥ Déplacer`. Puis *Enregistrer*.
- **Placer une icône** : choisis le type (garage, immeuble, entrepôt) et clique sur la carte.
  Les icônes se déplacent par glisser-déposer (sauvegarde auto).
- `Échap` pour revenir en mode sélection.

## Connexion Discord

Les admins se connectent avec Discord (OAuth2). Accès accordé seulement si le compte est **membre du serveur**
`DISCORD_GUILD_ID` **et** possède **au moins un** des rôles de `DISCORD_ALLOWED_ROLES`.
Les rôles sont revérifiés toutes les 10 minutes : un rôle retiré ou un kick coupe l'accès sans attendre.

1. https://discord.com/developers/applications → *New Application* → **OAuth2**
2. Copier *Client ID* → `DISCORD_CLIENT_ID`, *Client Secret* → `DISCORD_CLIENT_SECRET`
3. **Redirects** : ajouter `https://<ton-domaine>/api/auth/discord/callback`
   (et `http://localhost:3000/api/auth/discord/callback` pour le dev)
4. Dans Discord (mode développeur activé) : clic droit sur le serveur / les rôles → *Copier l'identifiant*
   → `DISCORD_GUILD_ID` et `DISCORD_ALLOWED_ROLES` (séparés par des virgules)

Aucun bot n'est nécessaire : la vérification utilise le scope `guilds.members.read` du compte connecté.

## Logs

Chaque création / modification / suppression est enregistrée dans `AuditLog` avec l'admin, la date,
et un snapshot avant/après. Depuis `/admin/logs` on peut voir le diff et **annuler** n'importe quelle
action (l'annulation est elle-même loggée).

## Structure

```
prisma/schema.prisma          Modèles Zone, Marker, AuditLog
src/app/api/*                 Routes API (toutes les écritures exigent une session admin)
src/components/map/           MapView (Leaflet), AdminTools (Geoman), icônes
src/components/admin/         Panel admin, logs, login
src/proxy.ts                  Redirection /admin → /login si pas connecté
```

## Déploiement (Dokploy)

1. Dans Dokploy : **Create Service → Compose**, source = ce dépôt GitHub, branche `main`.
2. **Compose Path** : `./docker-compose.prod.yml`
3. **Environment** : renseigner les variables de `.env.prod.example`
   (`DB_PASSWORD`, `SESSION_SECRET`, `DISCORD_*`, `SITE_URL`).
   Les anciens noms `AUTH_DISCORD_ID` / `AUTH_DISCORD_SECRET` / `APP_URL` restent acceptés.
4. **Domains** : ajouter ton domaine sur le service `app`, port `3000`, HTTPS activé.
5. **Deploy**.

Au démarrage, le conteneur applique les migrations Prisma.
La base Postgres est dans le volume `db-data` (persistant) et n'est pas exposée à l'extérieur.
