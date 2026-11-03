import { GENRE_LABEL, type Genre, type OracleAnswer, type OracleState, type OracleStep } from '@moodreel/core';
import { useCallback, useEffect, useState } from 'react';
import { clientId } from '../lib/clientId';
import { withGenre } from '../lib/genres';
import { Link } from '../router';
import { useApi } from '../state/api';
import { useStore } from '../state/store';
import { Icon } from './Icon';
import { Poster } from './Poster';
import './Oracle.css';

const ANSWERS: Array<{ id: OracleAnswer; label: string }> = [
  { id: 'yes', label: 'Yes' },
  { id: 'probably', label: 'Probably' },
  { id: 'unknown', label: 'Don’t care' },
  { id: 'probablyNot', label: 'Probably not' },
  { id: 'no', label: 'No' },
];

/** `genre` is null for "any genre"; the genre is chosen on the step before the questions. */
export function Oracle({ genre }: { genre: Genre | null }) {
  const { api, catalog } = useApi();
  const { state: store, unseenQuery, dispatch } = useStore();
  const [history, setHistory] = useState<OracleStep[]>([]);
  const [state, setState] = useState<OracleState | null>(null);
  const [thinking, setThinking] = useState(false);
  const [error, setError] = useState('');

  const run = useCallback(
    async (steps: OracleStep[]) => {
      setThinking(true);
      try {
        setError('');
        setState(await api.oracle(steps, withGenre(unseenQuery, genre, catalog)));
      } catch (e) {
        setError((e as Error).message);
      } finally {
        setThinking(false);
      }
    },
    [api, catalog, genre, unseenQuery],
  );

  useEffect(() => {
    void run(history);
    // Only the answers and the genre restart the questions.
  }, [history, genre]);

  const answer = (id: OracleAnswer) => {
    if (!state?.question || thinking) return;
    const questionId = state.question.id;
    setHistory((h) => [...h, { questionId, answer: id }]);
  };

  const film = state?.done ? state.top[0]?.movie : undefined;
  const saved = film ? store.watchlist.includes(film.id) : false;
  const genreName = genre ? GENRE_LABEL[genre].toLowerCase() : 'any genre';

  return (
    <section className="oracle" aria-labelledby="oracle-title">
      <header className="oracle__head">
        <h1 id="oracle-title">The Oracle</h1>
        <p>
          Genre: <b>{genreName}</b> ·{' '}
          <Link to="/oracle" className="oracle__change">
            change
          </Link>
        </p>
      </header>

      {error && (
        <p className="oracle__error" role="alert">
          {error}
        </p>
      )}

      {state && !state.done && state.question && (
        <div className="oracle__card" key={state.question.id}>
          <span className="orb" aria-hidden="true" />
          <p className="oracle__number">Question {state.question.number}</p>
          <h2 className="oracle__question" aria-live="polite">
            {state.question.text}
          </h2>
          <div className="oracle__answers" role="group" aria-label="Your answer">
            {ANSWERS.map((a) => (
              <button key={a.id} type="button" className={`btn oracle__answer ${a.id === 'yes' ? 'btn--primary' : ''}`} onClick={() => answer(a.id)} disabled={thinking}>
                {a.label}
              </button>
            ))}
          </div>
          {history.length > 0 && (
            <button type="button" className="btn btn--ghost btn--small" onClick={() => setHistory((h) => h.slice(0, -1))}>
              ← Back
            </button>
          )}
        </div>
      )}

      {film && (
        <div className="oracle__result">
          <Link to={`/film/${film.id}`} className="oracle__poster" aria-label={film.title}>
            <Poster movie={film} size="lg" />
          </Link>
          <div className="oracle__info">
            <p className="oracle__number">The Oracle picked</p>
            <h2>{film.title}</h2>
            <p className="oracle__meta">
              {film.year} · {film.director} · {Math.floor(film.runtime / 60)} h {film.runtime % 60} min
            </p>
            <p className="oracle__blurb">{film.blurb}</p>
            <div className="oracle__actions">
              <button
                type="button"
                className={`btn ${saved ? 'is-saved' : 'btn--primary'}`}
                aria-pressed={saved}
                onClick={() => {
                  if (!saved) api.feedback({ clientId: clientId(), movieId: film.id, verdict: 'watch' }).catch(() => undefined);
                  dispatch({ type: 'toggleWatch', id: film.id });
                }}
              >
                <Icon name={saved ? 'check' : 'bookmark'} size={16} /> {saved ? 'In your watchlist' : 'Add to watchlist'}
              </button>
              <Link to={`/film/${film.id}`} className="btn">
                More about it
              </Link>
              <button type="button" className="btn btn--ghost" onClick={() => setHistory([])}>
                Start over
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
