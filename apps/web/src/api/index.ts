import { createRemoteApi, probeRemote } from './remote';
import type { Api } from './types';

export type { Api } from './types';
export { ApiError } from './types';

/**
 * Picks the transport once at startup. A static build always runs locally;
 * otherwise we prefer the API and quietly fall back to the in-browser engine
 * (loaded on demand, with the catalog) if it does not answer.
 */
export async function createApi(): Promise<Api> {
  if (import.meta.env.VITE_API_MODE !== 'local' && (await probeRemote())) return createRemoteApi();
  const { createLocalApi } = await import('./local');
  return createLocalApi();
}
