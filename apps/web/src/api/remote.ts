import type { ApiErrorBody } from '@moodreel/core';
import { ApiError, type Api } from './types';

const TIMEOUT_MS = 8000;

async function request<T>(path: string, init: RequestInit & { json?: unknown } = {}): Promise<T> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(new DOMException('timeout', 'TimeoutError')), TIMEOUT_MS);
  // Respect a caller's own abort (a newer query superseding this one).
  init.signal?.addEventListener('abort', () => controller.abort(init.signal?.reason), { once: true });
  try {
    const res = await fetch(`/api${path}`, {
      ...init,
      signal: controller.signal,
      headers: { Accept: 'application/json', ...(init.json !== undefined ? { 'Content-Type': 'application/json' } : {}), ...init.headers },
      body: init.json !== undefined ? JSON.stringify(init.json) : init.body ?? null,
    });
    if (!res.ok) {
      const body = (await res.json().catch(() => null)) as ApiErrorBody | null;
      throw new ApiError(body?.message ?? `The server returned error ${res.status}.`, res.status, body?.error ?? 'http_error');
    }
    return (await res.json()) as T;
  } catch (error) {
    if (error instanceof ApiError) throw error;
    if ((error as Error).name === 'AbortError' && init.signal?.aborted) throw error;
    throw new ApiError('Cannot reach the server.', 0, 'network');
  } finally {
    clearTimeout(timeout);
  }
}

export function createRemoteApi(): Api {
  return {
    mode: 'remote',
    movies: async () => (await request<{ movies: Awaited<ReturnType<Api['movies']>> }>('/movies')).movies,
    movie: (id) => request(`/movies/${encodeURIComponent(id)}`),
    parse: (text) => request('/parse', { method: 'POST', json: { text } }),
    recommend: (query, options = {}) =>
      request('/recommend', { method: 'POST', json: { query, limit: options.limit ?? 12, seed: options.seed }, ...(options.signal ? { signal: options.signal } : {}) }),
    pick: (query, options = {}) => request('/pick', { method: 'POST', json: { query, seed: options.seed } }),
    oracle: (history, query) => request('/oracle', { method: 'POST', json: { history, query } }),
    feedback: async (input) => {
      await request('/feedback', { method: 'POST', json: input });
    },
    stats: () => request('/stats'),
  };
}

/** True when an API server answers; used to fall back to the in-browser engine. */
export async function probeRemote(): Promise<boolean> {
  try {
    const res = await fetch('/api/health', { signal: AbortSignal.timeout(2500) });
    return res.ok && (res.headers.get('content-type') ?? '').includes('json');
  } catch {
    return false;
  }
}
