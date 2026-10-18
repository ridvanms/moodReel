import { describe, expect, it } from 'vitest';
import { MOVIES, SUMMARIES } from '../src/catalog';
import { buildQuery, emptyQuery, levelConstraint } from '../src/effects';
import { buildReel, pickOne, REEL_LENGTH, REEL_WINNER_INDEX } from '../src/engine/pick';
import { dimFit, recommend } from '../src/engine/recommend';
import { movieSimilarity, similarMovies } from '../src/engine/similarity';
import { createRng } from '../src/math';
import { runOracle, type OracleStep } from '../src/oracle/oracle';

const byTitle = (title: string) => SUMMARIES.find((m) => m.title === title)!;

describe('dimFit', () => {
  it('is perfect inside the tolerance and decays outside min/max', () => {
    expect(dimFit(5, { target: 5 })).toBe(1);
    expect(dimFit(6, { target: 5 })).toBe(1);
    expect(dimFit(9, { target: 5, max: 6.5 })).toBeLessThan(dimFit(9, { target: 5 }));
    expect(dimFit(2, { target: 7.5, min: 5.5 })).toBeLessThan(0.1);
  });
});

describe('recommend', () => {
  it('never returns a film that breaks a dealbreaker', () => {
    const query = buildQuery([
      { kind: 'deal', key: 'noSadEnding' },
      { kind: 'deal', key: 'noGore' },
      { kind: 'deal', key: 'noAnimalDeath' },
    ]);
    const { results, pool } = recommend(MOVIES, query, { limit: 40 });
    for (const r of results) {
      expect(['sad', 'bleak']).not.toContain(r.movie.ending);
      expect(r.movie.flags.gore).toBe(false);
      expect(r.movie.flags.animalDeath).toBe(false);
    }
    expect(pool.remaining).toBe(MOVIES.length - Object.keys(pool.excluded).length);
    expect(pool.byReason.sadEnding).toBeGreaterThan(0);
  });

  it('ranks gentle horror first for "scary but not too much"', () => {
    const query = buildQuery([{ kind: 'dim', dim: 'fear', constraint: levelConstraint('mid') }]);
    const { results, ranked } = recommend(MOVIES, query, { limit: 8 });
    expect(ranked).toBe(true);
    for (const r of results) {
      expect(r.movie.profile.fear).toBeGreaterThanOrEqual(3);
      expect(r.movie.profile.fear).toBeLessThanOrEqual(7);
    }
    expect(results.filter((r) => r.movie.genres.includes('horror')).length).toBeGreaterThanOrEqual(4);
  });

  it('excludes the reference films themselves and explains the similarity', () => {
    const query = buildQuery([{ kind: 'like', movieId: 'black-swan-2010' }]);
    const { results, pool } = recommend(MOVIES, query);
    expect(results.map((r) => r.movie.id)).not.toContain('black-swan-2010');
    expect(pool.excluded['black-swan-2010']).toBe('reference');
    expect(results[0]!.reasons[0]!.text).toMatch(/similar to Black Swan/);
  });

  it('keeps the list varied (MMR) while still reading best-first', () => {
    const query = buildQuery([{ kind: 'dim', dim: 'humor', constraint: levelConstraint('max') }]);
    const { results } = recommend(MOVIES, query, { limit: 10 });
    const scores = results.map((r) => r.score);
    expect([...scores].sort((a, b) => b - a)).toEqual(scores);
    const genres = new Set(results.flatMap((r) => r.movie.genres));
    expect(genres.size).toBeGreaterThanOrEqual(5);
  });

  it('marks filter-only queries as unranked and shuffles them by seed', () => {
    const query = buildQuery([{ kind: 'deal', key: 'noSadEnding' }]);
    const a = recommend(MOVIES, query, { seed: 1 });
    const b = recommend(MOVIES, query, { seed: 2 });
    expect(a.ranked).toBe(false);
    expect(a.results.map((r) => r.movie.id)).not.toEqual(b.results.map((r) => r.movie.id));
  });

  it('respects the seen list', () => {
    const query = { ...emptyQuery(), exclude: ['inception-2010'] };
    const { pool } = recommend(MOVIES, query);
    expect(pool.excluded['inception-2010']).toBe('seen');
  });
});

