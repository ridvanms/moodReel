import { createApp } from './app';
import { loadConfig } from './config';
import { createLogger } from './logger';
import { JsonFileStore } from './store/jsonStore';

const config = loadConfig();
const logger = createLogger({ json: config.env === 'production', level: config.env === 'production' ? 'info' : 'debug' });

const store = await JsonFileStore.open(config.dataDir, logger);
const app = createApp({ store, logger, webDist: config.webDist, trustProxy: config.trustProxy });

const server = app.listen(config.port, config.host, () => {
  logger.info(`MoodReel API listening on http://localhost:${config.port}`, { env: config.env });
});

let shuttingDown = false;
async function shutdown(signal: string) {
  if (shuttingDown) return;
  shuttingDown = true;
  logger.info('shutting down', { signal });
  // Stop accepting connections, let in-flight requests finish, then persist.
  server.close(async () => {
    await store.close();
    process.exit(0);
  });
  setTimeout(() => process.exit(1), 10_000).unref();
}

process.on('SIGINT', () => void shutdown('SIGINT'));
process.on('SIGTERM', () => void shutdown('SIGTERM'));
process.on('unhandledRejection', (reason) => logger.error('unhandled rejection', { reason: String(reason) }));
