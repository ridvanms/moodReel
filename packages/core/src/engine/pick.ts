import type { Rng } from '../math';
import type { MovieSummary, Recommendation } from '../types';

export interface PickOptions {
  /** How many of the best matches are in the draw. */
  top?: number;
  /** Softmax temperature in score points: low = almost always #1, high = more surprises. */
  temperature?: number;
}

/**
 * Weighted draw among the best matches. A strict "always #1" feels robotic;
 * a uniform draw ignores the ranking. Softmax over score sits in between.
 */
export function pickOne(results: readonly Recommendation[], rng: Rng, options: PickOptions = {}): Recommendation | null {
  const pool = results.slice(0, options.top ?? 6);
  if (pool.length === 0) return null;
  const temperature = options.temperature ?? 6;
  const best = pool[0]!.score;
  const weights = pool.map((r) => Math.exp((r.score - best) / temperature));
  const total = weights.reduce((sum, w) => sum + w, 0);
  let roll = rng() * total;
  for (let i = 0; i < pool.length; i++) {
    roll -= weights[i]!;
    if (roll <= 0) return pool[i]!;
  }
  return pool[pool.length - 1]!;
}

export const REEL_LENGTH = 32;
/** The winning frame sits near the end so the reel has room to decelerate into it. */
export const REEL_WINNER_INDEX = 27;

/** Frames for the slot-machine animation, with the winner at a fixed index. */
export function buildReel(winner: MovieSummary, pool: readonly MovieSummary[], rng: Rng): MovieSummary[] {
  const others = pool.filter((m) => m.id !== winner.id);
  const source = others.length ? others : [winner];
  const reel: MovieSummary[] = [];
  let previous: string | null = null;
  for (let i = 0; i < REEL_LENGTH; i++) {
    if (i === REEL_WINNER_INDEX) {
      reel.push(winner);
      previous = winner.id;
      continue;
    }
    let next = source[Math.floor(rng() * source.length)]!;
    if (next.id === previous && source.length > 1) next = source[(source.indexOf(next) + 1) % source.length]!;
    reel.push(next);
    previous = next.id;
  }
  return reel;
}
