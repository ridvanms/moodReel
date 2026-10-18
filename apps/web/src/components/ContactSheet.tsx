import { EXCLUSION_LABEL, type ExclusionReason, type PoolReport } from '@moodreel/core';
import { useMemo, useState, type CSSProperties } from 'react';
import { useApi } from '../state/api';
import './ContactSheet.css';

interface Props {
  pool: PoolReport | null;
  highlighted: ReadonlySet<string>;
  onOpen: (id: string) => void;
}

/**
 * The whole catalog as frames on a strip of film. Rules switch frames off
 * one by one, so you can watch "no sad ending" thin the field without
 * learning which endings are sad.
 */
export function ContactSheet({ pool, highlighted, onOpen }: Props) {
  const { catalog } = useApi();
  const [focus, setFocus] = useState<ExclusionReason | null>(null);
  const frames = useMemo(() => [...catalog].sort((a, b) => a.year - b.year || a.title.localeCompare(b.title)), [catalog]);
  const reasons = (Object.entries(pool?.byReason ?? {}) as Array<[ExclusionReason, number]>).sort((a, b) => b[1] - a[1]);
  const remaining = pool?.remaining ?? catalog.length;
  const total = pool?.total ?? catalog.length;

  return (
    <section className="sheet" aria-labelledby="sheet-title">
      <div className="sheet__head">
        <div>
          <p className="eyebrow" id="sheet-title">
            Contact sheet · {frames[0]?.year}–{frames[frames.length - 1]?.year}
          </p>
          <p className="sheet__count" aria-live="polite">
            <span className="sheet__remaining">{remaining}</span>
            <span className="sheet__total"> of {total} films remain</span>
          </p>
        </div>
        {reasons.length > 0 && (
          <ul className="sheet__reasons" aria-label="Why films are excluded">
            {reasons.map(([reason, count]) => (
              <li key={reason}>
                <button
                  type="button"
                  className={`sheet__reason ${focus === reason ? 'is-on' : ''}`}
                  aria-pressed={focus === reason}
                  onClick={() => setFocus((f) => (f === reason ? null : reason))}
                >
                  <span className="mono">{count}</span> {EXCLUSION_LABEL[reason]}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
      <div className="sheet__strip" aria-hidden="true">
        {frames.map((movie, i) => {
          const reason = pool?.excluded[movie.id];
          const classes = ['frame', reason ? 'is-out' : '', highlighted.has(movie.id) ? 'is-hit' : '', focus && reason === focus ? 'is-focus' : ''].join(' ');
          return (
            <span
              key={movie.id}
              className={classes}
              title={reason ? `${movie.title} – excluded: ${EXCLUSION_LABEL[reason]}` : movie.title}
              style={{ '--a': movie.palette[1], '--b': movie.palette[0], '--i': i % 24 } as CSSProperties}
              onClick={() => onOpen(movie.id)}
            />
          );
        })}
      </div>
    </section>
  );
}
