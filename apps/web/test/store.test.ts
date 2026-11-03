import { emptyQuery, exclusionReason, GENRES } from '@moodreel/core';
import { SUMMARIES } from '@moodreel/core/catalog';
import { describe, expect, it } from 'vitest';
import { isGenre, withGenre } from '../src/lib/genres';
import { searchCatalog } from '../src/lib/search';
import { parseLocation } from '../src/router';
import { reducer, type MoodState } from '../src/state/store';

const byId = new Map(SUMMARIES.map((m) => [m.id, m]));
const empty: MoodState = { seen: [], watchlist: [] };

describe('store reducer', () => {
  it('marking a film as seen drops it from the watchlist', () => {
    let state = reducer(empty, { type: 'addWatch', id: 'up-2009' });
    state = reducer(state, { type: 'toggleSeen', id: 'up-2009' });
    expect(state.watchlist).toEqual([]);
    expect(state.seen).toEqual(['up-2009']);
  });
});

describe('genres', () => {
  it('restricts a query to one genre and keeps excluding seen films', () => {
    const base = { ...emptyQuery(), exclude: ['the-shining-1980'] };
    const horror = withGenre(base, 'horror', SUMMARIES);
    const left = SUMMARIES.filter((m) => !exclusionReason(m, horror));
    expect(left.length).toBeGreaterThan(5);
    for (const m of left) {
      expect(m.genres).toContain('horror');
      expect(m.id).not.toBe('the-shining-1980');
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
