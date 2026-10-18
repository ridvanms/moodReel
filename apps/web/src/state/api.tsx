import type { MovieSummary } from '@moodreel/core';
import { createContext, useContext, type ReactNode } from 'react';
import type { Api } from '../api';

interface ApiContextValue {
  api: Api;
  catalog: MovieSummary[];
  byId: ReadonlyMap<string, MovieSummary>;
}

const ApiContext = createContext<ApiContextValue | null>(null);

export function ApiProvider({ value, children }: { value: ApiContextValue; children: ReactNode }) {
  return <ApiContext.Provider value={value}>{children}</ApiContext.Provider>;
}

export function useApi(): ApiContextValue {
  const value = useContext(ApiContext);
  if (!value) throw new Error('useApi must be used inside <ApiProvider>');
  return value;
}
