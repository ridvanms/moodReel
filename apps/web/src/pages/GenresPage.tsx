import { exclusionReason, GENRE_LABEL, GENRES, type Genre, type MovieSummary } from '@moodreel/core';
import { useMemo, useState } from 'react';
import { GenreCard } from '../components/GenreCard';
import { Icon } from '../components/Icon';
import { PosterCard } from '../components/PosterCard';
import { RuleToggles } from '../components/RuleToggles';
import { hash } from '../lib/format';
import { GENRE_LINE, isGenre } from '../lib/genres';
import { Link, navigate } from '../router';
import { useApi } from '../state/api';
import { useStore } from '../state/store';
import { NotFoundPage } from './NotFoundPage';
import './GenresPage.css';

/** Films of each genre in a stable, shuffled order, so the covers are not always the oldest titles. */
export function useGenreFilms(): Map<Genre, MovieSummary[]> {
  const { catalog } = useApi();
  return useMemo(() => {
    const map = new Map<Genre, MovieSummary[]>();
    for (const g of GENRES) {
      map.set(
        g,
        catalog.filter((m) => m.genres.includes(g)).sort((a, b) => hash(`${a.id}${g}`) - hash(`${b.id}${g}`)),
      );
    }
    return map;
  }, [catalog]);
}

export function GenresPage() {
  const { catalog } = useApi();
  const films = useGenreFilms();
  return (
    <div className="page">
      <header className="page-head">
        <p className="kicker">Genres</p>
        <h1>
          What kind of film <em>tonight?</em>
        </h1>
        <p className="page-head__lead">Pick a genre to see every film in it. From there you can open any film, add it to your watchlist or ask the Oracle.</p>
      </header>
      <ul className="ggrid">
        {GENRES.filter((g) => (films.get(g)?.length ?? 0) > 0).map((g) => (
          <li key={g}>
            <GenreCard genre={g} films={films.get(g)!} />
          </li>
        ))}
        <li>
          <Link to="/browse" className="gcard gcard--all">
            <span className="gcard__all-mark" aria-hidden="true">
              <Icon name="search" size={30} />
            </span>
            <span className="gcard__text">
              <span className="gcard__title">All films</span>
              <span className="gcard__line">The whole catalog, with search and filters.</span>
              <span className="gcard__count mono">{catalog.length} films</span>
            </span>
            <Icon name="arrow" size={18} className="gcard__arrow" />
          </Link>
        </li>
      </ul>
    </div>
  );
}

const SORTS = [
  { id: 'new', label: 'Newest first' },
  { id: 'old', label: 'Oldest first' },
  { id: 'az', label: 'Title A–Z' },
  { id: 'short', label: 'Shortest first' },
] as const;

export function GenrePage({ genre: raw, params }: { genre: string; params: URLSearchParams }) {
  if (!isGenre(raw)) return <NotFoundPage />;
  return <GenreView genre={raw} params={params} />;
}

function GenreView({ genre, params }: { genre: Genre; params: URLSearchParams }) {
  const { catalog } = useApi();
  const { rulesQuery } = useStore();
  const [limit, setLimit] = useState(42);
  const sort = SORTS.find((s) => s.id === params.get('sort'))?.id ?? 'new';
  const rules = useMemo(() => ({ ...rulesQuery, exclude: [] }), [rulesQuery]);

  const { shown, hidden } = useMemo(() => {
    const all = catalog.filter((m) => m.genres.includes(genre));
    const passing = all.filter((m) => !exclusionReason(m, rules));
    const compare: Record<string, (a: MovieSummary, b: MovieSummary) => number> = {
      new: (a, b) => b.year - a.year,
      old: (a, b) => a.year - b.year,
      az: (a, b) => a.title.localeCompare(b.title),
      short: (a, b) => a.runtime - b.runtime,
    };
    return { shown: [...passing].sort(compare[sort]), hidden: all.length - passing.length };
  }, [catalog, genre, rules, sort]);

  const label = GENRE_LABEL[genre];
  const others = GENRES.filter((g) => g !== genre);

  return (
    <div className="page genre">
      <header className="genre__head">
        <div className="page-head">
          <p className="kicker">
            <Link to="/genres">Genres</Link>
          </p>
          <h1>{label}</h1>
          <p className="page-head__lead">{GENRE_LINE[genre]}</p>
        </div>
        <div className="genre__actions">
          <Link to={`/oracle?genre=${genre}`} className="btn btn--primary btn--large">
            <Icon name="orb" size={18} /> Ask the Oracle
          </Link>
        </div>
      </header>

      <section className="genre__bar" aria-label="Rules and sorting">
        <RuleToggles only={['noSadEnding', 'noGore', 'noJumpscares', 'familyFriendly']} />
        <label className="fselect genre__sort">
          <span className="fselect__label">Sort</span>
          <select value={sort} onChange={(e) => navigate(`/genres/${genre}?sort=${e.target.value}`, { replace: true })}>
            {SORTS.map((s) => (
              <option key={s.id} value={s.id}>
                {s.label}
              </option>
            ))}
          </select>
          <Icon name="chevronDown" size={16} className="fselect__chev" />
        </label>
      </section>

      <section className="section" aria-labelledby="genre-count">
        <p id="genre-count" className="genre__count" aria-live="polite">
          <b>{shown.length}</b> {shown.length === 1 ? 'film' : 'films'}
          {hidden > 0 && ` · ${hidden} hidden by your rules`}
        </p>
        {shown.length === 0 ? (
          <div className="empty">
            <h3>Your rules hide every {label.toLowerCase()} film</h3>
            <p>Switch a rule off above and they will come back.</p>
          </div>
        ) : (
          <ul className="pgrid">
            {shown.slice(0, limit).map((m) => (
              <li key={m.id}>
                <PosterCard movie={m} />
              </li>
            ))}
          </ul>
        )}
        {shown.length > limit && (
          <button type="button" className="btn genre__more" onClick={() => setLimit((l) => l + 42)}>
            Show more
          </button>
        )}
      </section>

      <nav className="section" aria-labelledby="other-genres">
        <h2 id="other-genres" className="genre__others-title">
          Other genres
        </h2>
        <div className="genre__others">
          {others.map((g) => (
            <Link key={g} to={`/genres/${g}`} className="gchip">
              {GENRE_LABEL[g]}
            </Link>
          ))}
        </div>
      </nav>
    </div>
  );
}
