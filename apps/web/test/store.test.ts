import { buildQuery, recommend, type Effect } from '@moodreel/core';
import { SUMMARIES } from '@moodreel/core/catalog';
import { describe, expect, it } from 'vitest';
import { padEffects } from '../src/components/MoodMap';
import { MOODS, moodEffects, moodQuery, OPENING_EFFECTS } from '../src/lib/moods';
import { searchCatalog } from '../src/lib/search';
import { parseLocation } from '../src/router';
import { effectChips, reducer, type MoodState } from '../src/state/store';

const byId = new Map(SUMMARIES.map((m) => [m.id, m]));
const empty: MoodState = { effects: [], pad: null, seen: [], watchlist: [], seed: 1 };
const mood = (slug: string) => MOODS.find((m) => m.slug === slug)!;
const apply = (state: MoodState, slug: string, mode: 'replace' | 'refine' = 'replace') => reducer(state, { type: 'apply', effects: moodEffects(mood(slug)), mode });

describe('store reducer', () => {
  it('a new mood replaces the old one but keeps standing rules', () => {
    let state = reducer(empty, { type: 'upsert', effect: { kind: 'deal', key: 'noSadEnding' } });
    state = apply(state, 'make-me-laugh');
    state = apply(state, 'mess-with-my-head');
    const chips = effectChips(state.effects, byId);
    expect(chips.map((c) => c.label)).toEqual(['No sad ending', 'Mess with my head']);
  });

  it('clear drops the mood and keeps the rules; clearRules does the opposite', () => {
    let state = reducer(empty, { type: 'upsert', effect: { kind: 'deal', key: 'noGore' } });
    state = apply(state, 'date-night');
    expect(reducer(state, { type: 'clear' }).effects).toEqual([{ kind: 'deal', key: 'noGore' }]);
    expect(reducer(state, { type: 'clearRules' }).effects.every((e) => e.kind !== 'deal' || e.group)).toBe(true);
  });

  it('removes a whole mood at once', () => {
    const state = apply(empty, 'cozy-rainy-sunday');
    const chips = effectChips(state.effects, byId);
    expect(chips).toHaveLength(1);
    expect(reducer(state, { type: 'remove', keys: chips[0]!.keys }).effects).toHaveLength(0);
  });

  it('a slider detaches a dimension from its mood group', () => {
    const state = apply(empty, 'make-me-laugh');
    const next = reducer(state, { type: 'upsert', effect: { kind: 'dim', dim: 'humor', constraint: { target: 9 } } });
    const humor = next.effects.find((e): e is Extract<Effect, { kind: 'dim' }> => e.kind === 'dim' && e.dim === 'humor');
    expect(humor?.group).toBeUndefined();
    expect(humor?.constraint.target).toBe(9);
  });

  it('moving the map puck replaces its previous wishes and clears when they are removed', () => {
    let state = reducer(empty, { type: 'pad', pad: { x: 0.9, y: 0.9 }, effects: padEffects(0.9, 0.9) });
    state = reducer(state, { type: 'pad', pad: { x: 0.1, y: 0.1 }, effects: padEffects(0.1, 0.1) });
    const chips = effectChips(state.effects, byId);
    expect(chips).toHaveLength(1);
    expect(chips[0]!.label).toContain('calm');
    state = reducer(state, { type: 'remove', keys: chips[0]!.keys });
    expect(state.pad).toBeNull();
  });

  it('marking a film as seen drops it from the watchlist', () => {
    let state = reducer(empty, { type: 'addWatch', id: 'up-2009' });
    state = reducer(state, { type: 'toggleSeen', id: 'up-2009' });
    expect(state.watchlist).toEqual([]);
    expect(state.seen).toEqual(['up-2009']);
  });
});

describe('moods', () => {
  it('only reference films that exist', () => {
    for (const m of MOODS) {
      for (const id of m.think) expect(byId.has(id), `${m.slug}: ${id}`).toBe(true);
      for (const e of m.effects) if (e.kind === 'like') expect(byId.has(e.movieId)).toBe(true);
    }
    expect(new Set(MOODS.map((m) => m.slug)).size).toBe(MOODS.length);
  });

  it('every mood finds at least six films, even with “no sad ending” on', () => {
    const rules: Effect[] = [{ kind: 'deal', key: 'noSadEnding' }];
    for (const m of MOODS) {
      const { results } = recommend(SUMMARIES, moodQuery(m, rules, []), { limit: 12 });
      expect(results.length, m.slug).toBeGreaterThanOrEqual(6);
    }
  });

  it('the opening mood is the brief: scary but not too much, no sad ending', () => {
    const query = buildQuery(OPENING_EFFECTS);
    expect(query.dealbreakers.noSadEnding).toBe(true);
    const { results } = recommend(SUMMARIES, query, { limit: 8 });
    for (const r of results) {
      expect(['sad', 'bleak']).not.toContain(r.movie.ending);
      expect(r.movie.profile.fear).toBeLessThanOrEqual(7);
    }
  });
});

describe('router', () => {
  it('parses every page', () => {
    expect(parseLocation('')).toEqual({ page: 'home' });
    expect(parseLocation('#/')).toEqual({ page: 'home' });
    expect(parseLocation('#/film/up-2009')).toEqual({ page: 'film', id: 'up-2009' });
    expect(parseLocation('#/moods/date-night')).toEqual({ page: 'mood', slug: 'date-night' });
    expect(parseLocation('#/moods')).toEqual({ page: 'moods' });
    const browse = parseLocation('#/browse?genre=horror&q=the%20thing');
    expect(browse.page === 'browse' && browse.params.get('q')).toBe('the thing');
    expect(parseLocation('#/nope').page).toBe('missing');
  });
});

describe('search', () => {
  it('ranks title hits above director and theme hits', () => {
    expect(searchCatalog(SUMMARIES, 'black swan')[0]?.id).toBe('black-swan-2010');
    expect(searchCatalog(SUMMARIES, 'nolan').map((m) => m.id)).toContain('inception-2010');
    expect(searchCatalog(SUMMARIES, 'amélie')[0]?.id).toBe('amelie-2001');
    expect(searchCatalog(SUMMARIES, '   ')).toEqual([]);
  });
});
