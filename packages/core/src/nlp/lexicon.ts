import { inverseLevelConstraint, levelConstraint, type EffectBody, type Level, type ParsedEffect } from '../effects';
import type { Dim, DimConstraint, Genre } from '../types';

/**
 * Vocabulary of the parser: English first, with Bulgarian alongside so both
 * kinds of input work. Stems match by prefix ("scar" → scary, scared;
 * "страш" → страшно, страшен), so endings come for free; `words` match whole tokens.
 */

export interface Concept {
  id: string;
  /** Prefixes that trigger the concept. */
  stems?: string[];
  /** Whole tokens that trigger the concept. */
  words?: string[];
  /** Tokens that look like a stem but mean something else ("terrific" is not scary). */
  not?: string[];
  defaultLevel?: Level;
  /** Effects for an absolute level. */
  apply: (level: Level) => ParsedEffect[];
  /** Direction of travel for comparatives ("scarier", "less dark"). */
  deltas?: Partial<Record<Dim, number>>;
  /** For non-dimensional concepts: what "shorter" or "newer" means. */
  comparative?: (direction: 1 | -1) => ParsedEffect[];
}

const dim = (d: Dim, constraint: DimConstraint, level?: Level): EffectBody =>
  level ? { kind: 'dim', dim: d, constraint, level } : { kind: 'dim', dim: d, constraint };

function dimConcept(
  id: string,
  d: Dim,
  opts: { stems?: string[]; words?: string[]; not?: string[]; genre?: Genre; tag?: string; defaultLevel?: Level; inverse?: boolean },
): Concept {
  return {
    id,
    ...(opts.stems ? { stems: opts.stems } : {}),
    ...(opts.words ? { words: opts.words } : {}),
    ...(opts.not ? { not: opts.not } : {}),
    defaultLevel: opts.defaultLevel ?? 'high',
    deltas: { [d]: opts.inverse ? -1 : 1 },
    apply: (level) => {
      const effects: ParsedEffect[] = [dim(d, opts.inverse ? inverseLevelConstraint(level) : levelConstraint(level), opts.inverse ? undefined : level)];
      if (opts.genre) effects.push({ kind: 'genre', genre: opts.genre, mode: level === 'none' ? 'exclude' : 'include' });
      if (opts.tag && level !== 'none') effects.push({ kind: 'tag', tag: opts.tag });
      return effects;
    },
  };
}

function tagConcept(id: string, tag: string, stems: string[], extra: (level: Level) => ParsedEffect[] = () => [], words?: string[]): Concept {
  return {
    id,
    stems,
    ...(words ? { words } : {}),
    defaultLevel: 'high',
    apply: (level) => (level === 'none' ? [] : [{ kind: 'tag', tag }, ...extra(level)]),
  };
}

function comboConcept(id: string, group: string, stems: string[], effects: EffectBody[], deltas: Partial<Record<Dim, number>>, words?: string[]): Concept {
  return {
    id,
    stems,
    ...(words ? { words } : {}),
    defaultLevel: 'high',
    deltas,
    apply: (level) => (level === 'none' ? [] : effects.map((e) => ({ ...e, group }))),
  };
}

const FEEL_GOOD: EffectBody[] = [
  dim('darkness', { target: 1.5, max: 3.5 }),
  dim('sadness', { target: 2.5, max: 5 }),
  dim('fear', { target: 0.5, max: 2.5 }),
  dim('humor', { target: 6.5, tolerance: 2, weight: 0.7 }),
];

const CALM: EffectBody[] = [
  dim('tension', { target: 2, max: 4 }),
  dim('fear', { target: 0.5, max: 2 }),
  dim('action', { target: 1.5, max: 4, weight: 0.7 }),
  dim('pace', { target: 3.5, tolerance: 1.5, weight: 0.6 }),
];

