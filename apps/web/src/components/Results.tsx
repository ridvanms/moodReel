import type { RecommendResult } from '@moodreel/core';
import { AnimatePresence } from 'motion/react';
import { useState } from 'react';
import { useStore } from '../state/store';
import { FilmCard } from './FilmCard';
import { Icon } from './Icon';
import './Results.css';

interface Props {
  data: RecommendResult | null;
  loading: boolean;
  error: string | null;
  onOpen: (id: string) => void;
  onPick: () => void;
}

export function Results({ data, loading, error, onOpen, onPick }: Props) {
  const { dispatch } = useStore();
  const [expanded, setExpanded] = useState(false);
  const all = data?.results ?? [];
  const results = expanded ? all : all.slice(0, 6);
  const strong = results.filter((r, i) => !data?.ranked || r.score >= 45 || i < 3);
  const weak = results.slice(strong.length);

  return (
    <section className="results" aria-labelledby="results-title" aria-busy={loading}>
      <div className="results__head">
        <div>
          <p className="eyebrow">Screen</p>
          <h2 id="results-title">{data?.ranked === false ? 'Everything that passes your rules' : 'What fits your mood'}</h2>
        </div>
        <div className="results__actions">
          <button type="button" className="btn btn--ghost" onClick={() => dispatch({ type: 'shuffle' })} title="Reorder equally good matches">
            <Icon name="shuffle" size={16} /> Shuffle
          </button>
          <button type="button" className="btn btn--primary" onClick={onPick} disabled={!all.length}>
            <Icon name="reel" size={16} /> Pick a film for me
          </button>
        </div>
      </div>

      {error && (
        <p className="results__error" role="alert">
          {error}
        </p>
      )}

      {!error && data && results.length === 0 && (
        <div className="results__empty">
          <h3>Your rules ruled out everything</h3>
          <p>Remove a wish above or switch off a rule in the “Rules” tab and the reel will fill up again.</p>
        </div>
      )}

      <div className={`results__list ${loading && data ? 'is-stale' : ''}`}>
        <AnimatePresence initial={false}>
          {strong.map((rec, i) => (
            <FilmCard key={rec.movie.id} rec={rec} rank={i} ranked={Boolean(data?.ranked)} onOpen={onOpen} />
          ))}
        </AnimatePresence>
        {weak.length > 0 && (
          <>
            <p className="results__divider eyebrow">Further suggestions</p>
            {weak.map((rec, i) => (
              <FilmCard key={rec.movie.id} rec={rec} rank={strong.length + i} ranked={Boolean(data?.ranked)} onOpen={onOpen} />
            ))}
          </>
        )}
      </div>
      {all.length > results.length && (
        <button type="button" className="btn results__more" onClick={() => setExpanded(true)}>
          Show {all.length - results.length} more
        </button>
      )}
    </section>
  );
}
