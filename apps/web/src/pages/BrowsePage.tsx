import { GENRE_LABEL, GENRES, type Genre, type MovieSummary } from '@moodreel/core';
import { useMemo, useState } from 'react';
import { Icon } from '../components/Icon';
import { PosterCard } from '../components/PosterCard';
import { isGenre } from '../lib/genres';
import { searchCatalog } from '../lib/search';
import { navigate } from '../router';
import { useApi } from '../state/api';
import './BrowsePage.css';

const PAGE = 42;
const SORTS = [
  { id: 'new', label: 'Newest first' },
  { id: 'old', label: 'Oldest first' },
  { id: 'az', label: 'A–Z' },
] as const;

export function BrowsePage({ params }: { params: URLSearchParams }) {
  const { catalog } = useApi();
  const [limit, setLimit] = useState(PAGE);
  const q = params.get('q') ?? '';
  const genre: Genre | null = isGenre(params.get('genre')) ? (params.get('genre') as Genre) : null;
  const sort = SORTS.find((s) => s.id === params.get('sort'))?.id ?? (q ? 'match' : 'new');

  const update = (patch: Record<string, string | null>) => {
    const next = new URLSearchParams(params);
    for (const [key, value] of Object.entries(patch)) {
      if (!value) next.delete(key);
      else next.set(key, value);
    }
    setLimit(PAGE);
    const search = next.toString();
    navigate(`/browse${search ? `?${search}` : ''}`, { replace: true });
  };

  const shown = useMemo(() => {
    const list = (q ? searchCatalog(catalog, q) : [...catalog]).filter((m) => !genre || m.genres.includes(genre));
    const compare: Record<string, (a: MovieSummary, b: MovieSummary) => number> = {
      new: (a, b) => b.year - a.year,
      old: (a, b) => a.year - b.year,
      az: (a, b) => a.title.localeCompare(b.title),
    };
    return sort === 'match' ? list : list.sort(compare[sort]);
  }, [catalog, q, genre, sort]);

  return (
    <div className="page browse">
      <header className="page-head">
        <h1>All films</h1>
        <p className="page-head__lead">{catalog.length} films in total.</p>
      </header>

      <div className="browse__row">
        <label className="browse__search">
          <Icon name="search" size={18} />
          <input type="search" placeholder="Search by title or director" value={q} onChange={(e) => update({ q: e.target.value })} aria-label="Search films" />
        </label>
        <label className="fselect">
          <span className="fselect__label">Sort</span>
          <select value={sort} onChange={(e) => update({ sort: e.target.value })}>
            {q && <option value="match">Best match</option>}
            {SORTS.map((s) => (
              <option key={s.id} value={s.id}>
                {s.label}
              </option>
            ))}
          </select>
          <Icon name="chevronDown" size={16} className="fselect__chev" />
        </label>
      </div>
      <div className="browse__genres" role="group" aria-label="Genre">
        <button type="button" className={`gchip ${!genre ? 'is-on' : ''}`} aria-pressed={!genre} onClick={() => update({ genre: null })}>
          All
        </button>
        {GENRES.map((g) => (
          <button key={g} type="button" className={`gchip ${genre === g ? 'is-on' : ''}`} aria-pressed={genre === g} onClick={() => update({ genre: genre === g ? null : g })}>
            {GENRE_LABEL[g]}
          </button>
        ))}
      </div>

      <section className="section" aria-label="Films">
        <p className="browse__count" aria-live="polite">
          {shown.length} {shown.length === 1 ? 'film' : 'films'}
        </p>
        {shown.length === 0 ? (
          <div className="empty">
            <h3>Nothing found</h3>
            <p>Try another word or another genre.</p>
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
          <button type="button" className="btn browse__more" onClick={() => setLimit((l) => l + PAGE)}>
            Show more
          </button>
        )}
      </section>
    </div>
  );
}