export const CONCEPTS: Concept[] = [
  // Genre words first: they carry a genre on top of the mood.
  dimConcept('horror', 'fear', { stems: ['horror', 'slasher', 'хорър', 'хорор'], words: ['ужаси', 'ужасите', 'ужастик', 'ужастици'], genre: 'horror' }),
  dimConcept('thriller', 'tension', { stems: ['thriller', 'трилър'], genre: 'thriller' }),
  dimConcept('comedy', 'humor', { stems: ['comed', 'romcom', 'rom-com', 'комеди', 'ромком'], genre: 'comedy' }),
  dimConcept('drama', 'sadness', { stems: ['drama', 'драма', 'драми', 'драмат'], genre: 'drama', defaultLevel: 'mid' }),
  dimConcept('mystery', 'mindbend', { stems: ['myster', 'мистер', 'загадк', 'загадъч'], genre: 'mystery', defaultLevel: 'mid' }),
  dimConcept('crime', 'tension', { stems: ['crime', 'criminal', 'gangster', 'mafia', 'mobster', 'detective', 'криминал', 'детектив', 'гангстер', 'мафия', 'мафиот'], words: ['mob', 'cop', 'cops', 'police'], genre: 'crime', defaultLevel: 'mid' }),
  dimConcept('adventure', 'wonder', { stems: ['adventur', 'приключен'], words: ['quest'], genre: 'adventure', defaultLevel: 'mid' }),
  dimConcept('fantasy', 'wonder', { stems: ['fantasy', 'dragon', 'wizard', 'witch', 'sorcer', 'fairytale', 'фентъзи', 'дракон', 'магьос', 'вещиц'], genre: 'fantasy' }),
  dimConcept('scifi', 'wonder', { stems: ['sci-fi', 'scifi', 'futuris', 'extraterrest', 'фантаст', 'сай-фай', 'сайфай', 'научна', 'пришълц', 'извънземн'], words: ['science', 'alien', 'aliens'], genre: 'scifi', defaultLevel: 'mid' }),
  dimConcept('musical', 'humor', { stems: ['musical', 'мюзикъл'], words: ['singing', 'songs'], genre: 'musical', tag: 'music', defaultLevel: 'mid' }),
  dimConcept('war', 'action', { stems: ['wartime', 'soldier', 'battlefield', 'военен', 'военна', 'военни', 'война', 'войни', 'войник', 'войници'], words: ['war', 'wars', 'ww2', 'wwii', 'wwi'], genre: 'war', tag: 'war' }),
  dimConcept('space', 'wonder', { stems: ['spaceship', 'astronaut', 'galax', 'planet', 'cosmos', 'cosmic', 'космос', 'космич', 'космическ', 'астронавт', 'космонавт', 'вселен'], words: ['space'], genre: 'scifi', tag: 'space' }),

  // Pure mood dimensions.
  dimConcept('fear', 'fear', {
    stems: ['scar', 'fright', 'terrif', 'horrif', 'creep', 'spook', 'eerie', 'sinister', 'nightmar', 'goosebump', 'страш', 'страх', 'плаш', 'уплаш', 'изплаш', 'ужас', 'кошмар', 'настръхн', 'крийпи', 'зловещ'],
    words: ['chilling', 'afraid', 'haunting'],
    not: ['terrific', 'scarf', 'scarce', 'scarlet', 'страхот', 'ужасно'],
  }),
  dimConcept('tension', 'tension', { stems: ['tense', 'tension', 'suspense', 'gripping', 'nail-bit', 'nailbit', 'intens', 'adrenal', 'unsettl', 'excit', 'напрег', 'напрежен', 'саспенс', 'тръпк', 'интензив', 'адренал', 'нервн', 'вълнуващ'], words: ['thrilling'] }),
  dimConcept('mindless', 'mindbend', { words: ['mindless', 'brainless', 'dumb', 'no-brainer', 'undemanding'], defaultLevel: 'none' }),
  dimConcept('mindbend', 'mindbend', {
    stems: [
      'mind-', 'mindbend', 'mindblow', 'mindfu', 'confus', 'twisty', 'complex', 'complicat', 'cerebral', 'clever', 'intellig', 'puzzl', 'trippy', 'weird', 'surreal', 'abstract', 'philosoph',
      'psycholog', 'brain', 'head-scratch', 'nonlinear', 'non-linear', 'layered', 'bizarre', 'enigma',
      'обърк', 'заплет', 'мозък', 'мозъч', 'мислов', 'замисл', 'размис', 'умен', 'умн', 'интелиг', 'философ', 'сюрреал', 'абстракт', 'нелинеен', 'нелинейн', 'пъзел',
      'главоблъск', 'странн', 'странен', 'сложен', 'сложн', 'дълбок', 'дълбоч', 'психолог',
    ],
    words: ['smart', 'strange', 'deep', 'thought-provoking', 'cryptic'],
    not: ['mindless', 'mind-numb'],
  }),
  dimConcept('fun', 'humor', { words: ['fun'], defaultLevel: 'mid' }),
  dimConcept('humor', 'humor', { stems: ['funny', 'funni', 'hilari', 'laugh', 'humor', 'humour', 'witty', 'goofy', 'silly', 'amusing', 'joke', 'смешн', 'смях', 'смее', 'смея', 'засмея', 'разсмя', 'забав', 'хумор', 'шантав', 'ржа'], words: ['lol', 'comic', 'comical', 'comedic'] }),
  dimConcept('romance', 'romance', { stems: ['romanc', 'romantic', 'kiss', 'swoon', 'butterfl', 'passion', 'романт', 'любов', 'влюб', 'целув', 'пеперуд', 'страст'], words: ['love', 'lovers', 'love-story'] }),
  dimConcept('action', 'action', { stems: ['action', 'fight', 'explos', 'shootout', 'gunfight', 'stunt', 'battle', 'superhero', 'badass', 'kick-ass', 'martial', 'екшън', 'екшан', 'бой', 'бойн', 'експлоз', 'гонк', 'гонен', 'стрелб', 'битк', 'юмру', 'каскад', 'супергер'], words: ['chase', 'chases'] }),
  dimConcept('sadness', 'sadness', { stems: ['tearjerk', 'heartbreak', 'melanchol', 'tissue', 'sorrow', 'тъж', 'тъга', 'плач', 'поплач', 'разплак', 'сълз', 'сърцераздир', 'меланхол', 'кърпич'], words: ['sad', 'cry', 'crying', 'cries', 'tears', 'weep', 'weepy', 'sob'] }),
  dimConcept('moving', 'sadness', { stems: ['touching', 'emotional', 'poignant', 'bittersweet', 'трогат', 'емоцион', 'покъртит'], words: ['moving'], defaultLevel: 'mid' }),
  dimConcept('darkness', 'darkness', {
    stems: ['dark', 'bleak', 'grim', 'gritty', 'brutal', 'disturb', 'heavy', 'noir', 'cynical', 'nihilis', 'violen', 'depressing', 'twisted', 'macabre', 'harrowing', 'мрач', 'тъмн', 'жесток', 'брутал', 'депресиращ', 'депресив', 'тежк', 'тежък', 'ноар', 'цинич', 'безнадежд'],
  }),
  dimConcept('wonder', 'wonder', {
    stems: ['magic', 'whimsic', 'enchant', 'fairy', 'beautiful', 'gorgeous', 'stunning', 'visual', 'otherworld', 'imaginat', 'вълшеб', 'магия', 'магич', 'приказ', 'чудн', 'феерич', 'мечтател', 'визуал', 'красив', 'красот'],
    words: ['dreamy', 'awe', 'wonder', 'wonderful', 'чудо', 'чудеса'],
  }),
  dimConcept('pace', 'pace', { stems: ['fast', 'pacy', 'snappy', 'energetic', 'dynamic', 'punchy', 'non-stop', 'nonstop', 'breakneck', 'бърз', 'динамич', 'енергич', 'темпо'] }),
  dimConcept('slow', 'pace', { stems: ['slow', 'contemplat', 'meditat', 'leisurely', 'бавн', 'съзерцат', 'медитат', 'мудн'], inverse: true }),

  comboConcept(
    'feelgood',
    'Light and positive',
    ['feel-good', 'feelgood', 'uplift', 'wholesome', 'heartwarm', 'lighthearted', 'light-hearted', 'cheer', 'positiv', 'sweet', 'warm', 'cute', 'optimis', 'inspir', 'joyful', 'upbeat', 'happy',
      'позитив', 'весел', 'приятн', 'светъл', 'светл', 'топъл', 'топл', 'сладк', 'сладък', 'вдъхнов', 'мотивир', 'оптимист', 'ободр', 'повдиг', 'щастлив', 'усмив'],
    FEEL_GOOD,
    { darkness: -1, sadness: -1, humor: 1 },
    ['light', 'lite', 'breezy', 'easygoing', 'joy', 'лек', 'лека', 'леко', 'леки', 'лекичко'],
  ),
  comboConcept('cozy', 'Cozy', ['cozy', 'cosy', 'comfort', 'comfy', 'snug', 'hygge', 'blanket', 'уют', 'кози'], [...FEEL_GOOD, { kind: 'tag', tag: 'cozy' }], { darkness: -1, tension: -1 }),
  comboConcept(
    'calm',
    'Calm',
    ['calm', 'relax', 'gentle', 'peaceful', 'sooth', 'mellow', 'low-key', 'lowkey', 'serene', 'tranquil', 'спокой', 'релакс', 'разпуск', 'отпуск', 'заспив', 'нежн', 'нежен', 'лежерн', 'чил'],
    CALM,
    { tension: -1, pace: -1 },
    ['chill', 'chilled', 'chillout', 'chill-out', 'quiet', 'soft', 'easy', 'тих', 'тиха', 'тихо', 'тихи', 'тихичко', 'мек', 'мека', 'меко'],
  ),

  // Formats, length and era.
  {
    id: 'animation',
    stems: ['animat', 'cartoon', 'anime', 'pixar', 'disney', 'ghibli', 'miyazaki', 'stop-motion', 'claymation', 'анимац', 'анимир', 'аниме', 'анимэ', 'пиксар', 'дисни', 'гибли', 'миядзаки', 'рисуван', 'анимационн'],
    defaultLevel: 'high',
    apply: (level) => [{ kind: 'animation', mode: level === 'none' ? 'exclude' : 'only' }],
  },
  {
    id: 'short',
    words: ['short', 'quick', 'brief', 'bite-sized', 'къс', 'къси', 'късичък', 'късичко', 'кратък', 'кратка', 'кратко', 'кратки', 'кратичък', 'кратичко'],
    defaultLevel: 'high',
    apply: (level) => [{ kind: 'runtime', ...(level === 'none' ? { min: 100 } : { max: level === 'max' ? 95 : 105 }) }],
    comparative: (dir) => [{ kind: 'runtime', ...(dir > 0 ? { max: 110 } : { min: 110 }) }],
  },
  {
    id: 'long',
    words: ['long', 'lengthy', 'epic', 'epics', 'marathon', 'дълъг', 'дълга', 'дълго', 'дълги', 'епичен', 'епична', 'епично', 'епос'],
    defaultLevel: 'high',
    apply: (level) => [{ kind: 'runtime', ...(level === 'none' ? { max: 120 } : level === 'mid' || level === 'low' ? { max: 130 } : { min: level === 'max' ? 150 : 130 }) }],
    comparative: (dir) => [{ kind: 'runtime', ...(dir > 0 ? { min: 125 } : { max: 115 }) }],
  },
  {
    id: 'old',
    words: ['old', 'classic', 'classics', 'vintage', 'retro', 'oldie', 'oldies', 'стар', 'стара', 'старо', 'стари', 'старичък', 'старичко', 'класика', 'класики', 'класически', 'класическа', 'класическо', 'ретро'],
    defaultLevel: 'high',
    apply: (level) => [{ kind: 'era', ...(level === 'none' ? { minYear: 2000 } : { maxYear: level === 'max' ? 1985 : 1999 }) }],
    comparative: (dir) => [{ kind: 'era', ...(dir > 0 ? { maxYear: 2000 } : { minYear: 2005 }) }],
  },
  {
    id: 'new',
    words: ['new', 'recent', 'modern', 'fresh', 'contemporary', 'нов', 'нова', 'ново', 'нови', 'новичък', 'скорошен', 'скорошна', 'скорошно', 'скорошни', 'модерен', 'модерна', 'модерно', 'модерни', 'съвременен', 'съвременна', 'съвременно'],
    defaultLevel: 'high',
    apply: (level) => [{ kind: 'era', ...(level === 'none' ? { maxYear: 2010 } : { minYear: level === 'max' ? 2018 : 2014 }) }],
    comparative: (dir) => [{ kind: 'era', ...(dir > 0 ? { minYear: 2010 } : { maxYear: 2005 }) }],
  },

  // Themes.
  tagConcept('twist', 'twist', ['twist', 'обрат'], () => [dim('mindbend', { target: 6.5, tolerance: 1.5, weight: 0.6 })]),
  tagConcept('heist', 'heist', ['heist', 'robbery', 'robber', 'обир', 'кражб'], undefined, ['caper']),
  tagConcept('road', 'road-trip', ['road-trip', 'roadtrip', 'пътешеств', 'пътуван', 'роуд'], undefined, ['road']),
  tagConcept('dreams', 'dreams', ['dream', 'сънищ', 'сънува']),
  tagConcept('memory', 'memory', ['amnesi', 'памет', 'спомен', 'амнези'], undefined, ['memory', 'memories']),
  tagConcept('ghost', 'ghost', ['ghost', 'haunt', 'paranormal', 'possess', 'demon', 'exorcis', 'supernatural', 'призра', 'духове', 'паранорм', 'обладан', 'демон', 'екзорс'], () => [dim('fear', { target: 6, tolerance: 1.5 })]),
  tagConcept('creature', 'creature', ['monster', 'creature', 'beast', 'kaiju', 'чудовищ', 'създани', 'същество', 'монстър', 'звяр', 'зверове'], () => [dim('fear', { target: 5.5, tolerance: 2 })]),
  tagConcept('revenge', 'revenge', ['reveng', 'vengean', 'отмъщ', 'възмезд']),
  tagConcept('killer', 'serial-killer', ['killer', 'serial', 'psychopath', 'murderer', 'маниак', 'убиец', 'убийц'], () => [dim('tension', { target: 8, min: 6 })]),
  tagConcept('cult', 'cult', ['секта', 'секти'], undefined, ['cult', 'cults']),
  tagConcept('cult-classic', 'cult-classic', ['култов']),
  tagConcept('isolation', 'isolation', ['isolat', 'stranded', 'изолац', 'изолир']),
  tagConcept('survival', 'survival', ['surviv', 'оцеля']),
  tagConcept('paranoia', 'paranoia', ['paranoi', 'параноя', 'параноич']),
  tagConcept('satire', 'satire', ['satir', 'parod', 'сатир']),
  tagConcept('obsession', 'obsession', ['obsess', 'обсес', 'обсеб', 'мания']),
  tagConcept('loneliness', 'loneliness', ['lonel', 'самот']),
  tagConcept('hope', 'hope', ['hope', 'надежд']),
  tagConcept('grief', 'grief', ['grief', 'griev', 'mourning', 'загуба', 'скръб', 'траур'], undefined, ['loss']),
  tagConcept('dystopia', 'dystopia', ['dystop', 'apocalyp', 'post-apocalyp', 'антиутоп', 'апокалип']),
  tagConcept('dance', 'dance', ['danc', 'ballet', 'ballerina', 'танц', 'балет', 'балерин']),
  tagConcept('food', 'food', ['food', 'cooking', 'cuisine', 'restaurant', 'храна', 'готвене', 'кулинар', 'кухня'], undefined, ['cook', 'chef', 'chefs']),
  tagConcept('school', 'school', ['school', 'high-school', 'college', 'campus', 'училищ', 'гимназ']),
  tagConcept('coming-of-age', 'coming-of-age', ['teen', 'coming-of-age', 'adolescen', 'тийнейдж', 'порастван', 'юношес']),
  tagConcept('friendship', 'friendship', ['friendship', 'buddies', 'bromance', 'приятелств'], undefined, ['buddy']),
  tagConcept('art', 'art', ['artist', 'painter', 'художни'], undefined, ['art', 'painting', 'изкуство']),
  tagConcept('journalism', 'journalism', ['journalis', 'reporter', 'newspaper', 'newsroom', 'журналист', 'вестник', 'репортер']),
  tagConcept('ocean', 'ocean', ['ocean', 'underwater', 'океан', 'морск', 'подводн'], undefined, ['sea', 'seas', 'море', 'морето']),
  tagConcept('nature', 'nature', ['nature', 'wilderness', 'jungle', 'природ', 'джунгл'], undefined, ['forest', 'woods', 'гора', 'гората']),
  tagConcept('small-town', 'small-town', ['small-town', 'smalltown', 'village', 'градче', 'провинц'], undefined, ['село', 'селото']),
  tagConcept('family', 'family', ['семейств'], undefined, ['family', 'families']),
  tagConcept('class', 'class', ['inequal', 'wealth', 'неравенств', 'класов'], undefined, ['rich', 'poor', 'богати', 'бедни']),
  tagConcept('underdog', 'underdog', ['underdog', 'аутсайдер']),
  tagConcept('music', 'music', ['music', 'jazz', 'concert', 'musician', 'музик', 'музикант', 'джаз', 'джез'], undefined, ['band', 'rock', 'рок', 'песни', 'пеене']),
  tagConcept('identity', 'identity', ['identit', 'doppelg', 'идентичн', 'двойник', 'двойниц']),
  tagConcept('ai', 'ai', ['android', 'андроид'], undefined, ['ai', 'a.i', 'ии']),
];

