import { readJson, writeJson } from './storage';

const KEY = 'moodreel:client';

function uuid(): string {
  if (typeof crypto.randomUUID === 'function') return crypto.randomUUID();
  // RFC 4122 v4 from getRandomValues, for older browsers.
  const b = crypto.getRandomValues(new Uint8Array(16));
  b[6] = (b[6]! & 0x0f) | 0x40;
  b[8] = (b[8]! & 0x3f) | 0x80;
  const h = [...b].map((x) => x.toString(16).padStart(2, '0')).join('');
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
}

/** Anonymous, random id so one person's repeated votes count once. Never tied to an account. */
export function clientId(): string {
  const existing = readJson<string | null>(KEY, null);
  if (existing) return existing;
  const id = uuid();
  writeJson(KEY, id);
  return id;
}
