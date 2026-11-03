import { useEffect, useState } from 'react';
import type { Api } from '../api';
import { Link, currentPath, useLocationHash } from '../router';
import { useStore } from '../state/store';
import { Icon } from './Icon';
import { SearchBox } from './SearchBox';
import './Header.css';

export const NAV = [
  { to: '/', label: 'Home' },
  { to: '/genres', label: 'Genres' },
  { to: '/oracle', label: 'Oracle' },
  { to: '/list', label: 'Watchlist' },
] as const;

export function isActive(to: string, path: string): boolean {
  if (to === '/genres' && path === '/browse') return true;
  return to === '/' ? path === '/' : path === to || path.startsWith(`${to}/`);
}

export function Header({ mode }: { mode: Api['mode'] }) {
  const hash = useLocationHash();
  const path = currentPath(hash);
  const { state } = useStore();
  const [menu, setMenu] = useState(false);
  const [searching, setSearching] = useState(false);

  // Any navigation closes the mobile panels.
  useEffect(() => {
    setMenu(false);
    setSearching(false);
  }, [hash]);

  useEffect(() => {
    if (!menu) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setMenu(false);
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [menu]);

  return (
    <header className={`topbar ${menu ? 'is-menu' : ''}`}>
      <div className="topbar__inner">
        <Link to="/" className="brand" aria-label="MoodReel home">
          <span className="brand__mark" aria-hidden="true">
            <Icon name="reel" size={22} />
          </span>
          <span className="brand__word">
            Mood<span>Reel</span>
          </span>
        </Link>

        <nav className="topbar__nav" aria-label="Main navigation">
          {NAV.map((item) => (
            <Link key={item.to} to={item.to} className={`topbar__link ${isActive(item.to, path) ? 'is-on' : ''}`} aria-current={isActive(item.to, path) ? 'page' : undefined}>
              {item.label}
              {item.to === '/list' && state.watchlist.length > 0 && <span className="topbar__badge">{state.watchlist.length}</span>}
            </Link>
          ))}
        </nav>

        <div className="topbar__search">
          <SearchBox />
        </div>

        <div className="topbar__tools">
          {mode === 'local' && (
            <span className="topbar__mode" title="The recommendation engine runs entirely in your browser">
              offline engine
            </span>
          )}
          <button type="button" className="btn btn--icon btn--ghost topbar__search-toggle" aria-label="Search" aria-expanded={searching} onClick={() => setSearching((s) => !s)}>
            <Icon name={searching ? 'close' : 'search'} />
          </button>
          <button type="button" className="btn btn--icon btn--ghost topbar__burger" aria-label="Menu" aria-expanded={menu} aria-controls="mobile-menu" onClick={() => setMenu((m) => !m)}>
            <Icon name={menu ? 'close' : 'menu'} />
          </button>
        </div>
      </div>

      {searching && (
        <div className="topbar__drop">
          <SearchBox autoFocus onDone={() => setSearching(false)} />
        </div>
      )}

      {menu && (
        <nav id="mobile-menu" className="topbar__menu" aria-label="Main navigation">
          {NAV.map((item, i) => (
            <Link key={item.to} to={item.to} className={`topbar__menu-link ${isActive(item.to, path) ? 'is-on' : ''}`} aria-current={isActive(item.to, path) ? 'page' : undefined}>
              <span className="mono">{String(i + 1).padStart(2, '0')}</span>
              <span>
                {item.label}
                {item.to === '/list' && state.watchlist.length > 0 && <span className="topbar__badge">{state.watchlist.length}</span>}
              </span>
              <Icon name="arrow" size={18} />
            </Link>
          ))}
        </nav>
      )}
    </header>
  );
}
