import { emptyQuery, exclusionReason, GENRES, type Effect } from '@moodreel/core';
import { SUMMARIES } from '@moodreel/core/catalog';
import { describe, expect, it } from 'vitest';
import { padEffects } from '../src/components/MoodMap';
import { isGenre, withGenre } from '../src/lib/genres';
import { searchCatalog } from '../src/lib/search';
import { parseLocation } from '../src/router';
import { effectChips, reducer, type MoodState } from '../src/state/store';

const byId = new Map(SUMMARIES.map((m) => [m.id, m]));
const empty: MoodState = { effects: [], pad: null, seen: [], watchlist: [], seed: 1 };
const laughs: Effect = { kind: 'dim', dim: 'humor', constraint: { target: 8 } };

describe('store reducer', () => {
  it('clear drops the mood and keeps the rules; clearRules does the opposite', () => {
    let state = reducer(empty, { type: 'upsert', effect: { kind: 'deal', key: 'noGore' } });
    state = reducer(state, { type: 'upsert', effect: laughs });
    expect(reducer(state, { type: 'clear' }).effects).toEqual([{ kind: 'deal', key: 'noGore' }]);
    expect(reducer(state, { type: 'clearRules' }).effects).toEqual([laughs]);
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

describe('genres', () => {
  it('restricts a query to one genre without touching the rules', () => {
    const base = { ...emptyQuery(), dealbreakers: { noSadEnding: true } };
    const horror = withGenre(base, 'horror', SUMMARIES);
    const left = SUMMARIES.filter((m) => !exclusionReason(m, horror));
    expect(left.length).toBeGreaterThan(5);
    for (const m of left) {
      expect(m.genres).toContain('horror');
      expect(['sad', 'bleak']).not.toContain(m.ending);
    }
    expect(withGenre(base, null, SUMMARIES)).toBe(base);
  });

  it('recognises genre slugs from the URL', () => {
    expect(GENRES.every(isGenre)).toBe(true);
    expect(isGenre('nope')).toBe(false);
    expect(isGenre(null)).toBe(false);
  });
});

describe('router', () => {
  it('parses every page', () => {
    expect(parseLocation('')).toEqual({ page: 'home' });
    expect(parseLocation('#/')).toEqual({ page: 'home' });
    expect(parseLocation('#/film/up-2009')).toEqual({ page: 'film', id: 'up-2009' });
    expect(parseLocation('#/genres')).toEqual({ page: 'genres' });
    const genre = parseLocation('#/genres/horror?sort=old');
    expect(genre.page === 'genre' && [genre.genre, genre.params.get('sort')]).toEqual(['horror', 'old']);
    const oracle = parseLocation('#/oracle?genre=comedy');
    expect(oracle.page === 'oracle' && oracle.params.get('genre')).toBe('comedy');
    expect(parseLocation('#/moods').page).toBe('missing');
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
