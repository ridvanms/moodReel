import { buildQuery, removeEffect, upsertEffect, type Effect, type MoodQuery } from '@moodreel/core';
import { createContext, useContext, useEffect, useMemo, useReducer, type Dispatch, type ReactNode } from 'react';
import { readJson, writeJson } from '../lib/storage';

export interface MoodState {
  /** Rules such as "no sad ending". */
  effects: Effect[];
  seen: string[];
  watchlist: string[];
}

export type Action =
  | { type: 'upsert'; effect: Effect }
  | { type: 'remove'; keys: string[] }
  | { type: 'toggleSeen'; id: string }
  | { type: 'toggleWatch'; id: string }
  | { type: 'addWatch'; id: string };

const STORAGE_KEY = 'moodreel:lists:v1';
const RULES_KEY = 'moodreel:rules:v1';

export function reducer(state: MoodState, action: Action): MoodState {
  switch (action.type) {
    case 'upsert':
      return { ...state, effects: upsertEffect(state.effects, action.effect) };
    case 'remove': {
      let effects = state.effects;
      for (const key of action.keys) effects = removeEffect(effects, key);
      return { ...state, effects };
    }
    case 'toggleSeen':
      return { ...state, seen: toggle(state.seen, action.id), watchlist: state.watchlist.filter((id) => id !== action.id) };
    case 'toggleWatch':
      return { ...state, watchlist: toggle(state.watchlist, action.id) };
    case 'addWatch':
      return state.watchlist.includes(action.id) ? state : { ...state, watchlist: [action.id, ...state.watchlist] };
  }
}

function toggle(list: string[], id: string): string[] {
  return list.includes(id) ? list.filter((x) => x !== id) : [id, ...list];
}

function initialState(defaults: Effect[]): MoodState {
  const lists = readJson<{ seen?: string[]; watchlist?: string[] }>(STORAGE_KEY, {});
  const rules = readJson<Effect[] | null>(RULES_KEY, null);
  return {
    effects: Array.isArray(rules) ? rules : defaults,
    seen: Array.isArray(lists.seen) ? lists.seen : [],
    watchlist: Array.isArray(lists.watchlist) ? lists.watchlist : [],
  };
}

interface Store {
  state: MoodState;
  dispatch: Dispatch<Action>;
  /** The rules plus seen films, as an engine query. */
  rulesQuery: MoodQuery;
}

const StoreContext = createContext<Store | null>(null);

export function StoreProvider({ children, defaults }: { children: ReactNode; defaults: Effect[] }) {
  const [state, dispatch] = useReducer(reducer, defaults, initialState);

  useEffect(() => {
    writeJson(STORAGE_KEY, { seen: state.seen, watchlist: state.watchlist });
  }, [state.seen, state.watchlist]);
  useEffect(() => {
    writeJson(RULES_KEY, state.effects);
  }, [state.effects]);

  const rulesQuery = useMemo(() => buildQuery(state.effects, state.seen), [state.effects, state.seen]);
  const value = useMemo(() => ({ state, dispatch, rulesQuery }), [state, rulesQuery]);
  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore(): Store {
  const store = useContext(StoreContext);
  if (!store) throw new Error('useStore must be used inside <StoreProvider>');
  return store;
}
