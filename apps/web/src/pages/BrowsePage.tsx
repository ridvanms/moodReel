import { DIM_META, DIMS, exclusionReason, GENRE_LABEL, GENRES, type Dim, type Genre, type MovieSummary } from '@moodreel/core';
import { useMemo, useState } from 'react';
import { Icon } from '../components/Icon';
import { PosterCard } from '../components/PosterCard';
import { RuleToggles } from '../components/RuleToggles';
import { searchCatalog } from '../lib/search';
import { navigate } from '../router';
import { useApi } from '../state/api';
import { useStore } from '../state/store';
import './BrowsePage.css';

const PAGE = 42;

const SORTS: Array<{ id: string; label: string }> = [
  { id: 'new', label: 'Newest first' },
  { id: 'old', label: 'Oldest first' },
  { id: 'az', label: 'Title A–Z' },
  { id: 'short', label: 'Shortest first' },
  { id: 'long', label: 'Longest first' },
  ...DIMS.map((d) => ({ id: `dim:${d}`, label: `Most ${DIM_META[d].label.toLowerCase()}` })),
];

const LENGTHS: Array<{ id: string; label: string; test: (m: MovieSummary) => boolean }> = [
  { id: '', label: 'Any length', test: () => true },
  { id: 'short', label: 'Under 1 h 40', test: (m) => m.runtime < 100 },
  { id: 'mid', label: '1 h 40 – 2 h 10', test: (m) => m.runtime >= 100 && m.runtime <= 130 },
  { id: 'long', label: 'Over 2 h 10', test: (m) => m.runtime > 130 },
];

