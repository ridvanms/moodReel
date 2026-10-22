import { buildQuery, dimFit, exclusionReason, GENRE_LABEL, runtimeLabel, tagLabel, timecode, type MovieDetails, type MovieSummary } from '@moodreel/core';
import { useEffect, useMemo, useState, type CSSProperties } from 'react';
import { EndingReveal } from '../components/EndingReveal';
import { Fingerprint } from '../components/Fingerprint';
import { Icon } from '../components/Icon';
import { Poster } from '../components/Poster';
import { Shelf } from '../components/Shelf';
import { imdbSearch, letterboxdSearch } from '../lib/format';
import { MOODS, type Mood } from '../lib/moods';
import { Link, navigate } from '../router';
import { useApi } from '../state/api';
import { usePick } from '../state/pick';
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
  const { state, query, rules, dispatch } = useStore();
  const pick = usePick();
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

  const moods = useMemo(() => (movie ? fittingMoods(movie) : []), [movie]);

  if (!movie) return <NotFoundPage />;
  const saved = state.watchlist.includes(movie.id);
  const seen = state.seen.includes(movie.id);
  const [bg, a, b] = movie.palette;
  const hasWish = Object.keys(query.dims).length > 0;

  const likeThis = () => buildQuery([...rules, { kind: 'like', movieId: movie.id }], [...state.seen, movie.id]);

  return (
    <article className="film" style={{ '--f-bg': bg, '--f-a': a, '--f-b': b } as CSSProperties}>
      <header className="film__hero">
        <div className="film__backdrop" aria-hidden="true" />
        <div className="film__hero-inner">
          <nav className="film__crumbs" aria-label="Breadcrumb">
            <Link to="/browse">Browse</Link>
            <span aria-hidden="true">/</span>
            <Link to={`/browse?genre=${movie.genres[0]}`}>{GENRE_LABEL[movie.genres[0]!]}</Link>
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
                    <Link to={`/browse?genre=${g}`} className="gchip">
                      {GENRE_LABEL[g]}
                    </Link>
                  </li>
                ))}
              </ul>
              <p className="film__blurb">{movie.blurb}</p>
              <div className="film__actions">
                <button type="button" className={`btn ${saved ? 'is-saved' : 'btn--primary'}`} aria-pressed={saved} onClick={() => dispatch({ type: 'toggleWatch', id: movie.id })}>
                  <Icon name={saved ? 'check' : 'bookmark'} size={16} /> {saved ? 'On my list' : 'Save to my list'}
                </button>
                <button type="button" className="btn" aria-pressed={seen} onClick={() => dispatch({ type: 'toggleSeen', id: movie.id })}>
                  <Icon name="eye" size={16} /> {seen ? 'Marked as seen' : 'Seen it'}
                </button>
                <button type="button" className="btn btn--ghost" onClick={() => pick({ query: likeThis(), label: `Something like ${movie.title}` })}>
                  <Icon name="reel" size={16} /> Spin something like it
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

        {moods.length > 0 && (
          <section className="section" aria-labelledby="fits-moods">
            <div className="section__head">
              <div>
                <p className="kicker">Mood match</p>
                <h2 id="fits-moods">Watch it when you feel…</h2>
              </div>
            </div>
            <ul className="film__moods">
              {moods.map(({ mood, fit }) => (
                <li key={mood.slug}>
                  <Link to={`/moods/${mood.slug}`} className="film__mood">
                    <span className="film__mood-fit mono">{Math.round(fit * 100)}%</span>
                    <span className="film__mood-title">{mood.title}</span>
                    <span className="film__mood-line">{mood.line}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}

        <Shelf
          kicker="Closest in mood and theme"
          title="If you like it, try"
          loading={!details}
          items={(details?.similar ?? []).map((s) => ({ movie: s.movie, score: s.similarity }))}
          more={{ to: `/browse?genre=${movie.genres[0]}`, label: `More ${GENRE_LABEL[movie.genres[0]!].toLowerCase()}` }}
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

/** How well the film fits each curated mood: the mood's dimension wishes and its rules, nothing else. */
function fittingMoods(movie: MovieSummary): Array<{ mood: Mood; fit: number }> {
  return MOODS.map((mood) => {
    const q = buildQuery(mood.effects);
    const reason = exclusionReason(movie, q);
    if (reason && reason !== 'reference') return { mood, fit: 0 };
    let num = 0;
    let den = 0;
    for (const [dim, c] of Object.entries(q.dims)) {
      const w = c!.weight ?? 1;
      num += w * Math.log(Math.max(dimFit(movie.profile[dim as keyof typeof movie.profile], c!), 1e-4));
      den += w;
    }
    return { mood, fit: den ? Math.exp(num / den) : 0 };
  })
    .filter((m) => m.fit >= 0.55)
    .sort((x, y) => y.fit - x.fit)
    .slice(0, 4);
}
