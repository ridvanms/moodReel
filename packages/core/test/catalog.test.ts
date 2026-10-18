import { describe, expect, it } from 'vitest';
import { MOVIES } from '../src/catalog';
import { DIMS, ENDINGS, GENRES } from '../src/types';
import { TAG_LABEL } from '../src/labels';

describe('catalog', () => {
  it('has a healthy number of films', () => {
    expect(MOVIES.length).toBeGreaterThanOrEqual(120);
  });

  it('uses unique ids in slug-year form', () => {
    const ids = MOVIES.map((m) => m.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const movie of MOVIES) expect(movie.id).toMatch(new RegExp(`^[a-z0-9-]+-${movie.year}$`));
  });

  it.each(MOVIES.map((m) => [m.title, m] as const))('%s is well-formed', (_title, movie) => {
    for (const dim of DIMS) {
      const value = movie.profile[dim];
      expect(Number.isInteger(value), `${dim} must be an integer`).toBe(true);
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThanOrEqual(10);
    }
    expect(ENDINGS).toContain(movie.ending);
    expect(movie.genres.length).toBeGreaterThan(0);
    for (const genre of movie.genres) expect(GENRES).toContain(genre);
    for (const tag of movie.tags) expect(TAG_LABEL, `missing label for tag "${tag}"`).toHaveProperty(tag);
    for (const colour of movie.palette) expect(colour).toMatch(/^#[0-9a-f]{6}$/);
    expect(movie.year).toBeGreaterThan(1900);
    expect(movie.runtime).toBeGreaterThan(60);
    expect(movie.blurb.length).toBeGreaterThan(40);
    expect(movie.blurb.length).toBeLessThan(220);
  });

  it('covers every ending type and enough sad endings to make the filter meaningful', () => {
    const counts = Object.fromEntries(ENDINGS.map((e) => [e, MOVIES.filter((m) => m.ending === e).length]));
    for (const ending of ENDINGS) expect(counts[ending]).toBeGreaterThan(3);
  });

  it('includes the films the brief mentions', () => {
    const titles = MOVIES.map((m) => m.title);
    expect(titles).toContain('The Thing');
    expect(titles).toContain('Black Swan');
  });
});
