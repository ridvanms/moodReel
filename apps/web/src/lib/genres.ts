import { GENRES, type Genre, type MoodQuery, type MovieSummary } from '@moodreel/core';

export const isGenre = (value: string | null | undefined): value is Genre => (GENRES as readonly string[]).includes(value ?? '');

/** Restrict a query to one genre: every film outside it is excluded. */
export function withGenre(query: MoodQuery, genre: Genre | null, catalog: readonly MovieSummary[]): MoodQuery {
  if (!genre) return query;
  const outside = catalog.filter((m) => !m.genres.includes(genre)).map((m) => m.id);
  return { ...query, exclude: [...new Set([...query.exclude, ...outside])] };
}
