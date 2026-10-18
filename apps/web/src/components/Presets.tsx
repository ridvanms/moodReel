import type { Effect, ParsedEffect } from '@moodreel/core';
import { useStore } from '../state/store';

/** Ready-made evenings. Each is just a named bundle of wishes, applied like a fresh prompt. */
const PRESETS: Array<{ id: string; label: string; note: string; effects: ParsedEffect[] }> = [
  {
    id: 'friday',
    label: 'Friday with friends',
    note: 'laughs, pace, no drama',
    effects: [
      { kind: 'dim', dim: 'humor', constraint: { target: 7.5, tolerance: 1.5 } },
      { kind: 'dim', dim: 'pace', constraint: { target: 7.5, tolerance: 1.5, weight: 0.7 } },
      { kind: 'dim', dim: 'sadness', constraint: { target: 2, max: 4.5 } },
    ],
  },
  {
    id: 'rain',
    label: 'Rainy Sunday',
    note: 'cozy and a little magical',
    effects: [
      { kind: 'dim', dim: 'darkness', constraint: { target: 1.5, max: 3.5 } },
      { kind: 'dim', dim: 'tension', constraint: { target: 3, max: 5 } },
      { kind: 'dim', dim: 'wonder', constraint: { target: 7, tolerance: 2 } },
      { kind: 'tag', tag: 'cozy' },
    ],
  },
  {
    id: 'date',
    label: 'Date night',
    note: 'romance with a smile',
    effects: [
      { kind: 'dim', dim: 'romance', constraint: { target: 7.5, min: 5.5 } },
      { kind: 'dim', dim: 'humor', constraint: { target: 6, tolerance: 2, weight: 0.6 } },
      { kind: 'deal', key: 'noGore' },
    ],
  },
  {
    id: 'night',
    label: 'Alone at 2 a.m.',
    note: 'strange, dark, thoughtful',
    effects: [
      { kind: 'dim', dim: 'mindbend', constraint: { target: 8.5, min: 6.5 } },
      { kind: 'dim', dim: 'darkness', constraint: { target: 7, tolerance: 2 } },
      { kind: 'dim', dim: 'fear', constraint: { target: 4.5, tolerance: 2.5, weight: 0.5 } },
    ],
  },
  {
    id: 'family',
    label: 'Family night',
    note: 'for all ages',
    effects: [
      { kind: 'deal', key: 'familyFriendly' },
      { kind: 'dim', dim: 'humor', constraint: { target: 7, tolerance: 2 } },
      { kind: 'dim', dim: 'wonder', constraint: { target: 7.5, tolerance: 2 } },
    ],
  },
  {
    id: 'adrenaline',
    label: 'Adrenaline',
    note: 'action and tension',
    effects: [
      { kind: 'dim', dim: 'action', constraint: { target: 9, min: 7 } },
      { kind: 'dim', dim: 'pace', constraint: { target: 9, min: 7 } },
      { kind: 'dim', dim: 'tension', constraint: { target: 8, tolerance: 1.5 } },
    ],
  },
];

export function Presets() {
  const { dispatch } = useStore();
  return (
    <div className="presets">
      {PRESETS.map((preset) => (
        <button
          key={preset.id}
          type="button"
          className="preset"
          onClick={() =>
            dispatch({
              type: 'parsed',
              text: preset.label,
              result: {
                effects: preset.effects.map((e) => ({ ...e, group: preset.label }) as Effect),
                mode: 'replace',
                unknown: [],
                moods: [],
                understood: true,
              },
            })
          }
        >
          <span className="preset__label">{preset.label}</span>
          <span className="preset__note">{preset.note}</span>
        </button>
      ))}
    </div>
  );
}