/**
 * English comparatives and superlatives. A closed list beats suffix guessing:
 * "thriller" and "monster" end in -er too.
 */
export const INFLECTIONS: Record<string, { core: string; degree: 'more' | 'most' }> = Object.fromEntries(
  (
    [
      ['scary', 'scarier', 'scariest'], ['creepy', 'creepier', 'creepiest'], ['dark', 'darker', 'darkest'], ['funny', 'funnier', 'funniest'],
      ['sad', 'sadder', 'saddest'], ['light', 'lighter', 'lightest'], ['happy', 'happier', 'happiest'], ['weird', 'weirder', 'weirdest'],
      ['strange', 'stranger', 'strangest'], ['fast', 'faster', 'fastest'], ['slow', 'slower', 'slowest'], ['short', 'shorter', 'shortest'],
      ['long', 'longer', 'longest'], ['old', 'older', 'oldest'], ['new', 'newer', 'newest'], ['calm', 'calmer', 'calmest'],
      ['cozy', 'cozier', 'coziest'], ['bleak', 'bleaker', 'bleakest'], ['grim', 'grimmer', 'grimmest'], ['heavy', 'heavier', 'heaviest'],
      ['tense', 'tenser', 'tensest'], ['sweet', 'sweeter', 'sweetest'], ['warm', 'warmer', 'warmest'], ['deep', 'deeper', 'deepest'],
      ['smart', 'smarter', 'smartest'], ['cute', 'cuter', 'cutest'], ['quick', 'quicker', 'quickest'], ['new', 'newer', 'latest'],
      ['spooky', 'spookier', 'spookiest'], ['gentle', 'gentler', 'gentlest'], ['quiet', 'quieter', 'quietest'], ['easy', 'easier', 'easiest'],
    ] as const
  ).flatMap(([core, more, most]) => [
    [more, { core, degree: 'more' as const }],
    [most, { core, degree: 'most' as const }],
  ]),
);

