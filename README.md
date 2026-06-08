<div align="center">

# Jellyboxd

**Le carnet de tout ce que vous regardez.**
PWA sociale de tracking, notation et critique — films **et** séries, nativement.

</div>

---

Jellyboxd est un « Letterboxd pour tout » : un journal de visionnage premium où les **séries sont des citoyennes de première classe** (progression saison/épisode, statuts *en cours / en pause / terminée / abandonnée*) au même titre que les films. Le produit est pensé autour de **sources média interchangeables** — TMDB aujourd'hui, **Jellyfin demain** — sans dette d'architecture.

> Ce dépôt contient une V1 « cœur en profondeur » : un vrai backend (auth par sessions, base de données branchée, CRUD complet), un design system éditorial, et toutes les pages principales.

## Sommaire

- [Le nom](#le-nom)
- [Fonctionnalités](#fonctionnalités)
- [Stack technique](#stack-technique)
- [Architecture & décisions](#architecture--décisions)
- [Modèle de données](#modèle-de-données)
- [Structure des dossiers](#structure-des-dossiers)
- [Démarrage rapide](#démarrage-rapide)
- [Déploiement Docker sur NAS](#déploiement-docker-sur-nas)
- [Comptes de démonstration](#comptes-de-démonstration)
- [Activer la vraie data (TMDB)](#activer-la-vraie-data-tmdb)
- [Préparation Jellyfin](#préparation-jellyfin)
- [PWA](#pwa)
- [Scripts](#scripts)
- [Prochaines étapes](#prochaines-étapes-priorisées)

## Le nom

**Jellyboxd** combine l'idée d'un carnet social façon Letterboxd avec une direction pensée pour les films, les séries et une future synchronisation Jellyfin.

## Fonctionnalités

**Authentification (vrai backend)**
- Inscription / connexion / déconnexion, mots de passe hachés (bcrypt)
- Sessions stockées en base + cookie `httpOnly` / `secure` / `SameSite`
- Garde des routes privées (middleware + vérification serveur)

**Catalogue & fiches**
- Films, séries, **saisons**, **épisodes** — pages détail riches et immersives
- Distribution, synopsis, métadonnées, note publique, genres cliquables
- Note personnelle (demi-étoiles), watchlist, ajout à des listes

**Journal / diary**
- Journaliser un visionnage (date, note, critique, re-vision, *aimé*, tags)
- Re-visions multiples, critiques avec/sans spoilers
- Vue journal groupée par mois

**Séries, nativement**
- Progression épisode par épisode (cases à cocher), barre de progression de saison
- Statut de suivi : *à voir / en cours / en pause / terminée / abandonnée*
- Notation séparée série / saison / épisode

**Social**
- Feed d'activité (abonnements + soi), généré automatiquement
- Suivre / ne plus suivre, likes de critiques, profils publics
- Listes publiques partageables, watchlist

**Listes** — manuelles, classées ou non, publiques/privées, watchlist spéciale

**Recherche & exploration** — recherche globale, filtres type / genre / année / tri, pagination

**Statistiques** — totaux (films, séries, épisodes, temps), histogramme de notes, genres les plus vus

**PWA** — manifest, service worker (offline shell), installable, mobile soigné (bottom-nav)

## Stack technique

| Domaine | Choix | Pourquoi |
|---|---|---|
| Framework | **Next.js 15** (App Router) · React 19 · TypeScript strict | Un seul codebase, SSR/SEO, Server Actions = backend intégré |
| Style | **Tailwind CSS 3** + design system maison | Identité forte, zéro lib « dashboard » |
| ORM / DB | **Prisma** + **SQLite** | Démarrage instantané, schéma portable vers PostgreSQL |
| Auth | **Sessions maison** (bcrypt + cookie `httpOnly`) | Contrôle total, sécurité explicite |
| Validation | **Zod** | Schémas partagés client/serveur |
| Données média | **Provider abstrait** : TMDB + repli seed | Prêt pour Jellyfin sans refonte |

## Architecture & décisions

**1. Une colonne vertébrale `MediaItem`.** Films, séries, saisons et épisodes sont tous des `MediaItem`. Notes, critiques, journal, listes et activité pointent donc uniformément vers n'importe quel niveau — c'est ce qui rend possible « noter une saison » ou « critiquer un épisode » sans cas particuliers. La structure (hiérarchie TV) vit dans des tables typées `Movie` / `Series` / `Season` / `Episode`.

**2. Sources média abstraites (clé Jellyfin).** Tout passe par une interface unique :

```ts
interface MediaProvider {
  search(q): Promise<MediaSummary[]>
  trending(): Promise<MediaSummary[]>
  discover(filters): Promise<MediaSummary[]>
  getMovie(id) / getSeries(id) / getSeason(id, n) / getEpisode(id, n, e)
}
```

`TmdbProvider` (réel) et `SeedProvider` (offline) l'implémentent ; une `factory` choisit selon la présence de `TMDB_API_KEY`. **Ajouter Jellyfin = écrire une classe de plus.** Quand un utilisateur interagit (note / log / liste), le service `resolveMediaRef` **matérialise** le DTO du provider en base (`MediaItem` + `ExternalMapping` + tables typées). Une future synchro Jellyfin alimentera exactement les mêmes tables.

**3. Actions serveur = backend.** La logique d'écriture vit dans `src/server/actions/*` (auth, tracking, social, lists, import) : authentification + validation Zod + logique métier + revalidation. La logique réutilisable (activité, watchlist, critiques, feed) est isolée dans `src/lib/services/*`, partagée entre actions **et** seed.

**4. SQLite & portabilité.** Prisma ne supporte ni `enum` ni listes scalaires sous SQLite : les « enums » sont des `String` documentés + unions TS/Zod (`src/lib/constants.ts`), et les genres sont une vraie relation N–N. Le schéma migre tel quel vers PostgreSQL (changer `provider` + `DATABASE_URL`).

## Modèle de données

`User`, `Session` · `MediaItem` (+ `Movie` / `Series` / `Season` / `Episode`) · `Genre` · `ExternalMapping` · `Rating` · `Review` · `WatchEntry` · `SeriesProgress` · `Tag` · `List` / `ListItem` · `Follow` · `Like` · `Comment` · `Activity` · `ImportSource`.

Voir [`prisma/schema.prisma`](prisma/schema.prisma) — chaque entité est commentée.

## Structure des dossiers

```
src/
├─ app/
│  ├─ (app)/            # shell connecté + pages publiques (header, nav, footer)
│  │  ├─ page.tsx       # landing "/"
│  │  ├─ home/ explore/ search/ journal/ listes/ liste/[id]/
│  │  ├─ film/[id]/  serie/[id]/saison/[n]/episode/[e]/
│  │  ├─ u/[username]/ stats/ parametres/ import/
│  ├─ (auth)/           # login / register (shell dédié)
│  ├─ layout.tsx  globals.css  not-found.tsx
├─ components/
│  ├─ ui/               # design system (Button, Poster, Stars, Modal, Toast…)
│  ├─ layout/  media/  tracking/  social/  lists/  settings/  import/
├─ lib/
│  ├─ auth/             # password, session, current-user
│  ├─ media/            # provider, tmdb, seed, upsert, refs, types, viewer-state
│  ├─ services/         # activity, lists, reviews, feed
│  ├─ validation/       # schémas Zod
│  ├─ constants.ts  db.ts  links.ts  dates.ts  utils.ts
├─ server/actions/      # auth, tracking, social, lists, import
└─ middleware.ts
prisma/  schema.prisma · seed.ts
public/  manifest.webmanifest · sw.js · icon.svg
```

## Démarrage rapide

**Prérequis :** Node 18+ (testé sur Node 25). Aucune base externe à installer.

```bash
# 1. Dépendances (génère aussi le client Prisma)
npm install

# 2. Créer la base SQLite + données de démo
npm run setup        # = prisma generate + db push + seed

# 3. Lancer en développement
npm run dev          # http://localhost:3000
```

C'est tout — l'app tourne **hors-ligne** grâce au catalogue seed intégré (≈15 films, 9 séries avec saisons/épisodes). Le fichier `.env` fourni contient des valeurs de dev prêtes à l'emploi.

## Déploiement Docker sur NAS

Le conteneur écoute en interne sur `3000` et `docker-compose.yml` l'expose sur le port **`3002`** du NAS.

```bash
# 1. Copier l'exemple d'environnement Docker
cp .env.docker.example .env.docker

# 2. Éditer .env.docker
# - AUTH_SECRET : valeur forte avec `openssl rand -base64 32`
# - NEXT_PUBLIC_APP_URL : URL de votre NAS, par exemple http://192.168.1.50:3002
# - TMDB_API_KEY : recommandé pour le catalogue réel

# 3. Construire et lancer
docker compose up -d --build

# 4. Voir les logs
docker compose logs -f jellyboxd
```

La base SQLite est persistée dans `./data/jellyboxd.db` sur le NAS. Au démarrage, le conteneur applique automatiquement le schéma Prisma avec `prisma db push`.

Pour arrêter :

```bash
docker compose down
```

## Comptes de démonstration

Mot de passe pour tous : **`password123`**

| E-mail | Pseudo | Profil |
|---|---|---|
| `alex@jellyboxd.app` | `alex` | Diary fourni, listes, séries en cours |
| `mia@jellyboxd.app` | `mia` | Critiques, drames A24 |
| `theo@jellyboxd.app` | `theo` | SF & animation |

## Activer la vraie data (TMDB)

Le repli seed fonctionne sans clé. Pour brancher le catalogue **réel** (recherche vivante, affiches, casting) :

1. Créez une clé gratuite sur [themoviedb.org](https://www.themoviedb.org/settings/api) (clé v3 **ou** token de lecture v4).
2. Renseignez `TMDB_API_KEY` dans `.env`.
3. Redémarrez : Jellyboxd bascule automatiquement sur `TmdbProvider`.

Aucune autre modification — c'est tout l'intérêt de l'abstraction.

## Préparation Jellyfin

La page **Importer & synchroniser** (`/import`) permet déjà d'enregistrer un serveur (entité `ImportSource` réelle, CRUD fonctionnel). L'intégration complète est préparée mais volontairement non câblée :

- `ExternalMapping (provider, externalId)` : déduplication + clé de synchro
- `ImportSource` : serveur connecté, statut, config
- Pipeline `resolveMediaRef` : point d'entrée unique qu'un importeur Jellyfin réutilisera tel quel
- Il restera à écrire `JellyfinProvider implements MediaProvider` + un worker de synchro (bibliothèque → `MediaItem`, watch state → `WatchEntry`).

## PWA

- `public/manifest.webmanifest` + `public/icon.svg` (installable, splash, thème sombre)
- `public/sw.js` : service worker (navigations *network-first* avec repli cache + shell offline), enregistré **en production uniquement**
- Bottom-nav mobile, zones tactiles, `safe-area`, animations discrètes

## Scripts

```bash
npm run dev         # serveur de dev
npm run build       # build de production (prisma generate + next build)
npm run start       # serveur de production
npm run typecheck   # tsc --noEmit (0 erreur)
npm run db:studio   # Prisma Studio (explorer la base)
npm run db:seed     # (re)seed des données de démo
npm run db:reset    # reset complet + reseed
```

## Qualité

- ✅ `npm run typecheck` : **0 erreur** TypeScript (mode strict, `noUncheckedIndexedAccess`)
- ✅ `npm run build` : **succès**, 18 routes, First Load JS ≈ 102 kB
- États vides soignés, skeleton loaders, toasts, mises à jour optimistes
- Accessibilité : focus visible, `aria-*`, navigation clavier, contrastes AA
- Responsive mobile-first, images en `loading="lazy"`

## Prochaines étapes priorisées

1. **OAuth + e-mail** (vérification, reset mot de passe), rate-limiting des actions auth.
2. **Commentaires & notifications** sur critiques/listes (les tables `Comment`/`Activity` sont prêtes).
3. **`JellyfinProvider` + worker de synchro** (bibliothèque et statut de visionnage).
4. **Infinite scroll** réel sur Explore/Recherche (API route + intersection observer).
5. **Pages dédiées** : critique unique partageable, page liste d'abonnés/abonnements, page genre.
6. **Migration PostgreSQL** + full-text search ; passage des « enums » string en enums natifs.
7. **Tests** : unitaires sur les services (rating sync, upsert, feed) + e2e Playwright sur le parcours auth → log → feed.
8. **Icônes PNG** maskables (192/512) générées depuis `icon.svg` pour un score Lighthouse PWA maximal.

---

<div align="center"><sub>Jellyboxd — un carnet de culture visuelle. Construit avec Next.js, Prisma & Tailwind.</sub></div>
