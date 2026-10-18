import { createParser, type Effect } from '@moodreel/core';
import { MOVIES, SUMMARIES } from '@moodreel/core/catalog';
import { describe, expect, it } from 'vitest';
import { padEffects } from '../src/components/MoodMap';
import { effectChips, reducer, type MoodState } from '../src/state/store';

const byId = new Map(SUMMARIES.map((m) => [m.id, m]));
const parser = createParser(MOVIES);
const empty: MoodState = { effects: [], pad: null, seen: [], watchlist: [], seed: 1, lastParse: null };

function parsed(state: MoodState, text: string): MoodState {
  return reducer(state, { type: 'parsed', text, result: parser.parse(text) });
}

describe('store reducer', () => {
  it('replaces the wish list on a fresh prompt and refines it on a tweak', () => {
    let state = parsed(empty, 'something scary');
    expect(state.effects.map((e) => e.kind)).toEqual(['dim']);
    state = parsed(state, 'no gore');
    expect(state.effects).toHaveLength(2);
    state = parsed(state, 'a romantic comedy');
    expect(state.effects.some((e) => e.kind === 'deal')).toBe(false);
  });

  it('removes a whole phrase at once', () => {
    const state = parsed(empty, 'had a bad day');
    const chips = effectChips(state.effects, byId);
    expect(chips).toHaveLength(1);
    const next = reducer(state, { type: 'remove', keys: chips[0]!.keys });
    expect(next.effects).toHaveLength(0);
  });

  it('a slider detaches a dimension from its phrase group', () => {
    const state = parsed(empty, 'had a bad day');
    const next = reducer(state, { type: 'upsert', effect: { kind: 'dim', dim: 'humor', constraint: { target: 9 } } });
    const humor = next.effects.find((e): e is Extract<Effect, { kind: 'dim' }> => e.kind === 'dim' && e.dim === 'humor');
    expect(humor?.group).toBeUndefined();
    expect(humor?.constraint.target).toBe(9);
  });

  it('moving the map puck replaces its previous wishes and clears when they are removed', () => {
    let state = reducer(empty, { type: 'pad', pad: { x: 0.9, y: 0.9 }, effects: padEffects(0.9, 0.9) });
    state = reducer(state, { type: 'pad', pad: { x: 0.1, y: 0.1 }, effects: padEffects(0.1, 0.1) });
    const chips = effectChips(state.effects, byId);
    expect(chips).toHaveLength(1);
    expect(chips[0]!.label).toContain('calm');
    state = reducer(state, { type: 'remove', keys: chips[0]!.keys });
    expect(state.pad).toBeNull();
  });

  it('marking a film as seen drops it from the watchlist', () => {
    let state = reducer(empty, { type: 'addWatch', id: 'up-2009' });
    state = reducer(state, { type: 'toggleSeen', id: 'up-2009' });
    expect(state.watchlist).toEqual([]);
    expect(state.seen).toEqual(['up-2009']);
  });
});

describe('effectChips', () => {
  it('labels references with film titles', () => {
    const state = parsed(empty, 'like Black Swan');
    expect(effectChips(state.effects, byId)[0]).toMatchObject({ group: 'Like', label: 'Black Swan' });
  });
});
