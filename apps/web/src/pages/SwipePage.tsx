import { exclusionReason, GENRE_LABEL, GENRES, type Genre, type MovieSummary } from '@moodreel/core';
import { AnimatePresence, motion, useMotionValue, useTransform, type PanInfo } from 'motion/react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Icon } from '../components/Icon';
import { Poster } from '../components/Poster';
import { hash } from '../lib/format';
import { isGenre } from '../lib/genres';
import { readJson, writeJson } from '../lib/storage';
import { Link } from '../router';
import { useApi } from '../state/api';
import { useStore } from '../state/store';
import './SwipePage.css';

type Choice = 'save' | 'skip';

const DECK_KEY = 'moodreel:swipe:v1';
/** How far (px) or how fast (px/s) a drag must go to count as a decision. */
const DISTANCE = 110;
const SPEED = 600;

interface Deck {
  /** Shuffles the order; a new one on "start over". */
  seed: number;
  skipped: string[];
  genre: Genre | null;
}

function loadDeck(): Deck {
  const saved = readJson<Partial<Deck>>(DECK_KEY, {});
  return {
    seed: typeof saved.seed === 'number' ? saved.seed : Math.floor(Math.random() * 1e9),
    skipped: Array.isArray(saved.skipped) ? saved.skipped : [],
    genre: isGenre(saved.genre) ? saved.genre : null,
  };
}

export function SwipePage() {
  const { catalog } = useApi();
  const { state, unseenQuery, dispatch } = useStore();
  const [deck, setDeck] = useState(loadDeck);
  const [history, setHistory] = useState<Array<{ id: string; choice: Choice }>>([]);
  const [direction, setDirection] = useState(1);

  useEffect(() => writeJson(DECK_KEY, deck), [deck]);

  // Films still to swipe: in the chosen genre, allowed by the rules, not saved, seen or skipped.
  const cards = useMemo(() => {
    const skipped = new Set(deck.skipped);
    return catalog
      .filter((m) => (!deck.genre || m.genres.includes(deck.genre)) && !state.watchlist.includes(m.id) && !skipped.has(m.id) && !exclusionReason(m, unseenQuery))
      .sort((a, b) => hash(`${a.id}${deck.seed}`) - hash(`${b.id}${deck.seed}`));
  }, [catalog, deck, state.watchlist, unseenQuery]);

  const top = cards[0];

  const decide = useCallback(
    (choice: Choice) => {
      if (!top) return;
      setDirection(choice === 'save' ? 1 : -1);
      setHistory((h) => [...h, { id: top.id, choice }]);
      if (choice === 'save') dispatch({ type: 'addWatch', id: top.id });
      else setDeck((d) => ({ ...d, skipped: [...d.skipped, top.id] }));
    },
    [top, dispatch],
  );

  const undo = () => {
    const last = history[history.length - 1];
    if (!last) return;
    setHistory((h) => h.slice(0, -1));
    if (last.choice === 'save') dispatch({ type: 'toggleWatch', id: last.id });
    else setDeck((d) => ({ ...d, skipped: d.skipped.filter((id) => id !== last.id) }));
  };

  const restart = () => {
    setHistory([]);
    setDeck((d) => ({ ...d, skipped: [], seed: Math.floor(Math.random() * 1e9) }));
  };

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if ((event.target as HTMLElement).closest('input, select, textarea')) return;
      if (event.key === 'ArrowRight') decide('save');
      else if (event.key === 'ArrowLeft') decide('skip');
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [decide]);

  const savedNow = history.filter((h) => h.choice === 'save').length;

  return (
    <div className="page swipe">
      <header className="swipe__head">
        <h1>Swipe</h1>
        <p>Right to save it, left to skip it.</p>
      </header>

      <div className="swipe__filters">
        <label className="fselect">
          <span className="fselect__label">Genre</span>
          <select value={deck.genre ?? ''} onChange={(e) => setDeck((d) => ({ ...d, genre: isGenre(e.target.value) ? e.target.value : null }))}>
            <option value="">All genres</option>
            {GENRES.map((g) => (
              <option key={g} value={g}>
                {GENRE_LABEL[g]}
              </option>
            ))}
          </select>
          <Icon name="chevronDown" size={16} className="fselect__chev" />
        </label>
      </div>

      <div className="swipe__stage">
        {top ? (
          <>
            {cards.slice(1, 3).map((m, i) => (
              <div key={m.id} className="swipe__behind" style={{ transform: `translateY(${(i + 1) * 10}px) scale(${1 - (i + 1) * 0.04})`, zIndex: 2 - i }} aria-hidden="true">
                <Poster movie={m} size="lg" bare />
              </div>
            ))}
            <AnimatePresence custom={direction} initial={false}>
              <SwipeCard key={top.id} movie={top} onDecide={decide} />
            </AnimatePresence>
          </>
        ) : (
          <div className="swipe__done">
            <h2>That’s all of them</h2>
            <p>{deck.genre ? `You went through every ${GENRE_LABEL[deck.genre].toLowerCase()} film.` : 'You went through every film.'}</p>
            <button type="button" className="btn btn--primary" onClick={restart}>
              Start over
            </button>
          </div>
        )}
      </div>

      {top && (
        <div className="swipe__buttons">
          <button type="button" className="swipe__btn swipe__btn--skip" onClick={() => decide('skip')} aria-label={`Skip ${top.title}`}>
            <Icon name="close" size={26} />
          </button>
          <Link to={`/film/${top.id}`} className="swipe__btn swipe__btn--info" aria-label={`More about ${top.title}`}>
            <Icon name="info" size={22} />
          </Link>
          <button type="button" className="swipe__btn swipe__btn--save" onClick={() => decide('save')} aria-label={`Save ${top.title}`}>
            <Icon name="heart" size={26} />
          </button>
        </div>
      )}

      <div className="swipe__foot">
        <button type="button" className="btn btn--ghost btn--small" onClick={undo} disabled={!history.length}>
          <Icon name="undo" size={14} /> Undo
        </button>
        <span>{top ? `${cards.length} left` : ''}</span>
        <Link to="/list" className="link-arrow">
          Watchlist{savedNow > 0 ? ` (+${savedNow})` : ''} <Icon name="arrow" size={14} />
        </Link>
      </div>
    </div>
  );
}

