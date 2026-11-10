import { useEffect, useState } from 'react';
import { Link, currentPath, useLocationHash } from '../router';
import { useStore } from '../state/store';
import { Icon } from './Icon';
import './Header.css';

const NAV = [
  { to: '/', label: 'Home' },
  { to: '/genres', label: 'Genres' },
  { to: '/oracle', label: 'Oracle' },
  { to: '/list', label: 'Watchlist' },
] as const;

function isActive(to: string, path: string): boolean {
  if (to === '/genres' && path.startsWith('/film/')) return true;
  return to === '/' ? path === '/' : path === to || path.startsWith(`${to}/`);
}

export function Header() {
  const hash = useLocationHash();
  const path = currentPath(hash);
  const { state } = useStore();
  const [menu, setMenu] = useState(false);

  useEffect(() => setMenu(false), [hash]);

  const links = NAV.map((item) => (
    <Link key={item.to} to={item.to} className={isActive(item.to, path) ? 'is-on' : ''} aria-current={isActive(item.to, path) ? 'page' : undefined}>
      {item.label}
      {item.to === '/list' && state.watchlist.length > 0 && <span className="topbar__badge">{state.watchlist.length}</span>}
    </Link>
  ));

  return (
    <header className="topbar">
      <div className="topbar__inner">
        <Link to="/" className="brand">
          Mood<span>Reel</span>
        </Link>
        <nav className="topbar__nav" aria-label="Main navigation">
          {links}
        </nav>
        <button type="button" className="topbar__burger" aria-label="Menu" aria-expanded={menu} onClick={() => setMenu((m) => !m)}>
          <Icon name={menu ? 'close' : 'menu'} />
        </button>
      </div>
      {menu && (
        <nav className="topbar__menu" aria-label="Main navigation">
          {links}
        </nav>
      )}
    </header>
  );
}
