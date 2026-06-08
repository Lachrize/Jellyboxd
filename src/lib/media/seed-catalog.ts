/**
 * Bundled offline catalogue used when no TMDB key is configured.
 * Real titles & metadata; posters intentionally omitted so the app renders the
 * editorial typographic poster fallback (fully offline, on-brand).
 */

export interface SeedMovie {
  externalId: string;
  title: string;
  year: number;
  releaseDate: string;
  runtime: number;
  tagline?: string;
  overview: string;
  director: string;
  genres: string[];
  cast: string[];
  voteAverage: number;
  popularity: number;
  originalLanguage: string;
}

export interface SeedSeason {
  seasonNumber: number;
  name: string;
  episodeCount: number;
  airDate: string | null;
  overview?: string;
}

export interface SeedSeries {
  externalId: string;
  title: string;
  firstAirYear: number;
  lastAirYear: number | null;
  status: "RETURNING" | "ENDED" | "CANCELED";
  network: string;
  numberOfSeasons: number;
  numberOfEpisodes: number;
  episodeRuntime: number;
  tagline?: string;
  overview: string;
  genres: string[];
  cast: string[];
  voteAverage: number;
  popularity: number;
  originalLanguage: string;
  seasons: SeedSeason[];
}

export const SEED_MOVIES: SeedMovie[] = [
  {
    externalId: "dune-part-two",
    title: "Dune : Deuxième partie",
    year: 2024,
    releaseDate: "2024-02-28",
    runtime: 166,
    tagline: "Longue vie aux combattants.",
    overview:
      "Paul Atreides s'unit aux Fremen pour mener la révolte contre ceux qui ont décimé sa famille, déchiré entre l'amour et le destin de l'univers.",
    director: "Denis Villeneuve",
    genres: ["Science-fiction", "Aventure"],
    cast: ["Timothée Chalamet", "Zendaya", "Rebecca Ferguson", "Javier Bardem"],
    voteAverage: 8.3,
    popularity: 980,
    originalLanguage: "en",
  },
  {
    externalId: "oppenheimer",
    title: "Oppenheimer",
    year: 2023,
    releaseDate: "2023-07-19",
    runtime: 181,
    tagline: "Le monde change à jamais.",
    overview:
      "L'histoire de J. Robert Oppenheimer et de son rôle dans la conception de la bombe atomique pendant la Seconde Guerre mondiale.",
    director: "Christopher Nolan",
    genres: ["Drame", "Histoire"],
    cast: ["Cillian Murphy", "Emily Blunt", "Robert Downey Jr.", "Matt Damon"],
    voteAverage: 8.1,
    popularity: 920,
    originalLanguage: "en",
  },
  {
    externalId: "parasite",
    title: "Parasite",
    year: 2019,
    releaseDate: "2019-05-30",
    runtime: 132,
    tagline: "Agis avant qu'il ne soit trop tard.",
    overview:
      "Toute la famille de Ki-taek est au chômage. Une opportunité les conduit chez les riches Park, jusqu'à un incident incontrôlable.",
    director: "Bong Joon-ho",
    genres: ["Thriller", "Drame", "Comédie"],
    cast: ["Song Kang-ho", "Lee Sun-kyun", "Cho Yeo-jeong", "Choi Woo-shik"],
    voteAverage: 8.5,
    popularity: 760,
    originalLanguage: "ko",
  },
  {
    externalId: "eeaao",
    title: "Everything Everywhere All at Once",
    year: 2022,
    releaseDate: "2022-03-25",
    runtime: 139,
    tagline: "Le multivers est en jeu.",
    overview:
      "Une gérante de laverie chinoise-américaine est entraînée dans une aventure folle où elle seule peut sauver le multivers en explorant d'autres versions d'elle-même.",
    director: "Daniels",
    genres: ["Science-fiction", "Aventure", "Comédie"],
    cast: ["Michelle Yeoh", "Stephanie Hsu", "Ke Huy Quan", "Jamie Lee Curtis"],
    voteAverage: 7.8,
    popularity: 700,
    originalLanguage: "en",
  },
  {
    externalId: "blade-runner-2049",
    title: "Blade Runner 2049",
    year: 2017,
    releaseDate: "2017-10-04",
    runtime: 164,
    tagline: "La clé du futur est enfin révélée.",
    overview:
      "Trente ans après les événements du premier film, un nouveau blade runner exhume un secret enfoui susceptible de plonger la société dans le chaos.",
    director: "Denis Villeneuve",
    genres: ["Science-fiction", "Mystère"],
    cast: ["Ryan Gosling", "Harrison Ford", "Ana de Armas", "Sylvia Hoeks"],
    voteAverage: 7.6,
    popularity: 560,
    originalLanguage: "en",
  },
  {
    externalId: "grand-budapest-hotel",
    title: "The Grand Budapest Hotel",
    year: 2014,
    releaseDate: "2014-03-07",
    runtime: 99,
    overview:
      "Les aventures de Gustave H., légendaire concierge d'un grand hôtel européen, et de Zéro, le garçon d'étage qui devient son plus fidèle ami.",
    director: "Wes Anderson",
    genres: ["Comédie", "Aventure"],
    cast: ["Ralph Fiennes", "Tony Revolori", "Saoirse Ronan", "Adrien Brody"],
    voteAverage: 8.0,
    popularity: 520,
    originalLanguage: "en",
  },
  {
    externalId: "whiplash",
    title: "Whiplash",
    year: 2014,
    releaseDate: "2014-10-10",
    runtime: 106,
    tagline: "La grandeur a un prix.",
    overview:
      "Un jeune batteur de jazz ambitieux se heurte à un professeur tyrannique prêt à tout pour révéler le génie qui sommeille en lui.",
    director: "Damien Chazelle",
    genres: ["Drame", "Musique"],
    cast: ["Miles Teller", "J.K. Simmons", "Paul Reiser", "Melissa Benoist"],
    voteAverage: 8.4,
    popularity: 540,
    originalLanguage: "en",
  },
  {
    externalId: "mad-max-fury-road",
    title: "Mad Max: Fury Road",
    year: 2015,
    releaseDate: "2015-05-13",
    runtime: 120,
    tagline: "Que la course commence.",
    overview:
      "Dans un désert post-apocalyptique, Max s'allie à Furiosa pour fuir un tyran à la tête d'une horde lancée à leurs trousses.",
    director: "George Miller",
    genres: ["Action", "Science-fiction", "Aventure"],
    cast: ["Tom Hardy", "Charlize Theron", "Nicholas Hoult", "Hugh Keays-Byrne"],
    voteAverage: 7.6,
    popularity: 500,
    originalLanguage: "en",
  },
  {
    externalId: "la-la-land",
    title: "La La Land",
    year: 2016,
    releaseDate: "2016-11-29",
    runtime: 128,
    tagline: "Voici venu le temps des rêveurs.",
    overview:
      "À Los Angeles, une apprentie comédienne et un pianiste de jazz tombent amoureux tout en poursuivant leurs rêves respectifs.",
    director: "Damien Chazelle",
    genres: ["Romance", "Musique", "Drame"],
    cast: ["Ryan Gosling", "Emma Stone", "John Legend", "Rosemarie DeWitt"],
    voteAverage: 7.9,
    popularity: 480,
    originalLanguage: "en",
  },
  {
    externalId: "past-lives",
    title: "Past Lives — Nos vies d'avant",
    year: 2023,
    releaseDate: "2023-06-23",
    runtime: 105,
    overview:
      "Deux amis d'enfance coréens se retrouvent à New York vingt ans plus tard, le temps d'une semaine qui interroge le destin et les choix d'une vie.",
    director: "Celine Song",
    genres: ["Romance", "Drame"],
    cast: ["Greta Lee", "Teo Yoo", "John Magaro"],
    voteAverage: 7.8,
    popularity: 430,
    originalLanguage: "en",
  },
  {
    externalId: "spider-verse-2",
    title: "Spider-Man : Across the Spider-Verse",
    year: 2023,
    releaseDate: "2023-05-31",
    runtime: 140,
    tagline: "Tout est lié.",
    overview:
      "Miles Morales traverse le multivers et rencontre une société d'Araignées, jusqu'à s'opposer à eux sur la façon de gérer une nouvelle menace.",
    director: "Joaquim Dos Santos",
    genres: ["Animation", "Action", "Aventure"],
    cast: ["Shameik Moore", "Hailee Steinfeld", "Oscar Isaac", "Jake Johnson"],
    voteAverage: 8.4,
    popularity: 690,
    originalLanguage: "en",
  },
  {
    externalId: "anatomie-dune-chute",
    title: "Anatomie d'une chute",
    year: 2023,
    releaseDate: "2023-08-23",
    runtime: 151,
    overview:
      "Une écrivaine est soupçonnée du meurtre de son mari, retrouvé mort au pied de leur chalet. Leur fils malvoyant devient le témoin clé du procès.",
    director: "Justine Triet",
    genres: ["Thriller", "Drame", "Mystère"],
    cast: ["Sandra Hüller", "Swann Arlaud", "Milo Machado-Graner"],
    voteAverage: 7.7,
    popularity: 410,
    originalLanguage: "fr",
  },
  {
    externalId: "portrait-jeune-fille-en-feu",
    title: "Portrait de la jeune fille en feu",
    year: 2019,
    releaseDate: "2019-09-18",
    runtime: 122,
    overview:
      "En 1770, une peintre est engagée pour réaliser en secret le portrait de mariage d'une jeune femme. Une passion naît au fil des regards.",
    director: "Céline Sciamma",
    genres: ["Romance", "Drame", "Histoire"],
    cast: ["Noémie Merlant", "Adèle Haenel", "Luàna Bajrami"],
    voteAverage: 8.1,
    popularity: 360,
    originalLanguage: "fr",
  },
  {
    externalId: "arrival",
    title: "Premier contact",
    year: 2016,
    releaseDate: "2016-11-11",
    runtime: 116,
    tagline: "Pourquoi sont-ils là ?",
    overview:
      "Une linguiste est recrutée par l'armée pour communiquer avec des extraterrestres dont les vaisseaux sont apparus aux quatre coins du globe.",
    director: "Denis Villeneuve",
    genres: ["Science-fiction", "Drame", "Mystère"],
    cast: ["Amy Adams", "Jeremy Renner", "Forest Whitaker"],
    voteAverage: 7.6,
    popularity: 450,
    originalLanguage: "en",
  },
  {
    externalId: "the-social-network",
    title: "The Social Network",
    year: 2010,
    releaseDate: "2010-10-01",
    runtime: 120,
    tagline: "On ne se fait pas 500 millions d'amis sans se faire quelques ennemis.",
    overview:
      "L'ascension fulgurante de Mark Zuckerberg et la création de Facebook, sur fond de trahisons et de batailles juridiques.",
    director: "David Fincher",
    genres: ["Drame", "Histoire"],
    cast: ["Jesse Eisenberg", "Andrew Garfield", "Justin Timberlake", "Armie Hammer"],
    voteAverage: 7.4,
    popularity: 390,
    originalLanguage: "en",
  },
];

