import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import type { Logger } from '../logger';
import { MemoryStore } from './memoryStore';
import type { FeedbackEvent } from './types';

interface FileShape {
  version: 1;
  events: FeedbackEvent[];
}

/**
 * Memory store with write-behind persistence to a single JSON file.
 * Writes are debounced and atomic (temp file + rename), so a crash mid-write
 * never leaves a half-written database behind. Good for one instance; swap
 * for SQLite/Postgres behind the same interface when it needs to scale out.
 */
export class JsonFileStore extends MemoryStore {
  private timer: NodeJS.Timeout | null = null;
  private writing: Promise<void> = Promise.resolve();

  private constructor(
    private readonly file: string,
    private readonly logger: Logger,
    initial: FeedbackEvent[],
    private readonly debounceMs: number,
  ) {
    super(initial);
  }

  static async open(dir: string, logger: Logger, debounceMs = 1000): Promise<JsonFileStore> {
    await mkdir(dir, { recursive: true });
    const file = join(dir, 'community.json');
    let initial: FeedbackEvent[] = [];
    try {
      const parsed = JSON.parse(await readFile(file, 'utf8')) as Partial<FileShape>;
      if (parsed.version !== 1 || !Array.isArray(parsed.events)) throw new Error('unexpected file shape');
      initial = parsed.events.filter((e) => typeof e?.movieId === 'string' && typeof e.at === 'number');
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
        const backup = `${file}.corrupt-${Date.now()}`;
        await rename(file, backup).catch(() => undefined);
        logger.warn('community store was unreadable, starting fresh', { backup, error: String(error) });
      }
    }
    logger.info('community store ready', { file, events: initial.length });
    return new JsonFileStore(file, logger, initial, debounceMs);
  }

  protected override changed(): void {
    if (this.timer) return;
    this.timer = setTimeout(() => {
      this.timer = null;
      void this.flush();
    }, this.debounceMs);
    this.timer.unref();
  }

  override async flush(): Promise<void> {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
    const snapshot: FileShape = { version: 1, events: this.list.slice() };
    // Chain writes so two flushes never race on the temp file.
    this.writing = this.writing.then(async () => {
      const temp = `${this.file}.${process.pid}.tmp`;
      try {
        await writeFile(temp, JSON.stringify(snapshot));
        await rename(temp, this.file);
      } catch (error) {
        this.logger.error('could not persist community store', { error: String(error) });
      }
    });
    return this.writing;
  }
}
