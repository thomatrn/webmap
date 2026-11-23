# Carte interactive GTA RP

Next.js 16 · React 19 · Leaflet (+ Geoman pour dessiner) · Prisma + Postgres · Tailwind 4

## Démarrage

```bash
pnpm install
cp .env.example .env        # puis remplir SESSION_SECRET (openssl rand -hex 32) et le mot de passe admin
pnpm run db:setup           # lance Postgres (Docker, port 5433), applique les migrations, crée l'admin du .env
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

**Après chaque modification de `public/map.svg`, régénère les tuiles :**

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

## Comptes admin

```bash
pnpm run admin:create <identifiant> <mot_de_passe>   # crée ou change le mot de passe
```

## Logs

Chaque création / modification / suppression est enregistrée dans `AuditLog` avec l'admin, la date,
et un snapshot avant/après. Depuis `/admin/logs` on peut voir le diff et **annuler** n'importe quelle
action (l'annulation est elle-même loggée).

## Structure

```
prisma/schema.prisma          Modèles Zone, Marker, AuditLog, AdminUser
src/app/api/*                 Routes API (toutes les écritures exigent une session admin)
src/components/map/           MapView (Leaflet), AdminTools (Geoman), icônes
src/components/admin/         Panel admin, logs, login
src/proxy.ts                  Redirection /admin → /login si pas connecté
```

## Déploiement (Dokploy, Docker Compose)

1. Dans Dokploy : **Create Service → Compose**, source = ce dépôt GitHub, branche `main`.
2. **Compose Path** : `./docker-compose.prod.yml`
3. **Environment** : renseigner les variables de `.env.prod.example`
   (`DB_PASSWORD`, `SESSION_SECRET`, `ADMIN_USERNAME`, `ADMIN_PASSWORD`).
4. **Domains** : ajouter ton domaine sur le service `app`, port `3000`, HTTPS activé.
5. **Deploy**.

Au démarrage, le conteneur applique les migrations Prisma puis crée/met à jour le compte admin.
La base Postgres est dans le volume `db-data` (persistant) et n'est pas exposée à l'extérieur.

### Reprendre les données de l'ancienne base SQLite

```bash
python3 scripts/export-sqlite.py prisma/dev.sqlite.backup > prisma/sqlite-export.json
DATABASE_URL="postgresql://…" pnpm exec tsx scripts/import-sqlite.ts prisma/sqlite-export.json
```