/** Conditional words: an intensifier when another concept follows, a concept of their own otherwise. */
export const CONDITIONAL_INTENSIFIERS: Record<string, { level: Level; onlyBefore?: Dim[]; fallback?: string }> = {
  crazy: { level: 'max', fallback: 'mindbend' },
  insanely: { level: 'max' },
  stupidly: { level: 'max' },
  wildly: { level: 'max' },
  страшно: { level: 'max', fallback: 'fear' },
  ужасно: { level: 'max', fallback: 'fear' },
  адски: { level: 'max' },
  брутално: { level: 'max', fallback: 'darkness' },
  жестоко: { level: 'max', fallback: 'darkness' },
  лудо: { level: 'max' },
  леко: { level: 'low', onlyBefore: ['fear', 'tension', 'darkness', 'sadness', 'action', 'mindbend', 'romance'], fallback: 'feelgood' },
  лекичко: { level: 'low', onlyBefore: ['fear', 'tension', 'darkness', 'sadness', 'action', 'mindbend', 'romance'], fallback: 'feelgood' },
};

export const INTENSIFIERS: Record<string, Level> = {
  very: 'max',
  really: 'max',
  super: 'max',
  so: 'max',
  extremely: 'max',
  incredibly: 'max',
  seriously: 'max',
  properly: 'max',
  truly: 'max',
  totally: 'max',
  absolutely: 'max',
  genuinely: 'max',
  utterly: 'max',
  ridiculously: 'max',
  hella: 'max',
  mega: 'max',
  most: 'max',
  pretty: 'high',
  quite: 'high',
  много: 'max',
  мнооого: 'max',
  супер: 'max',
  мега: 'max',
  яко: 'max',
  наистина: 'max',
  истински: 'max',
  изключително: 'max',
  невероятно: 'max',
  тотално: 'max',
  абсолютно: 'max',
  максимално: 'max',
  бая: 'high',
  доста: 'high',
  най: 'max',
};

