import {
  buildQuery,
  describeEffect,
  effectKey,
  mergeEffects,
  removeEffect,
  upsertEffect,
  type Effect,
  type MoodQuery,
  type MovieSummary,
  type ParseResult,
} from '@moodreel/core';
import { createContext, useContext, useEffect, useMemo, useReducer, type Dispatch, type ReactNode } from 'react';
import { readSharedEffects } from '../lib/share';
import { readJson, writeJson } from '../lib/storage';

export const PAD_GROUP_PREFIX = 'Map: ';

export interface MoodState {
  effects: Effect[];
  /** Puck on the mood map, 0–1 on both axes; null when the map is not in use. */
  pad: { x: number; y: number } | null;
  seen: string[];
  watchlist: string[];
  /** Changes on "shuffle" to reorder equally good matches. */
  seed: number;
  lastParse: { text: string; result: ParseResult } | null;
}

export type Action =
  | { type: 'parsed'; text: string; result: ParseResult }
  | { type: 'upsert'; effect: Effect }
  | { type: 'remove'; keys: string[] }
  | { type: 'clear' }
  | { type: 'pad'; pad: { x: number; y: number } | null; effects: Effect[] }
  | { type: 'toggleSeen'; id: string }
  | { type: 'toggleWatch'; id: string }
  | { type: 'addWatch'; id: string }
  | { type: 'shuffle' };

const STORAGE_KEY = 'moodreel:lists:v1';

export function reducer(state: MoodState, action: Action): MoodState {
  switch (action.type) {
    case 'parsed': {
      const effects = mergeEffects(state.effects, action.result.effects, action.result.mode);
      const padAlive = effects.some((e) => e.group?.startsWith(PAD_GROUP_PREFIX));
      return { ...state, effects, pad: padAlive ? state.pad : null, lastParse: { text: action.text, result: action.result } };
    }
    case 'upsert': {
      // A slider touching a dimension detaches it from whatever phrase or map position set it.
      const { group: _group, ...effect } = action.effect;
      return { ...state, effects: upsertEffect(state.effects, effect as Effect) };
    }
    case 'remove': {
      let effects = state.effects;
      for (const key of action.keys) effects = removeEffect(effects, key);
      const padAlive = effects.some((e) => e.group?.startsWith(PAD_GROUP_PREFIX));
      return { ...state, effects, pad: padAlive ? state.pad : null };
    }
    case 'clear':
      return { ...state, effects: [], pad: null, lastParse: null };
    case 'pad': {
      const kept = state.effects.filter((e) => !e.group?.startsWith(PAD_GROUP_PREFIX));
      const replaced = new Set(action.effects.map(effectKey));
      return { ...state, pad: action.pad, effects: [...kept.filter((e) => !replaced.has(effectKey(e))), ...action.effects] };
    }
    case 'toggleSeen':
      return { ...state, seen: toggle(state.seen, action.id), watchlist: state.watchlist.filter((id) => id !== action.id) };
    case 'toggleWatch':
      return { ...state, watchlist: toggle(state.watchlist, action.id) };
    case 'addWatch':
      return state.watchlist.includes(action.id) ? state : { ...state, watchlist: [action.id, ...state.watchlist] };
    case 'shuffle':
      return { ...state, seed: (state.seed * 1103515245 + 12345) >>> 0 };
  }
}

function toggle(list: string[], id: string): string[] {
  return list.includes(id) ? list.filter((x) => x !== id) : [id, ...list];
}

function initialState(defaults: Effect[]): MoodState {
  const lists = readJson<{ seen?: string[]; watchlist?: string[] }>(STORAGE_KEY, {});
  return {
    effects: readSharedEffects() ?? defaults,
    pad: null,
    seen: Array.isArray(lists.seen) ? lists.seen : [],
    watchlist: Array.isArray(lists.watchlist) ? lists.watchlist : [],
    seed: Math.floor(Math.random() * 1e9),
    lastParse: null,
  };
}

interface Store {
  state: MoodState;
  dispatch: Dispatch<Action>;
  query: MoodQuery;
}

const StoreContext = createContext<Store | null>(null);

export function StoreProvider({ children, defaults }: { children: ReactNode; defaults: Effect[] }) {
  const [state, dispatch] = useReducer(reducer, defaults, initialState);

  useEffect(() => {
    writeJson(STORAGE_KEY, { seen: state.seen, watchlist: state.watchlist });
  }, [state.seen, state.watchlist]);

  const query = useMemo(() => buildQuery(state.effects, state.seen), [state.effects, state.seen]);
  const value = useMemo(() => ({ state, dispatch, query }), [state, query]);
  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore(): Store {
  const store = useContext(StoreContext);
  if (!store) throw new Error('useStore must be used inside <StoreProvider>');
  return store;
}

export interface Chip {
  id: string;
  group: string;
  label: string;
  keys: string[];
  /** Several effects behind one phrase ("Bad day → …"). */
  combo: boolean;
  detail?: string;
}

/** One chip per phrase: grouped effects collapse into a single removable chip. */
export function effectChips(effects: readonly Effect[], byId: ReadonlyMap<string, MovieSummary>): Chip[] {
  const chips: Chip[] = [];
  const groups = new Map<string, Chip>();
  const titleOf = (id: string) => byId.get(id)?.title ?? id;
  for (const effect of effects) {
    const key = effectKey(effect);
    const described = describeEffect(effect, titleOf);
    if (effect.group) {
      const existing = groups.get(effect.group);
      if (existing) {
        existing.keys.push(key);
        existing.detail = `${existing.detail}, ${described.label.toLowerCase()}`;
        continue;
      }
      const chip: Chip = { id: `group:${effect.group}`, group: 'Combo', label: effect.group, keys: [key], combo: true, detail: described.label };
      groups.set(effect.group, chip);
      chips.push(chip);
      continue;
    }
    chips.push({ id: key, group: described.group, label: described.label, keys: [key], combo: false });
  }
  return chips;
}
