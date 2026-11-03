import type { MovieSummary } from '@moodreel/core';
import { useRef, type ReactNode } from 'react';
import { Link } from '../router';
import { Icon } from './Icon';
import { PosterCard } from './PosterCard';
import './Shelf.css';

export interface ShelfItem {
  movie: MovieSummary;
}

interface Props {
  title: ReactNode;
  items: ShelfItem[];
  more?: { to: string; label: string };
  loading?: boolean;
}

/** A horizontal row of posters that scrolls by touch, wheel or the arrow buttons. */
export function Shelf({ title, items, more, loading = false }: Props) {
  const track = useRef<HTMLUListElement>(null);
  const scroll = (dir: 1 | -1) => {
    const el = track.current;
    if (el) el.scrollBy({ left: dir * el.clientWidth * 0.85, behavior: 'smooth' });
  };

  return (
    <section className="section shelf">
      <div className="section__head">
        <div>
          <h2>{title}</h2>
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
      <ul ref={track} className="shelf__track" aria-busy={loading}>
        {loading && items.length === 0
          ? Array.from({ length: 7 }, (_, i) => <li key={i} className="shelf__ghost" aria-hidden="true" />)
          : items.map((item) => (
              <li key={item.movie.id}>
                <PosterCard movie={item.movie} />
              </li>
            ))}
      </ul>
    </section>
  );
}
