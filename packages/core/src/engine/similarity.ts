import { DIMS } from '../types';
import type { MovieSummary } from '../types';

/** Distance in mood space translated to 0–1. σ≈7 keeps "close" films well above "far" ones. */
const PROFILE_SIGMA = 7;

export function profileSimilarity(a: MovieSummary, b: MovieSummary): number {
  let d2 = 0;
  for (const dim of DIMS) {
    const diff = a.profile[dim] - b.profile[dim];
    d2 += diff * diff;
  }
  return Math.exp(-d2 / (2 * PROFILE_SIGMA * PROFILE_SIGMA));
}

/** Jaccard over genres and tags, with tags counted a bit stronger because they are more specific. */
export function themeSimilarity(a: MovieSummary, b: MovieSummary): number {
  const weight = (key: string) => (key.startsWith('g:') ? 1 : 1.5);
  const setA = new Set([...a.genres.map((g) => `g:${g}`), ...a.tags.map((t) => `t:${t}`)]);
  const setB = new Set([...b.genres.map((g) => `g:${g}`), ...b.tags.map((t) => `t:${t}`)]);
  let inter = 0;
  let union = 0;
  for (const key of new Set([...setA, ...setB])) {
    const w = weight(key);
    union += w;
    if (setA.has(key) && setB.has(key)) inter += w;
  }
  return union === 0 ? 0 : inter / union;
}

export function movieSimilarity(a: MovieSummary, b: MovieSummary): number {
  if (a.id === b.id) return 1;
  const sameDirector = a.director === b.director ? 0.05 : 0;
  return Math.min(1, 0.65 * profileSimilarity(a, b) + 0.35 * themeSimilarity(a, b) + sameDirector);
}

export interface RefMatch {
  ref: MovieSummary;
  similarity: number;
}

/** "Like X or Y": the best match dominates, the average keeps it honest. */
export function similarityToRefs(movie: MovieSummary, refs: readonly MovieSummary[]): { score: number; best: RefMatch | null } {
  if (refs.length === 0) return { score: 0, best: null };
  let best: RefMatch | null = null;
  let sum = 0;
  for (const ref of refs) {
    const similarity = movieSimilarity(movie, ref);
    sum += similarity;
    if (!best || similarity > best.similarity) best = { ref, similarity };
  }
  const mean = sum / refs.length;
  return { score: 0.7 * (best?.similarity ?? 0) + 0.3 * mean, best };
}

export function sharedThemes(a: MovieSummary, b: MovieSummary): string[] {
  const tags = new Set(b.tags);
  return a.tags.filter((t) => tags.has(t));
}

/** Nearest neighbours of one film, for the "if you liked this" rail. */
export function similarMovies(movie: MovieSummary, catalog: readonly MovieSummary[], limit = 6): RefMatch[] {
  return catalog
    .filter((m) => m.id !== movie.id)
    .map((m) => ({ ref: m, similarity: movieSimilarity(movie, m) }))
    .sort((x, y) => y.similarity - x.similarity)
    .slice(0, limit);
}
