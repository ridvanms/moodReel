import { GENRE_LABEL, normalizeTitle, tagLabel, type MovieSummary } from '@moodreel/core';

/**
 * Plain catalog search: titles first, then directors, years, genres and themes.
 * Deterministic and instant, it is a lookup, not a mood parser.
 */
export function searchCatalog(catalog: readonly MovieSummary[], raw: string, limit = Infinity): MovieSummary[] {
  const query = normalizeTitle(raw);
  if (!query) return [];
  const terms = query.split(' ');
  const scored: Array<{ movie: MovieSummary; score: number }> = [];
  for (const movie of catalog) {
    const title = normalizeTitle(movie.title);
    const words = title.split(' ');
    let score = 0;
    if (title === query) score = 100;
    else if (title.startsWith(query)) score = 80;
    else if (words.some((w) => w.startsWith(query))) score = 60;
    else if (title.includes(query)) score = 45;
    else {
      const haystack = normalizeTitle(
        [movie.director, String(movie.year), movie.country, movie.language, ...movie.genres.map((g) => GENRE_LABEL[g]), ...movie.tags.map(tagLabel)].join(' '),
      );
      const all = `${title} ${haystack}`;
      // Every term must appear somewhere ("nolan 2010", "korean thriller").
      if (terms.every((t) => all.includes(t))) score = normalizeTitle(movie.director).includes(query) ? 35 : 20;
    }
    if (score) scored.push({ movie, score });
  }
  return scored
    .sort((a, b) => b.score - a.score || b.movie.year - a.movie.year)
    .slice(0, limit)
    .map((s) => s.movie);
}
