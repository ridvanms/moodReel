import type { Dim, Ending, ExclusionReason, Genre } from './types';

export interface DimMeta {
  label: string;
  /** Short label for chart axes. */
  short: string;
  /** What 0 and 10 mean on this scale. */
  low: string;
  high: string;
}

export const DIM_META: Record<Dim, DimMeta> = {
  fear: { label: 'Fear', short: 'Fear', low: 'calm', high: 'terrifying' },
  tension: { label: 'Tension', short: 'Tension', low: 'relaxed', high: 'on edge' },
  mindbend: { label: 'Mind-bending', short: 'Mind', low: 'straightforward', high: 'twisty' },
  humor: { label: 'Laughs', short: 'Laughs', low: 'serious', high: 'hilarious' },
  romance: { label: 'Romance', short: 'Romance', low: 'none', high: 'swoony' },
  action: { label: 'Action', short: 'Action', low: 'quiet', high: 'explosive' },
  sadness: { label: 'Tears', short: 'Tears', low: 'dry-eyed', high: 'tearjerker' },
  darkness: { label: 'Darkness', short: 'Dark', low: 'bright', high: 'pitch-black' },
  wonder: { label: 'Wonder', short: 'Wonder', low: 'grounded', high: 'magical' },
  pace: { label: 'Pace', short: 'Pace', low: 'slow', high: 'breakneck' },
};

export const GENRE_LABEL: Record<Genre, string> = {
  horror: 'Horror',
  thriller: 'Thriller',
  mystery: 'Mystery',
  scifi: 'Sci-fi',
  fantasy: 'Fantasy',
  drama: 'Drama',
  comedy: 'Comedy',
  romance: 'Romance',
  action: 'Action',
  adventure: 'Adventure',
  crime: 'Crime',
  animation: 'Animation',
  war: 'War',
  musical: 'Musical',
};

export const ENDING_META: Record<Ending, { label: string; hint: string }> = {
  happy: { label: 'Bright ending', hint: 'You walk out smiling.' },
  bittersweet: { label: 'Bittersweet ending', hint: 'A win that costs something.' },
  open: { label: 'Open ending', hint: 'You will argue about what it meant.' },
  sad: { label: 'Sad ending', hint: 'Keep the tissues close.' },
  bleak: { label: 'Bleak ending', hint: 'The darkness wins.' },
};

export const EXCLUSION_LABEL: Record<ExclusionReason, string> = {
  sadEnding: 'sad ending',
  notHappy: 'not a happy ending',
  gore: 'gore',
  jumpscares: 'jump scares',
  animalDeath: 'an animal dies',
  family: 'not for kids',
  tooLong: 'too long',
  tooShort: 'too short',
  tooOld: 'too old',
  tooNew: 'too new',
  animation: 'animated',
  notAnimation: 'not animated',
  genre: 'excluded genre',
  seen: 'already seen',
  reference: 'your example',
};

export const TAG_LABEL: Record<string, string> = {
  paranoia: 'paranoia',
  isolation: 'isolation',
  creature: 'creature',
  obsession: 'obsession',
  psychological: 'psychological',
  twist: 'big twist',
  'unreliable-narrator': 'unreliable narrator',
  dreams: 'dreams',
  time: 'time',
  memory: 'memory',
  identity: 'identity',
  heist: 'heist',
  space: 'space',
  ai: 'AI',
  dystopia: 'dystopia',
  survival: 'survival',
  revenge: 'revenge',
  'serial-killer': 'serial killer',
  ghost: 'ghosts',
  cult: 'cult',
  'slow-burn': 'slow burn',
  'coming-of-age': 'coming of age',
  family: 'family',
  friendship: 'friendship',
  'road-trip': 'road trip',
  music: 'music',
  dance: 'dance',
  art: 'art',
  satire: 'satire',
  cozy: 'cozy',
  'visual-feast': 'visual feast',
  'true-story': 'true story',
  whodunit: 'whodunit',
  'small-town': 'small town',
  class: 'class',
  love: 'love',
  grief: 'grief',
  hope: 'hope',
  underdog: 'underdog',
  sports: 'sports',
  food: 'food',
  'one-location': 'one location',
  'found-family': 'found family',
  'mind-games': 'mind games',
  war: 'war',
  bulgarian: 'Bulgarian cinema',
  journalism: 'journalism',
  quirky: 'quirky',
  'cult-classic': 'cult classic',
  chase: 'chase',
  monster: 'monster',
  school: 'school',
  ocean: 'ocean',
  nature: 'nature',
  kids: 'kids',
  loneliness: 'loneliness',
};

export function tagLabel(tag: string): string {
  return TAG_LABEL[tag] ?? tag.replace(/-/g, ' ');
}

/** Runtime as a timecode, the way an editor reads it: 01:49:00. */
export function timecode(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:00`;
}

export function runtimeLabel(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m} min`;
  return m === 0 ? `${h} h` : `${h} h ${m} min`;
}
