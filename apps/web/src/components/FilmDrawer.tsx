import { GENRE_LABEL, runtimeLabel, tagLabel, timecode, type MovieDetails } from '@moodreel/core';
import { useEffect, useState } from 'react';
import { useDialog } from '../hooks/useDialog';
import { imdbSearch, letterboxdSearch } from '../lib/format';
import { useApi } from '../state/api';
import { useStore } from '../state/store';
import { EndingReveal } from './EndingReveal';
import { Fingerprint } from './Fingerprint';
import { Icon } from './Icon';
import { Poster } from './Poster';
import './FilmDrawer.css';

const FLAGS = [
  ['gore', 'Gore and violence', 'No gore'],
  ['jumpscares', 'Jump scares', 'No jump scares'],
  ['animalDeath', 'An animal dies', 'No animal deaths'],
] as const;

export function FilmDrawer({ id, onClose, onOpen }: { id: string | null; onClose: () => void; onOpen: (id: string) => void }) {
  const { api, byId } = useApi();
  const { state, query, dispatch } = useStore();
  const ref = useDialog<HTMLDivElement>(Boolean(id), onClose);
  const [details, setDetails] = useState<MovieDetails | null>(null);

  useEffect(() => {
    if (!id) return;
    let alive = true;
    setDetails(null);
    api
      .movie(id)
      .then((d) => alive && setDetails(d))
      .catch(() => undefined);
    return () => {
      alive = false;
    };
  }, [api, id]);

  if (!id) return null;
  const movie = details?.movie ?? byId.get(id);
  if (!movie) return null;
  const saved = state.watchlist.includes(movie.id);
  const seen = state.seen.includes(movie.id);

  return (
    <div className="drawer" role="dialog" aria-modal="true" aria-labelledby="drawer-title" ref={ref}>
      <div className="drawer__backdrop" onClick={onClose} />
      <div className="drawer__panel">
        <button type="button" className="btn btn--icon btn--ghost drawer__close" onClick={onClose} aria-label="Close" data-autofocus>
          <Icon name="close" />
        </button>
        <div className="drawer__hero">
          <Poster movie={movie} size="lg" decorative={false} />
          <div className="drawer__intro">
            <p className="eyebrow">
              {movie.country} · {movie.language} · {movie.age === 0 ? 'all ages' : `${movie.age}+`}
            </p>
            <h2 id="drawer-title">{movie.title}</h2>
            <p className="drawer__meta mono">
              {movie.year} · {movie.director} · <span title={runtimeLabel(movie.runtime)}>{timecode(movie.runtime)}</span>
            </p>
            <p className="drawer__genres">{movie.genres.map((g) => GENRE_LABEL[g]).join(' / ')}</p>
            <p className="drawer__blurb">{movie.blurb}</p>
            <div className="drawer__actions">
              <button type="button" className={`btn ${saved ? 'is-saved' : 'btn--primary'}`} aria-pressed={saved} onClick={() => dispatch({ type: 'toggleWatch', id: movie.id })}>
                <Icon name={saved ? 'check' : 'bookmark'} size={16} /> {saved ? 'Saved' : 'Save for later'}
              </button>
              <button type="button" className="btn" aria-pressed={seen} onClick={() => dispatch({ type: 'toggleSeen', id: movie.id })}>
                <Icon name="eye" size={16} /> {seen ? 'Marked as seen' : 'Seen it'}
              </button>
            </div>
          </div>
        </div>

        <div className="drawer__grid">
          <section className="drawer__block">
            <Fingerprint movie={movie} query={query} />
          </section>
          <section className="drawer__block">
            <p className="eyebrow">No spoilers</p>
            <EndingReveal ending={movie.ending} />
            <ul className="drawer__flags">
              {FLAGS.map(([key, yes, no]) => (
                <li key={key} className={movie.flags[key] ? 'is-yes' : ''}>
                  <span aria-hidden="true">{movie.flags[key] ? '!' : '✓'}</span>
                  {movie.flags[key] ? yes : no}
                </li>
              ))}
            </ul>
            {movie.tags.length > 0 && (
              <>
                <p className="eyebrow">Themes</p>
                <p className="drawer__tags">{movie.tags.map(tagLabel).join(' · ')}</p>
              </>
            )}
            <p className="drawer__links">
              <a href={imdbSearch(movie.title, movie.year)} target="_blank" rel="noreferrer">
                IMDb <Icon name="external" size={12} />
              </a>
              <a href={letterboxdSearch(movie.title)} target="_blank" rel="noreferrer">
                Letterboxd <Icon name="external" size={12} />
              </a>
            </p>
          </section>
        </div>

        <section className="drawer__similar">
          <p className="eyebrow">If you like it, try</p>
          <ul>
            {(details?.similar ?? []).map(({ movie: m, similarity }) => (
              <li key={m.id}>
                <button type="button" onClick={() => onOpen(m.id)}>
                  <Poster movie={m} size="sm" />
                  <span className="drawer__similar-title">{m.title}</span>
                  <span className="mono drawer__similar-score">{similarity}% similar</span>
                </button>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  );
}
