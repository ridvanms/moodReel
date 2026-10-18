import type { ExclusionReason, MoodQuery, MovieSummary } from '../types';

/**
 * Hard filters. Returns the first rule that rules a film out, or null.
 * Order matters only for attribution in the pool report, so the most
 * personal reasons (already seen, the reference itself) come first.
 */
export function exclusionReason(movie: MovieSummary, query: MoodQuery): ExclusionReason | null {
  const d = query.dealbreakers;

  if (query.exclude.includes(movie.id)) return 'seen';
  if (query.like.includes(movie.id)) return 'reference';

  if (d.happyOnly && movie.ending !== 'happy') return movie.ending === 'sad' || movie.ending === 'bleak' ? 'sadEnding' : 'notHappy';
  if (d.noSadEnding && (movie.ending === 'sad' || movie.ending === 'bleak')) return 'sadEnding';
  if (d.noGore && movie.flags.gore) return 'gore';
  if (d.noJumpscares && movie.flags.jumpscares) return 'jumpscares';
  if (d.noAnimalDeath && movie.flags.animalDeath) return 'animalDeath';
  if (d.familyFriendly && movie.age > 0) return 'family';

  if (d.maxRuntime !== undefined && movie.runtime > d.maxRuntime) return 'tooLong';
  if (d.minRuntime !== undefined && movie.runtime < d.minRuntime) return 'tooShort';
  if (d.minYear !== undefined && movie.year < d.minYear) return 'tooOld';
  if (d.maxYear !== undefined && movie.year > d.maxYear) return 'tooNew';

  const animated = movie.genres.includes('animation');
  if (d.animation === 'only' && !animated) return 'notAnimation';
  if (d.animation === 'exclude' && animated) return 'animation';

  if (query.genres.exclude.some((g) => movie.genres.includes(g))) return 'genre';
  return null;
}
