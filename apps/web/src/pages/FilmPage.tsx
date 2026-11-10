import { GENRE_LABEL, type MovieDetails } from '@moodreel/core';
import { useEffect, useState, type CSSProperties } from 'react';
import { Icon } from '../components/Icon';
import { Poster } from '../components/Poster';
import { PosterCard } from '../components/PosterCard';
import { imdbSearch, letterboxdSearch } from '../lib/format';
import { Link } from '../router';
import { useApi } from '../state/api';
import { useStore } from '../state/store';
import { NotFoundPage } from './NotFoundPage';
import './FilmPage.css';

const WARNINGS = [
  ['gore', 'blood and violence'],
  ['jumpscares', 'jump scares'],
  ['animalDeath', 'an animal dies'],
] as const;

export function FilmPage({ id }: { id: string }) {
  const { api, byId } = useApi();
  const { state, dispatch } = useStore();
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
      document.title = 'MoodReel';
    };
  }, [movie]);

  if (!movie) return <NotFoundPage />;
  const saved = state.watchlist.includes(movie.id);
  const seen = state.seen.includes(movie.id);
  const warnings = WARNINGS.filter(([key]) => movie.flags[key]).map(([, text]) => text);
  const hours = `${Math.floor(movie.runtime / 60)} h ${movie.runtime % 60} min`;

  return (
    <article className="page film" style={{ '--f-a': movie.palette[1] } as CSSProperties}>
      <p className="film__crumbs">
        <Link to="/genres">Genres</Link> / <Link to={`/genres/${movie.genres[0]}`}>{GENRE_LABEL[movie.genres[0]!]}</Link>
      </p>
      <div className="film__top">
        <div className="film__poster">
          <Poster movie={movie} size="lg" decorative={false} />
        </div>
        <div className="film__intro">
          <h1>{movie.title}</h1>
          <p className="film__meta">
            {movie.year} · {movie.director} · {hours} · {movie.age === 0 ? 'all ages' : `${movie.age}+`}
          </p>
          <p className="film__genres">
            {movie.genres.map((g, i) => (
              <span key={g}>
                {i > 0 && ', '}
                <Link to={`/genres/${g}`}>{GENRE_LABEL[g]}</Link>
              </span>
            ))}
          </p>
          <p className="film__blurb">{movie.blurb}</p>
          {warnings.length > 0 && <p className="film__warn">Heads up: {warnings.join(', ')}.</p>}
          <div className="film__actions">
            <button type="button" className={`btn ${saved ? 'is-saved' : 'btn--primary'}`} aria-pressed={saved} onClick={() => dispatch({ type: 'toggleWatch', id: movie.id })}>
              <Icon name={saved ? 'check' : 'bookmark'} size={16} /> {saved ? 'In your watchlist' : 'Add to watchlist'}
            </button>
            <button type="button" className="btn" aria-pressed={seen} onClick={() => dispatch({ type: 'toggleSeen', id: movie.id })}>
              <Icon name="eye" size={16} /> {seen ? 'Seen' : 'I’ve seen it'}
            </button>
          </div>
          <p className="film__links">
            <a href={imdbSearch(movie.title, movie.year)} target="_blank" rel="noreferrer">
              IMDb <Icon name="external" size={12} />
            </a>
            <a href={letterboxdSearch(movie.title)} target="_blank" rel="noreferrer">
              Letterboxd <Icon name="external" size={12} />
            </a>
          </p>
        </div>
      </div>

      {details && (
        <section className="section" aria-labelledby="similar-title">
          <h2 id="similar-title" className="film__similar-title">
            You might also like
          </h2>
          <ul className="pgrid">
            {details.similar.map(({ movie: m }) => (
              <li key={m.id}>
                <PosterCard movie={m} />
              </li>
            ))}
          </ul>
        </section>
      )}
    </article>
  );
}
