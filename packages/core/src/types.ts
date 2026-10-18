/**
 * Domain model for MoodReel.
 *
 * Every film is described by a "mood profile": ten dimensions scored 0–10.
 * Queries express wishes about those same dimensions, which keeps scoring,
 * explanations and the natural-language parser speaking one language.
 */

export const DIMS = [
  'fear',
  'tension',
  'mindbend',
  'humor',
  'romance',
  'action',
  'sadness',
  'darkness',
  'wonder',
  'pace',
] as const;

export type Dim = (typeof DIMS)[number];

export type MoodProfile = Record<Dim, number>;

export const GENRES = [
  'horror',
  'thriller',
  'mystery',
  'scifi',
  'fantasy',
  'drama',
  'comedy',
  'romance',
  'action',
  'adventure',
  'crime',
  'animation',
  'war',
  'musical',
] as const;

export type Genre = (typeof GENRES)[number];

/**
 * How a film ends, described without spoiling it.
 * - happy: the characters get what they need
 * - bittersweet: a win that costs something
 * - open: ambiguous, left for you to decide
 * - sad: a loss that lands hard
 * - bleak: the darkness wins
 */
export const ENDINGS = ['happy', 'bittersweet', 'open', 'sad', 'bleak'] as const;
export type Ending = (typeof ENDINGS)[number];

/** Recommended minimum age, roughly following local cinema ratings. */
export type AgeRating = 0 | 12 | 16 | 18;

export interface ContentFlags {
  /** Graphic blood, body horror or gore. */
  gore: boolean;
  /** Sudden loud scares. */
  jumpscares: boolean;
  /** A pet or another animal dies on screen or as a plot point. */
  animalDeath: boolean;
}

export interface Movie {
  id: string;
  title: string;
  /** Local or alternative titles the parser should recognise. */
  aliases?: string[];
  year: number;
  /** Minutes. */
  runtime: number;
  director: string;
  country: string;
  language: string;
  genres: Genre[];
  tags: string[];
  profile: MoodProfile;
  ending: Ending;
  flags: ContentFlags;
  age: AgeRating;
  /** Spoiler-free pitch in Bulgarian. */
  blurb: string;
  /** Three colours used to paint the generated poster. */
  palette: [string, string, string];
}

/** A wish about a single dimension. All values are on the 0–10 scale. */
export interface DimConstraint {
  target: number;
  /** Distance from the target that still counts as a perfect fit. */
  tolerance?: number;
  min?: number;
  max?: number;
  /** Relative importance, 1 by default. */
  weight?: number;
}

export interface Dealbreakers {
  /** Drop sad and bleak endings. */
  noSadEnding?: boolean;
  /** Keep only happy endings. */
  happyOnly?: boolean;
  noGore?: boolean;
  noJumpscares?: boolean;
  noAnimalDeath?: boolean;
  /** Only films suitable for everyone. */
  familyFriendly?: boolean;
  maxRuntime?: number;
  minRuntime?: number;
  minYear?: number;
  maxYear?: number;
  animation?: 'only' | 'exclude';
}

export interface MoodQuery {
  dims: Partial<Record<Dim, DimConstraint>>;
  /** Reference films ("something like Black Swan"). */
  like: string[];
  genres: { include: Genre[]; exclude: Genre[] };
  dealbreakers: Dealbreakers;
  /** Films the user has already seen or rejected. */
  exclude: string[];
  /** Themes that should be present ("twist", "heist"). Soft preference. */
  tags?: string[];
  /** Films matched by a free-text keyword ("shark"). Soft preference. */
  boostIds?: string[];
}

export type ExclusionReason =
  | 'sadEnding'
  | 'notHappy'
  | 'gore'
  | 'jumpscares'
  | 'animalDeath'
  | 'family'
  | 'tooLong'
  | 'tooShort'
  | 'tooOld'
  | 'tooNew'
  | 'animation'
  | 'notAnimation'
  | 'genre'
  | 'seen'
  | 'reference';

export type ReasonTone = 'good' | 'neutral' | 'warn';

export interface Reason {
  kind: 'dim' | 'like' | 'genre' | 'dealbreaker' | 'community';
  tone: ReasonTone;
  text: string;
  dim?: Dim;
}

/** What the client needs to draw a film without the full catalog entry. */
export type MovieSummary = Omit<Movie, 'aliases'>;

export interface Recommendation {
  movie: MovieSummary;
  /** 0–100. */
  score: number;
  reasons: Reason[];
}

export interface PoolReport {
  total: number;
  remaining: number;
  /** Count per reason; a film is attributed to the first rule that dropped it. */
  byReason: Partial<Record<ExclusionReason, number>>;
  /** movieId → reason. */
  excluded: Record<string, ExclusionReason>;
}

export interface RecommendResult {
  results: Recommendation[];
  pool: PoolReport;
  /** False when only filters are set: every film fits equally and the order is a shuffle. */
  ranked: boolean;
}
