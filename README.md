<div align="center">

# Jellyboxd

**Le carnet de tout ce que vous regardez.**
PWA sociale de tracking, notation et critique — films **et** séries, nativement.

</div>

---

Jellyboxd est un « Letterboxd pour tout » : un journal de visionnage premium où les **séries sont des citoyennes de première classe** (progression saison/épisode, statuts *en cours / en pause / terminée / abandonnée*) au même titre que les films. Le produit est pensé autour de **sources média interchangeables** — TMDB aujourd'hui, **Jellyfin demain** — sans dette d'architecture.

> Ce dépôt contient une V1 « cœur en profondeur » : un vrai backend (auth par sessions, base de données branchée, CRUD complet), un design system éditorial, et toutes les pages principales. **La synchronisation Jellyfin ↔ Jellyboxd (notes / vu / favoris, dans les deux sens) est opérationnelle** via un plugin Jellyfin.

## ⚡ Démarrage en 2 étapes

```bash
# 1. Lancer Jellyboxd (rien à configurer : les secrets sont auto-générés)
docker compose up -d --build
```

Jellyboxd tourne sur **http://localhost:3002**. Ouvre-le, crée ton compte admin, puis connecte ton serveur Jellyfin.

```
# 2. Synchroniser avec Jellyfin (notes/vu/favoris dans les deux sens)
#    → installe le plugin "Jellyboxd Sync" dans Jellyfin et colle la clé
#    affichée dans Jellyboxd → Paramètres → Synchronisation Jellyfin.
```

Plugin : https://github.com/Lachrize/jellyfin-plugin-jellyboxd — détails dans [Synchronisation Jellyfin](#synchronisation-jellyfin-plugin).

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
- [Synchronisation Jellyfin](#synchronisation-jellyfin-plugin)
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

## Déploiement Docker

Le conteneur écoute en interne sur `3000` et `docker-compose.yml` l'expose sur le port **`3002`** de l'hôte.

```bash
docker compose up -d --build      # c'est tout
docker compose logs -f jellyboxd  # (optionnel) suivre les logs
```

**Aucune configuration requise.** Au premier démarrage, le conteneur :

- génère et persiste les secrets `AUTH_SECRET` et `JELLYBOXD_SYNC_KEY` (dans le volume `./data`, stables entre redémarrages) ;
- applique le schéma Prisma (`prisma db push`) ;
- affiche la **clé de synchronisation** dans les logs (tu la retrouveras aussi dans l'app, voir [Synchronisation Jellyfin](#synchronisation-jellyfin-plugin)).

Jellyboxd est alors disponible sur **http://localhost:3002**. La base SQLite vit dans `./data/jellyboxd.db`.

**Optionnel** — pour personnaliser, copie `.env.docker.example` → `.env.docker` et règle ce que tu veux (`TMDB_API_KEY` pour le vrai catalogue, `NEXT_PUBLIC_APP_URL` si tu n'es pas sur `localhost`, ou pour figer tes propres secrets). Le fichier n'est pas obligatoire.

Pour arrêter : `docker compose down`.

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

## Synchronisation Jellyfin (plugin)

Jellyboxd synchronise **notes, vu et favoris dans les deux sens** avec Jellyfin, pour **tous les utilisateurs** (chacun sur son propre compte), via le plugin [**Jellyboxd Sync**](https://github.com/Lachrize/jellyfin-plugin-jellyboxd).

**Comment ça marche** — le plugin (côté Jellyfin) interroge l'app via une clé partagée et route chaque changement par `jellyfinUserId` :

- Jellyfin → Jellyboxd : le plugin pousse les changements en temps réel (`POST /api/sync/event`).
- Jellyboxd → Jellyfin : l'app met les changements dans une file (`PendingSync`) que le plugin récupère toutes les ~3 s (`GET/POST /api/sync/pending`) et applique au bon utilisateur.
- Films & séries entières : vu + note + favori. Saisons & épisodes : vu.

**Mise en place (admin, une fois) :**

1. Connecte ton serveur Jellyfin dans **Jellyboxd → Paramètres → Jellyfin** (URL + clé API Jellyfin). Cela crée/relie automatiquement un compte Jellyboxd pour chaque utilisateur Jellyfin.
   - ⚠️ Si Jellyboxd tourne en Docker et Jellyfin sur l'hôte, utilise `http://host.docker.internal:8096` (pas `localhost`).
2. Installe le plugin **Jellyboxd Sync** dans Jellyfin (voir le [README du plugin](https://github.com/Lachrize/jellyfin-plugin-jellyboxd)).
3. Dans la config du plugin : renseigne l'**URL Jellyboxd**, colle la **clé de synchronisation** (affichée dans **Paramètres → Synchronisation Jellyfin**), et **laisse « Jellyfin username » vide** (= tous les comptes).

C'est tout : tout le monde peut noter depuis Jellyfin **ou** Jellyboxd, sans configuration individuelle.

> La clé `JELLYBOXD_SYNC_KEY` est auto-générée par le conteneur ; elle s'affiche pour l'admin dans Paramètres (et dans les logs Docker au démarrage).

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
