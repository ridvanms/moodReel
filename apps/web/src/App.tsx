import { mergeEffects, type Effect, type MovieSummary } from '@moodreel/core';
import { useEffect, useMemo, useState } from 'react';
import { createApi, type Api } from './api';
import { CommunityPulse } from './components/CommunityPulse';
import { ContactSheet } from './components/ContactSheet';
import { EffectChips } from './components/EffectChips';
import { FilmDrawer } from './components/FilmDrawer';
import { Header, type View } from './components/Header';
import { Icon } from './components/Icon';
import { Mixer } from './components/Mixer';
import { Oracle } from './components/Oracle';
import { PickFlow } from './components/PickFlow';
import { PromptBar } from './components/PromptBar';
import { Results } from './components/Results';
import { Watchlist } from './components/Watchlist';
import { useRecommendations } from './hooks/useRecommendations';
import { ApiProvider, useApi } from './state/api';
import { StoreProvider, useStore } from './state/store';
import './App.css';

/** The page opens on the brief's own example, so the first screen already shows what the tool does. */
const OPENING_PROMPT = 'Something scary but not too much, no sad ending';

interface Boot {
  api: Api;
  catalog: MovieSummary[];
  defaults: Effect[];
}

export function App() {
  const [boot, setBoot] = useState<Boot | null>(null);
  const [failed, setFailed] = useState('');

  useEffect(() => {
    (async () => {
      const api = await createApi();
      const [catalog, opening] = await Promise.all([api.movies(), api.parse(OPENING_PROMPT)]);
      setBoot({ api, catalog, defaults: mergeEffects([], opening.effects, 'replace') });
    })().catch((error: Error) => setFailed(error.message));
  }, []);

  const byId = useMemo(() => new Map((boot?.catalog ?? []).map((m) => [m.id, m])), [boot]);

  if (failed) {
    return (
      <div className="boot">
        <p className="eyebrow">MoodReel</p>
        <h1>The reel snapped</h1>
        <p>{failed}</p>
        <button type="button" className="btn btn--primary" onClick={() => window.location.reload()}>
          Try again
        </button>
      </div>
    );
  }
  if (!boot) {
    return (
      <div className="boot" aria-busy="true">
        <Icon name="reel" size={44} className="boot__reel" />
        <p className="eyebrow">Loading the reel…</p>
      </div>
    );
  }

  return (
    <ApiProvider value={{ api: boot.api, catalog: boot.catalog, byId }}>
      <StoreProvider defaults={boot.defaults}>
        <Shell />
      </StoreProvider>
    </ApiProvider>
  );
}

function Shell() {
  const { api, catalog } = useApi();
  const { state, query, dispatch } = useStore();
  const [view, setView] = useState<View>('mood');
  const [openId, setOpenId] = useState<string | null>(null);
  const [picking, setPicking] = useState(false);
  const [parsing, setParsing] = useState(false);
  const [takes, setTakes] = useState(1);
  const [pulseKey, setPulseKey] = useState(0);
  const [parseError, setParseError] = useState('');
  const { data, loading, error } = useRecommendations(query, state.seed);

  const highlighted = useMemo(() => new Set((data?.results ?? []).slice(0, 6).map((r) => r.movie.id)), [data]);

  const submit = async (text: string) => {
    setParsing(true);
    setParseError('');
    try {
      const result = await api.parse(text);
      dispatch({ type: 'parsed', text, result });
      setTakes((t) => t + 1);
    } catch (e) {
      setParseError((e as Error).message);
    } finally {
      setParsing(false);
    }
  };

  const feedback = useMemo(() => {
    if (parseError) return { tone: 'warn' as const, text: parseError };
    const last = state.lastParse;
    if (!last) return { tone: 'info' as const, text: `Starting you off with an example: “${OPENING_PROMPT}”. Type your own.` };
    const { result } = last;
    if (!result.understood) return { tone: 'warn' as const, text: 'I didn’t quite get that. Try a mood (“funny”, “dark”), a genre, a film it should feel like, or a rule like “no sad ending”.' };
    const parts = [] as string[];
    if (result.moods.length) parts.push(`Noted: ${result.moods.join(', ').toLowerCase()}.`);
    parts.push(result.mode === 'refine' ? 'Added that to your current wishes.' : `Got ${result.effects.length === 1 ? 'one thing' : `${result.effects.length} things`} – see them below.`);
    if (result.unknown.length) parts.push(`Didn’t recognise: ${result.unknown.slice(0, 4).map((w) => `“${w}”`).join(', ')}.`);
    return { tone: 'info' as const, text: parts.join(' ') };
  }, [state.lastParse, parseError]);

  return (
    <>
      <div className="safe-top" aria-hidden="true" />
      <Header view={view} onView={setView} saved={state.watchlist.length} mode={api.mode} />
      <main className="shell">
        {view === 'mood' && (
          <>
            <section className="hero" aria-labelledby="hero-title">
              <div className="hero__copy">
                <p className="eyebrow">{catalog.length} hand-profiled films · no spoilers</p>
                <h1 id="hero-title">
                  What are we watching <em>tonight?</em>
                </h1>
                <p className="hero__lead">
                  Say it in your own words, tune the control desk or let the Oracle ask. MoodReel scores every film on ten mood dimensions and rules out what you don’t want, without giving away the endings.
                </p>
              </div>
              <PromptBar take={takes} busy={parsing} onSubmit={submit} feedback={feedback} />
              <EffectChips />
            </section>

            <div className="desk">
              <div className="desk__left">
                <Mixer highlighted={highlighted} excluded={data?.pool.excluded ?? {}} byReason={data?.pool.byReason ?? {}} onOpen={setOpenId} />
              </div>
              <div className="desk__right">
                <ContactSheet pool={data?.pool ?? null} highlighted={highlighted} onOpen={setOpenId} />
                <Results data={data} loading={loading} error={error} onOpen={setOpenId} onPick={() => setPicking(true)} />
              </div>
            </div>

            <CommunityPulse refreshKey={pulseKey} onOpen={setOpenId} />
          </>
        )}
        {view === 'oracle' && <Oracle onOpen={setOpenId} />}
        {view === 'list' && <Watchlist onOpen={setOpenId} />}
      </main>

      <footer className="footer">
        <div className="footer__inner">
          <p>
            <b>MoodReel</b> – a web project. The film data and posters were made for it: moods are scored by hand and posters are generated from code.
          </p>
          <p className="mono">{api.mode === 'remote' ? 'API · Express + React' : 'The engine runs in your browser'}</p>
        </div>
      </footer>

      {view === 'mood' && (
        <div className="pickbar">
          <button type="button" className="btn btn--primary pickbar__btn" onClick={() => setPicking(true)} disabled={!data?.results.length}>
            <Icon name="reel" size={18} /> Pick a film for me
          </button>
        </div>
      )}

      <PickFlow
        open={picking}
        onClose={() => {
          setPicking(false);
          setPulseKey((k) => k + 1);
        }}
      />
      <FilmDrawer id={openId} onClose={() => setOpenId(null)} onOpen={setOpenId} />
    </>
  );
}
