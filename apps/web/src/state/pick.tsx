import type { MoodQuery } from '@moodreel/core';
import { createContext, useContext } from 'react';

/** What the reel spins over, and the words on its label. */
export interface PickRequest {
  query: MoodQuery;
  /** "Scary, but not too much", "My list"… */
  label: string;
}

export const PickContext = createContext<(request: PickRequest) => void>(() => undefined);

/** Opens the "pick a film for me" reel from anywhere. */
export const usePick = () => useContext(PickContext);
