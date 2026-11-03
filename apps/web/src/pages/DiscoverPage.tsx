import { useMemo } from 'react';
import { ContactSheet } from '../components/ContactSheet';
import { EffectChips } from '../components/EffectChips';
import { Icon } from '../components/Icon';
import { Mixer } from '../components/Mixer';
import { Results } from '../components/Results';
import { useRecommendations } from '../hooks/useRecommendations';
import { openFilm } from '../router';
import { usePick } from '../state/pick';
import { useStore } from '../state/store';
import './DiscoverPage.css';

/** The mood lab: build a mood by hand and watch the catalog respond. */
export function DiscoverPage() {
  const { state, query } = useStore();
  const pick = usePick();
  const { data, loading, error } = useRecommendations(query, state.seed);
  const highlighted = useMemo(() => new Set((data?.results ?? []).slice(0, 6).map((r) => r.movie.id)), [data]);
  const spin = () => pick({ query, label: 'Your mood from the lab' });

  return (
    <div className="page lab">
      <header className="page-head">
          <p className="kicker">Mood lab</p>
          <h1>
            Mix a mood <em>by hand</em>
          </h1>
          <p className="page-head__lead">Drag the puck across the mood map, fine-tune ten dimensions and set your rules. The whole catalog reacts as you go.</p>
      </header>

      <EffectChips />

      <div className="desk">
        <div className="desk__left">
          <Mixer highlighted={highlighted} excluded={data?.pool.excluded ?? {}} byReason={data?.pool.byReason ?? {}} onOpen={openFilm} />
        </div>
        <div className="desk__right">
          <ContactSheet pool={data?.pool ?? null} highlighted={highlighted} onOpen={openFilm} />
          <Results data={data} loading={loading} error={error} onOpen={openFilm} onPick={spin} />
        </div>
      </div>

      <div className="pickbar">
        <button type="button" className="btn btn--primary pickbar__btn" onClick={spin} disabled={!data?.results.length}>
          <Icon name="reel" size={18} /> Pick a film for me
        </button>
      </div>
    </div>
  );
}
