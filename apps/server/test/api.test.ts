import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { REEL_WINNER_INDEX } from '@moodreel/core';
import request from 'supertest';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { createApp } from '../src/app';
import { createLogger } from '../src/logger';
import { communitySignals } from '../src/services/community';
import { JsonFileStore } from '../src/store/jsonStore';
import { MemoryStore } from '../src/store/memoryStore';

const logger = createLogger({ json: false, silent: true });
const CLIENT = '6f1c2d7e-8a9b-4c3d-9e0f-1a2b3c4d5e6f';

function makeApp(store = new MemoryStore()) {
  return { app: createApp({ store, logger, rateLimitPerMinute: 1000 }), store };
}

describe('GET endpoints', () => {
  const { app } = makeApp();

  it('reports health', async () => {
    const res = await request(app).get('/api/health').expect(200);
    expect(res.body).toMatchObject({ status: 'ok' });
    expect(res.body.movies).toBeGreaterThan(100);
  });

  it('serves the catalog without parser-only fields and with caching', async () => {
    const res = await request(app).get('/api/movies').expect(200);
    expect(res.headers['cache-control']).toContain('max-age');
    expect(res.body.movies[0]).not.toHaveProperty('aliases');
  });

  it('returns one film with its neighbours, or 404', async () => {
    const res = await request(app).get('/api/movies/black-swan-2010').expect(200);
    expect(res.body.movie.title).toBe('Black Swan');
    expect(res.body.similar).toHaveLength(6);
    const missing = await request(app).get('/api/movies/nope-1999').expect(404);
    expect(missing.body.error).toBe('movie_not_found');
  });

  it('sets security headers and hides the framework', async () => {
    const res = await request(app).get('/api/health');
    expect(res.headers['x-powered-by']).toBeUndefined();
    expect(res.headers['content-security-policy']).toContain("default-src 'self'");
    expect(res.headers['x-content-type-options']).toBe('nosniff');
  });

  it('answers unknown API routes with JSON', async () => {
    const res = await request(app).get('/api/nope').expect(404);
    expect(res.body).toMatchObject({ error: 'not_found' });
  });
});

describe('POST /api/parse', () => {
  const { app } = makeApp();

  it('understands the brief', async () => {
    const res = await request(app).post('/api/parse').send({ text: 'I want something scary but not too much' }).expect(200);
    expect(res.body.effects[0]).toMatchObject({ kind: 'dim', dim: 'fear', level: 'mid' });
    expect(res.body.understood).toBe(true);
  });

  it('validates input with a readable message', async () => {
    const res = await request(app).post('/api/parse').send({ text: '' }).expect(400);
    expect(res.body.error).toBe('invalid_request');
    expect(res.body.message).toBe('Tell me what you feel like watching');
  });

  it('rejects malformed JSON', async () => {
    const res = await request(app).post('/api/parse').set('Content-Type', 'application/json').send('{"text":').expect(400);
    expect(res.body.error).toBe('invalid_json');
  });
});

describe('POST /api/recommend', () => {
  const { app } = makeApp();

  it('fills defaults for a partial query and honours dealbreakers', async () => {
    const res = await request(app)
      .post('/api/recommend')
      .send({ query: { dims: { fear: { target: 5, min: 3, max: 6.5 } }, dealbreakers: { noSadEnding: true } }, limit: 5 })
      .expect(200);
    expect(res.body.results).toHaveLength(5);
    expect(res.body.ranked).toBe(true);
    for (const r of res.body.results) expect(['sad', 'bleak']).not.toContain(r.movie.ending);
    expect(res.body.pool.byReason.sadEnding).toBeGreaterThan(0);
  });

  it('rejects out-of-range values', async () => {
    const res = await request(app).post('/api/recommend').send({ query: { dims: { fear: { target: 42 } } } }).expect(400);
    expect(res.body.issues[0].path).toBe('query.dims.fear.target');
  });
});

