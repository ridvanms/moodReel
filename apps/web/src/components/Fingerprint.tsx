import { DIM_META, DIMS, type MoodQuery, type MovieSummary } from '@moodreel/core';
import './Fingerprint.css';

/**
 * A bullet chart: one row per mood dimension. The warm bar is the film,
 * the cool band is what you asked for. Values are printed, so nothing hides behind hover.
 */
export function Fingerprint({ movie, query, compact = false }: { movie: MovieSummary; query?: MoodQuery; compact?: boolean }) {
  const wishes = query?.dims ?? {};
  const hasWishes = Object.keys(wishes).length > 0;
  const rows = compact && hasWishes ? DIMS.filter((d) => wishes[d]) : DIMS;

  return (
    <figure className={`print ${compact ? 'print--compact' : ''}`}>
      <figcaption className="print__caption">
        <span className="eyebrow">Mood fingerprint · 0–10</span>
        {hasWishes && (
          <span className="print__legend">
            <span className="print__key print__key--film" aria-hidden="true" /> the film
            <span className="print__key print__key--wish" aria-hidden="true" /> your wish
          </span>
        )}
      </figcaption>
      <table className="print__table">
        <tbody>
          {rows.map((dim) => {
            const value = movie.profile[dim];
            const wish = wishes[dim];
            const lo = wish ? Math.max(0, wish.min ?? wish.target - (wish.tolerance ?? 1)) : 0;
            const hi = wish ? Math.min(10, wish.max ?? wish.target + (wish.tolerance ?? 1)) : 0;
            const wishText = wish ? `you want ${fmt(lo)}–${fmt(hi)}` : '';
            return (
              <tr key={dim} title={`${DIM_META[dim].label}: ${value}/10${wish ? ` · ${wishText}` : ''}`}>
                <th scope="row">{DIM_META[dim].short}</th>
                <td className="print__cell">
                  <span className="print__track">
                    {wish && <span className="print__band" style={{ left: `${lo * 10}%`, width: `${Math.max(2, (hi - lo) * 10)}%` }} />}
                    {wish && <span className="print__target" style={{ left: `${wish.target * 10}%` }} />}
                    <span className="print__bar" style={{ width: `${Math.max(value, 0.3) * 10}%` }} />
                  </span>
                </td>
                <td className="print__value mono">
                  {value}
                  {wish && !compact && <span className="print__wish"> · {wishText}</span>}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </figure>
  );
}

function fmt(n: number): string {
  return Number.isInteger(n) ? String(n) : n.toFixed(1);
}
