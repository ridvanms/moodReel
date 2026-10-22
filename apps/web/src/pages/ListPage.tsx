import { buildQuery, runtimeLabel, type MovieSummary } from '@moodreel/core';
import { useState } from 'react';
import { Icon } from '../components/Icon';
import { Poster } from '../components/Poster';
import { Link } from '../router';
import { useApi } from '../state/api';
import { usePick } from '../state/pick';
import { useStore } from '../state/store';
import './ListPage.css';

type Tab = 'watch' | 'seen';

export function ListPage() {
  const { catalog, byId } = useApi();
  const { state, dispatch } = useStore();
  const pick = usePick();
  const [tab, setTab] = useState<Tab>('watch');
  const saved = state.watchlist.map((id) => byId.get(id)).filter((m): m is MovieSummary => m !== undefined);
  const seen = state.seen.map((id) => byId.get(id)).filter((m): m is MovieSummary => m !== undefined);
  const totalMinutes = saved.reduce((sum, m) => sum + m.runtime, 0);

  // The reel only spins over your list: everything else is excluded.
  const spinList = () => {
    const keep = new Set(state.watchlist);
    pick({ query: buildQuery([], catalog.filter((m) => !keep.has(m.id)).map((m) => m.id)), label: 'From my list' });
  };

  return (
    <div className="page list">
      <header className="page-head list__head">
        <p className="kicker">My list</p>
        <h1>
          Saved for <em>later</em>
        </h1>
        <p className="page-head__lead">Kept in this browser only, no account needed. Films you mark as seen stop being suggested anywhere on the site.</p>
      </header>

      <div className="list__bar">
        <div className="list__tabs" role="tablist" aria-label="Lists">
          <button type="button" role="tab" aria-selected={tab === 'watch'} className={`list__tab ${tab === 'watch' ? 'is-on' : ''}`} onClick={() => setTab('watch')}>
            To watch <span className="mono">{saved.length}</span>
          </button>
          <button type="button" role="tab" aria-selected={tab === 'seen'} className={`list__tab ${tab === 'seen' ? 'is-on' : ''}`} onClick={() => setTab('seen')}>
            Seen <span className="mono">{seen.length}</span>
          </button>
        </div>
        {tab === 'watch' && saved.length > 0 && (
          <div className="list__summary">
            <span>
              <b>{runtimeLabel(totalMinutes)}</b> of screen time
            </span>
            <button type="button" className="btn btn--primary" onClick={spinList} disabled={saved.length < 2}>
              <Icon name="reel" size={16} /> Spin my list
            </button>
          </div>
        )}
      </div>

      {tab === 'watch' &&
        (saved.length === 0 ? (
          <div className="empty list__empty">
            <h3>Nothing saved yet</h3>
            <p>Press “Save” on any poster, or “I’ll watch it!” when the reel stops, and the film will wait for you here.</p>
            <p>
              <Link to="/moods" className="btn btn--primary">
                Find something by mood <Icon name="arrow" size={16} />
              </Link>
            </p>
          </div>
        ) : (
          <ol className="list__rows">
            {saved.map((m, i) => (
              <li key={m.id} className="list__row">
                <span className="list__n mono">{String(i + 1).padStart(2, '0')}</span>
                <Link to={`/film/${m.id}`} className="list__poster" aria-label={m.title}>
                  <Poster movie={m} size="sm" />
                </Link>
                <div className="list__info">
                  <Link to={`/film/${m.id}`} className="list__title">
                    {m.title}
                  </Link>
                  <p className="list__meta mono">
                    {m.year} · {m.director} · {runtimeLabel(m.runtime)}
                  </p>
                  <p className="list__blurb">{m.blurb}</p>
                </div>
                <div className="list__actions">
                  <button type="button" className="btn btn--small" onClick={() => dispatch({ type: 'toggleSeen', id: m.id })}>
                    <Icon name="check" size={14} /> Watched
                  </button>
                  <button type="button" className="btn btn--small btn--ghost" onClick={() => dispatch({ type: 'toggleWatch', id: m.id })} aria-label={`Remove ${m.title}`}>
                    <Icon name="close" size={14} /> Remove
                  </button>
                </div>
              </li>
            ))}
          </ol>
        ))}

      {tab === 'seen' &&
        (seen.length === 0 ? (
          <div className="empty list__empty">
            <h3>No seen films yet</h3>
            <p>Mark a film as seen and it stops appearing in moods, picks and the Oracle.</p>
          </div>
        ) : (
          <ul className="list__seen">
            {seen.map((m) => (
              <li key={m.id}>
                <Link to={`/film/${m.id}`} className="list__seen-title">
                  {m.title} <span className="mono">{m.year}</span>
                </Link>
                <button type="button" className="btn btn--small btn--ghost" onClick={() => dispatch({ type: 'toggleSeen', id: m.id })}>
                  Suggest it again
                </button>
              </li>
            ))}
          </ul>
        ))}
    </div>
  );
}
