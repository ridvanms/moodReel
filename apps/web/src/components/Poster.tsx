import type { Genre, MovieSummary } from '@moodreel/core';
import { memo, type CSSProperties, type ReactNode } from 'react';
import { hash, inkFor } from '../lib/format';
import './Poster.css';

/**
 * A generated, typographic poster. No scraped artwork: each film gets its own
 * palette and a motif for its main genre, laid out with a seeded jitter so
 * two horror films never look identical.
 */

type Motif = (p: [string, string, string], r: (n: number) => number) => ReactNode;

const MOTIFS: Record<Genre, Motif> = {
  horror: ([, a, b], r) => (
    <>
      <path d={`M${96 + r(16)} -5 L${88 + r(20)} 80 L${104 + r(10)} 120 L${86 + r(16)} 190 L${100 + r(6)} 305`} stroke={a} strokeWidth="3.5" fill="none" />
      <circle cx={70 + r(60)} cy={70 + r(40)} r="9" fill={b} opacity="0.9" />
      <circle cx={70 + r(60)} cy={70 + r(40)} r="3.5" fill={a} />
    </>
  ),
  thriller: ([, a], r) => (
    <g transform={`rotate(${-28 + r(10)} 100 150)`}>
      {Array.from({ length: 9 }, (_, i) => (
        <rect key={i} x="-60" y={i * 34 - 10} width="320" height={10 + (i % 3) * 3} fill={a} opacity={0.22 + (i % 4) * 0.08} />
      ))}
    </g>
  ),
  mystery: ([, a, b], r) => (
    <>
      {[70, 52, 34, 16].map((rad, i) => (
        <circle key={rad} cx={100 + r(14) * (i % 2 ? 1 : -1)} cy={120 + r(10)} r={rad} fill="none" stroke={i % 2 ? b : a} strokeWidth="2.5" opacity={0.85 - i * 0.12} />
      ))}
    </>
  ),
  scifi: ([, a, b], r) => (
    <>
      <circle cx={100 + r(30) - 15} cy={110 + r(20)} r="54" fill={a} opacity="0.92" />
      <ellipse cx={100 + r(30) - 15} cy={110 + r(20)} rx="92" ry="16" fill="none" stroke={b} strokeWidth="3" transform={`rotate(${-18 + r(10)} 100 120)`} />
      <rect x="0" y={232 + r(14)} width="200" height="1.5" fill={b} opacity="0.7" />
    </>
  ),
  fantasy: ([, a, b], r) => (
    <>
      <path d="M50 270 L50 140 A50 50 0 0 1 150 140 L150 270" fill="none" stroke={a} strokeWidth="4" />
      {Array.from({ length: 7 }, (_, i) => (
        <circle key={i} cx={20 + r(160)} cy={20 + r(90)} r={1.5 + (i % 3)} fill={b} />
      ))}
    </>
  ),
  drama: ([, a, b], r) => (
    <>
      <circle cx={60 + r(80)} cy="205" r="46" fill={a} opacity="0.95" />
      <rect x="0" y="205" width="200" height="100" fill="rgb(0 0 0 / 0.35)" />
      <rect x="0" y="204" width="200" height="2" fill={b} opacity="0.8" />
    </>
  ),
  comedy: ([, a, b], r) => (
    <>
      {Array.from({ length: 6 }, (_, i) => (
        <rect key={i} x={10 + r(160)} y={20 + r(190)} width={14 + r(26)} height={14 + r(26)} rx="7" fill={i % 2 ? a : b} transform={`rotate(${r(90)} 100 150)`} opacity="0.9" />
      ))}
    </>
  ),
  romance: ([, a, b], r) => (
    <>
      <circle cx={80 + r(8)} cy={130 + r(14)} r="46" fill={a} opacity="0.85" />
      <circle cx={122 + r(8)} cy={140 + r(14)} r="46" fill={b} opacity="0.55" style={{ mixBlendMode: 'screen' }} />
    </>
  ),
  action: ([, a, b], r) => (
    <>
      {Array.from({ length: 7 }, (_, i) => (
        <rect key={i} x="-40" y={40 + i * 26 + r(8)} width={150 + r(120)} height="3" fill={i === 3 ? a : b} transform="skewX(-35)" opacity={i === 3 ? 1 : 0.5} />
      ))}
      <path d={`M${60 + r(20)} 210 L100 175 L${140 - r(20)} 210`} stroke={a} strokeWidth="6" fill="none" />
    </>
  ),
  adventure: ([, a, b], r) => (
    <>
      <path d={`M-10 260 L${55 + r(20)} ${130 + r(30)} L${110 + r(10)} 230 L${150 + r(20)} ${150 + r(30)} L215 260 Z`} fill={a} opacity="0.9" />
      <circle cx={140 + r(30)} cy={70 + r(30)} r="14" fill={b} />
    </>
  ),
  crime: ([, a], r) => (
    <>
      {Array.from({ length: 11 }, (_, i) => (
        <rect key={i} x="0" y={30 + i * 22} width="200" height="7" fill={a} opacity={0.12 + ((i + r(3)) % 4) * 0.07} />
      ))}
    </>
  ),
  animation: ([, a, b], r) => (
    <>
      <rect x={30 + r(20)} y={70 + r(20)} width="90" height="90" rx="40" fill={a} opacity="0.9" />
      <rect x={90 + r(20)} y={120 + r(20)} width="70" height="70" rx="32" fill={b} opacity="0.85" />
    </>
  ),
  war: ([, a, b], r) => (
    <>
      <circle cx={100 + r(40) - 20} cy="190" r="34" fill={a} opacity="0.85" />
      {Array.from({ length: 5 }, (_, i) => (
        <rect key={i} x="0" y={150 + i * 14} width="200" height="6" fill={b} opacity={0.2 + i * 0.1} />
      ))}
    </>
  ),
  musical: ([, a, b], r) => (
    <>
      {[30, 50, 70, 90].map((rad, i) => (
        <path key={rad} d={`M${100 - rad} ${170 + r(6)} A${rad} ${rad} 0 0 1 ${100 + rad} ${170 + r(6)}`} fill="none" stroke={i % 2 ? b : a} strokeWidth="3" />
      ))}
    </>
  ),
};

