import type { ErrorRequestHandler, RequestHandler } from 'express';
import { ZodError } from 'zod';
import type { Logger } from '../logger';

export class HttpError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
  ) {
    super(message);
  }
}

export const notFound: RequestHandler = (req, _res, next) => {
  next(new HttpError(404, 'not_found', `No such route: ${req.method} ${req.path}`));
};

/** One error shape for every failure: { error, message, issues? }. Clients never see stack traces. */
export function errorHandler(logger: Logger): ErrorRequestHandler {
  return (err, req, res, _next) => {
    if (err instanceof ZodError) {
      res.status(400).json({
        error: 'invalid_request',
        message: err.issues[0]?.message ?? 'Invalid request',
        issues: err.issues.map((i) => ({ path: i.path.join('.'), message: i.message })),
      });
      return;
    }
    if (err instanceof HttpError) {
      res.status(err.status).json({ error: err.code, message: err.message });
      return;
    }
    const type = (err as { type?: string }).type;
    if (type === 'entity.parse.failed') {
      res.status(400).json({ error: 'invalid_json', message: 'The request body is not valid JSON.' });
      return;
    }
    if (type === 'entity.too.large') {
      res.status(413).json({ error: 'too_large', message: 'The request is too large.' });
      return;
    }
    logger.error('unhandled error', { path: req.path, error: err instanceof Error ? err.stack : String(err) });
    res.status(500).json({ error: 'internal', message: 'Something went wrong on our side. Try again in a moment.' });
  };
}
