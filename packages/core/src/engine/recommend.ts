import { DIM_META, EXCLUSION_LABEL, GENRE_LABEL, tagLabel } from '../labels';
import { clamp } from '../math';
import { toSummary } from '../summary';
import { DIMS } from '../types';
import type {
  Dim,
  DimConstraint,
  ExclusionReason,
  Genre,
  Movie,
  MoodQuery,
  MovieSummary,
  PoolReport,
  Reason,
  Recommendation,
  RecommendResult,
} from '../types';
import { exclusionReason } from './filter';
import { movieSimilarity, sharedThemes, similarityToRefs, type RefMatch } from './similarity';

export interface CommunitySignal {
  /** -1…1, from the share of "I'll watch it" vs "skip" verdicts. */
  boost: number;
  /** How many times people accepted this film. */
  picks: number;
}

export interface RecommendOptions {
  limit?: number;
  /** MMR trade-off: 1 = pure relevance, 0 = pure variety. */
  relevance?: number;
  community?: Readonly<Record<string, CommunitySignal>>;
  /** Breaks ties in a different order on every shuffle instead of alphabetically. */
  seed?: number;
}

/**
 * Where each dimension is the point of the film rather than a side effect.
 * "Scary but not too much" should surface gentle horror, not a war film that
 * happens to score 4 on fear.
 */
const DIM_GENRES: Partial<Record<Dim, Genre[]>> = {
  fear: ['horror', 'thriller'],
  humor: ['comedy'],
  romance: ['romance'],
  action: ['action', 'adventure', 'war'],
  mindbend: ['mystery', 'thriller', 'scifi'],
  sadness: ['drama', 'war'],
  wonder: ['fantasy', 'scifi', 'animation', 'adventure'],
  tension: ['thriller', 'crime', 'horror', 'action'],
};

interface DimFit {
  dim: Dim;
  value: number;
  constraint: DimConstraint;
  fit: number;
}

interface Scored {
  movie: MovieSummary;
  score: number;
  dims: DimFit[];
  ref: { score: number; best: RefMatch | null } | null;
  genreHit: boolean | null;
  tagHits: string[];
  keywordHit: boolean | null;
}

const DIM_SIGMA = 2;
const OUT_OF_RANGE_DECAY = 0.9;

/** How well one value satisfies one wish, 0–1. Inside tolerance is perfect; past min/max it decays fast. */
export function dimFit(value: number, c: DimConstraint): number {
  const tolerance = c.tolerance ?? 1;
  const distance = Math.max(0, Math.abs(value - c.target) - tolerance);
  let fit = Math.exp(-(distance * distance) / (2 * DIM_SIGMA * DIM_SIGMA));
  if (c.min !== undefined && value < c.min) fit *= Math.exp(-(c.min - value) * OUT_OF_RANGE_DECAY);
  if (c.max !== undefined && value > c.max) fit *= Math.exp(-(value - c.max) * OUT_OF_RANGE_DECAY);
  return fit;
}

/** Weighted geometric mean: one badly missed wish drags the whole score down, as it should. */
function geometricMean(parts: ReadonlyArray<readonly [value: number, weight: number]>): number {
  let num = 0;
  let den = 0;
  for (const [value, weight] of parts) {
    num += weight * Math.log(Math.max(value, 1e-4));
    den += weight;
  }
  return den === 0 ? 0.7 : Math.exp(num / den);
}

