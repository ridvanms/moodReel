import type { MoodQuery, RecommendResult } from '@moodreel/core';
import { useEffect, useRef, useState } from 'react';
import { useApi } from '../state/api';

interface State {
  data: RecommendResult | null;
  loading: boolean;
  error: string | null;
}

/**
 * Debounced, cancellable recommendations. The previous result stays on screen
 * while the next one loads, so sliders never make the layout jump.
 */
export function useRecommendations(query: MoodQuery, seed: number, limit = 12): State {
  const { api } = useApi();
  const [state, setState] = useState<State>({ data: null, loading: true, error: null });
  const key = JSON.stringify([query, seed, limit]);
  const latest = useRef(key);

  useEffect(() => {
    latest.current = key;
    const controller = new AbortController();
    setState((s) => ({ ...s, loading: true }));
    const timer = setTimeout(() => {
      api
        .recommend(query, { limit, seed, signal: controller.signal })
        .then((data) => {
          if (latest.current === key) setState({ data, loading: false, error: null });
        })
        .catch((error: Error) => {
          if (controller.signal.aborted) return;
          setState((s) => ({ ...s, loading: false, error: error.message }));
        });
    }, 140);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
    // `key` captures query, seed and limit by value, so object identity changes do not refetch.
  }, [api, key]);

  return state;
}
