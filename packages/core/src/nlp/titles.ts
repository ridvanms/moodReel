import type { Movie } from '../types';
import { dice, normalizeTitle, transliterate } from './text';

interface TitleEntry {
  movieId: string;
  /** Normalised title or alias. */
  text: string;
  latin: boolean;
  /** Safe to spot anywhere in free text, without "like …" in front of it. */
  scannable: boolean;
}

export interface TitleMatch {
  movieId: string;
  score: number;
  matched: string;
}

const CYRILLIC = /[Ѐ-ӿ]/;

/**
 * Short or very common titles ("Up", "Her", "Слава", "Урок") would fire on ordinary
 * words, so only long Latin titles, multi-word aliases and article-marked
 * Bulgarian titles ("Матрицата") are recognised without a "like …" cue.
 */
/** Titles that double as everyday phrases ("I'm home alone tonight" is not a film request). */
const EVERYDAY_PHRASES = new Set([
  'home alone', 'the thing', 'about time', 'get out', 'inside out', 'life is beautiful', 'into the wild', 'your name', 'it follows', 'the father',
  'the lesson', 'the others', 'others', 'searching', 'prisoners', 'gravity', 'arrival', 'parasite', 'scream', 'psycho', 'martian', 'prestige',
  'predestination', 'primer', 'coherence', 'the notebook', 'cast away', 'the hangover', 'glory',
  'сам вкъщи', 'тихо място', 'въпрос на време', 'в небето', 'отвътре навън', 'нож в гърба', 'светът е голям',
  'сред дивата природа', 'стая', 'урок', 'слава', 'бащата', 'луна', 'враг', 'тя', 'ние', 'седем', 'писък',
]);

function isScannable(text: string): boolean {
  if (EVERYDAY_PHRASES.has(text)) return false;
  const words = text.split(' ').length;
  if (!CYRILLIC.test(text)) return words >= 2 || text.length >= 6;
  return words >= 2 || (text.length >= 8 && /(та|то|ът|ят)$/.test(text));
}

export class TitleIndex {
  private readonly entries: TitleEntry[] = [];
  /** Longest names first, so "the dark knight" wins over "dark". */
  private readonly scanOrder: Array<TitleEntry & { pattern: RegExp }>;

  constructor(movies: readonly Movie[]) {
    for (const movie of movies) {
      const names = [movie.title, ...(movie.aliases ?? [])];
      for (const name of names) {
        const text = normalizeTitle(name);
        if (!text) continue;
        this.add(movie.id, text);
        if (text.startsWith('the ')) this.add(movie.id, text.slice(4));
      }
    }
    this.scanOrder = this.entries
      .filter((e) => e.scannable)
      .sort((a, b) => b.text.length - a.text.length)
      .map((e) => ({ ...e, pattern: wordPattern(e.text) }));
  }

  private add(movieId: string, text: string): void {
    if (this.entries.some((e) => e.movieId === movieId && e.text === text)) return;
    this.entries.push({ movieId, text, latin: !CYRILLIC.test(text), scannable: isScannable(text) });
  }

  /** Exact, whole-word mentions anywhere in the text. Returns character ranges for consumption. */
  scan(normalizedText: string): Array<TitleMatch & { start: number; end: number }> {
    const found: Array<TitleMatch & { start: number; end: number }> = [];
    for (const entry of this.scanOrder) {
      for (const m of normalizedText.matchAll(entry.pattern)) {
        const start = m.index ?? 0;
        const end = start + m[0].length;
        if (found.some((f) => start < f.end && end > f.start)) continue;
        found.push({ movieId: entry.movieId, score: 1, matched: entry.text, start, end });
      }
    }
    return found;
  }

  /** Best fuzzy match for a phrase the user flagged as a title ("like X", quotes). */
  match(phrase: string, threshold = 0.72): TitleMatch | null {
    const query = normalizeTitle(phrase);
    if (query.length < 2) return null;
    const queryLatin = CYRILLIC.test(query) ? transliterate(query) : null;
    let best: TitleMatch | null = null;
    for (const entry of this.entries) {
      let score = scorePair(query, entry.text);
      if (queryLatin && entry.latin) score = Math.max(score, 0.95 * scorePair(queryLatin, entry.text));
      if (!best || score > best.score) best = { movieId: entry.movieId, score, matched: entry.text };
    }
    return best && best.score >= threshold ? best : null;
  }

  /**
   * "black swan maybe" → tries "black swan maybe", "black swan", "black".
   * Picks the longest prefix that still matches, so trailing chatter is ignored.
   */
  matchPrefix(phrase: string, threshold = 0.72): (TitleMatch & { words: number }) | null {
    const words = normalizeTitle(phrase).split(' ').filter(Boolean);
    let best: (TitleMatch & { words: number }) | null = null;
    for (let n = Math.min(words.length, 7); n >= 1; n--) {
      const candidate = words.slice(0, n).join(' ');
      const match = this.match(candidate, threshold);
      if (match && (!best || match.score > best.score + 0.05)) best = { ...match, words: n };
    }
    return best;
  }
}

function scorePair(query: string, title: string): number {
  if (query === title) return 1;
  // "spirited" → "spirited away", but not "dark" → "dark knight": the prefix has to carry most of the title.
  if (title.startsWith(`${query} `) && query.length >= 6 && query.length / title.length >= 0.4) return 0.82 + 0.15 * (query.length / title.length);
  return dice(query, title);
}

/** Words of a title separated by any run of non-letters: "mad max fury road" ~ "mad max: fury road". */
function wordPattern(text: string): RegExp {
  const words = text.split(' ').map((w) => w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
  return new RegExp(`(?<![\\p{L}\\p{N}])${words.join('[^\\p{L}\\p{N}]+')}(?![\\p{L}\\p{N}])`, 'gu');
}
