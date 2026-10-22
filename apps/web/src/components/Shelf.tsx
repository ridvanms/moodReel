import type { MovieSummary } from '@moodreel/core';
import { useRef, type ReactNode } from 'react';
import { Link } from '../router';
import { Icon } from './Icon';
import { PosterCard } from './PosterCard';
import './Shelf.css';

export interface ShelfItem {
  movie: MovieSummary;
  score?: number;
}

interface Props {
  title: ReactNode;
  kicker?: string;
  lead?: ReactNode;
  items: ShelfItem[];
  more?: { to: string; label: string };
  ranked?: boolean;
  loading?: boolean;
}

/** A horizontal row of posters that scrolls by touch, wheel or the arrow buttons. */
export function Shelf({ title, kicker, lead, items, more, ranked = false, loading = false }: Props) {
  const track = useRef<HTMLUListElement>(null);
  const scroll = (dir: 1 | -1) => {
    const el = track.current;
    if (el) el.scrollBy({ left: dir * el.clientWidth * 0.85, behavior: 'smooth' });
  };

  return (
    <section className="section shelf">
      <div className="section__head">
        <div>
          {kicker && <p className="kicker">{kicker}</p>}
          <h2>{title}</h2>
          {lead && <p>{lead}</p>}
        </div>
        <div className="shelf__nav">
          {more && (
            <Link to={more.to} className="link-arrow">
              {more.label} <Icon name="arrow" size={16} />
            </Link>
          )}
          <button type="button" className="btn btn--icon shelf__btn" aria-label="Scroll back" onClick={() => scroll(-1)}>
            <Icon name="chevron" size={18} className="flip" />
          </button>
          <button type="button" className="btn btn--icon shelf__btn" aria-label="Scroll forward" onClick={() => scroll(1)}>
            <Icon name="chevron" size={18} />
          </button>
        </div>
      </div>
      <ul ref={track} className={`shelf__track ${ranked ? 'is-ranked' : ''}`} aria-busy={loading}>
        {loading && items.length === 0
          ? Array.from({ length: 7 }, (_, i) => <li key={i} className="shelf__ghost" aria-hidden="true" />)
          : items.map((item, i) => (
              <li key={item.movie.id}>
                <PosterCard movie={item.movie} {...(item.score !== undefined ? { score: item.score } : {})} {...(ranked ? { rank: i + 1 } : {})} />
              </li>
            ))}
      </ul>
    </section>
  );
}