export function BrowsePage({ params }: { params: URLSearchParams }) {
  const { catalog } = useApi();
  const { rulesQuery } = useStore();
  const [limit, setLimit] = useState(PAGE);

  const q = params.get('q') ?? '';
  const genre = (GENRES as readonly string[]).includes(params.get('genre') ?? '') ? (params.get('genre') as Genre) : null;
  const decade = Number(params.get('decade')) || null;
  const language = params.get('lang') ?? '';
  const length = LENGTHS.find((l) => l.id === (params.get('len') ?? '')) ?? LENGTHS[0]!;
  const sort = SORTS.some((s) => s.id === params.get('sort')) ? params.get('sort')! : q ? 'relevance' : 'new';
  const respect = params.get('rules') !== 'off';

  const update = (patch: Record<string, string | null>) => {
    const next = new URLSearchParams(params);
    for (const [key, value] of Object.entries(patch)) {
      if (value === null || value === '') next.delete(key);
      else next.set(key, value);
    }
    setLimit(PAGE);
    const search = next.toString();
    navigate(`/browse${search ? `?${search}` : ''}`, { replace: true });
  };

  const decades = useMemo(() => [...new Set(catalog.map((m) => Math.floor(m.year / 10) * 10))].sort((a, b) => a - b), [catalog]);
  const languages = useMemo(() => {
    const counts = new Map<string, number>();
    for (const m of catalog) counts.set(m.language, (counts.get(m.language) ?? 0) + 1);
    return [...counts.entries()].sort((a, b) => b[1] - a[1]).map(([l]) => l);
  }, [catalog]);

  // Rules without the seen-list: browsing shows seen films, marked as such.
  const rules = useMemo(() => ({ ...rulesQuery, exclude: [] }), [rulesQuery]);

  const { shown, hidden } = useMemo(() => {
    let list = q ? searchCatalog(catalog, q) : [...catalog];
    list = list.filter((m) => (!genre || m.genres.includes(genre)) && (!decade || Math.floor(m.year / 10) * 10 === decade) && (!language || m.language === language) && length.test(m));
    const passing = respect ? list.filter((m) => !exclusionReason(m, rules)) : list;
    const sorted = sort === 'relevance' ? passing : [...passing].sort(comparator(sort));
    return { shown: sorted, hidden: list.length - passing.length };
  }, [catalog, q, genre, decade, language, length, sort, respect, rules]);

  const activeFilters = [q, genre, decade, language, length.id].filter(Boolean).length;
  const ruleCount = Object.keys(rulesQuery.dealbreakers).length;

  return (
    <div className="page browse">
      <header className="page-head">
        <p className="kicker">Browse</p>
        <h1>
          The whole <em>catalog</em>
        </h1>
        <p className="page-head__lead">
          {catalog.length} films, each scored by hand on ten mood dimensions. Filter the usual way, or sort by a feeling: most fear, most laughs, most wonder.
        </p>
      </header>

      <section className="browse__filters" aria-label="Filters">
        <div className="browse__row">
          <label className="browse__search">
            <Icon name="search" size={18} />
            <input type="search" placeholder="Filter by title, director, theme…" value={q} onChange={(e) => update({ q: e.target.value })} aria-label="Filter the catalog" />
          </label>
          <Select label="Decade" value={decade ? String(decade) : ''} onChange={(v) => update({ decade: v })} options={[{ value: '', label: 'All decades' }, ...decades.map((d) => ({ value: String(d), label: `${d}s` }))]} />
          <Select label="Language" value={language} onChange={(v) => update({ lang: v })} options={[{ value: '', label: 'All languages' }, ...languages.map((l) => ({ value: l, label: l }))]} />
          <Select label="Length" value={length.id} onChange={(v) => update({ len: v })} options={LENGTHS.map((l) => ({ value: l.id, label: l.label }))} />
          <Select label="Sort" value={sort} onChange={(v) => update({ sort: v })} options={[...(q ? [{ value: 'relevance', label: 'Best match' }] : []), ...SORTS.map((s) => ({ value: s.id, label: s.label }))]} />
        </div>
        <div className="browse__genres" role="group" aria-label="Genre">
          <button type="button" className={`gchip ${!genre ? 'is-on' : ''}`} aria-pressed={!genre} onClick={() => update({ genre: null })}>
            All genres
          </button>
          {GENRES.map((g) => (
            <button key={g} type="button" className={`gchip ${genre === g ? 'is-on' : ''}`} aria-pressed={genre === g} onClick={() => update({ genre: genre === g ? null : g })}>
              {GENRE_LABEL[g]}
            </button>
          ))}
        </div>
        <details className="browse__rules">
          <summary>
            <span className="browse__rules-label">
              House rules <span className="mono">{ruleCount ? `${ruleCount} on` : 'off'}</span>
            </span>
            <label className="browse__respect" onClick={(e) => e.stopPropagation()}>
              <input type="checkbox" checked={respect} onChange={(e) => update({ rules: e.target.checked ? null : 'off' })} />
              Apply them here
            </label>
          </summary>
          <RuleToggles />
        </details>
      </section>

      <section className="section" aria-labelledby="browse-count">
        <div className="browse__status">
          <p id="browse-count" aria-live="polite">
            <b>{shown.length}</b> {shown.length === 1 ? 'film' : 'films'}
            {respect && hidden > 0 && (
              <>
                {' '}
                · {hidden} hidden by your rules{' '}
                <button type="button" className="browse__inline" onClick={() => update({ rules: 'off' })}>
                  show them
                </button>
              </>
            )}
          </p>
          {(activeFilters > 0 || !respect) && (
            <button type="button" className="btn btn--ghost btn--small" onClick={() => navigate('/browse', { replace: true })}>
              Reset filters
            </button>
          )}
        </div>
        {shown.length === 0 ? (
          <div className="empty">
            <h3>Nothing on this shelf</h3>
            <p>No film matches all of these filters. Loosen one, or reset them.</p>
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
            Show {Math.min(PAGE, shown.length - limit)} more
          </button>
        )}
      </section>
    </div>
  );
}

function comparator(sort: string): (a: MovieSummary, b: MovieSummary) => number {
  if (sort.startsWith('dim:')) {
    const dim = sort.slice(4) as Dim;
    return (a, b) => b.profile[dim] - a.profile[dim] || b.year - a.year;
  }
  switch (sort) {
    case 'old':
      return (a, b) => a.year - b.year || a.title.localeCompare(b.title);
    case 'az':
      return (a, b) => a.title.localeCompare(b.title);
    case 'short':
      return (a, b) => a.runtime - b.runtime;
    case 'long':
      return (a, b) => b.runtime - a.runtime;
    default:
      return (a, b) => b.year - a.year || a.title.localeCompare(b.title);
  }
}

function Select({ label, value, onChange, options }: { label: string; value: string; onChange: (v: string) => void; options: Array<{ value: string; label: string }> }) {
  return (
    <label className="fselect">
      <span className="fselect__label">{label}</span>
      <select value={value} onChange={(e) => onChange(e.target.value)}>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      <Icon name="chevronDown" size={16} className="fselect__chev" />
    </label>
  );
}
