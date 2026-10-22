import { buildQuery, mergeEffects, type Effect, type MoodQuery } from '@moodreel/core';

/**
 * Curated moods: the answer to "how do you feel tonight?" without typing.
 * Each one is a named bundle of wishes, so a mood page, a home tile and the
 * mood lab all score films with exactly the same engine.
 */
export interface Mood {
  slug: string;
  title: string;
  /** One line under the title on a tile. */
  line: string;
  /** A paragraph for the mood's own page. */
  about: string;
  /** Films that define the feeling, shown as "think of…". */
  think: string[];
  effects: Effect[];
}

const dim = (d: Extract<Effect, { kind: 'dim' }>['dim'], target: number, extra: Omit<Extract<Effect, { kind: 'dim' }>['constraint'], 'target'> = {}): Effect => ({
  kind: 'dim',
  dim: d,
  constraint: { target, ...extra },
});

export const MOODS: Mood[] = [
  {
    slug: 'scary-not-too-much',
    title: 'Scary, but not too much',
    line: 'Goosebumps you can still sleep after.',
    about: 'Fear in the middle of the dial: enough dread to grab the cushion, not enough to check the locks twice. Gore is optional, nightmares are not included.',
    think: ['the-others-2001', 'a-quiet-place-2018', 'get-out-2017'],
    effects: [dim('fear', 5, { tolerance: 1.2, min: 3, max: 6.5, weight: 1.3 }), dim('tension', 6.5, { tolerance: 2, weight: 0.6 })],
  },
  {
    slug: 'mess-with-my-head',
    title: 'Mess with my head',
    line: 'Confusing in the best way, like The Thing or Black Swan.',
    about: 'Twists, unreliable narrators and the creeping sense that nothing is what it seems. Films you argue about on the way home.',
    think: ['black-swan-2010', 'the-thing-1982', 'mulholland-drive-2001'],
    effects: [dim('mindbend', 8.5, { min: 6.5, weight: 1.4 }), dim('tension', 7, { tolerance: 2, weight: 0.6 }), { kind: 'like', movieId: 'black-swan-2010' }, { kind: 'like', movieId: 'the-thing-1982' }],
  },
  {
    slug: 'happy-ending-guaranteed',
    title: 'Happy ending, guaranteed',
    line: 'Whatever happens, you walk out smiling.',
    about: 'Every film here ends bright. We never say how it gets there, only that it does. Perfect after a long week.',
    think: ['paddington-2-2017', 'the-intouchables-2011', 'about-time-2013'],
    effects: [{ kind: 'deal', key: 'happyOnly' }, dim('darkness', 2, { max: 4.5 }), dim('humor', 6, { tolerance: 2.5, weight: 0.6 })],
  },
  {
    slug: 'make-me-laugh',
    title: 'Make me laugh',
    line: 'Proper laughs, not polite smiles.',
    about: 'Comedies that actually land, from cult classics to crowd-pleasers. Light on tears, heavy on quotable lines.',
    think: ['hot-fuzz-2007', 'superbad-2007', 'the-grand-budapest-hotel-2014'],
    effects: [dim('humor', 8.5, { min: 6.5, weight: 1.4 }), dim('sadness', 2, { max: 4.5, weight: 0.7 })],
  },
  {
    slug: 'edge-of-my-seat',
    title: 'Edge of my seat',
    line: 'Tension without the monsters.',
    about: 'Heists, chases and races against the clock. Your heart rate goes up; your fear of the dark stays where it is.',
    think: ['whiplash-2014', 'mission-impossible-fallout-2018', 'prisoners-2013'],
    effects: [dim('tension', 8.5, { min: 6.5, weight: 1.3 }), dim('fear', 2.5, { max: 4.5 }), dim('pace', 7.5, { tolerance: 2, weight: 0.6 })],
  },
  {
    slug: 'date-night',
    title: 'Date night',
    line: 'Romance with a smile, no awkward scenes.',
    about: 'Swoony, funny and easy to share. Nothing gory, nothing that makes the evening heavy.',
    think: ['before-sunrise-1995', 'when-harry-met-sally-1989', 'la-la-land-2016'],
    effects: [dim('romance', 7.5, { min: 5.5, weight: 1.3 }), dim('humor', 6, { tolerance: 2, weight: 0.6 }), { kind: 'deal', key: 'noGore' }],
  },
  {
    slug: 'alone-at-2am',
    title: 'Alone at 2 a.m.',
    line: 'Strange, dark and thoughtful.',
    about: 'For when the house is quiet and you want a film that lingers. Atmosphere first, answers maybe.',
    think: ['enemy-2013', 'donnie-darko-2001', 'moon-2009'],
    effects: [dim('mindbend', 8, { min: 6 }), dim('darkness', 7, { tolerance: 2 }), dim('fear', 4.5, { tolerance: 2.5, weight: 0.5 }), dim('pace', 3.5, { tolerance: 2, weight: 0.4 })],
  },
  {
    slug: 'cozy-rainy-sunday',
    title: 'Cozy rainy Sunday',
    line: 'A blanket, a tea and a little magic.',
    about: 'Gentle, warm and a bit enchanted. The kind of film that feels like being looked after.',
    think: ['my-neighbor-totoro-1988', 'amelie-2001', 'paddington-2-2017'],
    effects: [dim('darkness', 1.5, { max: 3.5 }), dim('tension', 3, { max: 5 }), dim('wonder', 7, { tolerance: 2 }), { kind: 'tag', tag: 'cozy' }],
  },
  {
    slug: 'family-night',
    title: 'Family night',
    line: 'Something the whole sofa agrees on.',
    about: 'Suitable for all ages and genuinely fun for the grown-ups too. Wonder and laughs, no surprises you would have to explain.',
    think: ['up-2009', 'coco-2017', 'back-to-the-future-1985'],
    effects: [{ kind: 'deal', key: 'familyFriendly' }, dim('humor', 7, { tolerance: 2 }), dim('wonder', 7.5, { tolerance: 2 })],
  },
  {
    slug: 'adrenaline',
    title: 'Pure adrenaline',
    line: 'Explosions, speed, zero homework.',
    about: 'Action at full throttle. Plot optional, popcorn mandatory.',
    think: ['mad-max-fury-road-2015', 'john-wick-2014', 'die-hard-1988'],
    effects: [dim('action', 9, { min: 7, weight: 1.3 }), dim('pace', 9, { min: 7 }), dim('tension', 8, { tolerance: 1.5, weight: 0.6 })],
  },
  {
    slug: 'a-good-cry',
    title: 'A good cry',
    line: 'Let it out. Tissues on standby.',
    about: 'Films that hit you right in the heart. Note: some of them end sadly, so this mood ignores the “no sad ending” rule unless you keep it on.',
    think: ['the-green-mile-1999', 'coco-2017', 'life-is-beautiful-1997'],
    effects: [dim('sadness', 8, { min: 6, weight: 1.4 }), dim('romance', 4, { tolerance: 3, weight: 0.3 })],
  },
  {
    slug: 'wonder',
    title: 'Something beautiful',
    line: 'Worlds you want to step into.',
    about: 'Big, gorgeous, imaginative films. Turn the lights off and the volume up.',
    think: ['spirited-away-2001', 'arrival-2016', 'pans-labyrinth-2006'],
    effects: [dim('wonder', 8.5, { min: 6.5, weight: 1.4 }), { kind: 'tag', tag: 'visual-feast' }],
  },
];

export const MOOD_BY_SLUG = new Map(MOODS.map((m) => [m.slug, m]));

/** The mood's effects, tagged with its title so the mood lab shows them as one chip. */
export function moodEffects(mood: Mood): Effect[] {
  return mood.effects.map((e) => ({ ...e, group: mood.title }));
}

/** A mood scored on top of your standing rules and seen films. */
export function moodQuery(mood: Mood, rules: readonly Effect[], seen: readonly string[]): MoodQuery {
  return buildQuery(mergeEffects([...rules], mood.effects, 'refine'), seen);
}

/** The first visit opens on the brief's own example. */
export const OPENING_MOOD = MOODS[0]!;
export const OPENING_EFFECTS: Effect[] = [...moodEffects(OPENING_MOOD), { kind: 'deal', key: 'noSadEnding' }];
