import { GENRE_LABEL, type Genre, type MovieSummary } from '@moodreel/core';
import type { CSSProperties } from 'react';
import { GENRE_LINE } from '../lib/genres';
import { Link } from '../router';
import { Icon } from './Icon';
import { Poster } from './Poster';
import './GenreCard.css';

/** A genre tile: three of its films fanned out, its name and how many films it holds. */
export function GenreCard({ genre, films }: { genre: Genre; films: MovieSummary[] }) {
  const cover = films.slice(0, 3);
  const tint = cover[0]?.palette[1] ?? '#e0186f';
  return (
    <Link to={`/genres/${genre}`} className="gcard" style={{ '--tint': tint } as CSSProperties}>
      <span className="gcard__fan" aria-hidden="true">
        {cover.map((m, i) => (
          <span key={m.id} className="gcard__poster" style={{ '--i': i } as CSSProperties}>
            <Poster movie={m} size="sm" />
          </span>
        ))}
      </span>
      <span className="gcard__text">
        <span className="gcard__title">{GENRE_LABEL[genre]}</span>
        <span className="gcard__line">{GENRE_LINE[genre]}</span>
        <span className="gcard__count mono">{films.length} films</span>
      </span>
      <Icon name="arrow" size={18} className="gcard__arrow" />
    </Link>
  );
}
