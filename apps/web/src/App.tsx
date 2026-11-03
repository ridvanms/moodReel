import type { Effect, MovieSummary } from '@moodreel/core';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { createApi, type Api } from './api';
import { Footer } from './components/Footer';
import { Header } from './components/Header';
import { Icon } from './components/Icon';
import { PickFlow } from './components/PickFlow';
import { AtlasPage } from './pages/AtlasPage';
import { BrowsePage } from './pages/BrowsePage';
import { DiscoverPage } from './pages/DiscoverPage';
import { FilmPage } from './pages/FilmPage';
import { HomePage } from './pages/HomePage';
import { ListPage } from './pages/ListPage';
import { GenrePage, GenresPage } from './pages/GenresPage';
import { NotFoundPage } from './pages/NotFoundPage';
import { OraclePage } from './pages/OraclePage';
import { useLocationHash, useRoute, useScrollRestoration, type Route } from './router';
import { ApiProvider, useApi } from './state/api';
import { PickContext, type PickRequest } from './state/pick';
import { StoreProvider } from './state/store';
import './App.css';

/** The first visit starts with the brief's one rule: no sad endings. */
const OPENING_RULES: Effect[] = [{ kind: 'deal', key: 'noSadEnding' }];

interface Boot {
  api: Api;
  catalog: MovieSummary[];
}

const TITLES: Partial<Record<Route['page'], string>> = {
  discover: 'Mood lab',
  genres: 'Genres',
  browse: 'All films',
  oracle: 'The Oracle',
  atlas: 'Atlas',
  list: 'Watchlist',
};

export function App() {
  const [boot, setBoot] = useState<Boot | null>(null);
  const [failed, setFailed] = useState('');

  useEffect(() => {
    (async () => {
      const api = await createApi();
      setBoot({ api, catalog: await api.movies() });
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
      <StoreProvider defaults={OPENING_RULES}>
        <Shell />
      </StoreProvider>
    </ApiProvider>
  );
}

function Shell() {
  const { api } = useApi();
  const hash = useLocationHash();
  const route = useRoute();
  const [pick, setPick] = useState<PickRequest | null>(null);
  const openPick = useCallback((request: PickRequest) => setPick(request), []);
  useScrollRestoration(hash);

  useEffect(() => {
    const title = TITLES[route.page];
    // The film page sets its own title from the film.
    if (route.page !== 'film' && route.page !== 'genre') document.title = title ? `${title} · MoodReel` : 'MoodReel – pick a film by how you feel';
  }, [route.page]);

  return (
    <PickContext.Provider value={openPick}>
      <a className="skip" href="#main" onClick={(e) => (e.preventDefault(), document.getElementById('main')?.focus())}>
        Skip to content
      </a>
      <div className="safe-top" aria-hidden="true" />
      <Header mode={api.mode} />
      <main id="main" tabIndex={-1} className="main">
        <Page route={route} />
      </main>
      <Footer />
      <PickFlow request={pick} onClose={() => setPick(null)} />
    </PickContext.Provider>
  );
}

function Page({ route }: { route: Route }) {
  switch (route.page) {
    case 'home':
      return <HomePage />;
    case 'discover':
      return <DiscoverPage />;
    case 'genres':
      return <GenresPage />;
    case 'genre':
      return <GenrePage genre={route.genre} params={route.params} />;
    case 'browse':
      return <BrowsePage params={route.params} />;
    case 'film':
      return <FilmPage key={route.id} id={route.id} />;
    case 'oracle':
      return <OraclePage params={route.params} />;
    case 'atlas':
      return <AtlasPage />;
    case 'list':
      return <ListPage />;
    case 'missing':
      return <NotFoundPage />;
  }
}