export const DIMINISHERS: Record<string, Level> = {
  slightly: 'low',
  mildly: 'low',
  lightly: 'low',
  barely: 'low',
  bit: 'low',
  little: 'low',
  tad: 'low',
  somewhat: 'mid',
  moderately: 'mid',
  fairly: 'mid',
  reasonably: 'mid',
  kinda: 'mid',
  sorta: 'mid',
  малко: 'low',
  мъничко: 'low',
  'малко-малко': 'low',
  слабо: 'low',
  бегло: 'low',
  умерено: 'mid',
  средно: 'mid',
  нормално: 'mid',
  донякъде: 'mid',
  отчасти: 'mid',
};

export const NEGATORS = new Set([
  'no', 'not', 'without', 'nothing', 'zero', 'none', 'never', "don't", 'dont', "doesn't", 'doesnt', "isn't", 'isnt', "aren't", "won't", 'avoid',
  'не', 'без', 'никак', 'никакъв', 'никаква', 'никакво', 'никакви', 'нищо', 'нула',
]);

/** Words after a negation that turn it into moderation: "not too", "nothing too", "не прекалено". */
export const MODERATION_AFTER_NOT = new Set(['too', 'very', 'overly', 'that', 'super', 'so', 'crazy', 'extremely', 'прекалено', 'много', 'твърде', 'чак', 'особено', 'съвсем', 'толкова', 'кой']);

