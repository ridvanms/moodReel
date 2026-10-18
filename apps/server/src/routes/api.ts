import {
  buildReel,
  createParser,
  createRng,
  pickOne,
  randomSeed,
  recommend,
  runOracle,
  similarMovies,
  exclusionReason,
  type Movie,
  type MovieDetails,
  type MovieSummary,
  type PickResult,
} from '@moodreel/core';
import { Router } from 'express';
import { rateLimit } from 'express-rate-limit';
import { HttpError } from '../middleware/errors';
import { feedbackRequest, oracleRequest, parseRequest, pickRequest, recommendRequest } from '../schemas';
import { communitySignals, communityStats } from '../services/community';
import type { FeedbackStore } from '../store/types';

export interface ApiDeps {
  catalog: readonly Movie[];
  summaries: readonly MovieSummary[];
  store: FeedbackStore;
  /** Requests per minute per IP for the compute endpoints. */
  rateLimitPerMinute?: number;
}

const limiter = (limit: number) =>
  rateLimit({
    windowMs: 60_000,
    limit,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    handler: (_req, res) => {
      res.status(429).json({ error: 'rate_limited', message: 'Too many requests. Take a breath and try again in a minute.' });
    },
  });

export function createApiRouter(deps: ApiDeps): Router {
  const router = Router();
  const parser = createParser(deps.catalog);
  const byId = new Map(deps.summaries.map((m) => [m.id, m]));
  const startedAt = Date.now();
  const perMinute = deps.rateLimitPerMinute ?? 120;

  // Signals change only when someone votes; cache them per store revision instead of per request.
  let signalsCache: { size: number; value: ReturnType<typeof communitySignals> } | null = null;
  const signals = () => {
    const events = deps.store.events();
    if (!signalsCache || signalsCache.size !== events.length) signalsCache = { size: events.length, value: communitySignals(events) };
    return signalsCache.value;
  };

  router.get('/health', (_req, res) => {
    res.json({ status: 'ok', uptimeSeconds: Math.round((Date.now() - startedAt) / 1000), movies: deps.summaries.length });
  });

  router.get('/movies', (_req, res) => {
    res.set('Cache-Control', 'public, max-age=300');
    res.json({ movies: deps.summaries });
  });

  router.get('/movies/:id', (req, res) => {
    const movie = byId.get(req.params.id);
    if (!movie) throw new HttpError(404, 'movie_not_found', 'That film is not in the catalog.');
    res.set('Cache-Control', 'public, max-age=300');
    const body: MovieDetails = { movie, similar: similarMovies(movie, deps.summaries, 6).map((s) => ({ movie: s.ref, similarity: Math.round(s.similarity * 100) })) };
    res.json(body);
  });

  router.post('/parse', limiter(perMinute), (req, res) => {
    const { text } = parseRequest.parse(req.body);
    res.json(parser.parse(text));
  });

  router.post('/recommend', limiter(perMinute), (req, res) => {
    const { query, limit, seed } = recommendRequest.parse(req.body);
    res.json(recommend(deps.summaries, query, { limit, community: signals(), ...(seed !== undefined ? { seed } : {}) }));
  });

  router.post('/pick', limiter(perMinute), (req, res) => {
    const { query, seed = randomSeed(), temperature } = pickRequest.parse(req.body);
    const { results, pool } = recommend(deps.summaries, query, { limit: 8, community: signals(), seed });
    const rng = createRng(seed);
    const pick = pickOne(results, rng, temperature ? { temperature } : {});
    if (!pick) throw new HttpError(404, 'nothing_left', 'Your rules filtered out every film. Remove one and try again.');
    const remaining = deps.summaries.filter((m) => !pool.excluded[m.id]);
    const body: PickResult = {
      pick,
      reel: buildReel(pick.movie, remaining.length > 1 ? remaining : deps.summaries, rng),
      seed,
      alternatives: results.filter((r) => r.movie.id !== pick.movie.id).slice(0, 3),
    };
    res.json(body);
  });

  router.post('/oracle', limiter(perMinute), (req, res) => {
    const { history, query } = oracleRequest.parse(req.body);
    const pool = query ? deps.summaries.filter((m) => !exclusionReason(m, query)) : deps.summaries;
    if (pool.length === 0) throw new HttpError(404, 'nothing_left', 'Your rules filtered out every film. Remove one and try again.');
    res.json(runOracle(pool, history));
  });

  router.post('/feedback', limiter(Math.max(10, Math.round(perMinute / 4))), async (req, res) => {
    const { clientId, movieId, verdict, mood } = feedbackRequest.parse(req.body);
    if (!byId.has(movieId)) throw new HttpError(404, 'movie_not_found', 'That film is not in the catalog.');
    const accepted = await deps.store.add({ clientId, movieId, verdict, at: Date.now(), ...(mood ? { mood } : {}) });
    res.status(accepted ? 201 : 200).json({ accepted });
  });

  router.get('/stats', (_req, res) => {
    res.set('Cache-Control', 'no-store');
    res.json(communityStats(deps.store.events(), byId));
  });

  return router;
}