describe('similarity', () => {
  it('finds psychological thrillers next to Black Swan', () => {
    const near = similarMovies(byTitle('Black Swan'), SUMMARIES, 5).map((m) => m.ref.title);
    expect(near).toContain('Perfect Blue');
  });

  it('is symmetric and bounded', () => {
    const a = byTitle('Alien');
    const b = byTitle('The Thing');
    expect(movieSimilarity(a, b)).toBeCloseTo(movieSimilarity(b, a));
    expect(movieSimilarity(a, b)).toBeLessThanOrEqual(1);
    expect(movieSimilarity(a, byTitle('Mamma Mia!'))).toBeLessThan(movieSimilarity(a, b));
  });
});

describe('pick', () => {
  it('is reproducible with a seed and favours the best match', () => {
    const results = [95, 90, 80, 70, 60, 50].map((score, i) => ({ movie: SUMMARIES[i]!, score, reasons: [] }));
    const tally = new Map<string, number>();
    const rng = createRng(42);
    for (let i = 0; i < 600; i++) {
      const pick = pickOne(results, rng)!;
      tally.set(pick.movie.id, (tally.get(pick.movie.id) ?? 0) + 1);
    }
    const counts = results.map((r) => tally.get(r.movie.id) ?? 0);
    expect(counts[0]).toBeGreaterThan(counts[2]!);
    expect(counts[2]).toBeGreaterThan(counts[5]!);
    expect(counts[0]).toBeGreaterThan(600 / 6);
    expect(pickOne(results, createRng(7))!.movie.id).toBe(pickOne(results, createRng(7))!.movie.id);
  });

  it('builds a reel with the winner at the fixed slot and no immediate repeats', () => {
    const winner = byTitle('Up');
    const reel = buildReel(winner, SUMMARIES, createRng(3));
    expect(reel).toHaveLength(REEL_LENGTH);
    expect(reel[REEL_WINNER_INDEX]!.id).toBe(winner.id);
    for (let i = 1; i < reel.length; i++) expect(reel[i]!.id).not.toBe(reel[i - 1]!.id);
  });
});

describe('oracle', () => {
  it('asks the most informative question first and narrows the field', () => {
    const first = runOracle(SUMMARIES, []);
    expect(first.done).toBe(false);
    expect(first.question).not.toBeNull();
    expect(first.effectiveCandidates).toBeGreaterThan(100);

    const history: OracleStep[] = [];
    let state = first;
    // Someone who wants a light, funny, animated film.
    const answers: Record<string, OracleStep['answer']> = {
      animated: 'yes', laugh: 'yes', fear: 'no', cry: 'no', dark: 'no', bright: 'yes', magic: 'probably', cozy: 'yes',
    };
    while (!state.done) {
      history.push({ questionId: state.question!.id, answer: answers[state.question!.id] ?? 'unknown' });
      state = runOracle(SUMMARIES, history);
    }
    expect(state.asked).toBeGreaterThanOrEqual(4);
    expect(state.effectiveCandidates).toBeLessThan(first.effectiveCandidates);
    expect(state.top[0]!.movie.genres).toContain('animation');
  });

  it('never repeats a question', () => {
    const history: OracleStep[] = [];
    const seen = new Set<string>();
    let state = runOracle(SUMMARIES, history);
    while (!state.done) {
      expect(seen.has(state.question!.id)).toBe(false);
      seen.add(state.question!.id);
      history.push({ questionId: state.question!.id, answer: 'unknown' });
      state = runOracle(SUMMARIES, history);
    }
  });
});
