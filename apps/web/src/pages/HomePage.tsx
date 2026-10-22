import type { CommunityStats, MovieSummary } from '@moodreel/core';
import { useEffect, useMemo, useState, type CSSProperties } from 'react';
import { Faq } from '../components/Faq';
import { Icon } from '../components/Icon';
import { MoodTile } from '../components/MoodTile';
import { Poster } from '../components/Poster';
import { RuleToggles } from '../components/RuleToggles';
import { Shelf } from '../components/Shelf';
import { useRecommendations } from '../hooks/useRecommendations';
import { hash } from '../lib/format';
import { MOOD_BY_SLUG, MOODS, moodQuery, type Mood } from '../lib/moods';
import { Link } from '../router';
import { useApi } from '../state/api';
import { usePick } from '../state/pick';
import { useStore } from '../state/store';
import './HomePage.css';

export function HomePage() {
  const { api, catalog } = useApi();
  const { state, rulesQuery } = useStore();
  const pick = usePick();
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
  const ruleCount = Object.keys(rulesQuery.dealbreakers).length;

  return (
    <div className="home">
      <section className="hero" aria-labelledby="hero-title">
        <PosterWall films={catalog} />
        <div className="hero__inner">
          <p className="kicker">{catalog.length} hand-profiled films · zero spoilers</p>
          <h1 id="hero-title">
            What are we watching <em>tonight?</em>
          </h1>
          <p className="hero__lead">
            Pick a feeling, not a title. MoodReel scores every film on ten mood dimensions, rules out what you don’t want and never gives away an ending.
          </p>
          <div className="hero__cta">
            <button type="button" className="btn btn--primary btn--large hero__pick" onClick={() => pick({ query: rulesQuery, label: noSad ? 'Anything, no sad ending' : 'Surprise me' })}>
              <Icon name="reel" size={20} />
              {noSad ? 'Pick me a film, no sad ending' : 'Pick me a film'}
            </button>
            <Link to="/oracle" className="btn btn--large hero__oracle">
              <Icon name="orb" size={18} /> Ask the Oracle
            </Link>
          </div>
          <div className="hero__rules">
            <RuleToggles only={['noSadEnding', 'noGore', 'noJumpscares']} />
            <Link to="/discover" className="link-arrow">
              {ruleCount > 3 ? `${ruleCount} rules on · ` : ''}More rules <Icon name="arrow" size={14} />
            </Link>
          </div>
        </div>
      </section>

      <div className="page home__page">
        <section className="section" aria-labelledby="moods-title">
          <div className="section__head">
            <div>
              <p className="kicker">Step one</p>
              <h2 id="moods-title">How do you feel tonight?</h2>
              <p>Tap a mood. Your house rules come along, so “no sad ending” stays on wherever you go.</p>
            </div>
            <Link to="/moods" className="link-arrow">
              All {MOODS.length} moods <Icon name="arrow" size={16} />
            </Link>
          </div>
          <ul className="moodgrid">
            {MOODS.slice(0, 8).map((mood, i) => (
              <li key={mood.slug}>
                <MoodTile mood={mood} index={i} />
              </li>
            ))}
          </ul>
        </section>

        <MoodShelf mood={MOOD_BY_SLUG.get('mess-with-my-head')!} kicker="Confusing in the best way" />

        {stats && stats.topWeek.length > 0 ? (
          <Shelf
            kicker="Community"
            title="Picked most this week"
            lead="What people said “I’ll watch it!” to after the reel stopped."
            items={stats.topWeek.map((t) => ({ movie: t.movie }))}
            ranked
            more={{ to: '/atlas', label: 'See the pulse' }}
          />
        ) : (
          <MoodShelf mood={MOOD_BY_SLUG.get('happy-ending-guaranteed')!} kicker="Guaranteed bright" />
        )}

        <section className="howto" aria-labelledby="howto-title">
          <div className="howto__intro">
            <p className="kicker">How it works</p>
            <h2 id="howto-title">A film recommender that listens to how you feel</h2>
            <p>Not another wall of trailers and star ratings. Three ways in, one engine underneath, and it always shows its working.</p>
          </div>
          <ol className="howto__steps">
            <li>
              <span className="howto__num mono">01</span>
              <h3>Pick a mood or mix your own</h3>
              <p>Start from a curated mood, or drag the puck on the mood map and fine-tune ten sliders in the Mood lab.</p>
              <Link to="/discover" className="link-arrow">
                Open the Mood lab <Icon name="arrow" size={14} />
              </Link>
            </li>
            <li>
              <span className="howto__num mono">02</span>
              <h3>Set your house rules</h3>
              <p>No sad ending, no gore, the dog survives. Excluded films go dark, but we never tell you which ending is which.</p>
              <Link to="/browse" className="link-arrow">
                Browse with rules <Icon name="arrow" size={14} />
              </Link>
            </li>
            <li>
              <span className="howto__num mono">03</span>
              <h3>Let the reel decide</h3>
              <p>A weighted draw among your best matches, spun like a film reel, ending in a ticket that explains the choice.</p>
              <button type="button" className="link-arrow link-arrow--button" onClick={() => pick({ query: rulesQuery, label: 'Surprise me' })}>
                Spin the reel <Icon name="arrow" size={14} />
              </button>
            </li>
          </ol>
        </section>

        <MoodShelf mood={MOOD_BY_SLUG.get('scary-not-too-much')!} kicker="The original brief" />

        {state.watchlist.length > 0 && <ListTeaser ids={state.watchlist} />}

        <section className="section home__faq" aria-labelledby="faq-title">
          <div className="section__head">
            <div>
              <p className="kicker">FAQ</p>
              <h2 id="faq-title">Questions, answered without spoilers</h2>
            </div>
          </div>
          <Faq items={FAQ} />
        </section>
      </div>
    </div>
  );
}

