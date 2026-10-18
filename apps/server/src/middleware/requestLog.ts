import type { RequestHandler } from 'express';
import type { Logger } from '../logger';

export function requestLog(logger: Logger): RequestHandler {
  return (req, res, next) => {
    if (req.path === '/api/health') return next();
    const started = process.hrtime.bigint();
    res.on('finish', () => {
      const ms = Number(process.hrtime.bigint() - started) / 1e6;
      const data = { method: req.method, path: req.path, status: res.statusCode, ms: Math.round(ms * 10) / 10 };
      if (res.statusCode >= 500) logger.error('request', data);
      else if (req.path.startsWith('/api/')) logger.info('request', data);
      else logger.debug('request', data);
    });
    next();
  };
}
