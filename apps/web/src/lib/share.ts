import type { Effect } from '@moodreel/core';

const KINDS = new Set(['dim', 'like', 'genre', 'tag', 'keyword', 'deal', 'runtime', 'era', 'animation']);

function toBase64Url(text: string): string {
  const bytes = new TextEncoder().encode(text);
  let binary = '';
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function fromBase64Url(encoded: string): string {
  const binary = atob(encoded.replace(/-/g, '+').replace(/_/g, '/'));
  return new TextDecoder().decode(Uint8Array.from(binary, (c) => c.charCodeAt(0)));
}

/** A link that reopens the same mood: the effect list, compacted into the query string. */
export function shareUrl(effects: readonly Effect[]): string {
  const url = new URL(window.location.href);
  url.search = '';
  url.hash = '';
  if (effects.length) url.searchParams.set('m', toBase64Url(JSON.stringify(effects)));
  return url.toString();
}

export function readSharedEffects(): Effect[] | null {
  try {
    const encoded = new URLSearchParams(window.location.search).get('m');
    if (!encoded) return null;
    const parsed: unknown = JSON.parse(fromBase64Url(encoded));
    if (!Array.isArray(parsed)) return null;
    const effects = parsed.filter((e): e is Effect => typeof e === 'object' && e !== null && KINDS.has((e as { kind?: string }).kind ?? ''));
    return effects.slice(0, 40);
  } catch {
    return null;
  }
}
