import {
  buildReel,
  createParser,
  createRng,
  exclusionReason,
  pickOne,
  randomSeed,
  recommend,
  runOracle,
  similarMovies,
} from '@moodreel/core';
import { MOVIES, SUMMARIES } from '@moodreel/core/catalog';
import { ApiError, type Api } from './types';

/**
 * The same contract as the HTTP API, computed in the browser. Used for the
 * static build and as a fallback when the server is unreachable. Community
 * features need a shared backend, so they are simply absent here.
 */
export function createLocalApi(): Api {
  const parser = createParser(MOVIES);
  const byId = new Map(SUMMARIES.map((m) => [m.id, m]));

  return {
    mode: 'local',
    movies: async () => SUMMARIES,
    movie: async (id) => {
      const movie = byId.get(id);
      if (!movie) throw new ApiError('That film is not in the catalog.', 404, 'movie_not_found');
      return { movie, similar: similarMovies(movie, SUMMARIES, 6).map((s) => ({ movie: s.ref, similarity: Math.round(s.similarity * 100) })) };
    },
    parse: async (text) => parser.parse(text.slice(0, 400)),
    recommend: async (query, options = {}) => recommend(SUMMARIES, query, { limit: options.limit ?? 12, ...(options.seed !== undefined ? { seed: options.seed } : {}) }),
    pick: async (query, options = {}) => {
      const seed = options.seed ?? randomSeed();
      const { results, pool } = recommend(SUMMARIES, query, { limit: 8, seed });
      const rng = createRng(seed);
      const pick = pickOne(results, rng);
      if (!pick) throw new ApiError('Your rules filtered out every film. Remove one and try again.', 404, 'nothing_left');
      const remaining = SUMMARIES.filter((m) => !pool.excluded[m.id]);
      return { pick, reel: buildReel(pick.movie, remaining.length > 1 ? remaining : SUMMARIES, rng), seed, alternatives: results.filter((r) => r.movie.id !== pick.movie.id).slice(0, 3) };
    },
    oracle: async (history, query) => {
      const pool = query ? SUMMARIES.filter((m) => !exclusionReason(m, query)) : SUMMARIES;
      if (pool.length === 0) throw new ApiError('Your rules filtered out every film. Remove one and try again.', 404, 'nothing_left');
      return runOracle(pool, history);
    },
    feedback: async () => {},
    stats: async () => null,
  };
}