export const SEED_SERIES: SeedSeries[] = [
  {
    externalId: "the-bear",
    title: "The Bear",
    firstAirYear: 2022,
    lastAirYear: null,
    status: "RETURNING",
    network: "FX",
    numberOfSeasons: 3,
    numberOfEpisodes: 28,
    episodeRuntime: 32,
    tagline: "Oui, chef.",
    overview:
      "Un jeune chef étoilé revient à Chicago gérer le sandwicherie familiale après un drame, et tente d'en transformer le chaos en excellence.",
    genres: ["Comédie", "Drame"],
    cast: ["Jeremy Allen White", "Ayo Edebiri", "Ebon Moss-Bachrach"],
    voteAverage: 8.4,
    popularity: 870,
    originalLanguage: "en",
    seasons: [
      { seasonNumber: 1, name: "Saison 1", episodeCount: 8, airDate: "2022-06-23" },
      { seasonNumber: 2, name: "Saison 2", episodeCount: 10, airDate: "2023-06-22" },
      { seasonNumber: 3, name: "Saison 3", episodeCount: 10, airDate: "2024-06-27" },
    ],
  },
  {
    externalId: "succession",
    title: "Succession",
    firstAirYear: 2018,
    lastAirYear: 2023,
    status: "ENDED",
    network: "HBO",
    numberOfSeasons: 4,
    numberOfEpisodes: 39,
    episodeRuntime: 60,
    tagline: "Tout reste dans la famille.",
    overview:
      "La famille Roy, propriétaire d'un empire médiatique, se déchire pour le contrôle du groupe alors que la santé du patriarche décline.",
    genres: ["Drame"],
    cast: ["Brian Cox", "Jeremy Strong", "Sarah Snook", "Kieran Culkin"],
    voteAverage: 8.6,
    popularity: 640,
    originalLanguage: "en",
    seasons: [
      { seasonNumber: 1, name: "Saison 1", episodeCount: 10, airDate: "2018-06-03" },
      { seasonNumber: 2, name: "Saison 2", episodeCount: 10, airDate: "2019-08-11" },
      { seasonNumber: 3, name: "Saison 3", episodeCount: 9, airDate: "2021-10-17" },
      { seasonNumber: 4, name: "Saison 4", episodeCount: 10, airDate: "2023-03-26" },
    ],
  },
  {
    externalId: "severance",
    title: "Severance",
    firstAirYear: 2022,
    lastAirYear: null,
    status: "RETURNING",
    network: "Apple TV+",
    numberOfSeasons: 2,
    numberOfEpisodes: 19,
    episodeRuntime: 50,
    tagline: "Travail et vie, enfin séparés.",
    overview:
      "Des employés acceptent une procédure qui scinde leurs souvenirs entre travail et vie privée — jusqu'à ce que la frontière se fissure.",
    genres: ["Science-fiction", "Thriller", "Mystère"],
    cast: ["Adam Scott", "Britt Lower", "Patricia Arquette", "John Turturro"],
    voteAverage: 8.4,
    popularity: 810,
    originalLanguage: "en",
    seasons: [
      { seasonNumber: 1, name: "Saison 1", episodeCount: 9, airDate: "2022-02-18" },
      { seasonNumber: 2, name: "Saison 2", episodeCount: 10, airDate: "2025-01-17" },
    ],
  },
  {
    externalId: "breaking-bad",
    title: "Breaking Bad",
    firstAirYear: 2008,
    lastAirYear: 2013,
    status: "ENDED",
    network: "AMC",
    numberOfSeasons: 5,
    numberOfEpisodes: 62,
    episodeRuntime: 47,
    tagline: "La chimie, c'est la vie.",
    overview:
      "Un professeur de chimie atteint d'un cancer se lance dans la fabrication de méthamphétamine pour assurer l'avenir de sa famille.",
    genres: ["Drame", "Crime", "Thriller"],
    cast: ["Bryan Cranston", "Aaron Paul", "Anna Gunn", "Giancarlo Esposito"],
    voteAverage: 8.9,
    popularity: 750,
    originalLanguage: "en",
    seasons: [
      { seasonNumber: 1, name: "Saison 1", episodeCount: 7, airDate: "2008-01-20" },
      { seasonNumber: 2, name: "Saison 2", episodeCount: 13, airDate: "2009-03-08" },
      { seasonNumber: 3, name: "Saison 3", episodeCount: 13, airDate: "2010-03-21" },
      { seasonNumber: 4, name: "Saison 4", episodeCount: 13, airDate: "2011-07-17" },
      { seasonNumber: 5, name: "Saison 5", episodeCount: 16, airDate: "2012-07-15" },
    ],
  },
  {
    externalId: "the-last-of-us",
    title: "The Last of Us",
    firstAirYear: 2023,
    lastAirYear: null,
    status: "RETURNING",
    network: "HBO",
    numberOfSeasons: 1,
    numberOfEpisodes: 9,
    episodeRuntime: 55,
    tagline: "Cherchez la lumière.",
    overview:
      "Vingt ans après l'effondrement de la civilisation, un contrebandier doit escorter une adolescente immunisée à travers une Amérique ravagée.",
    genres: ["Drame", "Science-fiction", "Action"],
    cast: ["Pedro Pascal", "Bella Ramsey", "Anna Torv"],
    voteAverage: 8.5,
    popularity: 700,
    originalLanguage: "en",
    seasons: [{ seasonNumber: 1, name: "Saison 1", episodeCount: 9, airDate: "2023-01-15" }],
  },
  {
    externalId: "chernobyl",
    title: "Chernobyl",
    firstAirYear: 2019,
    lastAirYear: 2019,
    status: "ENDED",
    network: "HBO",
    numberOfSeasons: 1,
    numberOfEpisodes: 5,
    episodeRuntime: 65,
    tagline: "Quel est le prix des mensonges ?",
    overview:
      "La reconstitution de la catastrophe nucléaire de 1986 et du sacrifice de ceux qui ont tenté d'en limiter les conséquences.",
    genres: ["Drame", "Histoire"],
    cast: ["Jared Harris", "Stellan Skarsgård", "Emily Watson"],
    voteAverage: 8.9,
    popularity: 520,
    originalLanguage: "en",
    seasons: [{ seasonNumber: 1, name: "Mini-série", episodeCount: 5, airDate: "2019-05-06" }],
  },
  {
    externalId: "arcane",
    title: "Arcane",
    firstAirYear: 2021,
    lastAirYear: 2024,
    status: "ENDED",
    network: "Netflix",
    numberOfSeasons: 2,
    numberOfEpisodes: 18,
    episodeRuntime: 40,
    tagline: "Dans le partage du pouvoir, il y a toujours un perdant.",
    overview:
      "Dans les cités jumelles de Piltover et Zaun, deux sœurs se retrouvent dans des camps opposés alors qu'une technologie magique bouleverse l'ordre établi.",
    genres: ["Animation", "Science-fiction", "Action", "Drame"],
    cast: ["Hailee Steinfeld", "Ella Purnell", "Kevin Alejandro"],
    voteAverage: 8.7,
    popularity: 680,
    originalLanguage: "en",
    seasons: [
      { seasonNumber: 1, name: "Saison 1", episodeCount: 9, airDate: "2021-11-06" },
      { seasonNumber: 2, name: "Saison 2", episodeCount: 9, airDate: "2024-11-09" },
    ],
  },
  {
    externalId: "fleabag",
    title: "Fleabag",
    firstAirYear: 2016,
    lastAirYear: 2019,
    status: "ENDED",
    network: "BBC Three",
    numberOfSeasons: 2,
    numberOfEpisodes: 12,
    episodeRuntime: 27,
    overview:
      "À Londres, une jeune femme au franc-parler navigue le deuil, le sexe et la famille en prenant le spectateur à témoin de ses pensées.",
    genres: ["Comédie", "Drame"],
    cast: ["Phoebe Waller-Bridge", "Sian Clifford", "Andrew Scott"],
    voteAverage: 8.4,
    popularity: 410,
    originalLanguage: "en",
    seasons: [
      { seasonNumber: 1, name: "Saison 1", episodeCount: 6, airDate: "2016-07-21" },
      { seasonNumber: 2, name: "Saison 2", episodeCount: 6, airDate: "2019-03-04" },
    ],
  },
  {
    externalId: "dark",
    title: "Dark",
    firstAirYear: 2017,
    lastAirYear: 2020,
    status: "ENDED",
    network: "Netflix",
    numberOfSeasons: 3,
    numberOfEpisodes: 26,
    episodeRuntime: 55,
    tagline: "Le commencement est la fin, et la fin est le commencement.",
    overview:
      "La disparition d'enfants dans une petite ville allemande révèle les secrets de quatre familles et une faille temporelle vertigineuse.",
    genres: ["Science-fiction", "Thriller", "Mystère", "Drame"],
    cast: ["Louis Hofmann", "Lisa Vicari", "Oliver Masucci"],
    voteAverage: 8.4,
    popularity: 470,
    originalLanguage: "de",
    seasons: [
      { seasonNumber: 1, name: "Saison 1", episodeCount: 10, airDate: "2017-12-01" },
      { seasonNumber: 2, name: "Saison 2", episodeCount: 8, airDate: "2019-06-21" },
      { seasonNumber: 3, name: "Saison 3", episodeCount: 8, airDate: "2020-06-27" },
    ],
  },
];

/** All distinct genres in the seed catalogue, for the explore filters. */
export const SEED_GENRES: string[] = Array.from(
  new Set([...SEED_MOVIES.flatMap((m) => m.genres), ...SEED_SERIES.flatMap((s) => s.genres)]),
).sort();