function MoodShelf({ mood, kicker }: { mood: Mood; kicker: string }) {
  const { state, rules } = useStore();
  const query = useMemo(() => moodQuery(mood, rules, state.seen), [mood, rules, state.seen]);
  const { data, loading } = useRecommendations(query, 7, 14);
  return (
    <Shelf
      kicker={kicker}
      title={mood.title}
      lead={mood.line}
      loading={loading}
      items={(data?.results ?? []).map((r) => ({ movie: r.movie, score: r.score }))}
      more={{ to: `/moods/${mood.slug}`, label: 'Open the mood' }}
    />
  );
}

function ListTeaser({ ids }: { ids: string[] }) {
  const { byId } = useApi();
  const films = ids.map((id) => byId.get(id)).filter((m): m is MovieSummary => m !== undefined);
  if (!films.length) return null;
  return <Shelf kicker="Waiting for you" title="Your list" items={films.map((movie) => ({ movie }))} more={{ to: '/list', label: 'Open my list' }} />;
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
    q: 'How does MoodReel decide what fits my mood?',
    a: 'Every film has a hand-scored profile on ten dimensions: fear, tension, mind-bending, laughs, romance, action, tears, darkness, wonder and pace. A mood is a set of wishes on those dimensions. The engine scores each film against them, adds similarity to example films and genre affinity, then keeps the list varied so you don’t get ten copies of the same film.',
  },
  {
    q: 'Will you spoil the ending?',
    a: 'No. We store what kind of ending a film has (bright, bittersweet, open, sad or bleak) only so the rules can work. It stays hidden behind a lock on every page until you choose to reveal it.',
  },
  {
    q: 'What exactly does “no sad ending” exclude?',
    a: 'Films whose ending is sad or bleak. Bittersweet and open endings stay in. Want only bright endings? Switch on “Happy endings only”. Your rules follow you to every page and every pick until you switch them off.',
  },
  {
    q: 'What is the Oracle?',
    a: 'Akinator for films. It asks yes/no questions and always picks the one that splits the remaining films best, so five to eight answers are usually enough to land on something you will like.',
  },
  {
    q: 'Where do the posters come from?',
    a: 'They are generated in code from each film’s colour palette and genre, so nothing is downloaded from anywhere and nothing tracks you.',
  },
  {
    q: 'Do I need an account?',
    a: 'No. Your list, your seen films and your rules are kept in this browser only.',
  },
];
