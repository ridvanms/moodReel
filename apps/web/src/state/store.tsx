import { buildQuery, type MoodQuery } from '@moodreel/core';
import { createContext, useContext, useEffect, useMemo, useReducer, type Dispatch, type ReactNode } from 'react';
import { readJson, writeJson } from '../lib/storage';

export interface MoodState {
  seen: string[];
  watchlist: string[];
}

export type Action = { type: 'toggleSeen'; id: string } | { type: 'toggleWatch'; id: string } | { type: 'addWatch'; id: string };

const STORAGE_KEY = 'moodreel:lists:v1';

export function reducer(state: MoodState, action: Action): MoodState {
  switch (action.type) {
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

function initialState(): MoodState {
  const lists = readJson<{ seen?: string[]; watchlist?: string[] }>(STORAGE_KEY, {});
  return {
    seen: Array.isArray(lists.seen) ? lists.seen : [],
    watchlist: Array.isArray(lists.watchlist) ? lists.watchlist : [],
  };
}

interface Store {
  state: MoodState;
  dispatch: Dispatch<Action>;
  /** An engine query that leaves out films already seen. */
  unseenQuery: MoodQuery;
}

const StoreContext = createContext<Store | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, undefined, initialState);

  useEffect(() => {
    writeJson(STORAGE_KEY, { seen: state.seen, watchlist: state.watchlist });
  }, [state.seen, state.watchlist]);

  const unseenQuery = useMemo(() => buildQuery([], state.seen), [state.seen]);
  const value = useMemo(() => ({ state, dispatch, unseenQuery }), [state, unseenQuery]);
  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore(): Store {
  const store = useContext(StoreContext);
  if (!store) throw new Error('useStore must be used inside <StoreProvider>');
  return store;
}
