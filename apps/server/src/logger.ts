type Level = 'debug' | 'info' | 'warn' | 'error';
const ORDER: Record<Level, number> = { debug: 10, info: 20, warn: 30, error: 40 };

export interface Logger {
  debug(msg: string, data?: Record<string, unknown>): void;
  info(msg: string, data?: Record<string, unknown>): void;
  warn(msg: string, data?: Record<string, unknown>): void;
  error(msg: string, data?: Record<string, unknown>): void;
}

/**
 * JSON lines in production (easy to ship to any log store), readable lines in development.
 * Deliberately tiny: the API has no need for a logging framework.
 */
export function createLogger(options: { json: boolean; level?: Level; silent?: boolean }): Logger {
  const min = ORDER[options.level ?? 'info'];
  const write = (level: Level, msg: string, data?: Record<string, unknown>) => {
    if (options.silent || ORDER[level] < min) return;
    const stream = level === 'error' || level === 'warn' ? process.stderr : process.stdout;
    if (options.json) {
      stream.write(`${JSON.stringify({ time: new Date().toISOString(), level, msg, ...data })}\n`);
    } else {
      const extra = data && Object.keys(data).length ? ` ${JSON.stringify(data)}` : '';
      stream.write(`${new Date().toLocaleTimeString('en-GB')} ${level.toUpperCase().padEnd(5)} ${msg}${extra}\n`);
    }
  };
  return {
    debug: (msg, data) => write('debug', msg, data),
    info: (msg, data) => write('info', msg, data),
    warn: (msg, data) => write('warn', msg, data),
    error: (msg, data) => write('error', msg, data),
  };
}
