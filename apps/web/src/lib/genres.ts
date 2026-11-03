import { GENRES, type Genre, type MoodQuery, type MovieSummary } from '@moodreel/core';

export const GENRE_LINE: Record<Genre, string> = {
  horror: 'Creaking doors, things in the dark, cushions held tight.',
  thriller: 'Tension that does not let go until the credits.',
  mystery: 'Clues, suspects and the answer you did not see coming.',
  scifi: 'Other planets, other times, big ideas.',
  fantasy: 'Magic, monsters and worlds that do not exist.',
  drama: 'People, choices and the moments that change them.',
  comedy: 'Films made to make you laugh out loud.',
  romance: 'Love stories, from first sparks to grand gestures.',
  action: 'Chases, fights and explosions at full speed.',
  adventure: 'Journeys, quests and a long way from home.',
  crime: 'Heists, detectives and the wrong side of the law.',
  animation: 'Drawn, painted and modelled, for every age.',
  war: 'Courage and loss on the front line.',
  musical: 'Stories told in songs and dance.',
};

export const isGenre = (value: string | null | undefined): value is Genre => (GENRES as readonly string[]).includes(value ?? '');

/** Restrict any query to one genre: every film outside it is excluded, so engine, pick and Oracle all respect it. */
export function withGenre(query: MoodQuery, genre: Genre | null, catalog: readonly MovieSummary[]): MoodQuery {
  if (!genre) return query;
  const outside = catalog.filter((m) => !m.genres.includes(genre)).map((m) => m.id);
  return { ...query, exclude: [...new Set([...query.exclude, ...outside])] };
}
