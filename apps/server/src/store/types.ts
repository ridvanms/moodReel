import type { Dim } from '@moodreel/core';

export type Verdict = 'watch' | 'skip';

export interface FeedbackEvent {
  clientId: string;
  movieId: string;
  verdict: Verdict;
  /** Epoch milliseconds. */
  at: number;
  /** The targets the person asked for when they accepted the pick. Anonymous; used for the community mood. */
  mood?: Partial<Record<Dim, number>>;
}

export interface FeedbackStore {
  /** Returns false when the event duplicates a recent one from the same client. */
  add(event: FeedbackEvent): Promise<boolean>;
  events(): readonly FeedbackEvent[];
  /** Persist anything buffered. */
  flush(): Promise<void>;
  close(): Promise<void>;
}
