import { clamp } from './math';
import { DIM_META, GENRE_LABEL, tagLabel } from './labels';
import type { Dealbreakers, Dim, DimConstraint, Genre, MoodQuery } from './types';

/**
 * An Effect is one atomic wish ("not too scary", "no sad ending", "like Black Swan").
 *
 * The UI keeps a flat list of effects and renders each as a removable chip;
 * the query sent to the engine is always derived from that list. The text
 * parser and the mood mixer both just produce effects, so they compose.
 */

export type Level = 'none' | 'low' | 'mid' | 'high' | 'max';

export type BooleanDealbreaker = 'noSadEnding' | 'happyOnly' | 'noGore' | 'noJumpscares' | 'noAnimalDeath' | 'familyFriendly';

export type EffectBody =
  | { kind: 'dim'; dim: Dim; constraint: DimConstraint; level?: Level }
  | { kind: 'like'; movieId: string }
  | { kind: 'genre'; genre: Genre; mode: 'include' | 'exclude' }
  | { kind: 'tag'; tag: string }
  | { kind: 'keyword'; word: string; movieIds: string[] }
  | { kind: 'deal'; key: BooleanDealbreaker }
  | { kind: 'runtime'; min?: number; max?: number }
  | { kind: 'era'; minYear?: number; maxYear?: number }
  | { kind: 'animation'; mode: 'only' | 'exclude' };

/**
 * `group` ties together effects that came from one phrase ("bad day" →
 * more laughs, less darkness, …) so the UI can show and remove them as one chip.
 */
export type Effect = EffectBody & { group?: string };

/** A relative tweak produced by phrases like "less scary". Resolved against existing effects. */
export interface DimDelta {
  kind: 'dimDelta';
  dim: Dim;
  delta: number;
  group?: string;
}

export type ParsedEffect = (Effect | DimDelta) & { span?: string; via?: string };

export function effectKey(effect: Effect | DimDelta): string {
  switch (effect.kind) {
    case 'dim':
    case 'dimDelta':
      return `dim:${effect.dim}`;
    case 'like':
      return `like:${effect.movieId}`;
    case 'genre':
      return `genre:${effect.genre}`;
    case 'tag':
      return `tag:${effect.tag}`;
    case 'keyword':
      return `keyword:${effect.word}`;
    case 'deal':
      return `deal:${effect.key}`;
    case 'runtime':
      return 'runtime';
    case 'era':
      return 'era';
    case 'animation':
      return 'animation';
  }
}

/** Positive polarity: the concept pushes the dimension up. */
export function levelConstraint(level: Level): DimConstraint {
  switch (level) {
    case 'none':
      return { target: 0.5, max: 2, weight: 1.4 };
    case 'low':
      return { target: 3, max: 4.5 };
    case 'mid':
      return { target: 5, min: 3, max: 6.5 };
    case 'high':
      return { target: 7.5, min: 5.5 };
    case 'max':
      return { target: 9.5, min: 7.5, weight: 1.2 };
  }
}

/** Negative polarity, e.g. "slow" on the pace scale. */
export function inverseLevelConstraint(level: Level): DimConstraint {
  switch (level) {
    case 'none':
      return { target: 6.5, min: 5 };
    case 'low':
    case 'mid':
      return { target: 4, max: 5.5 };
    case 'high':
      return { target: 2.5, max: 4.5 };
    case 'max':
      return { target: 1, max: 3, weight: 1.2 };
  }
}

/** Constraint for a slider position: the user asked for a precise value. */
export function sliderConstraint(target: number): DimConstraint {
  return { target: clamp(Math.round(target * 2) / 2, 0, 10), tolerance: 1 };
}

function shiftConstraint(base: DimConstraint, delta: number): DimConstraint {
  const target = clamp(base.target + delta, 0, 10);
  const next: DimConstraint = { ...base, target };
  if (delta < 0) {
    next.max = clamp(target + 1.5, 0, 10);
    delete next.min;
  } else {
    next.min = clamp(target - 1.5, 0, 10);
    delete next.max;
  }
  return next;
}

/**
 * Merge freshly parsed effects into the current list.
 * - replace: start over (a brand-new wish)
 * - refine: upsert by key and resolve relative deltas against what is already there
 */
export function mergeEffects(current: readonly Effect[], incoming: readonly ParsedEffect[], mode: 'replace' | 'refine'): Effect[] {
  const map = new Map<string, Effect>();
  if (mode === 'refine') for (const e of current) map.set(effectKey(e), e);

  for (const raw of incoming) {
    const { span: _span, via: _via, ...effect } = raw;
    const key = effectKey(effect as Effect | DimDelta);
    if (effect.kind === 'dimDelta') {
      const existing = map.get(key);
      const base: DimConstraint =
        existing && existing.kind === 'dim' ? existing.constraint : effect.delta < 0 ? { target: 5.5 } : { target: 4.5 };
      map.set(key, { kind: 'dim', dim: effect.dim, constraint: shiftConstraint(base, effect.delta) });
      continue;
    }
    if (effect.kind === 'deal' && effect.key === 'happyOnly') map.delete('deal:noSadEnding');
    if (effect.kind === 'deal' && effect.key === 'noSadEnding' && map.has('deal:happyOnly')) continue;
    map.set(key, effect as Effect);
  }
  return [...map.values()];
}

