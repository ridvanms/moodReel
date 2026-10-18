import { DIMS, type CommunitySignal, type CommunityStats, type Dim, type MovieSummary } from '@moodreel/core';
import type { FeedbackEvent } from '../store/types';

const DAY = 24 * 60 * 60 * 1000;
const SIGNAL_WINDOW = 30 * DAY;
const WEEK = 7 * DAY;

/**
 * Turns raw "I'll watch it" / "skip" votes into a ranking nudge.
 *
 * A Bayesian average with a Beta(2, 2) prior: a film with no votes sits at
 * exactly 0, one lucky vote can't rocket it to the top, and a long record
 * of skips slowly pulls it down. The engine applies this as at most ±5%.
 */
export function communitySignals(events: readonly FeedbackEvent[], now = Date.now()): Record<string, CommunitySignal> {
  const tally = new Map<string, { watch: number; skip: number }>();
  for (const e of events) {
    if (now - e.at > SIGNAL_WINDOW) continue;
    const t = tally.get(e.movieId) ?? { watch: 0, skip: 0 };
    t[e.verdict] += 1;
    tally.set(e.movieId, t);
  }
  const signals: Record<string, CommunitySignal> = {};
  for (const [movieId, { watch, skip }] of tally) {
    const mean = (watch + 2) / (watch + skip + 4);
    signals[movieId] = { boost: (mean - 0.5) * 2, picks: watch };
  }
  return signals;
}

export function communityStats(events: readonly FeedbackEvent[], catalog: ReadonlyMap<string, MovieSummary>, now = Date.now()): CommunityStats {
  const watches = events.filter((e) => e.verdict === 'watch');
  const week = watches.filter((e) => now - e.at <= WEEK);

  const counts = new Map<string, number>();
  for (const e of week) counts.set(e.movieId, (counts.get(e.movieId) ?? 0) + 1);
  const topWeek = [...counts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, 5)
    .flatMap(([id, picks]) => {
      const movie = catalog.get(id);
      return movie ? [{ movie, picks }] : [];
    });

  const sums: Partial<Record<Dim, { total: number; n: number }>> = {};
  let moodSamples = 0;
  for (const e of week) {
    if (!e.mood) continue;
    moodSamples += 1;
    for (const dim of DIMS) {
      const value = e.mood[dim];
      if (value === undefined) continue;
      const s = (sums[dim] ??= { total: 0, n: 0 });
      s.total += value;
      s.n += 1;
    }
  }
  const mood: Partial<Record<Dim, number>> = {};
  for (const dim of DIMS) {
    const s = sums[dim];
    if (s && s.n >= 2) mood[dim] = Math.round((s.total / s.n) * 10) / 10;
  }

  return {
    totalPicks: watches.length,
    weekPicks: week.length,
    topWeek,
    mood: moodSamples >= 3 && Object.keys(mood).length ? mood : null,
    moodSamples,
    updatedAt: new Date(now).toISOString(),
  };
}
