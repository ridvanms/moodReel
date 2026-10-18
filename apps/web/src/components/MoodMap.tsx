import type { Effect, MovieSummary } from '@moodreel/core';
import { useEffect, useMemo, useRef, useState, type KeyboardEvent, type PointerEvent } from 'react';
import { useApi } from '../state/api';
import { PAD_GROUP_PREFIX, useStore } from '../state/store';
import './MoodMap.css';

/**
 * Every film plotted by intensity (x) and darkness (y). Dragging the puck
 * writes a handful of soft wishes; the dots light up as the engine agrees.
 */

const intensity = (m: MovieSummary) => (0.45 * m.profile.tension + 0.3 * m.profile.pace + 0.25 * m.profile.action) / 10;
const darkness = (m: MovieSummary) => (0.55 * m.profile.darkness + 0.25 * m.profile.sadness + 0.2 * m.profile.fear) / 10;

function label(x: number, y: number): string {
  const xl = x < 0.36 ? 'calm' : x > 0.64 ? 'intense' : 'balanced';
  const yl = y < 0.36 ? 'bright' : y > 0.64 ? 'dark' : 'neither bright nor dark';
  return `${PAD_GROUP_PREFIX}${xl} and ${yl}`;
}

export function padEffects(x: number, y: number): Effect[] {
  const group = label(x, y);
  const round = (v: number) => Math.round(v * 2) / 2;
  return [
    { kind: 'dim', dim: 'tension', constraint: { target: round(1 + 8 * x), tolerance: 1.5, weight: 0.8 }, group },
    { kind: 'dim', dim: 'pace', constraint: { target: round(2 + 7 * x), tolerance: 1.5, weight: 0.6 }, group },
    { kind: 'dim', dim: 'darkness', constraint: { target: round(0.5 + 9 * y), tolerance: 1.5, weight: 0.9 }, group },
    { kind: 'dim', dim: 'humor', constraint: { target: round(8 * (1 - y)), tolerance: 2, weight: 0.4 }, group },
  ];
}

interface Props {
  highlighted: ReadonlySet<string>;
  excluded: Readonly<Record<string, unknown>>;
  onOpen: (id: string) => void;
}

export function MoodMap({ highlighted, excluded, onOpen }: Props) {
  const { catalog } = useApi();
  const { state, dispatch } = useStore();
  const [puck, setPuck] = useState(state.pad);
  const [hover, setHover] = useState<{ movie: MovieSummary; x: number; y: number } | null>(null);
  const area = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);
  const lastSent = useRef(0);

  useEffect(() => setPuck(state.pad), [state.pad]);

  const points = useMemo(() => {
    const xs = catalog.map(intensity);
    const ys = catalog.map(darkness);
    const [x0, x1, y0, y1] = [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)];
    return catalog.map((movie, i) => ({
      movie,
      x: 0.04 + 0.92 * ((xs[i]! - x0) / (x1 - x0 || 1)),
      y: 0.04 + 0.92 * ((ys[i]! - y0) / (y1 - y0 || 1)),
    }));
  }, [catalog]);

  const commit = (pos: { x: number; y: number }, force = false) => {
    const now = performance.now();
    if (!force && now - lastSent.current < 120) return;
    lastSent.current = now;
    dispatch({ type: 'pad', pad: pos, effects: padEffects(pos.x, pos.y) });
  };

  const fromPointer = (event: PointerEvent) => {
    const rect = area.current!.getBoundingClientRect();
    const clamp = (v: number) => Math.min(1, Math.max(0, v));
    return { x: clamp((event.clientX - rect.left) / rect.width), y: clamp((event.clientY - rect.top) / rect.height) };
  };

  const onPointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if ((event.target as HTMLElement).dataset.dot) return;
    dragging.current = true;
    area.current?.setPointerCapture(event.pointerId);
    const pos = fromPointer(event);
    setPuck(pos);
    commit(pos, true);
  };
  const onPointerMove = (event: PointerEvent<HTMLDivElement>) => {
    if (!dragging.current) return;
    const pos = fromPointer(event);
    setPuck(pos);
    commit(pos);
  };
  const onPointerUp = (event: PointerEvent<HTMLDivElement>) => {
    if (!dragging.current) return;
    dragging.current = false;
    commit(fromPointer(event), true);
  };

  const onKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    const step = event.shiftKey ? 0.15 : 0.05;
    const base = puck ?? { x: 0.5, y: 0.5 };
    const moves: Record<string, [number, number]> = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step] };
    const move = moves[event.key];
    if (!move) return;
    event.preventDefault();
    const next = { x: Math.min(1, Math.max(0, base.x + move[0])), y: Math.min(1, Math.max(0, base.y + move[1])) };
    setPuck(next);
    commit(next, true);
  };

  const describe = puck ? label(puck.x, puck.y).slice(PAD_GROUP_PREFIX.length) : 'not set';

  return (
    <div className="moodmap">
      <div
        ref={area}
        className="moodmap__area"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
      >
        <span className="moodmap__quad moodmap__quad--tl">Cozy</span>
        <span className="moodmap__quad moodmap__quad--tr">Adrenaline</span>
        <span className="moodmap__quad moodmap__quad--bl">Melancholy</span>
        <span className="moodmap__quad moodmap__quad--br">Nightmare</span>
        <div className="moodmap__dots">
          {points.map(({ movie, x, y }) => {
            const stateClass = excluded[movie.id] ? 'is-out' : highlighted.has(movie.id) ? 'is-hit' : '';
            return (
              <span
                key={movie.id}
                data-dot="1"
                className={`moodmap__dot ${stateClass}`}
                style={{ left: `${x * 100}%`, top: `${y * 100}%` }}
                onPointerEnter={() => setHover({ movie, x, y })}
                onPointerLeave={() => setHover((h) => (h?.movie.id === movie.id ? null : h))}
                onClick={() => onOpen(movie.id)}
              />
            );
          })}
        </div>
        {hover && (
          <span className={`moodmap__tip ${hover.x > 0.6 ? 'moodmap__tip--left' : ''}`} style={{ left: `${hover.x * 100}%`, top: `${hover.y * 100}%` }}>
            {hover.movie.title} <span className="mono">{hover.movie.year}</span>
          </span>
        )}
        <button
          type="button"
          className={`moodmap__puck ${puck ? '' : 'is-idle'}`}
          style={{ left: `${(puck?.x ?? 0.5) * 100}%`, top: `${(puck?.y ?? 0.5) * 100}%` }}
          aria-label={`Map position: ${describe}. Move it with the arrow keys.`}
          onKeyDown={onKeyDown}
          onClick={() => !puck && commit({ x: 0.5, y: 0.5 }, true)}
        />
      </div>
      <div className="moodmap__axes" aria-hidden="true">
        <span>← calm</span>
        <span>intense →</span>
      </div>
      <p className="moodmap__hint">
        {puck ? (
          <>
            You are after something <b>{describe}</b>. Each dot is a film; the bright ones fit best.
          </>
        ) : (
          'Drag or tap anywhere on the map. Up is bright, down is dark.'
        )}
      </p>
    </div>
  );
}
