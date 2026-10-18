import { DIM_META, DIMS, effectKey, sliderConstraint, type Dim } from '@moodreel/core';
import type { CSSProperties } from 'react';
import { useStore } from '../state/store';
import './DimSliders.css';

export function DimSliders() {
  const { query, dispatch } = useStore();

  const set = (dim: Dim, value: number) => dispatch({ type: 'upsert', effect: { kind: 'dim', dim, constraint: sliderConstraint(value) } });
  const reset = (dim: Dim) => dispatch({ type: 'remove', keys: [effectKey({ kind: 'dimDelta', dim, delta: 0 })] });

  return (
    <div className="sliders">
      <p className="sliders__hint">Every dimension runs from 0 to 10. Grey means “don’t care” – touch a slider to switch it on.</p>
      <ul className="sliders__list">
        {DIMS.map((dim) => {
          const meta = DIM_META[dim];
          const constraint = query.dims[dim];
          const active = Boolean(constraint);
          const value = constraint?.target ?? 5;
          const id = `slider-${dim}`;
          return (
            <li key={dim} className={`slider ${active ? 'is-active' : ''}`}>
              <div className="slider__top">
                <label htmlFor={id} className="slider__label">
                  {meta.label}
                </label>
                <span className="slider__value mono" aria-hidden="true">
                  {active ? value.toFixed(1).replace('.0', '') : '—'}
                </span>
                {active && (
                  <button type="button" className="slider__reset" onClick={() => reset(dim)} aria-label={`${meta.label}: don’t care`}>
                    ×
                  </button>
                )}
              </div>
              <input
                id={id}
                type="range"
                min={0}
                max={10}
                step={0.5}
                value={value}
                aria-valuetext={active ? `${meta.label} ${value} out of 10` : `${meta.label}: don’t care`}
                onChange={(e) => set(dim, Number(e.target.value))}
                onPointerDown={() => !active && set(dim, value)}
                style={{ '--fill': `${value * 10}%` } as CSSProperties}
              />
              <div className="slider__ends" aria-hidden="true">
                <span>{meta.low}</span>
                <span>{meta.high}</span>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
