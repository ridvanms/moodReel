import type {
  CommunityStats,
  FeedbackInput,
  MoodQuery,
  MovieDetails,
  MovieSummary,
  OracleState,
  OracleStep,
  ParseResult,
  PickResult,
  RecommendResult,
} from '@moodreel/core';

/** Everything the UI needs. Implemented by the HTTP client and by the in-browser engine. */
export interface Api {
  readonly mode: 'remote' | 'local';
  movies(): Promise<MovieSummary[]>;
  movie(id: string): Promise<MovieDetails>;
  parse(text: string): Promise<ParseResult>;
  recommend(query: MoodQuery, options?: { limit?: number; seed?: number; signal?: AbortSignal }): Promise<RecommendResult>;
  pick(query: MoodQuery, options?: { seed?: number }): Promise<PickResult>;
  oracle(history: OracleStep[], query?: MoodQuery): Promise<OracleState>;
  feedback(input: FeedbackInput): Promise<void>;
  /** Null when there is no shared backend to aggregate votes. */
  stats(): Promise<CommunityStats | null>;
}

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly code: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}
