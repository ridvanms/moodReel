import { exclusionReason, GENRES, type CommunityStats, type MovieSummary } from '@moodreel/core';
import { useEffect, useMemo, useState, type CSSProperties } from 'react';
import { Faq } from '../components/Faq';
import { GenreCard } from '../components/GenreCard';
import { Icon } from '../components/Icon';
import { Poster } from '../components/Poster';
import { RuleToggles } from '../components/RuleToggles';
import { Shelf } from '../components/Shelf';
import { hash } from '../lib/format';
import { Link } from '../router';
import { useApi } from '../state/api';
import { usePick } from '../state/pick';
import { useStore } from '../state/store';
import { useGenreFilms } from './GenresPage';
import './HomePage.css';

const HOME_GENRES = ['horror', 'thriller', 'comedy', 'romance', 'scifi', 'drama', 'animation', 'action'] as const;

export function HomePage() {
  const { api, catalog } = useApi();
  const { state, rulesQuery } = useStore();
  const pick = usePick();
  const films = useGenreFilms();
  const [stats, setStats] = useState<CommunityStats | null>(null);

  useEffect(() => {
    let alive = true;
    api
      .stats()
      .then((s) => alive && setStats(s))
      .catch(() => undefined);
    return () => {
      alive = false;
    };
  }, [api]);

  const noSad = Boolean(rulesQuery.dealbreakers.noSadEnding || rulesQuery.dealbreakers.happyOnly);
  const rules = useMemo(() => ({ ...rulesQuery, exclude: [] }), [rulesQuery]);
  const newest = useMemo(() => catalog.filter((m) => !exclusionReason(m, rules)).sort((a, b) => b.year - a.year).slice(0, 14), [catalog, rules]);

  return (
    <div className="home">
      <section className="hero" aria-labelledby="hero-title">
        <PosterWall films={catalog} />
        <div className="hero__inner">
          <p className="kicker">{catalog.length} films · zero spoilers</p>
          <h1 id="hero-title">
            What are we watching <em>tonight?</em>
          </h1>
          <p className="hero__lead">Pick a genre, answer a few questions from the Oracle and get one film with its description. Keep the ones you like in your watchlist.</p>
          <div className="hero__cta">
            <Link to="/oracle" className="btn btn--primary btn--large hero__pick">
              <Icon name="orb" size={20} /> Ask the Oracle
            </Link>
            <button type="button" className="btn btn--large hero__oracle" onClick={() => pick({ query: rulesQuery, label: noSad ? 'Anything, no sad ending' : 'Surprise me' })}>
              <Icon name="reel" size={18} />
              {noSad ? 'Pick me a film, no sad ending' : 'Pick me a film'}
            </button>
          </div>
          <div className="hero__rules">
            <RuleToggles only={['noSadEnding', 'noGore', 'noJumpscares']} />
          </div>
        </div>
      </section>

      <div className="page home__page">
        <section className="section" aria-labelledby="genres-title">
          <div className="section__head">
            <div>
              <h2 id="genres-title">Browse by genre</h2>
              <p>Open a genre to see all of its films.</p>
            </div>
            <Link to="/genres" className="link-arrow">
              All {GENRES.length} genres <Icon name="arrow" size={16} />
            </Link>
          </div>
          <ul className="ggrid home__genres">
            {HOME_GENRES.map((g) => (
              <li key={g}>
                <GenreCard genre={g} films={films.get(g) ?? []} />
              </li>
            ))}
          </ul>
        </section>

        <section className="howto" aria-labelledby="howto-title">
          <div className="howto__intro">
            <p className="kicker">How it works</p>
            <h2 id="howto-title">Three steps to tonight’s film</h2>
            <p>No accounts, no endless scrolling.</p>
          </div>
          <ol className="howto__steps">
            <li>
              <span className="howto__num mono">01</span>
              <h3>Pick a genre</h3>
              <p>Horror, comedy, romance or anything else. Or let the Oracle consider every genre.</p>
              <Link to="/genres" className="link-arrow">
                See the genres <Icon name="arrow" size={14} />
              </Link>
            </li>
            <li>
              <span className="howto__num mono">02</span>
              <h3>Answer the Oracle</h3>
              <p>A few yes-or-no questions. The Oracle narrows the films down until one is left.</p>
              <Link to="/oracle" className="link-arrow">
                Ask the Oracle <Icon name="arrow" size={14} />
              </Link>
            </li>
            <li>
              <span className="howto__num mono">03</span>
              <h3>Save it</h3>
              <p>Read the description, then add the film to your watchlist for tonight or later.</p>
              <Link to="/list" className="link-arrow">
                Open the watchlist <Icon name="arrow" size={14} />
              </Link>
            </li>
          </ol>
        </section>

        {stats && stats.topWeek.length > 0 ? (
          <Shelf kicker="Community" title="Picked most this week" items={stats.topWeek.map((t) => ({ movie: t.movie }))} ranked />
        ) : (
          <Shelf title="Newest in the catalog" items={newest.map((movie) => ({ movie }))} more={{ to: '/browse', label: 'All films' }} />
        )}

        {state.watchlist.length > 0 && <ListTeaser ids={state.watchlist} />}

        <section className="section home__faq" aria-labelledby="faq-title">
          <div className="section__head">
            <div>
              <p className="kicker">FAQ</p>
              <h2 id="faq-title">Questions</h2>
            </div>
          </div>
          <Faq items={FAQ} />
        </section>
      </div>
    </div>
  );
}

