import { GENRE_LABEL, timecode, type Recommendation } from '@moodreel/core';
import { motion } from 'motion/react';
import { useStore } from '../state/store';
import { EndingReveal } from './EndingReveal';
import { Icon } from './Icon';
import { Poster } from './Poster';
import './FilmCard.css';

const FLAG_LABEL = { gore: 'gore', jumpscares: 'jump scares', animalDeath: 'an animal dies' } as const;

interface Props {
  rec: Recommendation;
  rank: number;
  ranked: boolean;
  onOpen: (id: string) => void;
}

export function FilmCard({ rec, rank, ranked, onOpen }: Props) {
  const { movie, score, reasons } = rec;
  const { state, dispatch } = useStore();
  const saved = state.watchlist.includes(movie.id);
  const flags = (Object.keys(FLAG_LABEL) as Array<keyof typeof FLAG_LABEL>).filter((f) => movie.flags[f]);
  const featured = rank === 0 && ranked;

  return (
    <motion.article
      layout="position"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.97 }}
      transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
      className={`card ${featured ? 'card--featured' : ''}`}
      aria-labelledby={`card-${movie.id}`}
    >
      <button type="button" className="card__poster" onClick={() => onOpen(movie.id)} aria-label={`Details for ${movie.title}`}>
        <Poster movie={movie} size={featured ? 'md' : 'sm'} />
      </button>
      <div className="card__body">
        <div className="card__top">
          <div className="card__titles">
            {featured && <p className="eyebrow card__eyebrow">Best match</p>}
            <h3 id={`card-${movie.id}`} className="card__title">
              <button type="button" onClick={() => onOpen(movie.id)}>
                {movie.title}
              </button>
            </h3>
            <p className="card__meta mono">
              <span>{movie.year}</span>
              <span>{movie.director}</span>
              <span title="Runtime">{timecode(movie.runtime)}</span>
              <span>{movie.genres.map((g) => GENRE_LABEL[g]).join(' / ')}</span>
            </p>
          </div>
          <div className={`card__score ${ranked ? '' : 'is-unranked'}`} title={ranked ? 'How well the film fits your wishes' : 'No preferences yet, so the order is shuffled'}>
            <span className="card__score-value">
              {ranked ? score : '—'}
              {ranked && <small>%</small>}
            </span>
            <span className="card__score-label">{ranked ? 'match' : 'unscored'}</span>
          </div>
        </div>
        <p className="card__blurb">{movie.blurb}</p>
        {reasons.length > 0 && (
          <ul className="card__reasons" aria-label="Why this film">
            {reasons.slice(0, featured ? 5 : 3).map((reason) => (
              <li key={reason.text} className={`chip chip--${reason.tone === 'warn' ? 'warn' : reason.tone === 'good' ? 'good' : 'plain'}`}>
                {reason.text}
              </li>
            ))}
          </ul>
        )}
        <div className="card__foot">
          <EndingReveal ending={movie.ending} />
          {flags.length > 0 && (
            <span className="card__flags" title="Content warnings">
              {flags.map((f) => FLAG_LABEL[f]).join(' · ')}
            </span>
          )}
          <span className="card__age mono">{movie.age === 0 ? 'all ages' : `${movie.age}+`}</span>
          <span className="card__actions">
            <button type="button" className={`btn btn--small ${saved ? 'is-saved' : ''}`} aria-pressed={saved} onClick={() => dispatch({ type: 'toggleWatch', id: movie.id })}>
              <Icon name={saved ? 'check' : 'bookmark'} size={14} />
              {saved ? 'Saved' : 'Save'}
            </button>
            <button type="button" className="btn btn--small btn--ghost" onClick={() => dispatch({ type: 'toggleSeen', id: movie.id })}>
              <Icon name="eye" size={14} />
              Seen it
            </button>
          </span>
        </div>
      </div>
    </motion.article>
  );
}
