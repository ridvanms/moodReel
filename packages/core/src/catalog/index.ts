import { MOVIES } from './movies';
import { toSummary } from '../summary';
import type { Movie, MovieSummary } from '../types';

export { MOVIES };

export const MOVIES_BY_ID: ReadonlyMap<string, Movie> = new Map(MOVIES.map((m) => [m.id, m]));

export const SUMMARIES: MovieSummary[] = MOVIES.map(toSummary);
