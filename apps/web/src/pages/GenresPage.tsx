import { GENRE_LABEL, GENRES, type Genre, type MovieSummary } from '@moodreel/core';
import { useMemo, useState } from 'react';
import { GenreCard } from '../components/GenreCard';
import { Icon } from '../components/Icon';
import { PosterCard } from '../components/PosterCard';
import { hash } from '../lib/format';
import { isGenre } from '../lib/genres';
import { Link, navigate } from '../router';
import { useApi } from '../state/api';
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
  const films = useGenreFilms();
  return (
    <div className="page">
      <header className="page-head">
        <h1>Genres</h1>
        <p className="page-head__lead">Pick one to see its films.</p>
      </header>
      <ul className="ggrid">
        {GENRES.filter((g) => (films.get(g)?.length ?? 0) > 0).map((g) => (
          <li key={g}>
            <GenreCard genre={g} films={films.get(g)!} />
          </li>
        ))}
      </ul>
    </div>
  );
}

const SORTS = [
  { id: 'new', label: 'Newest first' },
  { id: 'old', label: 'Oldest first' },
  { id: 'az', label: 'A–Z' },
] as const;

export function GenrePage({ genre: raw, params }: { genre: string; params: URLSearchParams }) {
  if (!isGenre(raw)) return <NotFoundPage />;
  return <GenreView genre={raw} params={params} />;
}

function GenreView({ genre, params }: { genre: Genre; params: URLSearchParams }) {
  const { catalog } = useApi();
  const [limit, setLimit] = useState(42);
  const sort = SORTS.find((s) => s.id === params.get('sort'))?.id ?? 'new';

  const shown = useMemo(() => {
    const compare: Record<string, (a: MovieSummary, b: MovieSummary) => number> = {
      new: (a, b) => b.year - a.year,
      old: (a, b) => a.year - b.year,
      az: (a, b) => a.title.localeCompare(b.title),
    };
    return catalog.filter((m) => m.genres.includes(genre)).sort(compare[sort]);
  }, [catalog, genre, sort]);

  const label = GENRE_LABEL[genre];

  return (
    <div className="page genre">
      <header className="genre__head">
        <div className="page-head">
          <p className="genre__crumb">
            <Link to="/genres">Genres</Link> /
          </p>
          <h1>{label}</h1>
          <p className="page-head__lead">{shown.length} films</p>
        </div>
        <Link to={`/oracle?genre=${genre}`} className="btn btn--primary btn--large">
          <Icon name="orb" size={18} /> Ask the Oracle
        </Link>
      </header>

      <section className="section" aria-label={`${label} films`}>
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
        <ul className="pgrid">
          {shown.slice(0, limit).map((m) => (
            <li key={m.id}>
              <PosterCard movie={m} />
            </li>
          ))}
        </ul>
        {shown.length > limit && (
          <button type="button" className="btn genre__more" onClick={() => setLimit((l) => l + 42)}>
            Show more
          </button>
        )}
      </section>
    </div>
  );
}
