import { timecode } from '@moodreel/core';
import { useApi } from '../state/api';
import { useStore } from '../state/store';
import { Icon } from './Icon';
import { Poster } from './Poster';
import './Watchlist.css';

export function Watchlist({ onOpen }: { onOpen: (id: string) => void }) {
  const { byId } = useApi();
  const { state, dispatch } = useStore();
  const saved = state.watchlist.map((id) => byId.get(id)).filter((m) => m !== undefined);
  const seen = state.seen.map((id) => byId.get(id)).filter((m) => m !== undefined);
  const totalMinutes = saved.reduce((sum, m) => sum + m.runtime, 0);

  return (
    <section className="watch" aria-labelledby="watch-title">
      <header>
        <p className="eyebrow">My list</p>
        <h2 id="watch-title">To watch</h2>
        {saved.length > 0 && (
          <p className="watch__total">
            {saved.length} {saved.length === 1 ? 'film' : 'films'} · <span className="mono">{timecode(totalMinutes)}</span> of screen time
          </p>
        )}
      </header>
      {saved.length === 0 ? (
        <p className="watch__empty">Nothing yet. Press “Save” on a film, or “I’ll watch it!” after the reel, and it will wait for you here.</p>
      ) : (
        <ul className="watch__grid">
          {saved.map((m) => (
            <li key={m.id} className="watch__item">
              <button type="button" className="watch__poster" onClick={() => onOpen(m.id)} aria-label={`Details for ${m.title}`}>
                <Poster movie={m} />
              </button>
              <div className="watch__row">
                <button type="button" className="btn btn--small" onClick={() => dispatch({ type: 'toggleSeen', id: m.id })}>
                  <Icon name="check" size={14} /> Watched
                </button>
                <button type="button" className="btn btn--small btn--ghost" onClick={() => dispatch({ type: 'toggleWatch', id: m.id })} aria-label={`Remove ${m.title}`}>
                  <Icon name="close" size={14} />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
      {seen.length > 0 && (
        <details className="watch__seen">
          <summary>
            Seen ({seen.length}) <span className="watch__seen-note">– no longer suggested</span>
          </summary>
          <ul>
            {seen.map((m) => (
              <li key={m.id}>
                <span>
                  {m.title} <span className="mono">{m.year}</span>
                </span>
                <button type="button" className="btn btn--small btn--ghost" onClick={() => dispatch({ type: 'toggleSeen', id: m.id })}>
                  Suggest it again
                </button>
              </li>
            ))}
          </ul>
        </details>
      )}
    </section>
  );
}