function scoreMovie(movie: MovieSummary, query: MoodQuery, refs: readonly MovieSummary[], community?: CommunitySignal): Scored {
  const parts: Array<readonly [number, number]> = [];

  const dims: DimFit[] = [];
  for (const dim of DIMS) {
    const constraint = query.dims[dim];
    if (!constraint) continue;
    const value = movie.profile[dim];
    dims.push({ dim, value, constraint, fit: dimFit(value, constraint) });
  }
  if (dims.length) parts.push([geometricMean(dims.map((d) => [d.fit, d.constraint.weight ?? 1] as const)), 1]);

  const salient = dims.filter((d) => d.constraint.target >= 4 && DIM_GENRES[d.dim]);
  if (salient.length) {
    const hits = salient.filter((d) => DIM_GENRES[d.dim]!.some((g) => movie.genres.includes(g))).length;
    parts.push([0.72 + 0.28 * (hits / salient.length), 0.35]);
  }

  let ref: Scored['ref'] = null;
  if (refs.length) {
    ref = similarityToRefs(movie, refs);
    parts.push([Math.min(1, ref.score / 0.85), 0.9]);
  }

  let genreHit: boolean | null = null;
  if (query.genres.include.length) {
    genreHit = query.genres.include.some((g) => movie.genres.includes(g));
    parts.push([genreHit ? 1 : 0.55, 0.6]);
  }

  const tagHits = (query.tags ?? []).filter((t) => movie.tags.includes(t));
  if (query.tags?.length) parts.push([0.5 + 0.5 * (tagHits.length / query.tags.length), 0.6]);

  let keywordHit: boolean | null = null;
  if (query.boostIds?.length) {
    keywordHit = query.boostIds.includes(movie.id);
    parts.push([keywordHit ? 1 : 0.4, 0.8]);
  }

  let score = parts.length ? geometricMean(parts) : 0.7;
  if (community) score *= 1 + 0.05 * clamp(community.boost, -1, 1);
  return { movie, score: clamp(score, 0, 1), dims, ref, genreHit, tagHits, keywordHit };
}

function dimReason(d: DimFit): Reason {
  const meta = DIM_META[d.dim];
  const { value: v, constraint: c } = d;
  const label = `${meta.label} ${v}/10`;
  const aboveMax = c.max !== undefined && v > c.max;
  const belowMin = c.min !== undefined && v < c.min;
  if (c.target <= 1 && !aboveMax) return { kind: 'dim', dim: d.dim, tone: 'good', text: v === 0 ? `${meta.label}: none at all` : `${label} – barely there` };
  if (aboveMax) return { kind: 'dim', dim: d.dim, tone: 'warn', text: `${label} – a bit more than you wanted` };
  if (belowMin) return { kind: 'dim', dim: d.dim, tone: 'warn', text: `${label} – less than you wanted` };
  if (d.fit > 0.8) return { kind: 'dim', dim: d.dim, tone: 'good', text: `${label} – just what you asked for` };
  return { kind: 'dim', dim: d.dim, tone: 'neutral', text: label };
}

const DEAL_REASON: Array<[keyof MoodQuery['dealbreakers'], string]> = [
  ['happyOnly', 'happy ending'],
  ['noSadEnding', 'no sad ending'],
  ['noGore', 'no gore'],
  ['noJumpscares', 'no jump scares'],
  ['noAnimalDeath', 'the animals are fine'],
  ['familyFriendly', 'fine for all ages'],
];

function buildReasons(s: Scored, query: MoodQuery, community?: CommunitySignal): Reason[] {
  const reasons: Reason[] = [];

  if (s.ref?.best) {
    const { ref, similarity } = s.ref.best;
    reasons.push({ kind: 'like', tone: similarity > 0.6 ? 'good' : 'neutral', text: `${Math.round(similarity * 100)}% similar to ${ref.title}` });
    const shared = sharedThemes(s.movie, ref).slice(0, 2).map(tagLabel);
    if (ref.director === s.movie.director) reasons.push({ kind: 'like', tone: 'good', text: `Same director as ${ref.title}` });
    else if (shared.length) reasons.push({ kind: 'like', tone: 'neutral', text: `Shares with ${ref.title}: ${shared.join(', ')}` });
  }

  const dimReasons = s.dims
    .map((d) => ({ d, reason: dimReason(d), weight: (1 - d.fit) * (d.constraint.weight ?? 1) }))
    .sort((a, b) => a.weight - b.weight);
  const good = dimReasons.filter((x) => x.reason.tone !== 'warn').slice(0, 2);
  const warn = dimReasons.filter((x) => x.reason.tone === 'warn').slice(-1);
  reasons.push(...good.map((x) => x.reason), ...warn.map((x) => x.reason));

  if (s.genreHit) {
    const hits = query.genres.include.filter((g) => s.movie.genres.includes(g)).map((g) => GENRE_LABEL[g]);
    reasons.push({ kind: 'genre', tone: 'good', text: `Genre: ${hits.join(', ')}` });
  }
  if (s.tagHits.length) reasons.push({ kind: 'genre', tone: 'good', text: `Theme: ${s.tagHits.map(tagLabel).join(', ')}` });
  if (s.keywordHit) reasons.push({ kind: 'genre', tone: 'good', text: 'Matches your search' });

  const deals = DEAL_REASON.filter(([key]) => query.dealbreakers[key]).map(([, text]) => text);
  if (deals.length) reasons.push({ kind: 'dealbreaker', tone: 'good', text: `✓ ${deals.join(', ')}` });

  if (community && community.picks >= 2) reasons.push({ kind: 'community', tone: 'neutral', text: `Picked ${community.picks}× by other viewers` });
  return reasons;
}

