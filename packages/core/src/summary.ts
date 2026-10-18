import type { Movie, MovieSummary } from './types';

export function toSummary(movie: Movie): MovieSummary {
  const { aliases: _aliases, ...summary } = movie;
  return summary;
}
