/**
 * Demo seed — creates a believable little community so the app feels alive on
 * first launch. Re-runnable: media is upserted via the real pipeline, and demo
 * social data for the seeded users is reset each run.
 *
 *   npm run db:seed
 *
 * Demo accounts (password for all: "password123"):
 *   alex@jellyboxd.app · mia@jellyboxd.app · theo@jellyboxd.app
 */
import { db } from "../src/lib/db";
import { hashPassword } from "../src/lib/auth/password";
import { resolveMediaRef } from "../src/lib/media/upsert";
import { episodeExternalId } from "../src/lib/media/refs";
import { getOrCreateWatchlist, uniqueListSlug } from "../src/lib/services/lists";
import { recordActivity } from "../src/lib/services/activity";
import type { ActivityType } from "../src/lib/constants";

const DAY = 24 * 60 * 60 * 1000;
const daysAgo = (n: number) => new Date(Date.now() - n * DAY);

async function upsertUser(email: string, username: string, name: string, bio: string) {
  const passwordHash = await hashPassword("password123");
  return db.user.upsert({
    where: { email },
    update: { name, bio },
    create: { email, username, name, bio, passwordHash },
  });
}

async function resolveMovie(externalId: string) {
  return resolveMediaRef({ provider: "SEED", externalId, kind: "MOVIE" });
}
async function resolveSeries(externalId: string) {
  return resolveMediaRef({ provider: "SEED", externalId, kind: "SERIES" });
}
async function resolveEpisode(seriesId: string, season: number, ep: number) {
  return resolveMediaRef({
    provider: "SEED",
    externalId: episodeExternalId(seriesId, season, ep),
    kind: "EPISODE",
  });
}

async function resetDemoData(userIds: string[]) {
  await db.activity.deleteMany({ where: { actorId: { in: userIds } } });
  await db.watchEntry.deleteMany({ where: { userId: { in: userIds } } });
  await db.review.deleteMany({ where: { userId: { in: userIds } } });
  await db.rating.deleteMany({ where: { userId: { in: userIds } } });
  await db.seriesProgress.deleteMany({ where: { userId: { in: userIds } } });
  await db.follow.deleteMany({ where: { followerId: { in: userIds } } });
  await db.friendship.deleteMany({
    where: { OR: [{ requesterId: { in: userIds } }, { addresseeId: { in: userIds } }] },
  });
  await db.listItem.deleteMany({ where: { list: { userId: { in: userIds } } } });
  await db.list.deleteMany({ where: { userId: { in: userIds }, kind: { not: "WATCHLIST" } } });
}

interface LogOptions {
  rating?: number; // 1..10
  review?: string;
  liked?: boolean;
  rewatch?: boolean;
  daysAgo: number;
  spoilers?: boolean;
  visibility?: string;
}

async function logFilm(userId: string, mediaItemId: string, opts: LogOptions) {
  const when = daysAgo(opts.daysAgo);
  const visibility = opts.visibility ?? "PUBLIC";
  let reviewId: string | undefined;
  let activityType: ActivityType = "LOGGED";

  if (opts.review) {
    const review = await db.review.create({
      data: {
        userId,
        mediaItemId,
        body: opts.review,
        rating: opts.rating ?? null,
        containsSpoilers: opts.spoilers ?? false,
        visibility,
        createdAt: when,
      },
    });
    reviewId = review.id;
    activityType = "REVIEWED";
  } else if (opts.rating) {
    activityType = "RATED";
  }

  const entry = await db.watchEntry.create({
    data: {
      userId,
      mediaItemId,
      watchedOn: when,
      rewatch: opts.rewatch ?? false,
      liked: opts.liked ?? false,
      rating: opts.rating ?? null,
      visibility,
      reviewId,
      createdAt: when,
    },
  });

  if (opts.rating) {
    await db.rating.upsert({
      where: { userId_mediaItemId: { userId, mediaItemId } },
      update: { value: opts.rating, visibility, updatedAt: when },
      create: { userId, mediaItemId, value: opts.rating, visibility, createdAt: when, updatedAt: when },
    });
  }

  await recordActivity({
    actorId: userId,
    type: activityType,
    mediaItemId,
    targetType: reviewId ? "REVIEW" : "WATCH_ENTRY",
    targetId: reviewId ?? entry.id,
    data: { rating: opts.rating ?? null, liked: opts.liked ?? false },
    visibility,
    createdAt: when,
  });

  return entry;
}

