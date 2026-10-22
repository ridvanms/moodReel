import type { MovieSummary } from '@moodreel/core';
import type { CSSProperties } from 'react';
import type { Mood } from '../lib/moods';
import { Link } from '../router';
import { useApi } from '../state/api';
import { Icon } from './Icon';
import { Poster } from './Poster';
import './MoodTile.css';

export function MoodTile({ mood, index }: { mood: Mood; index: number }) {
  const { byId } = useApi();
  const films = mood.think.map((id) => byId.get(id)).filter((m): m is MovieSummary => m !== undefined);
  const tint = films[0]?.palette[1] ?? '#e0186f';
  return (
    <Link to={`/moods/${mood.slug}`} className="moodtile" style={{ '--tint': tint } as CSSProperties}>
      <span className="moodtile__num mono">{String(index + 1).padStart(2, '0')}</span>
      <span className="moodtile__fan" aria-hidden="true">
        {films.map((m, i) => (
          <span key={m.id} className="moodtile__poster" style={{ '--i': i } as CSSProperties}>
            <Poster movie={m} size="sm" />
          </span>
        ))}
      </span>
      <span className="moodtile__text">
        <span className="moodtile__title">{mood.title}</span>
        <span className="moodtile__line">{mood.line}</span>
      </span>
      <Icon name="arrow" size={18} className="moodtile__arrow" />
    </Link>
  );
}

