import { existsSync } from 'node:fs';
import { join } from 'node:path';
import type { Movie } from '@moodreel/core';
import { MOVIES, SUMMARIES } from '@moodreel/core/catalog';
import compression from 'compression';
import express, { type Express } from 'express';
import helmet from 'helmet';
import type { Logger } from './logger';
import { errorHandler, notFound } from './middleware/errors';
import { requestLog } from './middleware/requestLog';
import { createApiRouter } from './routes/api';
import type { FeedbackStore } from './store/types';

export interface AppOptions {
  store: FeedbackStore;
  logger: Logger;
  catalog?: readonly Movie[];
  /** Directory with the built web client. Served with an SPA fallback when present. */
  webDist?: string;
  trustProxy?: number;
  rateLimitPerMinute?: number;
}

export function createApp(options: AppOptions): Express {
  const app = express();
  const catalog = options.catalog ?? MOVIES;
  const summaries = options.catalog ? catalog.map(({ aliases: _a, ...m }) => m) : SUMMARIES;

  app.disable('x-powered-by');
  if (options.trustProxy) app.set('trust proxy', options.trustProxy);

  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          imgSrc: ["'self'", 'data:'],
          fontSrc: ["'self'", 'data:'],
          connectSrc: ["'self'"],
          objectSrc: ["'none'"],
          frameAncestors: ["'none'"],
        },
      },
      crossOriginEmbedderPolicy: false,
    }),
  );
  app.use(compression());
  app.use(requestLog(options.logger));
  app.use(express.json({ limit: '32kb' }));

  app.use('/api', createApiRouter({ catalog, summaries, store: options.store, ...(options.rateLimitPerMinute ? { rateLimitPerMinute: options.rateLimitPerMinute } : {}) }));
  app.use('/api', notFound);

  const indexHtml = options.webDist ? join(options.webDist, 'index.html') : '';
  if (indexHtml && existsSync(indexHtml)) {
    // Hashed bundles never change, so cache them forever; index.html always revalidates.
    app.use('/assets', express.static(join(options.webDist!, 'assets'), { immutable: true, maxAge: '1y', fallthrough: false }));
    app.use(express.static(options.webDist!, { index: false, maxAge: '1h' }));
    app.use((req, res, next) => {
      if (req.method !== 'GET' && req.method !== 'HEAD') return next();
      res.set('Cache-Control', 'no-cache');
      res.sendFile(indexHtml);
    });
    options.logger.info('serving web client', { dir: options.webDist });
  }

  app.use(notFound);
  app.use(errorHandler(options.logger));
  return app;
}