async function main() {
  console.log("→ Seeding Jellyboxd…");

  const alex = await upsertUser(
    "alex@jellyboxd.app",
    "alex",
    "Alex Moreau",
    "Cinéphile du dimanche, sérievore le reste de la semaine. Villeneuve > tout.",
  );
  const mia = await upsertUser(
    "mia@jellyboxd.app",
    "mia",
    "Mia Lefèvre",
    "Je note tout, je revois souvent. Drames coréens & A24.",
  );
  const theo = await upsertUser(
    "theo@jellyboxd.app",
    "theo",
    "Théo Garnier",
    "SF, animation, et BO de Hans Zimmer en boucle.",
  );

  await resetDemoData([alex.id, mia.id, theo.id]);

  // Catalogue (materialised via the real upsert pipeline)
  const [dune, oppenheimer, parasite, eeaao, br2049, whiplash, lalaland, pastLives, arrival, portrait] =
    await Promise.all([
      resolveMovie("dune-part-two"),
      resolveMovie("oppenheimer"),
      resolveMovie("parasite"),
      resolveMovie("eeaao"),
      resolveMovie("blade-runner-2049"),
      resolveMovie("whiplash"),
      resolveMovie("la-la-land"),
      resolveMovie("past-lives"),
      resolveMovie("arrival"),
      resolveMovie("portrait-jeune-fille-en-feu"),
    ]);

  const [theBear, succession, severance, breakingBad, arcane] = await Promise.all([
    resolveSeries("the-bear"),
    resolveSeries("succession"),
    resolveSeries("severance"),
    resolveSeries("breaking-bad"),
    resolveSeries("arcane"),
  ]);

  // Friendships (all three demo users are friends so the feed is lively)
  for (const [a, b] of [
    [alex, mia],
    [alex, theo],
    [mia, theo],
  ] as const) {
    await db.friendship.create({
      data: { requesterId: a.id, addresseeId: b.id, status: "ACCEPTED", respondedAt: daysAgo(20) },
    });
  }

  // Alex — diary
  await logFilm(alex.id, dune!, {
    rating: 9,
    liked: true,
    daysAgo: 2,
    review:
      "Un opéra de sable. Villeneuve filme le silence comme personne ; la séquence de l'arène en noir et blanc est gravée à jamais.",
  });
  await logFilm(alex.id, oppenheimer!, { rating: 8, liked: true, daysAgo: 9 });
  await logFilm(alex.id, arrival!, {
    rating: 8,
    rewatch: true,
    daysAgo: 15,
    review: "Troisième vision. Le twist sur le temps frappe encore plus fort quand on connaît la fin.",
  });
  await logFilm(alex.id, br2049!, { rating: 8, daysAgo: 30, visibility: "PRIVATE" });

  // Mia — diary
  await logFilm(mia.id, parasite!, {
    rating: 10,
    liked: true,
    daysAgo: 3,
    review: "La perfection structurelle. Chaque plan est une lutte des classes.",
  });
  await logFilm(mia.id, pastLives!, {
    rating: 9,
    liked: true,
    daysAgo: 6,
    review: "J'ai pleuré dans le métro après. Le in-yun, cette idée du destin tissé… bouleversant.",
  });
  await logFilm(mia.id, portrait!, { rating: 9, liked: true, daysAgo: 12 });
  await logFilm(mia.id, whiplash!, { rating: 8, daysAgo: 18, visibility: "FRIENDS" });

  // Théo — diary
  await logFilm(theo.id, eeaao!, {
    rating: 9,
    liked: true,
    daysAgo: 1,
    review: "Le chaos a rarement été aussi tendre. Ke Huy Quan, retour de l'année.",
  });
  await logFilm(theo.id, lalaland!, { rating: 7, daysAgo: 8 });
  await logFilm(theo.id, dune!, { rating: 10, liked: true, daysAgo: 4 });

  // Series progress + a couple of series ratings
  await db.seriesProgress.create({
    data: { userId: alex.id, seriesId: (await db.series.findFirstOrThrow({ where: { mediaItem: { id: theBear! } } })).id, status: "WATCHING", startedAt: daysAgo(40) },
  });
  await db.seriesProgress.create({
    data: { userId: alex.id, seriesId: (await db.series.findFirstOrThrow({ where: { mediaItem: { id: breakingBad! } } })).id, status: "COMPLETED", startedAt: daysAgo(200), completedAt: daysAgo(60) },
  });
  await db.seriesProgress.create({
    data: { userId: mia.id, seriesId: (await db.series.findFirstOrThrow({ where: { mediaItem: { id: severance! } } })).id, status: "WATCHING", startedAt: daysAgo(25) },
  });

  // Alex marks The Bear S1 episodes 1–8 as watched (episode-level tracking demo)
  for (let ep = 1; ep <= 8; ep++) {
    const epId = await resolveEpisode("the-bear", 1, ep);
    if (epId) {
      const when = daysAgo(40 - ep);
      await db.watchEntry.create({
        data: { userId: alex.id, mediaItemId: epId, watchedOn: when, createdAt: when },
      });
    }
  }
  await recordActivity({ actorId: alex.id, type: "EPISODE_WATCHED", mediaItemId: theBear, data: { season: 1, episode: 8 }, createdAt: daysAgo(32) });

  // Series ratings + activity
  await db.rating.create({ data: { userId: alex.id, mediaItemId: breakingBad!, value: 10 } });
  await db.rating.create({ data: { userId: alex.id, mediaItemId: theBear!, value: 9 } });
  await recordActivity({ actorId: alex.id, type: "RATED", mediaItemId: breakingBad, data: { rating: 10 }, createdAt: daysAgo(60) });

  // Watchlists
  const alexWatchlist = await getOrCreateWatchlist(alex.id);
  for (const [i, mediaItemId] of [succession, severance, arcane].entries()) {
    if (mediaItemId)
      await db.listItem.create({
        data: { listId: alexWatchlist.id, mediaItemId, position: i },
      });
  }

  // A curated public list by Alex
  const slug = await uniqueListSlug(alex.id, "Le canon science-fiction");
  const canon = await db.list.create({
    data: {
      userId: alex.id,
      title: "Le canon science-fiction",
      slug,
      description: "Les films qui m'ont fait aimer le genre. Mis à jour au gré des (re)visions.",
      kind: "CUSTOM",
      isRanked: true,
      isPublic: true,
      createdAt: daysAgo(22),
      updatedAt: daysAgo(5),
    },
  });
  for (const [i, mediaItemId] of [dune, br2049, arrival, eeaao].entries()) {
    if (mediaItemId)
      await db.listItem.create({ data: { listId: canon.id, mediaItemId, position: i } });
  }
  await recordActivity({
    actorId: alex.id,
    type: "LIST_CREATED",
    targetType: "LIST",
    targetId: canon.id,
    data: { title: canon.title },
    createdAt: daysAgo(22),
  });

  const counts = {
    users: await db.user.count(),
    media: await db.mediaItem.count(),
    watchEntries: await db.watchEntry.count(),
    reviews: await db.review.count(),
    activities: await db.activity.count(),
  };
  console.log("✓ Seed terminé:", counts);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