export const COMPARATIVE_UP = new Set(['more', 'extra', 'even', 'повече', 'по-голямо', 'по-голям', 'по-силно', 'още']);
export const COMPARATIVE_DOWN = new Set(['less', 'fewer', 'по-малко', 'по-слабо']);

export const BOUNDARIES = new Set([',', '.', '!', '?', ';', ':', 'but', 'and', 'or', 'plus', 'though', 'although', 'yet', 'however', 'also', 'но', 'ама', 'обаче', 'а', 'и', 'или', 'плюс', 'хем']);

/** "I'd love something funny" is not a request for romance. */
export const SPEAKER_WORDS = new Set(['i', "i'd", 'id', 'we', "we'd", 'would', "i'll", 'really', 'just', 'you', 'they']);
export const ENJOY_WORDS = new Set(['love', 'loved', 'loving', 'adore']);

/** Words that carry no wish of their own. They never break a modifier's reach. */
export const FILLERS = new Set([
  // English
  'i', "i'm", 'im', "i'd", 'id', "i've", 'ive', "i'll", 'me', 'my', 'we', "we're", "we'd", 'us', 'our', 'you', 'your', 'it', "it's", 'its', 'they', 'them',
  'want', 'wanna', 'wants', 'would', 'like', 'need', 'looking', 'look', 'find', 'give', 'show', 'recommend', 'suggest', 'pick', 'choose', 'get', 'got', 'have', 'has', 'had',
  'watch', 'watching', 'see', 'seeing', 'something', 'anything', 'one', 'movie', 'movies', 'film', 'films', 'flick', 'flicks', 'title', 'option', 'options', 'idea', 'ideas',
  'a', 'an', 'the', 'some', 'any', 'kind', 'sort', 'type', 'of', 'to', 'for', 'in', 'on', 'at', 'with', 'about', 'into', 'from', 'by', 'as', 'that', 'this', 'these', 'those',
  'is', 'are', 'be', 'been', 'being', 'was', 'were', 'am', 'do', 'does', 'did', 'can', 'could', 'should', 'will', 'gonna', 'let', "let's", 'lets', 'please', 'tonight',
  'today', 'now', 'evening', 'night', 'weekend', 'friday', 'saturday', 'sunday', 'mood', 'vibe', 'vibes', 'feel', 'feeling', 'feels', 'just', 'maybe', 'perhaps',
  'good', 'great', 'nice', 'decent', 'cool', 'awesome', 'interesting', 'okay', 'ok', 'fine', 'actually', 'which', 'what', 'who', 'how', 'where', 'when',
  'there', 'here', 'then', 'than', 'if', 'because', 'since', 'while', 'enjoy', 'enjoyed', 'think', 'thought', 'know', 'guess', 'probably', 'definitely', 'much',
  'many', 'lot', 'lots', 'all', 'every', 'everything', 'other', 'else', 'still', 'again', 'ever', 'tell', 'make', 'makes', 'made', 'go', 'going',
  'hey', 'hi', 'hello', 'thanks', 'thank', 'yes', 'yeah', 'sure', 'right', 'stuff', 'things', 'thing', 'way', 'genre', 'style', 'kind-of', 'sort-of',
  'home', 'alone', 'house', 'people', 'person', 'life', 'world', 'time', 'year', 'years', 'day', 'days', 'week', 'man', 'woman', 'guy', 'girl', 'boy', 'story',
  'stories', 'plot', 'character', 'characters', 'end', 'ending', 'start', 'half', 'hour', 'hours', 'minute', 'minutes', 'max', 'min', 'tops', 'ever', 'watched',
  'seen', 'saw', 'liked', 'enjoyed', 'loved', 'tired', 'mood', 'wanted', 'anymore', 'lately', 'recently', 'already', 'couch', 'sofa', 'popcorn', 'together', 'outside', 'inside', "tonight's", "evening's",
  // Bulgarian
  'искам', 'искаш', 'иска', 'искаме', 'искате', 'исках', 'бих', 'искал', 'искала', 'желая', 'търся', 'търсим', 'трябва', 'ми', 'ме', 'ни', 'му', 'им', 'се', 'си',
  'нещо', 'нещичко', 'някакъв', 'някаква', 'някакво', 'някакви', 'някой', 'някоя', 'филм', 'филма', 'филмът', 'филми', 'филмче', 'филмчета', 'кино', 'сериал',
  'гледам', 'гледаме', 'гледаш', 'гледане', 'изгледам', 'изгледаме', 'да', 'е', 'са', 'съм', 'сме', 'сте', 'бъде', 'бъдат', 'ще', 'ли', 'беше', 'било', 'бил', 'била',
  'аз', 'ти', 'той', 'тя', 'ние', 'вие', 'те', 'тази', 'този', 'това', 'тези', 'тоя', 'таз', 'туй', 'вечер', 'вечерта', 'довечера', 'днес', 'сега', 'утре',
  'уикенда', 'уикенд', 'петък', 'събота', 'неделя', 'моля', 'хайде', 'дай', 'дайте', 'предложи', 'предложете', 'препоръчай', 'препоръчайте', 'избери', 'изберете',
  'намери', 'намерете', 'покажи', 'кажи', 'за', 'на', 'в', 'във', 'с', 'със', 'от', 'по', 'при', 'към', 'около', 'през', 'че', 'който', 'която', 'което', 'които',
  'какъв', 'каква', 'какво', 'какви', 'как', 'кой', 'коя', 'кое', 'кои', 'нека', 'може', 'можеш', 'става', 'просто', 'точно', 'само', 'също', 'пак', 'все', 'пък',
  'ок', 'ей', 'хм', 'по-скоро', 'по-добре', 'хубав', 'хубаво', 'хубави', 'хубава', 'добър', 'добро', 'добра', 'добри', 'готин', 'готино', 'готина', 'интересен',
  'интересно', 'интересна', 'малко-много', 'нещата', 'тип', 'вид', 'жанр', 'настроение', 'настроението', 'ден', 'нощ', 'тук', 'там', 'вкъщи', 'заедно', 'някак',
  'някъде', 'гледал', 'гледала', 'гледали', 'страхотен', 'страхотно', 'страхотна', 'страхотни', 'вариант', 'варианти', 'идея', 'идеи', 'препоръка', 'предложение',
  'мен', 'нас', 'тебе', 'мене', 'моя', 'мой', 'мое', 'мои', 'твоя', 'твой', 'наш', 'наша', 'определено', 'задължително', 'обичам', 'харесвам', 'харесва', 'харесах',
  'харесало', 'привлича', 'обича', 'обичаме', 'мисля', 'мислех', 'смятам', 'знам', 'знаеш', 'днешната', 'тазвечерния', 'нито', 'ако', 'когато', 'щом', 'защото',
  'понеже', 'докато', 'вече', 'всъщност', 'например', 'напр', 'стил', 'стила', 'духа', 'неща', 'струва', 'струват', 'казвам', 'казва', 'виждам', 'намирам', 'правя',
  'прави', 'отида', 'отивам', 'имам', 'имаме', 'гледах', 'гледахме', 'видя', 'видим', 'хареса', 'харесат', 'опитай', 'опитаме', 'пусни', 'пуснем', 'чувствам',
  'чувство', 'нямам', 'няма', 'някого', 'никой', 'всички', 'всичко', 'друг', 'друга', 'друго', 'други', 'днеска', 'тая', 'тоз', 'оня', 'онази', 'онзи', 'онова',
  'едно', 'един', 'една', 'вариантче',
]);