/** Maximal Marginal Relevance: keep the list relevant but stop it from being ten copies of the same film. */
function diversify(scored: Scored[], limit: number, relevance: number): Scored[] {
  const pool = scored.slice(0, Math.max(limit * 3, 30));
  const picked: Scored[] = [];
  while (picked.length < limit && pool.length) {
    let bestIndex = 0;
    let bestValue = -Infinity;
    for (let i = 0; i < pool.length; i++) {
      const candidate = pool[i]!;
      const redundancy = picked.length ? Math.max(...picked.map((p) => movieSimilarity(p.movie, candidate.movie))) : 0;
      const value = relevance * candidate.score - (1 - relevance) * redundancy;
      if (value > bestValue) {
        bestValue = value;
        bestIndex = i;
      }
    }
    picked.push(pool.splice(bestIndex, 1)[0]!);
  }
  // Variety decided *which* films make the cut; the list itself still reads best-first.
  return picked.sort((a, b) => b.score - a.score);
}

export function poolReport(catalog: readonly MovieSummary[], query: MoodQuery): PoolReport {
  const excluded: Record<string, ExclusionReason> = {};
  const byReason: Partial<Record<ExclusionReason, number>> = {};
  for (const movie of catalog) {
    const reason = exclusionReason(movie, query);
    if (!reason) continue;
    excluded[movie.id] = reason;
    byReason[reason] = (byReason[reason] ?? 0) + 1;
  }
  return { total: catalog.length, remaining: catalog.length - Object.keys(excluded).length, byReason, excluded };
}

export function recommend(catalog: readonly (Movie | MovieSummary)[], query: MoodQuery, options: RecommendOptions = {}): RecommendResult {
  const limit = options.limit ?? 12;
  const relevance = options.relevance ?? 0.78;
  const summaries = catalog.map((m) => ('aliases' in m ? toSummary(m as Movie) : m));
  const byId = new Map(summaries.map((m) => [m.id, m]));
  const refs = query.like.map((id) => byId.get(id)).filter((m): m is MovieSummary => Boolean(m));

  const pool = poolReport(summaries, query);
  const tieBreak = (id: string) => (options.seed === undefined ? 0 : hashString(`${options.seed}:${id}`));
  const scored = summaries
    .filter((m) => !pool.excluded[m.id])
    .map((m) => scoreMovie(m, query, refs, options.community?.[m.id]))
    .sort((a, b) => b.score - a.score || tieBreak(a.movie.id) - tieBreak(b.movie.id) || a.movie.id.localeCompare(b.movie.id));

  const results: Recommendation[] = diversify(scored, limit, relevance).map((s) => ({
    movie: s.movie,
    score: Math.round(s.score * 100),
    reasons: buildReasons(s, query, options.community?.[s.movie.id]),
  }));

  return { results, pool, ranked: hasPreferences(query) };
}

/** True when the query expresses taste, not just filters; otherwise match percentages mean nothing. */
export function hasPreferences(query: MoodQuery): boolean {
  return Object.keys(query.dims).length > 0 || query.like.length > 0 || query.genres.include.length > 0 || Boolean(query.tags?.length) || Boolean(query.boostIds?.length);
}

function hashString(text: string): number {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** A one-line, human summary of why the pool shrank. */
export function describePool(pool: PoolReport): string {
  const parts = (Object.entries(pool.byReason) as Array<[ExclusionReason, number]>)
    .filter(([reason]) => reason !== 'reference')
    .sort((a, b) => b[1] - a[1])
    .map(([reason, count]) => `${count} – ${EXCLUSION_LABEL[reason]}`);
  return parts.length ? `Excluded: ${parts.join(' · ')}` : 'Nothing excluded';
}
