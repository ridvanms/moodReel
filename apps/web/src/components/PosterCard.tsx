import { GENRE_LABEL, type MovieSummary } from '@moodreel/core';
import { Link } from '../router';
import { useStore } from '../state/store';
import { Icon } from './Icon';
import { Poster } from './Poster';
import './PosterCard.css';

interface Props {
  movie: MovieSummary;
  /** 0–100 match for the current mood, when there is one. */
  score?: number;
  /** Dimmed with a reason, e.g. "excluded: sad ending" – never revealing which ending. */
  note?: string;
  rank?: number;
}

/** A poster tile for grids and shelves: the whole card links to the film, Save works in place. */
export function PosterCard({ movie, score, note, rank }: Props) {
  const { state, dispatch } = useStore();
  const saved = state.watchlist.includes(movie.id);
  const seen = state.seen.includes(movie.id);

  return (
    <article className={`pcard ${note ? 'is-muted' : ''}`}>
      <Link to={`/film/${movie.id}`} className="pcard__link" aria-label={`${movie.title} (${movie.year})`}>
        <div className="pcard__frame">
          <Poster movie={movie} />
          {score !== undefined && (
            <span className="pcard__score mono" title="How well it fits">
              {score}%
            </span>
          )}
          {rank !== undefined && <span className="pcard__rank">{rank}</span>}
          {seen && <span className="pcard__seen mono">seen</span>}
          <span className="pcard__hover" aria-hidden="true">
            <span className="pcard__genres">{movie.genres.slice(0, 2).map((g) => GENRE_LABEL[g]).join(' · ')}</span>
            <span className="pcard__open">
              Open <Icon name="arrow" size={14} />
            </span>
          </span>
        </div>
        <h3 className="pcard__title">{movie.title}</h3>
      </Link>
      <div className="pcard__foot">
        <span className="pcard__meta mono">
          {movie.year} · {movie.runtime} min
        </span>
        <button
          type="button"
          className={`pcard__save ${saved ? 'is-on' : ''}`}
          aria-pressed={saved}
          aria-label={saved ? `Remove ${movie.title} from my list` : `Save ${movie.title}`}
          onClick={() => dispatch({ type: 'toggleWatch', id: movie.id })}
        >
          <Icon name={saved ? 'check' : 'plus'} size={13} />
          {saved ? 'Saved' : 'Save'}
        </button>
      </div>
      {note && <p className="pcard__note">{note}</p>}
    </article>
  );
}
