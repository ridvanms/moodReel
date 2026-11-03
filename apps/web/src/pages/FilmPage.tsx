import { GENRE_LABEL, runtimeLabel, tagLabel, timecode, type MovieDetails } from '@moodreel/core';
import { useEffect, useState, type CSSProperties } from 'react';
import { EndingReveal } from '../components/EndingReveal';
import { Fingerprint } from '../components/Fingerprint';
import { Icon } from '../components/Icon';
import { Poster } from '../components/Poster';
import { Shelf } from '../components/Shelf';
import { imdbSearch, letterboxdSearch } from '../lib/format';
import { Link, navigate } from '../router';
import { useApi } from '../state/api';
import { useStore } from '../state/store';
import { NotFoundPage } from './NotFoundPage';
import './FilmPage.css';

const FLAGS = [
  ['gore', 'Gore and violence', 'No gore'],
  ['jumpscares', 'Jump scares', 'No jump scares'],
  ['animalDeath', 'An animal dies', 'No animal deaths'],
] as const;

export function FilmPage({ id }: { id: string }) {
  const { api, byId } = useApi();
  const { state, query, dispatch } = useStore();
  const [details, setDetails] = useState<MovieDetails | null>(null);
  const movie = byId.get(id);

  useEffect(() => {
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

  useEffect(() => {
    if (movie) document.title = `${movie.title} (${movie.year}) · MoodReel`;
    return () => {
      document.title = 'MoodReel – pick a film by how you feel';
    };
  }, [movie]);

  if (!movie) return <NotFoundPage />;
  const saved = state.watchlist.includes(movie.id);
  const seen = state.seen.includes(movie.id);
  const [bg, a, b] = movie.palette;
  const hasWish = Object.keys(query.dims).length > 0;


  return (
    <article className="film" style={{ '--f-bg': bg, '--f-a': a, '--f-b': b } as CSSProperties}>
      <header className="film__hero">
        <div className="film__backdrop" aria-hidden="true" />
        <div className="film__hero-inner">
          <nav className="film__crumbs" aria-label="Breadcrumb">
            <Link to="/genres">Genres</Link>
            <span aria-hidden="true">/</span>
            <Link to={`/genres/${movie.genres[0]}`}>{GENRE_LABEL[movie.genres[0]!]}</Link>
            <span aria-hidden="true">/</span>
            <span aria-current="page">{movie.title}</span>
          </nav>
          <div className="film__top">
            <div className="film__poster">
              <Poster movie={movie} size="lg" decorative={false} />
            </div>
            <div className="film__intro">
              <p className="eyebrow">
                {movie.country} · {movie.language} · {movie.age === 0 ? 'all ages' : `${movie.age}+`}
              </p>
              <h1>{movie.title}</h1>
              <p className="film__meta mono">
                <span>{movie.year}</span>
                <span>{movie.director}</span>
                <span title={runtimeLabel(movie.runtime)}>{timecode(movie.runtime)}</span>
              </p>
              <ul className="film__genres">
                {movie.genres.map((g) => (
                  <li key={g}>
                    <Link to={`/genres/${g}`} className="gchip">
                      {GENRE_LABEL[g]}
                    </Link>
                  </li>
                ))}
              </ul>
              <p className="film__blurb">{movie.blurb}</p>
              <div className="film__actions">
                <button type="button" className={`btn ${saved ? 'is-saved' : 'btn--primary'}`} aria-pressed={saved} onClick={() => dispatch({ type: 'toggleWatch', id: movie.id })}>
                  <Icon name={saved ? 'check' : 'bookmark'} size={16} /> {saved ? 'In your watchlist' : 'Add to watchlist'}
                </button>
                <button type="button" className="btn" aria-pressed={seen} onClick={() => dispatch({ type: 'toggleSeen', id: movie.id })}>
                  <Icon name="eye" size={16} /> {seen ? 'Marked as seen' : 'Seen it'}
                </button>
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="page film__body">
        <div className="film__grid">
          <section className="film__panel" aria-label="Mood fingerprint">
            <Fingerprint movie={movie} query={query} />
            {hasWish && (
              <p className="film__note">
                Blue bands are your current mood from the{' '}
                <Link to="/discover" className="film__inline">
                  Mood lab
                </Link>
                .
              </p>
            )}
          </section>

          <section className="film__panel film__facts" aria-label="Without spoilers">
            <p className="eyebrow">No spoilers</p>
            <EndingReveal ending={movie.ending} />
            <ul className="film__flags">
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
                <ul className="film__tags">
                  {movie.tags.map((t) => (
                    <li key={t}>
                      <Link to={`/browse?q=${encodeURIComponent(tagLabel(t))}`} className="chip">
                        {tagLabel(t)}
                      </Link>
                    </li>
                  ))}
                </ul>
              </>
            )}
            <p className="film__links">
              <a href={imdbSearch(movie.title, movie.year)} target="_blank" rel="noreferrer">
                IMDb <Icon name="external" size={12} />
              </a>
              <a href={letterboxdSearch(movie.title)} target="_blank" rel="noreferrer">
                Letterboxd <Icon name="external" size={12} />
              </a>
            </p>
          </section>
        </div>

        <Shelf
          kicker="Closest in mood and theme"
          title="If you like it, try"
          loading={!details}
          items={(details?.similar ?? []).map((s) => ({ movie: s.movie, score: s.similarity }))}
          more={{ to: `/genres/${movie.genres[0]}`, label: `More ${GENRE_LABEL[movie.genres[0]!].toLowerCase()}` }}
        />
        <p className="film__back">
          <button type="button" className="link-arrow link-arrow--button" onClick={() => (window.history.length > 1 ? window.history.back() : navigate('/browse'))}>
            <Icon name="arrow" size={14} className="flip" /> Back
          </button>
        </p>
      </div>
    </article>
  );
}