function SwipeCard({ movie, onDecide }: { movie: MovieSummary; onDecide: (choice: Choice) => void }) {
  const x = useMotionValue(0);
  const rotate = useTransform(x, [-220, 220], [-14, 14]);
  const saveOpacity = useTransform(x, [20, DISTANCE], [0, 1]);
  const skipOpacity = useTransform(x, [-DISTANCE, -20], [1, 0]);

  const onDragEnd = (_: unknown, info: PanInfo) => {
    if (info.offset.x > DISTANCE || info.velocity.x > SPEED) onDecide('save');
    else if (info.offset.x < -DISTANCE || info.velocity.x < -SPEED) onDecide('skip');
  };

  return (
    <motion.article
      className="swipe__card"
      style={{ x, rotate, zIndex: 3 }}
      drag="x"
      dragSnapToOrigin
      dragElastic={0.9}
      onDragEnd={onDragEnd}
      initial={{ scale: 0.96, y: 10, opacity: 0.6 }}
      animate={{ scale: 1, y: 0, opacity: 1 }}
      exit="gone"
      variants={{ gone: (dir: number) => ({ x: dir * 640, rotate: dir * 24, opacity: 0, transition: { duration: 0.32 } }) }}
      transition={{ duration: 0.25 }}
      aria-label={movie.title}
    >
      <Poster movie={movie} size="lg" bare />
      <motion.span className="swipe__stamp swipe__stamp--save" style={{ opacity: saveOpacity }} aria-hidden="true">
        Save
      </motion.span>
      <motion.span className="swipe__stamp swipe__stamp--skip" style={{ opacity: skipOpacity }} aria-hidden="true">
        Skip
      </motion.span>
      <div className="swipe__info">
        <h2>{movie.title}</h2>
        <p className="swipe__meta">
          {movie.year} · {Math.floor(movie.runtime / 60)} h {movie.runtime % 60} min · {movie.genres.slice(0, 2).map((g) => GENRE_LABEL[g]).join(', ')}
        </p>
        <p className="swipe__blurb">{movie.blurb}</p>
      </div>
    </motion.article>
  );
}