export function upsertEffect(effects: readonly Effect[], effect: Effect): Effect[] {
  const key = effectKey(effect);
  const index = effects.findIndex((e) => effectKey(e) === key);
  if (index === -1) return [...effects, effect];
  const next = effects.slice();
  next[index] = effect;
  return next;
}

export function removeEffect(effects: readonly Effect[], key: string): Effect[] {
  return effects.filter((e) => effectKey(e) !== key);
}

export function emptyQuery(): MoodQuery {
  return { dims: {}, like: [], genres: { include: [], exclude: [] }, dealbreakers: {}, exclude: [] };
}

export function buildQuery(effects: readonly Effect[], exclude: readonly string[] = []): MoodQuery {
  const query = emptyQuery();
  const deals: Dealbreakers = query.dealbreakers;
  const tags: string[] = [];
  const keywordIds = new Set<string>();

  for (const effect of effects) {
    switch (effect.kind) {
      case 'dim':
        query.dims[effect.dim] = effect.constraint;
        break;
      case 'like':
        if (!query.like.includes(effect.movieId)) query.like.push(effect.movieId);
        break;
      case 'genre': {
        const list = effect.mode === 'include' ? query.genres.include : query.genres.exclude;
        if (!list.includes(effect.genre)) list.push(effect.genre);
        break;
      }
      case 'tag':
        tags.push(effect.tag);
        break;
      case 'keyword':
        for (const id of effect.movieIds) keywordIds.add(id);
        break;
      case 'deal':
        deals[effect.key] = true;
        break;
      case 'runtime':
        if (effect.max !== undefined) deals.maxRuntime = effect.max;
        if (effect.min !== undefined) deals.minRuntime = effect.min;
        break;
      case 'era':
        if (effect.minYear !== undefined) deals.minYear = effect.minYear;
        if (effect.maxYear !== undefined) deals.maxYear = effect.maxYear;
        break;
      case 'animation':
        deals.animation = effect.mode;
        break;
    }
  }

  if (tags.length) query.tags = tags;
  if (keywordIds.size) query.boostIds = [...keywordIds];
  query.exclude = [...exclude];
  return query;
}

const LEVEL_WORD: Record<Level, string> = {
  none: 'none',
  low: 'a little',
  mid: 'moderate',
  high: 'a lot',
  max: 'maxed out',
};

export interface EffectDescription {
  /** Category shown in small caps. */
  group: string;
  label: string;
}

/** Human label for a chip. `titleOf` resolves movie ids for "like" effects. */
export function describeEffect(effect: Effect, titleOf: (id: string) => string): EffectDescription {
  switch (effect.kind) {
    case 'dim': {
      const meta = DIM_META[effect.dim];
      const c = effect.constraint;
      if (effect.level) return { group: 'Mood', label: `${meta.label} · ${LEVEL_WORD[effect.level]}` };
      if (c.max !== undefined && c.min === undefined && c.target <= 2) return { group: 'Mood', label: `No ${meta.label.toLowerCase()}` };
      return { group: 'Mood', label: `${meta.label} ≈ ${formatTarget(c.target)}` };
    }
    case 'like':
      return { group: 'Like', label: titleOf(effect.movieId) };
    case 'genre':
      return { group: effect.mode === 'include' ? 'Genre' : 'Not', label: GENRE_LABEL[effect.genre] };
    case 'tag':
      return { group: 'Theme', label: tagLabel(effect.tag) };
    case 'keyword':
      return { group: 'Keyword', label: effect.word };
    case 'deal':
      return { group: 'Rule', label: DEAL_LABEL[effect.key] };
    case 'runtime':
      return { group: 'Length', label: runtimeRange(effect.min, effect.max) };
    case 'era':
      return { group: 'Years', label: yearRange(effect.minYear, effect.maxYear) };
    case 'animation':
      return { group: 'Format', label: effect.mode === 'only' ? 'Animation only' : 'No animation' };
  }
}

export const DEAL_LABEL: Record<BooleanDealbreaker, string> = {
  noSadEnding: 'No sad ending',
  happyOnly: 'Happy endings only',
  noGore: 'No gore',
  noJumpscares: 'No jump scares',
  noAnimalDeath: 'The animals survive',
  familyFriendly: 'Kid-friendly',
};

function formatTarget(target: number): string {
  return Number.isInteger(target) ? String(target) : target.toFixed(1);
}

function minutes(m: number): string {
  const h = Math.floor(m / 60);
  const r = m % 60;
  if (h === 0) return `${r} min`;
  return r ? `${h} h ${r} min` : `${h} h`;
}

function runtimeRange(min?: number, max?: number): string {
  if (min !== undefined && max !== undefined) return `${minutes(min)} – ${minutes(max)}`;
  if (max !== undefined) return `up to ${minutes(max)}`;
  if (min !== undefined) return `over ${minutes(min)}`;
  return 'any';
}

function yearRange(min?: number, max?: number): string {
  if (min !== undefined && max !== undefined) {
    if (max - min === 9 && min % 10 === 0) return min >= 2000 ? `${min}s` : `’${String(min).slice(2)}s`;
    return `${min}–${max}`;
  }
  if (min !== undefined) return `${min} or later`;
  if (max !== undefined) return `up to ${max}`;
  return 'all';
}
