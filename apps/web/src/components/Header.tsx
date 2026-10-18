import type { Api } from '../api';
import { Icon } from './Icon';
import './Header.css';

export type View = 'mood' | 'oracle' | 'list';

export function Header({ view, onView, saved, mode }: { view: View; onView: (v: View) => void; saved: number; mode: Api['mode'] }) {
  const items: Array<{ id: View; label: string }> = [
    { id: 'mood', label: 'Mood' },
    { id: 'oracle', label: 'Oracle' },
    { id: 'list', label: 'My list' },
  ];
  return (
    <header className="topbar">
      <div className="topbar__inner">
        <a className="brand" href="./" onClick={(e) => (e.preventDefault(), onView('mood'))}>
          <Icon name="reel" size={26} className="brand__mark" />
          <span className="brand__word">
            Mood<span>Reel</span>
          </span>
        </a>
        <nav className="topbar__nav" aria-label="Main navigation">
          {items.map((item) => (
            <button key={item.id} type="button" className={`topbar__link ${view === item.id ? 'is-on' : ''}`} aria-current={view === item.id ? 'page' : undefined} onClick={() => onView(item.id)}>
              {item.label}
              {item.id === 'list' && saved > 0 && <span className="topbar__badge">{saved}</span>}
            </button>
          ))}
        </nav>
        {mode === 'local' && (
          <span className="topbar__mode" title="The engine runs entirely in your browser">
            offline mode
          </span>
        )}
      </div>
    </header>
  );
}