interface PosterProps {
  movie: MovieSummary;
  size?: 'sm' | 'md' | 'lg';
  /** Decorative when the title is already next to it. */
  decorative?: boolean;
  className?: string;
}

export const Poster = memo(function Poster({ movie, size = 'md', decorative = true, className }: PosterProps) {
  const [bg, a, b] = movie.palette;
  const seed = hash(movie.id);
  let state = seed;
  const r = (n: number) => {
    state = (Math.imul(state ^ (state >>> 15), 2246822507) + 0x9e3779b9) >>> 0;
    return (state % 1000) / 1000 * n;
  };
  const motif = MOTIFS[movie.genres[0] ?? 'drama'](movie.palette, r);
  const ink = inkFor(bg);
  // Size the title so its longest word fits the poster width: the display face is wide, and a word must never break.
  const longestWord = Math.max(...movie.title.split(/\s+/).map((w) => w.length));
  const titleSize = Math.min(movie.title.length > 22 ? 10 : 12.5, 80 / (0.92 * longestWord));

  return (
    <div
      className={`poster poster--${size} ${className ?? ''}`}
      style={{ '--poster-bg': bg, '--poster-a': a, '--poster-b': b, '--poster-ink': ink } as CSSProperties}
      role={decorative ? undefined : 'img'}
      aria-hidden={decorative || undefined}
      aria-label={decorative ? undefined : `Poster: ${movie.title}`}
    >
      <svg className="poster__art" viewBox="0 0 200 300" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
        {motif}
      </svg>
      <div className="poster__grain" aria-hidden="true" />
      <div className="poster__text">
        <span className="poster__year">{movie.year}</span>
        <span className="poster__title" style={{ fontSize: `${titleSize.toFixed(2)}cqw` }}>
          {movie.title}
        </span>
        <span className="poster__credit">{movie.director.split(',')[0]}</span>
      </div>
    </div>
  );
});
