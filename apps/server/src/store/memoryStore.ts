import type { FeedbackEvent, FeedbackStore } from './types';

/** One person voting the same way on the same film within this window counts once. */
export const DEDUPE_WINDOW_MS = 6 * 60 * 60 * 1000;
export const MAX_EVENTS = 20_000;

export class MemoryStore implements FeedbackStore {
  protected list: FeedbackEvent[];

  constructor(initial: FeedbackEvent[] = []) {
    this.list = initial.slice(-MAX_EVENTS);
  }

  async add(event: FeedbackEvent): Promise<boolean> {
    const duplicate = this.list.some(
      (e) => e.clientId === event.clientId && e.movieId === event.movieId && e.verdict === event.verdict && event.at - e.at < DEDUPE_WINDOW_MS,
    );
    if (duplicate) return false;
    this.list.push(event);
    if (this.list.length > MAX_EVENTS) this.list.splice(0, this.list.length - MAX_EVENTS);
    this.changed();
    return true;
  }

  events(): readonly FeedbackEvent[] {
    return this.list;
  }

  /** Hook for persistent subclasses. */
  protected changed(): void {}

  async flush(): Promise<void> {}

  async close(): Promise<void> {
    await this.flush();
  }
}
