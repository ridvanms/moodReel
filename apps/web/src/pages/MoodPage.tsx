import { EXCLUSION_LABEL, type ExclusionReason, type MovieSummary } from '@moodreel/core';
import { useMemo, useState, type CSSProperties } from 'react';
import { Icon } from '../components/Icon';
import { Poster } from '../components/Poster';
import { PosterCard } from '../components/PosterCard';
import { RuleToggles } from '../components/RuleToggles';
import { useRecommendations } from '../hooks/useRecommendations';
import { MOODS, moodEffects, moodQuery, type Mood } from '../lib/moods';
import { Link, navigate } from '../router';
import { useApi } from '../state/api';
import { usePick } from '../state/pick';
import { useStore } from '../state/store';
import { NotFoundPage } from './NotFoundPage';
import './MoodPage.css';

export function MoodPage({ slug }: { slug: string }) {
  const index = MOODS.findIndex((m) => m.slug === slug);
  const mood = MOODS[index];
  if (!mood) return <NotFoundPage />;
  return <MoodView key={mood.slug} mood={mood} index={index} />;
}

function MoodView({ mood, index }: { mood: Mood; index: number }) {
  const { byId } = useApi();
  const { state, rules, dispatch } = useStore();
  const pick = usePick();
  const [seed, setSeed] = useState(11);
  const query = useMemo(() => moodQuery(mood, rules, state.seen), [mood, rules, state.seen]);
  const { data, loading, error } = useRecommendations(query, seed, 28);
  const think = mood.think.map((id) => byId.get(id)).filter((m): m is MovieSummary => m !== undefined);
  const tint = think[0]?.palette[1] ?? '#e0186f';
  const prev = MOODS[(index - 1 + MOODS.length) % MOODS.length]!;
  const next = MOODS[(index + 1) % MOODS.length]!;
  const reasons = (Object.entries(data?.pool.byReason ?? {}) as Array<[ExclusionReason, number]>).filter(([r]) => r !== 'seen' && r !== 'reference').sort((a, b) => b[1] - a[1]);
  const results = data?.results ?? [];

  return (
    <div className="moodpage" style={{ '--tint': tint } as CSSProperties}>
      <header className="moodpage__hero">
        <div className="moodpage__hero-inner">
          <div className="moodpage__copy">
            <p className="kicker">
              Mood {String(index + 1).padStart(2, '0')} of {MOODS.length}
            </p>
            <h1>{mood.title}</h1>
            <p className="moodpage__about">{mood.about}</p>
            <div className="moodpage__actions">
              <button type="button" className="btn btn--primary btn--large" onClick={() => pick({ query, label: mood.title })} disabled={!results.length}>
                <Icon name="reel" size={18} /> Pick one for me
              </button>
              <button
                type="button"
                className="btn btn--large"
                onClick={() => {
                  dispatch({ type: 'apply', effects: moodEffects(mood), mode: 'replace' });
                  navigate('/discover');
                }}
              >
                <Icon name="sliders" size={18} /> Fine-tune in the lab
              </button>
            </div>
          </div>
          <div className="moodpage__think" aria-label="Films that define this mood">
            {think.map((m, i) => (
              <Link key={m.id} to={`/film/${m.id}`} className="moodpage__think-card" style={{ '--i': i } as CSSProperties} aria-label={m.title}>
                <Poster movie={m} />
              </Link>
            ))}
            <p className="moodpage__think-label mono">Think of: {think.map((m) => m.title).join(', ')}</p>
          </div>
        </div>
      </header>

      <div className="page moodpage__body">
        <section className="moodpage__rules" aria-label="House rules">
          <RuleToggles />
          {reasons.length > 0 && (
            <p className="moodpage__excluded">
              Rules hide {reasons.reduce((s, [, n]) => s + n, 0)} films here:{' '}
              {reasons.map(([r, n]) => `${n} × ${EXCLUSION_LABEL[r]}`).join(', ')}.
            </p>
          )}
        </section>

        <section className="section" aria-labelledby="fits-title" aria-busy={loading}>
          <div className="section__head">
            <div>
              <h2 id="fits-title">Best fits</h2>
              <p>Ranked by how well each film matches the mood. Percentages are the match, not a rating.</p>
            </div>
            <button type="button" className="btn btn--ghost" onClick={() => setSeed((s) => s + 1)}>
              <Icon name="shuffle" size={16} /> Shuffle ties
            </button>
          </div>
          {error && <p className="results__error">{error}</p>}
          {!loading && !error && results.length === 0 && (
            <div className="empty">
              <h3>Your rules ruled out everything</h3>
              <p>Switch a rule off above and this mood will fill up again.</p>
            </div>
          )}
          <ul className={`pgrid ${loading && data ? 'is-stale' : ''}`}>
            {results.map((r) => (
              <li key={r.movie.id}>
                <PosterCard movie={r.movie} score={r.score} />
              </li>
            ))}
          </ul>
        </section>

        <nav className="moodpage__pager" aria-label="Other moods">
          <Link to={`/moods/${prev.slug}`} className="moodpage__pager-link">
            <span className="eyebrow">Previous mood</span>
            <span className="moodpage__pager-title">← {prev.title}</span>
          </Link>
          <Link to={`/moods/${next.slug}`} className="moodpage__pager-link moodpage__pager-link--next">
            <span className="eyebrow">Next mood</span>
            <span className="moodpage__pager-title">{next.title} →</span>
          </Link>
        </nav>
      </div>
    </div>
  );
}
