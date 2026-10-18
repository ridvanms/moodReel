import { resolve } from 'node:path';

function int(value: string | undefined, fallback: number): number {
  const parsed = Number.parseInt(value ?? '', 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export interface Config {
  port: number;
  host: string;
  env: 'development' | 'production' | 'test';
  /** Where community.json lives. */
  dataDir: string;
  /** Built web client to serve in production; empty to run as a pure API. */
  webDist: string;
  /** Number of proxy hops to trust for client IPs (rate limiting behind a load balancer). */
  trustProxy: number;
}

export function loadConfig(env: NodeJS.ProcessEnv = process.env): Config {
  const mode = env.NODE_ENV === 'production' ? 'production' : env.NODE_ENV === 'test' ? 'test' : 'development';
  return {
    port: int(env.PORT, 4000),
    host: env.HOST ?? '0.0.0.0',
    env: mode,
    dataDir: resolve(env.DATA_DIR ?? 'data'),
    webDist: env.WEB_DIST === '' ? '' : resolve(env.WEB_DIST ?? '../web/dist'),
    trustProxy: int(env.TRUST_PROXY, 0),
  };
}