function ListTeaser({ ids }: { ids: string[] }) {
  const { byId } = useApi();
  const films = ids.map((id) => byId.get(id)).filter((m): m is MovieSummary => m !== undefined);
  if (!films.length) return null;
  return <Shelf kicker="Waiting for you" title="Your watchlist" items={films.map((movie) => ({ movie }))} more={{ to: '/list', label: 'Open the watchlist' }} />;
}

/** Slow columns of posters behind the hero: the catalog, at a glance. */
function PosterWall({ films }: { films: MovieSummary[] }) {
  const columns = useMemo(() => {
    const shuffled = [...films].sort((a, b) => hash(`${a.id}wall`) - hash(`${b.id}wall`)).slice(0, 36);
    return Array.from({ length: 6 }, (_, c) => shuffled.filter((_, i) => i % 6 === c));
  }, [films]);
  return (
    <div className="wall" aria-hidden="true">
      <div className="wall__tilt">
        {columns.map((col, c) => (
          <div key={c} className="wall__col" style={{ '--speed': `${70 + c * 9}s`, '--dir': c % 2 ? 'reverse' : 'normal' } as CSSProperties}>
            {[...col, ...col].map((m, i) => (
              <Poster key={`${m.id}-${i}`} movie={m} size="sm" />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

const FAQ = [
  {
    q: 'How does the Oracle choose a film?',
    a: 'Every film is scored by hand on things like fear, laughs, romance and pace. Each answer you give rules some films in and others out, and the Oracle always asks the question that splits the remaining films best. Five to eight answers are usually enough.',
  },
  {
    q: 'Will you spoil the ending?',
    a: 'No. The kind of ending is stored only so the rules can work, and it stays hidden behind a lock on every film page until you choose to reveal it.',
  },
  {
    q: 'What does “no sad ending” exclude?',
    a: 'Films whose ending is sad or bleak. The rule applies to the genres, the Oracle and every pick until you switch it off.',
  },
  {
    q: 'Where do the posters come from?',
    a: 'They are generated in code from each film’s colours and genre, so nothing is downloaded from anywhere and nothing tracks you.',
  },
  {
    q: 'Do I need an account for the watchlist?',
    a: 'No. Your watchlist is kept in this browser only.',
  },
];
