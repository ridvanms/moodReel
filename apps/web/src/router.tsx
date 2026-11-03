import { useEffect, useSyncExternalStore, type AnchorHTMLAttributes, type MouseEvent } from 'react';

/**
 * A tiny hash router. Hash URLs work everywhere the site is hosted, including
 * GitHub Pages and a single HTML file opened from disk, with no server rewrites.
 *
 *   #/                 home
 *   #/film/up-2009     a film
 *   #/oracle?genre=x   a page with its own query string
 */

export type Route =
  | { page: 'home' }
  | { page: 'genres' }
  | { page: 'genre'; genre: string; params: URLSearchParams }
  | { page: 'browse'; params: URLSearchParams }
  | { page: 'film'; id: string }
  | { page: 'oracle'; params: URLSearchParams }
  | { page: 'list' }
  | { page: 'swipe' }
  | { page: 'missing'; path: string };

export function parseLocation(hash: string): Route {
  const raw = hash.replace(/^#/, '') || '/';
  const [pathPart = '/', search = ''] = raw.split('?');
  const parts = pathPart.split('/').filter(Boolean).map(decodeURIComponent);
  const [head, arg] = parts;
  switch (head) {
    case undefined:
      return { page: 'home' };
    case 'genres':
      return arg ? { page: 'genre', genre: arg, params: new URLSearchParams(search) } : { page: 'genres' };
    case 'browse':
      return { page: 'browse', params: new URLSearchParams(search) };
    case 'film':
      return arg ? { page: 'film', id: arg } : { page: 'missing', path: raw };
    case 'oracle':
      return { page: 'oracle', params: new URLSearchParams(search) };
    case 'list':
      return { page: 'list' };
    case 'swipe':
      return { page: 'swipe' };
    default:
      return { page: 'missing', path: raw };
  }
}

const subscribe = (onChange: () => void) => {
  window.addEventListener('hashchange', onChange);
  return () => window.removeEventListener('hashchange', onChange);
};
const snapshot = () => window.location.hash;

export function useLocationHash(): string {
  return useSyncExternalStore(subscribe, snapshot, () => '');
}

export function useRoute(): Route {
  return parseLocation(useLocationHash());
}

/** `to` is an app path such as "/film/up-2009". */
export function href(to: string): string {
  return `#${to.startsWith('/') ? to : `/${to}`}`;
}

export function navigate(to: string, { replace = false } = {}): void {
  const next = href(to);
  if (next === window.location.hash) return;
  pushedHash = replace ? null : next;
  if (replace) {
    // replaceState does not fire hashchange, so tell the router ourselves.
    window.history.replaceState(window.history.state, '', next);
    window.dispatchEvent(new HashChangeEvent('hashchange'));
  } else {
    window.location.hash = next;
  }
}

export const openFilm = (id: string) => navigate(`/film/${encodeURIComponent(id)}`);

export function Link({ to, onClick, ...rest }: AnchorHTMLAttributes<HTMLAnchorElement> & { to: string }) {
  return (
    <a
      {...rest}
      href={href(to)}
      onClick={(event: MouseEvent<HTMLAnchorElement>) => {
        onClick?.(event);
        // Let the browser handle new tabs and windows.
        if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
        event.preventDefault();
        navigate(to);
      }}
    />
  );
}

/** The path part of the current hash, used to mark the active navigation item. */
export function currentPath(hash: string): string {
  return (hash.replace(/^#/, '') || '/').split('?')[0] ?? '/';
}

/**
 * Scroll to the top on new pages and back to where you were on Back/Forward.
 * Positions are remembered per URL for the session.
 */
export function useScrollRestoration(hash: string): void {
  // Query-string changes (filters) keep the scroll position; only a new page moves it.
  const path = currentPath(hash);
  useEffect(() => {
    if ('scrollRestoration' in window.history) window.history.scrollRestoration = 'manual';
  }, []);

  useEffect(() => {
    const key = `scroll:${path}`;
    let saved: number | null = null;
    try {
      const raw = sessionStorage.getItem(key);
      saved = raw ? Number(raw) : null;
    } catch {
      saved = null;
    }
    // A hash we did not push ourselves came from Back/Forward or a reload.
    const popped = pushedHash === null || currentPath(pushedHash) !== path;
    pushedHash = null;
    // Wait a frame so the new page has laid out before restoring.
    const frame = requestAnimationFrame(() => window.scrollTo({ top: popped && saved ? saved : 0, behavior: 'instant' as ScrollBehavior }));
    const save = () => {
      try {
        sessionStorage.setItem(key, String(Math.round(window.scrollY)));
      } catch {
        // Storage blocked: Back simply starts at the top.
      }
    };
    window.addEventListener('scroll', save, { passive: true });
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('scroll', save);
    };
  }, [path]);
}

/** The last hash set by navigate(); anything else arriving is history traversal. */
let pushedHash: string | null = null;
