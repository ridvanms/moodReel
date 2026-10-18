/** Lowercase, unify quotes and dashes, drop Latin accents (Amélie → amelie) but keep Cyrillic intact. */
export function normalize(text: string): string {
  return text
    .toLowerCase()
    .replace(/[‘’`´]/g, "'")
    .replace(/[„“”«»]/g, '"')
    .replace(/[–—]/g, '-')
    .normalize('NFD')
    .replace(/([a-z])[̀-ͯ]+/g, '$1')
    .normalize('NFC')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Titles compare best with punctuation removed: "Ocean's Eleven" ~ "oceans eleven". */
export function normalizeTitle(text: string): string {
  return normalize(text)
    .replace(/&/g, ' and ')
    .replace(/[·.:,!?'"()\-–—/]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export interface Token {
  text: string;
  start: number;
  end: number;
  punct: boolean;
}

const TOKEN_RE = /[\p{L}\p{N}]+(?:['-][\p{L}\p{N}]+)*|[,.!?;:]/gu;

export function tokenize(normalized: string): Token[] {
  const tokens: Token[] = [];
  for (const match of normalized.matchAll(TOKEN_RE)) {
    const start = match.index ?? 0;
    tokens.push({ text: match[0], start, end: start + match[0].length, punct: /^[,.!?;:]$/.test(match[0]) });
  }
  return tokens;
}

const TRANSLIT: Record<string, string> = {
  а: 'a', б: 'b', в: 'v', г: 'g', д: 'd', е: 'e', ж: 'zh', з: 'z', и: 'i', й: 'y', к: 'k', л: 'l', м: 'm',
  н: 'n', о: 'o', п: 'p', р: 'r', с: 's', т: 't', у: 'u', ф: 'f', х: 'h', ц: 'ts', ч: 'ch', ш: 'sh', щ: 'sht',
  ъ: 'a', ь: 'y', ю: 'yu', я: 'ya',
};

/** Streamlined Bulgarian transliteration, so "интерстелар" can meet "interstellar". */
export function transliterate(text: string): string {
  let out = '';
  for (const ch of text) out += TRANSLIT[ch] ?? ch;
  return out;
}

function bigrams(text: string): Map<string, number> {
  const grams = new Map<string, number>();
  const padded = ` ${text} `;
  for (let i = 0; i < padded.length - 1; i++) {
    const gram = padded.slice(i, i + 2);
    grams.set(gram, (grams.get(gram) ?? 0) + 1);
  }
  return grams;
}

/** Sørensen–Dice coefficient over character bigrams: forgiving with typos, cheap to compute. */
export function dice(a: string, b: string): number {
  if (a === b) return 1;
  if (a.length < 2 || b.length < 2) return 0;
  const ga = bigrams(a);
  const gb = bigrams(b);
  let overlap = 0;
  let total = 0;
  for (const [gram, count] of ga) {
    overlap += Math.min(count, gb.get(gram) ?? 0);
    total += count;
  }
  for (const count of gb.values()) total += count;
  return (2 * overlap) / total;
}

const CYRILLIC = /[\u0400-\u04ff]/;

/**
 * Crude stemmers, good enough to match "sharks" with "shark" or "динозаври" with
 * "динозаврите": drop plurals, -ing/-ed and the Bulgarian definite article.
 */
export function stem(word: string): string {
  if (!CYRILLIC.test(word)) {
    if (word.length > 5 && word.endsWith('ies')) return `${word.slice(0, -3)}y`;
    if (word.length > 6 && word.endsWith('ing')) return word.slice(0, -3);
    if (word.length > 5 && word.endsWith('ed')) return word.slice(0, -2);
    if (word.length > 4 && word.endsWith('s') && !word.endsWith('ss')) return word.slice(0, -1);
    return word;
  }
  const endings = ['ията', 'ите', 'ата', 'ото', 'ът', 'ят', 'та', 'то', 'те', 'ове', 'еве', 'ия', 'и', 'а', 'о', 'е', 'я', 'ъ'];
  for (const ending of endings) {
    if (word.length - ending.length >= 4 && word.endsWith(ending)) return word.slice(0, -ending.length);
  }
  return word;
}
