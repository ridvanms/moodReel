import { GENRE_LABEL, type Genre, type MovieSummary } from '@moodreel/core';
import type { CSSProperties } from 'react';
import { Link } from '../router';
import { Poster } from './Poster';
import './GenreCard.css';

/** A genre tile: three of its films fanned out, its name and how many films it holds. */
export function GenreCard({ genre, films }: { genre: Genre; films: MovieSummary[] }) {
  return (
    <Link to={`/genres/${genre}`} className="gcard">
      <span className="gcard__fan" aria-hidden="true">
        {films.slice(0, 3).map((m, i) => (
          <span key={m.id} className="gcard__poster" style={{ '--i': i } as CSSProperties}>
            <Poster movie={m} size="sm" />
          </span>
        ))}
      </span>
      <span className="gcard__title">{GENRE_LABEL[genre]}</span>
      <span className="gcard__count">{films.length} films</span>
    </Link>
  );
}
