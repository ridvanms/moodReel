export function plural(n: number, one: string, many: string): string {
  return `${n} ${n === 1 ? one : many}`;
}

export function luminance(hex: string): number {
  const v = Number.parseInt(hex.slice(1), 16);
  const channel = (c: number) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * channel((v >> 16) & 255) + 0.7152 * channel((v >> 8) & 255) + 0.0722 * channel(v & 255);
}

/** Ink that stays readable on a poster background. */
export function inkFor(background: string): string {
  return luminance(background) > 0.35 ? '#14110d' : '#f4ede2';
}

export function hash(text: string): number {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export function imdbSearch(title: string, year: number): string {
  return `https://www.imdb.com/find/?q=${encodeURIComponent(`${title} ${year}`)}&s=tt&ttype=ft`;
}

export function letterboxdSearch(title: string): string {
  return `https://letterboxd.com/search/films/${encodeURIComponent(title)}/`;
}
