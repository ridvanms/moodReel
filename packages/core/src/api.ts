import type { Dim, MovieSummary, Recommendation } from './types';

/** Response shapes shared by the Express API and the browser client: one contract, two implementations. */

export interface MovieDetails {
  movie: MovieSummary;
  similar: Array<{ movie: MovieSummary; similarity: number }>;
}

export interface PickResult {
  pick: Recommendation;
  /** Frames for the slot-machine animation; the winner sits at REEL_WINNER_INDEX. */
  reel: MovieSummary[];
  seed: number;
  alternatives: Recommendation[];
}

export interface CommunityStats {
  totalPicks: number;
  weekPicks: number;
  topWeek: Array<{ movie: MovieSummary; picks: number }>;
  /** Average of what people asked for this week, per dimension. Null until there is enough data. */
  mood: Partial<Record<Dim, number>> | null;
  moodSamples: number;
  updatedAt: string;
}

export interface FeedbackInput {
  clientId: string;
  movieId: string;
  verdict: 'watch' | 'skip';
  mood?: Partial<Record<Dim, number>>;
}

export interface ApiErrorBody {
  error: string;
  message: string;
  issues?: Array<{ path: string; message: string }>;
}
