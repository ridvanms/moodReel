import { useEffect, useState } from 'react';
import type { Api } from '../api';
import { Link, currentPath, useLocationHash } from '../router';
import { usePick } from '../state/pick';
import { useStore } from '../state/store';
import { Icon } from './Icon';
import { SearchBox } from './SearchBox';
import './Header.css';

export const NAV = [
  { to: '/', label: 'Home' },
  { to: '/discover', label: 'Mood lab' },
  { to: '/moods', label: 'Moods' },
  { to: '/browse', label: 'Browse' },
  { to: '/oracle', label: 'Oracle' },
  { to: '/atlas', label: 'Atlas' },
] as const;

export function isActive(to: string, path: string): boolean {
  return to === '/' ? path === '/' : path === to || path.startsWith(`${to}/`);
}

export function Header({ mode }: { mode: Api['mode'] }) {
  const hash = useLocationHash();
  const path = currentPath(hash);
  const { state, query } = useStore();
  const pick = usePick();
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
          <Link to="/list" className={`topbar__list ${isActive('/list', path) ? 'is-on' : ''}`} aria-label={`My list, ${state.watchlist.length} saved`}>
            <Icon name="bookmark" size={18} />
            <span className="topbar__list-label">My list</span>
            {state.watchlist.length > 0 && <span className="topbar__badge">{state.watchlist.length}</span>}
          </Link>
          <button type="button" className="btn btn--primary topbar__pick" onClick={() => pick({ query, label: 'Your current mood' })}>
            <Icon name="reel" size={16} />
            <span>Pick for me</span>
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
          {[...NAV, { to: '/list', label: 'My list' } as const].map((item, i) => (
            <Link key={item.to} to={item.to} className={`topbar__menu-link ${isActive(item.to, path) ? 'is-on' : ''}`} aria-current={isActive(item.to, path) ? 'page' : undefined}>
              <span className="mono">{String(i + 1).padStart(2, '0')}</span>
              {item.label}
              <Icon name="arrow" size={18} />
            </Link>
          ))}
        </nav>
      )}
    </header>
  );
}