describe('POST /api/pick', () => {
  const { app } = makeApp();

  it('returns a winner, a reel with the winner in the landing slot, and is reproducible by seed', async () => {
    const body = { query: { dims: { humor: { target: 8 } } }, seed: 1234 };
    const a = await request(app).post('/api/pick').send(body).expect(200);
    const b = await request(app).post('/api/pick').send(body).expect(200);
    expect(a.body.reel[REEL_WINNER_INDEX].id).toBe(a.body.pick.movie.id);
    expect(a.body.pick.movie.id).toBe(b.body.pick.movie.id);
    expect(a.body.seed).toBe(1234);
  });

  it('explains when the filters leave nothing', async () => {
    const res = await request(app)
      .post('/api/pick')
      .send({ query: { dealbreakers: { maxRuntime: 30 } } })
      .expect(404);
    expect(res.body.error).toBe('nothing_left');
  });
});

describe('POST /api/oracle', () => {
  const { app } = makeApp();

  it('runs a stateless dialogue', async () => {
    const first = await request(app).post('/api/oracle').send({ history: [] }).expect(200);
    expect(first.body.done).toBe(false);
    const q = first.body.question.id;
    const second = await request(app).post('/api/oracle').send({ history: [{ questionId: q, answer: 'yes' }] }).expect(200);
    expect(second.body.question.id).not.toBe(q);
    expect(second.body.effectiveCandidates).toBeLessThan(first.body.effectiveCandidates);
  });

  it('restricts the pool with dealbreakers', async () => {
    const res = await request(app).post('/api/oracle').send({ history: [], query: { dealbreakers: { animation: 'only' } } }).expect(200);
    for (const c of res.body.top) expect(c.movie.genres).toContain('animation');
  });
});

describe('feedback and community stats', () => {
  let ctx: ReturnType<typeof makeApp>;
  beforeEach(() => {
    ctx = makeApp();
  });

  it('records a pick once per client and shows it in the weekly stats', async () => {
    const vote = { clientId: CLIENT, movieId: 'up-2009', verdict: 'watch', mood: { humor: 7, sadness: 2 } };
    await request(ctx.app).post('/api/feedback').send(vote).expect(201);
    const again = await request(ctx.app).post('/api/feedback').send(vote).expect(200);
    expect(again.body.accepted).toBe(false);

    const stats = await request(ctx.app).get('/api/stats').expect(200);
    expect(stats.body.weekPicks).toBe(1);
    expect(stats.body.topWeek[0]).toMatchObject({ picks: 1, movie: { id: 'up-2009' } });
  });

  it('rejects unknown films and bad client ids', async () => {
    await request(ctx.app).post('/api/feedback').send({ clientId: CLIENT, movieId: 'nope-1999', verdict: 'watch' }).expect(404);
    await request(ctx.app).post('/api/feedback').send({ clientId: 'not-a-uuid', movieId: 'up-2009', verdict: 'watch' }).expect(400);
  });
});

describe('community signals', () => {
  it('is neutral without votes and moves with them, gently', () => {
    const now = Date.now();
    const votes = (verdict: 'watch' | 'skip', n: number) =>
      Array.from({ length: n }, (_, i) => ({ clientId: `c${i}`, movieId: 'up-2009', verdict, at: now }));
    expect(communitySignals([])['up-2009']).toBeUndefined();
    const liked = communitySignals(votes('watch', 6))['up-2009']!;
    const disliked = communitySignals(votes('skip', 6))['up-2009']!;
    expect(liked.boost).toBeGreaterThan(0);
    expect(disliked.boost).toBeLessThan(0);
    expect(liked.boost).toBeLessThan(1);
    expect(communitySignals(votes('watch', 1))['up-2009']!.boost).toBeLessThan(liked.boost);
  });
});

describe('JsonFileStore', () => {
  const dirs: string[] = [];
  afterAll(async () => {
    await Promise.all(dirs.map((d) => rm(d, { recursive: true, force: true })));
  });

  it('persists atomically and reloads', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'moodreel-'));
    dirs.push(dir);
    const store = await JsonFileStore.open(dir, logger, 5);
    await store.add({ clientId: CLIENT, movieId: 'up-2009', verdict: 'watch', at: Date.now() });
    await store.close();
    const saved = JSON.parse(await readFile(join(dir, 'community.json'), 'utf8'));
    expect(saved.events).toHaveLength(1);
    const reopened = await JsonFileStore.open(dir, logger);
    expect(reopened.events()).toHaveLength(1);
  });

  it('survives a corrupt file by starting fresh and keeping a backup', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'moodreel-'));
    dirs.push(dir);
    await writeFile(join(dir, 'community.json'), '{oops');
    const store = await JsonFileStore.open(dir, logger);
    expect(store.events()).toHaveLength(0);
  });
});
