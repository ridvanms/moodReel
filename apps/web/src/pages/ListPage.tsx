import type { MovieSummary } from '@moodreel/core';
import { useState } from 'react';
import { Icon } from '../components/Icon';
import { Poster } from '../components/Poster';
import { Link } from '../router';
import { useApi } from '../state/api';
import { useStore } from '../state/store';
import './ListPage.css';

type Tab = 'watch' | 'seen';

export function ListPage() {
  const { byId } = useApi();
  const { state, dispatch } = useStore();
  const [tab, setTab] = useState<Tab>('watch');
  const saved = state.watchlist.map((id) => byId.get(id)).filter((m): m is MovieSummary => m !== undefined);
  const seen = state.seen.map((id) => byId.get(id)).filter((m): m is MovieSummary => m !== undefined);
  const films = tab === 'watch' ? saved : seen;

  return (
    <div className="page list">
      <header className="page-head">
        <h1>Watchlist</h1>
      </header>

      <div className="list__tabs" role="tablist" aria-label="Lists">
        <button type="button" role="tab" aria-selected={tab === 'watch'} className={`list__tab ${tab === 'watch' ? 'is-on' : ''}`} onClick={() => setTab('watch')}>
          To watch ({saved.length})
        </button>
        <button type="button" role="tab" aria-selected={tab === 'seen'} className={`list__tab ${tab === 'seen' ? 'is-on' : ''}`} onClick={() => setTab('seen')}>
          Seen ({seen.length})
        </button>
      </div>

      {films.length === 0 ? (
        <div className="empty">
          {tab === 'watch' ? (
            <>
              <h3>Nothing here yet</h3>
              <p>Save a film and it will show up here.</p>
              <p>
                <Link to="/oracle" className="btn btn--primary">
                  <Icon name="orb" size={16} /> Ask the Oracle
                </Link>
              </p>
            </>
          ) : (
            <>
              <h3>No seen films</h3>
              <p>Films you mark as seen go here, and the Oracle won’t suggest them again.</p>
            </>
          )}
        </div>
      ) : (
        <ul className="list__rows">
          {films.map((m) => (
            <li key={m.id} className="list__row">
              <Link to={`/film/${m.id}`} className="list__poster" aria-label={m.title}>
                <Poster movie={m} size="sm" />
              </Link>
              <div className="list__info">
                <Link to={`/film/${m.id}`} className="list__title">
                  {m.title}
                </Link>
                <p className="list__meta">
                  {m.year} · {m.director}
                </p>
              </div>
              <div className="list__actions">
                {tab === 'watch' ? (
                  <>
                    <button type="button" className="btn btn--small" onClick={() => dispatch({ type: 'toggleSeen', id: m.id })}>
                      <Icon name="check" size={14} /> Watched
                    </button>
                    <button type="button" className="btn btn--small btn--ghost" onClick={() => dispatch({ type: 'toggleWatch', id: m.id })} aria-label={`Remove ${m.title}`}>
                      Remove
                    </button>
                  </>
                ) : (
                  <button type="button" className="btn btn--small btn--ghost" onClick={() => dispatch({ type: 'toggleSeen', id: m.id })}>
                    Not seen
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
