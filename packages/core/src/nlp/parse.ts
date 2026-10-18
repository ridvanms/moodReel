import { effectKey, type EffectBody, type Level, type ParsedEffect } from '../effects';
import type { Dim, DimConstraint, Movie } from '../types';
import {
  BOUNDARIES,
  COMPARATIVE_DOWN,
  COMPARATIVE_UP,
  CONCEPTS,
  CONDITIONAL_INTENSIFIERS,
  DIMINISHERS,
  ENJOY_WORDS,
  FILLERS,
  INFLECTIONS,
  INTENSIFIERS,
  MODERATION_AFTER_NOT,
  NEGATORS,
  SPEAKER_WORDS,
  type Concept,
} from './lexicon';
import { dice, normalize, normalizeTitle, stem, tokenize, transliterate } from './text';
import { TitleIndex } from './titles';

export interface ParseResult {
  effects: ParsedEffect[];
  /** replace: a fresh wish. refine: tweak what is already on screen ("less scary"). */
  mode: 'replace' | 'refine';
  /** Content words the parser could not place. */
  unknown: string[];
  /** The user's own state, when they told us ("bad day"). */
  moods: string[];
  understood: boolean;
}

export interface Parser {
  parse(text: string): ParseResult;
}

const L = '(?<![\\p{L}\\p{N}])';
const R = '(?![\\p{L}\\p{N}])';
/** A word character run that never crosses punctuation, so one phrase cannot swallow the next clause. */
const W = "[^\\s,.;!?]";
const rx = (source: string) => new RegExp(source.replace(/<L>/g, L).replace(/<R>/g, R).replace(/<W>/g, W), 'gdu');

const dim = (d: Dim, constraint: DimConstraint): EffectBody => ({ kind: 'dim', dim: d, constraint });

interface PhraseRule {
  re: RegExp;
  /** Return null to leave the text for later rules. */
  effects: (m: RegExpMatchArray) => ParsedEffect[] | null;
  mood?: string;
}

const NUMBER_WORDS: Record<string, number> = {
  a: 1, an: 1, one: 1, two: 2, three: 3, four: 4, 'half an': 0.5, 'half a': 0.5,
  един: 1, една: 1, едно: 1, час: 1, два: 2, две: 2, три: 3, четири: 4, половин: 0.5,
};

/** "2 hours", "90 minutes", "an hour and a half", "час и половина" → minutes. Four-digit numbers are years, not durations. */
function durationMinutes(amount: string, unit: string | undefined, half: boolean): number | null {
  const n = NUMBER_WORDS[amount] ?? Number(amount.replace(',', '.'));
  if (!Number.isFinite(n) || n >= 1000) return null;
  const isHours = unit ? /^(ч|h)/.test(unit) : n <= 4 || amount === 'час';
  return Math.round(isHours ? n * 60 + (half ? 30 : 0) : n);
}

const DECADE_WORDS: Record<string, number> = {
  fifties: 1950,
  sixties: 1960,
  seventies: 1970,
  eighties: 1980,
  nineties: 1990,
  noughties: 2000,
  петдесетте: 1950,
  шейсетте: 1960,
  шестдесетте: 1960,
  седемдесетте: 1970,
  осемдесетте: 1980,
  деветдесетте: 1990,
  нулевите: 2000,
  двехилядните: 2000,
};

const AMOUNT = '(\\d+(?:[.,]\\d+)?|half\\s+an?|an?|one|two|three|four|един|една|два|две|три|четири|час|половин)';
const UNIT = '(hours?|hrs?|h|minutes?|mins?|min|час(?:а|ове)?|ч\\.?|минути|минута|мин\\.?)?';
const HALF = "(\\s+and\\s+a\\s+half|\\s+и\\s+половина)?";
const NEG_EN = "(?:no|without|nothing|zero|avoid|skip|hate|none\\s+of\\s+the|anything\\s+but|don'?t\\s+want|do\\s+not\\s+want|not\\s+into|no\\s+more)";
const NEG_BG = '(?:без|не\\s+искам|не\\s+ми\\s+трябва|никакъв|никаква|никакво|никакви|да\\s+няма|да\\s+не\\s+е\\s+с|не\\s+понасям|не\\s+обичам|мразя)';
const NEG = `(?:${NEG_EN}|${NEG_BG})`;
const ME = "(?:i'?m|i\\s+am|i\\s+feel|feeling|i'?ve\\s+been)";

const LIFT: EffectBody[] = [
  dim('humor', { target: 7, tolerance: 1.5, weight: 0.8 }),
  dim('darkness', { target: 1.5, max: 3.5 }),
  dim('sadness', { target: 2, max: 4.5 }),
  dim('fear', { target: 0.5, max: 2 }),
  dim('wonder', { target: 6.5, tolerance: 2, weight: 0.5 }),
];

function group(name: string, effects: EffectBody[]): ParsedEffect[] {
  return effects.map((e) => ({ ...e, group: name }));
}

/** True when the few characters before a match negate it ("not for kids", "не за деца"). */
const negatedBefore = (m: RegExpMatchArray) => /(?:^|\s)(?:not|не|no)\s*$/.test(m.input!.slice(Math.max(0, m.index! - 5), m.index));

const PHRASES: PhraseRule[] = [
  // ── The user's own state ────────────────────────────────────────────────
  {
    re: rx(
      `<L>(?:${ME}\\s+(?:so\\s+|really\\s+|a\\s+bit\\s+|kinda\\s+|pretty\\s+|very\\s+)?(?:sad|down|low|blue|depressed|miserable|heartbroken|gutted|awful|terrible|crap|crappy|rubbish|upset)|(?:bad|rough|terrible|awful|hard|crappy|horrible|tough|lousy)\\s+(?:day|week)|cheer\\s+me\\s+up|need\\s+(?:a\\s+)?(?:pick[- ]me[- ]up|cheering\\s+up)` +
        `|(?:тъжен|тъжна|депресиран<W>*|разбит<W>*|потиснат<W>*|нещастен|нещастна|разстроен<W>*|кофти|зле)\\s+(?:съм|се\\s+чувствам)|(?:съм|се\\s+чувствам)\\s+(?:много\\s+|малко\\s+|доста\\s+)?(?:тъжен|тъжна|депресиран<W>*|разбит<W>*|потиснат<W>*|разстроен<W>*|зле|кофти)|(?:тъжно|кофти|гадно|зле|тежко|мъчно)\\s+ми\\s+е|(?:лош|тежък|скапан|гаден|кофти|ужасен|отвратителен)\\s+ден)<R>`,
    ),
    effects: () => group('Bad day → something uplifting', LIFT),
    mood: 'Bad day',
  },
  {
    re: rx(
      `<L>(?:${ME}\\s+(?:so\\s+|really\\s+|very\\s+|pretty\\s+)?(?:tired|exhausted|wiped|beat|drained|sleepy|knackered|fried)|long\\s+day|brain(?:\\s+is)?\\s+(?:fried|dead|mush)|brain[- ]dead|can'?t\\s+think|too\\s+tired` +
        `|(?:уморен|уморена|изморен|изморена|изтощен|изтощена|скапан|скапана)\\s+(?:съм|се\\s+чувствам)|(?:съм|се\\s+чувствам)\\s+(?:много\\s+|доста\\s+)?(?:уморен<W>*|изморен<W>*|изтощен<W>*|скапан<W>*)|без\\s+сили)<R>`,
    ),
    effects: () => [
      ...group('Tired → easy watching', [dim('mindbend', { target: 2, max: 4 }), dim('tension', { target: 4, max: 6, weight: 0.7 })]),
      { kind: 'runtime', max: 120, group: 'Tired → easy watching' },
    ],
    mood: 'Tired',
  },
  {
    re: rx(`<L>(?:${ME}\\s+(?:so\\s+|really\\s+)?bored|boring\\s+day|nothing\\s+to\\s+do|скучно\\s+ми\\s+е|скучая|отегчен<W>*)<R>`),
    effects: () => group('Bored → something fast', [dim('pace', { target: 8, min: 6 }), dim('tension', { target: 6.5, tolerance: 2, weight: 0.6 })]),
    mood: 'Bored',
  },
  {
    re: rx(
      `<L>(?:${ME}\\s+(?:so\\s+|really\\s+|a\\s+bit\\s+|pretty\\s+)?(?:stressed|anxious|nervous|overwhelmed|on\\s+edge|tense|frazzled)|stressful\\s+(?:day|week)` +
        `|(?:стресиран<W>*|напрегнат<W>*|тревожн<W>*|притеснен<W>*|изнервен<W>*)\\s+(?:съм|се\\s+чувствам)|(?:съм|се\\s+чувствам)\\s+(?:много\\s+|доста\\s+)?(?:стресиран<W>*|напрегнат<W>*|тревожн<W>*|изнервен<W>*)|в\\s+стрес|стрес\\s+ми\\s+е)<R>`,
    ),
    effects: () =>
      group('Stressed → something calm', [
        dim('tension', { target: 2, max: 4 }),
        dim('fear', { target: 0.5, max: 2 }),
        dim('darkness', { target: 2, max: 4 }),
        dim('humor', { target: 6, tolerance: 2, weight: 0.6 }),
      ]),
    mood: 'Stressed',
  },
  {
    re: rx(`<L>(?:${ME}\\s+(?:so\\s+)?in\\s+love|fell\\s+in\\s+love|falling\\s+in\\s+love|(?:влюбен|влюбена)\\s+съм|съм\\s+(?:много\\s+)?(?:влюбен|влюбена))<R>`),
    effects: () => group('In love → romance', [dim('romance', { target: 8, min: 6 })]),
    mood: 'In love',
  },
  {
    re: rx(
      `<L>(?:${ME}\\s+(?:so\\s+|really\\s+)?(?:happy|great|excited|amazing|fantastic)|(?:good|great|happy)\\s+mood` +
        `|(?:щастлив|щастлива|весел|весела|ентусиазиран<W>*)\\s+съм|в\\s+(?:добро|супер|страхотно|отлично)\\s+настроение\\s+съм)<R>`,
    ),
    effects: () =>
      group('Good mood → keep it going', [
        dim('darkness', { target: 3, max: 5 }),
        dim('sadness', { target: 3, max: 6 }),
        dim('humor', { target: 6, tolerance: 2, weight: 0.5 }),
      ]),
    mood: 'Good mood',
  },
  {
    re: rx(
      `<L>(?:can'?t\\s+sleep|cannot\\s+sleep|insomnia|middle\\s+of\\s+the\\s+night|late\\s+at\\s+night|late[- ]night|(?:at\\s+)?[1-4]\\s?(?:am|a\\.m\\.)` +
        `|не\\s+мога\\s+да\\s+(?:заспя|спя)|безсъни<W>*|посред\\s+нощ|късно\\s+през\\s+нощта|в\\s+[1-4]\\s+(?:през\\s+нощта|сутринта|часа\\s+през\\s+нощта))<R>`,
    ),
    effects: () => group('Late night → something strange', [dim('mindbend', { target: 7, tolerance: 2 }), dim('darkness', { target: 6, tolerance: 2, weight: 0.6 })]),
    mood: 'Late night',
  },
  {
    re: rx(`<L>(?:raining|rainy|rain|snowing|snowy|snow|stormy|cold\\s+outside|вали|дъжд<W>*|снеж<W>*|сняг|студено\\s+е|мразовито)<R>`),
    effects: () =>
      group('Weather outside → cozy', [dim('darkness', { target: 3, max: 5 }), dim('tension', { target: 3.5, max: 6, weight: 0.6 }), dim('wonder', { target: 6, tolerance: 2, weight: 0.5 })]),
    mood: 'Bad weather',
  },

  // ── Company ─────────────────────────────────────────────────────────────
  {
    re: rx(
      `<L>(?:with\\s+(?:my\\s+|the\\s+|our\\s+)?(?:kids|children|son|daughter|little\\s+ones?|nephew|niece|grandkids|toddler)|for\\s+(?:the\\s+)?(?:kids|children|whole\\s+family|little\\s+ones)|family[- ](?:movie|film|night|friendly)|kid[- ]friendly|child[- ]friendly|suitable\\s+for\\s+(?:kids|children|all\\s+ages)|all\\s+ages` +
        `|с\\s+(?:децата|деца|детето|малките|малкия|малката|сина\\s+ми|дъщеря\\s+ми|дъщеричката|племенни<W>*|внуци<W>*|внучк<W>*|братчето|сестричката)|за\\s+(?:деца|децата|цялото\\s+семейство|малки)|детск<W>*|семеен\\s+филм|семейна\\s+вечер|за\\s+всички\\s+възрасти)<R>`,
    ),
    effects: (m) => (negatedBefore(m) ? [] : [{ kind: 'deal', key: 'familyFriendly' }]),
  },
  {
    re: rx(
      `<L>(?:date\\s*night|on\\s+a\\s+date|first\\s+date|with\\s+(?:my\\s+)?(?:girlfriend|boyfriend|partner|wife|husband|gf|bf|crush|fianc<W>*|significant\\s+other|other\\s+half)|romantic\\s+(?:evening|night)` +
        `|с\\s+(?:гаджето|приятелката\\s+си|приятелката\\s+ми|приятеля\\s+си|приятеля\\s+ми|половинката|жена\\s+ми|мъжа\\s+ми|съпруг<W>*|любим<W>*)|за\\s+среща|на\\s+среща|романтична\\s+вечер)<R>`,
    ),
    effects: () => group('Date → romance', [dim('romance', { target: 6.5, tolerance: 1.5 })]),
  },
  {
    re: rx(
      `<L>(?:with\\s+(?:my\\s+|some\\s+|the\\s+)?(?:friends|mates|buddies|boys|girls|gang|roommates|flatmates|colleagues|coworkers|crew)|(?:a|for\\s+a|at\\s+a)\\s+party|group\\s+watch` +
        `|с\\s+(?:приятели|приятелите|приятелки|компания|компанията|колеги<W>*|аверите|пичовете|момичетата|момчетата|съквартирант<W>*)|за\\s+купон|на\\s+купон)<R>`,
    ),
    effects: () => group('Friends → laughs and pace', [dim('humor', { target: 7, tolerance: 1.5, weight: 0.8 }), dim('pace', { target: 7, tolerance: 1.5, weight: 0.6 })]),
  },

  // ── Endings and content ─────────────────────────────────────────────────
  {
    re: rx(`<L>(?:(?:happy|feel-good|feelgood|upbeat|uplifting|positive|good)\\s+(?:ending|endings|end)|happily\\s+ever\\s+after|ends?\\s+happily|(?:щастлив<W>*|хубав<W>*|добър|добри|позитивен|позитивн<W>*|светъл)\\s+(?:край<W>*|краища|финал<W>*|завършек)|хепи\\s?енд<W>*|happy\\s?end)<R>`),
    effects: (m) => (/(?:^|\s)(?:no|not|without|без|не)\s*$/.test(m.input!.slice(Math.max(0, m.index! - 9), m.index)) ? null : [{ kind: 'deal', key: 'happyOnly' }]),
  },
  {
    re: rx(
      `<L>(?:(?:${NEG}|not|не)\\s+(?:<W>+\\s+){0,3}?(?:sad|bad|tragic|depressing|downer|unhappy|bleak|dark|devastating|heartbreaking|gut-wrenching|crushing|тъж<W>*|лош<W>*|трагич<W>*|депрес<W>*|печал<W>*|кофти)\\s+(?:endings?|end|край<W>*|краища|финал<W>*|завършек<W>*))<R>`,
    ),
    effects: () => [{ kind: 'deal', key: 'noSadEnding' }],
  },
  {
    re: rx(
      `<L>(?:(?:doesn'?t|does\\s+not|don'?t|do\\s+not|shouldn'?t|won'?t|can'?t)\\s+end\\s+(?:badly|sadly|tragically|in\\s+tears|on\\s+a\\s+down\\s+note)|(?:that|which)\\s+ends?\\s+well|ends?\\s+on\\s+a\\s+high|(?:nobody|no\\s+one|noone)\\s+dies|(?:the\\s+)?(?:hero|heroes|main\\s+characters?|good\\s+guys?)\\s+(?:survives?|lives?|makes\\s+it|(?:don'?t|doesn'?t)\\s+die)` +
        `|(?:да|който|които|която|което)\\s+(?:да\\s+)?(?:свършва<W>*|завършва<W>*|приключва<W>*)\\s+(?:добре|хубаво|щастливо|позитивно)|(?:да\\s+)?не\\s+(?:свършва<W>*|завършва<W>*|приключва<W>*)\\s+(?:зле|тъжно|лошо|трагично)|никой\\s+(?:да\\s+)?не\\s+умира|(?:главни<W>*|героят|героите|героинята)\\s+(?:<W>+\\s+)?(?:да\\s+)?(?:не\\s+умира<W>*|оцелява<W>*))<R>`,
    ),
    effects: () => [{ kind: 'deal', key: 'noSadEnding' }],
  },
  {
    re: rx(
      `<L>(?:${NEG}\\s+(?:<W>+\\s+){0,2}?(?:gore|gory|blood|bloody|violence|violent|graphic|guts|splatter|кръв<W>*|кърви|кървав<W>*|клане|кланета|насилие|разчленяв<W>*)|not\\s+(?:too\\s+|very\\s+|that\\s+)?(?:gory|bloody|violent|graphic)|(?:да\\s+не\\s+е|не\\s+много)\\s+кървав<W>*)<R>`,
    ),
    effects: () => [{ kind: 'deal', key: 'noGore' }],
  },
  {
    re: rx(
      `<L>(?:${NEG}\\s+(?:<W>+\\s+){0,2}?(?:jump\\s*-?\\s*scares?|jumpscares?|sudden\\s+scares|cheap\\s+scares|внезапн<W>*|стряск<W>*|джъмп\\s*скеър<W>*|джъмп\\s*скер<W>*|изскачащ<W>*)|nothing\\s+that\\s+makes\\s+me\\s+jump|(?:да\\s+)?не\\s+(?:ме\\s+)?(?:стряска<W>*|стресва<W>*))<R>`,
    ),
    effects: () => [{ kind: 'deal', key: 'noJumpscares' }],
  },
  {
    re: rx(
      `<L>(?:(?:the\\s+)?(?:dog|dogs|cat|cats|pet|pets|animal|animals|puppy|puppies|horse)\\s+(?:doesn'?t|don'?t|does\\s+not|do\\s+not|shouldn'?t|can'?t|won'?t|must\\s+not|better\\s+not)\\s+die|no\\s+(?:dead|dying)\\s+(?:dogs?|cats?|pets?|animals?)|(?:no|without\\s+(?:any\\s+)?)\\s*(?:animal|dog|pet)\\s+deaths?|(?:the\\s+)?(?:dog|cat|animals?)\\s+(?:lives|survives?)` +
        `|без\\s+(?:да\\s+)?(?:умира<W>*|умре|умрат|загива<W>*|страда<W>*|умиращи|мъртви)\\s+(?:<W>+\\s+)?(?:куче<W>*|кучета|животн<W>*|котк<W>*|коте<W>*)|(?:куче<W>*|кучета|животн<W>*|котк<W>*|коте<W>*)\\s+(?:<W>+\\s+)?(?:да\\s+)?не\\s+(?:умира<W>*|умре|умрат|загива<W>*|страда<W>*|пострада<W>*)|(?:да\\s+)?не\\s+(?:умира<W>*|умре|загива<W>*)\\s+(?:<W>+\\s+)?(?:куче<W>*|кучета|животн<W>*|котк<W>*))<R>`,
    ),
    effects: () => [{ kind: 'deal', key: 'noAnimalDeath' }],
  },

  // ── Phrases that look like other words ──────────────────────────────────
  {
    // "something new" usually means "something I have not seen", not a release year.
    re: rx(`<L>(?:something|anything)\\s+(?:new|different|else)<R>`),
    effects: () => [],
  },

  // ── Themes that need more than one word ────────────────────────────────
  {
    re: rx('<L>(?:time\\s*travel<W>*|time\\s*loops?|time\\s*machine|пътуван<W>*\\s+(?:във|в)\\s+времето|машина<W>*\\s+на\\s+времето|времев<W>*\\s+(?:примк<W>*|парадокс<W>*|пътувани<W>*))<R>'),
    effects: () => [{ kind: 'tag', tag: 'time' }, dim('mindbend', { target: 6.5, tolerance: 1.5, weight: 0.6 })],
  },
  {
    re: rx('<L>(?:artificial\\s+intelligence|изкуствен<W>*\\s+интелект)<R>'),
    effects: () => [{ kind: 'tag', tag: 'ai' }],
  },
  {
    re: rx('<L>(?:true\\s+story|based\\s+on\\s+(?:a\\s+)?true\\s+(?:story|events)|real\\s+events|really\\s+happened|(?:истинска|реална)\\s+история|действителн<W>*\\s+(?:случай|събития|история)|по\\s+истински\\s+случай)<R>'),
    effects: () => [{ kind: 'tag', tag: 'true-story' }],
  },
  {
    re: rx('<L>(?:serial\\s+killers?|сериен\\s+убиец|серийни\\s+убийци)<R>'),
    effects: () => [{ kind: 'tag', tag: 'serial-killer' }, dim('tension', { target: 8, min: 6 })],
  },
  {
    re: rx("<L>(?:whodunn?it|murder\\s+myster<W>*|who\\s+did\\s+it|кой\\s+е\\s+убиецът|детективска\\s+загадка)<R>"),
    effects: () => [{ kind: 'tag', tag: 'whodunit' }, { kind: 'genre', genre: 'mystery', mode: 'include' }],
  },
  {
    re: rx('<L>(?:(?:on\\s+the\\s+)?edge\\s+of\\s+(?:my|your|our|the)\\s+seats?|на\\s+ръба\\s+(?:на\\s+)?(?:стола|дивана|седалката))<R>'),
    effects: () => [dim('tension', { target: 9, min: 7.5 })],
  },
  {
    re: rx('<L>(?:makes?\\s+(?:me|you|us)\\s+think|thought[- ]provoking|да\\s+(?:ме\\s+)?(?:накара|кара)\\s+да\\s+мисля|да\\s+(?:ме\\s+)?замисли)<R>'),
    effects: () => [dim('mindbend', { target: 7.5, min: 5.5 })],
  },
  {
    re: rx('<L>(?:cult\\s+classics?)<R>'),
    effects: () => [{ kind: 'tag', tag: 'cult-classic' }],
  },
  {
    re: rx('<L>(?:small[- ]town|small\\s+village)<R>'),
    effects: () => [{ kind: 'tag', tag: 'small-town' }],
  },
  {
    re: rx('<L>(?:coming\\s+of\\s+age|growing\\s+up)<R>'),
    effects: () => [{ kind: 'tag', tag: 'coming-of-age' }],
  },
  {
    re: rx('<L>(?:road\\s+trip|road\\s+movie)<R>'),
    effects: () => [{ kind: 'tag', tag: 'road-trip' }],
  },
  {
    re: rx('<L>(?:slow[- ]?burn)<R>'),
    effects: () => [{ kind: 'tag', tag: 'slow-burn' }, dim('pace', { target: 3, max: 5, weight: 0.6 })],
  },

  // ── Length ──────────────────────────────────────────────────────────────
  {
    re: rx(
      `<L>(?:under|up\\s+to|less\\s+than|no\\s+more\\s+than|no\\s+longer\\s+than|shorter\\s+than|max|maximum|at\\s+most|within|i\\s+have|i'?ve\\s+got|we\\s+have|we'?ve\\s+got|only\\s+have|got` +
        `|под|до|по-малко\\s+от|не\\s+повече\\s+от|максимум|макс|най-много|имам|имаме|разполагам\\s+с|разполагаме\\s+с)\\s+(?:only\\s+|about\\s+|around\\s+|roughly\\s+|just\\s+|само\\s+|около\\s+|някакви\\s+|едва\\s+)?${AMOUNT}\\s*${UNIT}${HALF}<R>`,
    ),
    effects: (m) => {
      const minutes = durationMinutes(m[1]!, m[2], Boolean(m[3]));
      return minutes === null ? null : [{ kind: 'runtime', max: Math.max(60, minutes) }];
    },
  },
  {
    re: rx(`<L>${AMOUNT}\\s*${UNIT}${HALF}\\s+(?:max|maximum|tops|at\\s+most|or\\s+less|or\\s+shorter|максимум|най-много)<R>`),
    effects: (m) => {
      const minutes = durationMinutes(m[1]!, m[2], Boolean(m[3]));
      return minutes === null ? null : [{ kind: 'runtime', max: Math.max(60, minutes) }];
    },
  },
  {
    re: rx(`<L>(?:over|more\\s+than|at\\s+least|longer\\s+than|minimum|над|поне|повече\\s+от|минимум)\\s+${AMOUNT}\\s*${UNIT}${HALF}<R>`),
    effects: (m) => {
      const minutes = durationMinutes(m[1]!, m[2], Boolean(m[3]));
      return minutes === null ? null : [{ kind: 'runtime', min: minutes }];
    },
  },

  // ── Era ─────────────────────────────────────────────────────────────────
  {
    re: rx('<L>(?:between|from|от|между)\\s+((?:19|20)\\d\\d)\\s+(?:and|to|до|и)\\s+((?:19|20)\\d\\d)<R>'),
    effects: (m) => [{ kind: 'era', minYear: Number(m[1]), maxYear: Number(m[2]) }],
  },
  {
    re: rx("<L>(?:(?:from|in)\\s+)?(?:the\\s+)?(?:от\\s+)?'?(?:(19|20)?([0-9])0)\\s*-?\\s*'?(?:s|те)(?:\\s+години)?<R>"),
    effects: (m) => {
      const digit = Number(m[2]);
      const century = m[1] ? Number(m[1]) * 100 : digit >= 3 ? 1900 : 2000;
      const start = century + digit * 10;
      return [{ kind: 'era', minYear: start, maxYear: start + 9 }];
    },
  },
  {
    re: rx(`<L>(?:(?:from|in)\\s+)?(?:the\\s+)?(?:от\\s+)?(${Object.keys(DECADE_WORDS).join('|')})(?:\\s+години)?<R>`),
    effects: (m) => {
      const start = DECADE_WORDS[m[1]!]!;
      return [{ kind: 'era', minYear: start, maxYear: start + 9 }];
    },
  },
  {
    re: rx('<L>(?:after|since|from|post|след|от)\\s+((?:19|20)\\d\\d)(?:\\s*г\\.?|\\s+година)?<R>'),
    effects: (m) => [{ kind: 'era', minYear: m[0].startsWith('after') || m[0].startsWith('post') ? Number(m[1]) + 1 : Number(m[1]) }],
  },
  {
    re: rx('<L>(?:before|until|pre|up\\s+to|преди|до)\\s+((?:19|20)\\d\\d)(?:\\s*г\\.?|\\s+година)?<R>'),
    effects: (m) => [{ kind: 'era', maxYear: /^(?:before|pre|преди)/.test(m[0]) ? Number(m[1]) - 1 : Number(m[1]) }],
  },
];

const LIKE_CUE = rx(
  "<L>(?:like|similar\\s+to|in\\s+the\\s+(?:style|vein|spirit)\\s+of|reminds?\\s+(?:me\\s+)?of|same\\s+vibes?\\s+as|vibes?\\s+like|a\\s+la|à\\s+la|such\\s+as|като|подобн<W>*\\s+на|в\\s+стила\\s+на|в\\s+стил|в\\s+духа\\s+на|напомня<W>*(?:\\s+на)?|тип|а\\s+ла)\\s+(.+?)(?=$|[,.;!?]|\\s+(?:but|without|with|for|from|that|which|under|over|please|no|not|but|но|ама|обаче|без|не|със|с|за|който|която|което|които|ако|защото)<R>)",
);
const QUOTED = /"([^"]{2,60})"/dg;
const LIST_SEPARATOR = /\s+(?:or|and|или|и|&)\s+|\s*[/,]\s*/g;
const REFINE_CUE = new RegExp(`^(?:also|and|but|plus|even|make\\s+it|without|actually|only|още|и|а|ама|но|плюс|също|добави|освен\\s+това|само\\s+че|обаче|без|по-)${R}`, 'u');

/** Surnames that are also everyday words or belong to someone more famous. */
const AMBIGUOUS_SURNAMES = new Set(['king', 'bird', 'jones', 'scott', 'wright', 'lee', 'waters', 'singer', 'carpenter', 'stone', 'jackson']);

interface SearchDoc {
  id: string;
  stems: Set<string>;
  words: string[];
}

type Degree = '' | 'more' | 'most';

export function createParser(catalog: readonly Movie[]): Parser {
  const titles = new TitleIndex(catalog);
  const conceptById = new Map(CONCEPTS.map((c) => [c.id, c]));

  // Free-text index for "something with a shark": stems from blurbs, titles and aliases.
  const docs: SearchDoc[] = catalog.map((m) => {
    const words = tokenize(normalize([m.title, ...(m.aliases ?? []), m.blurb].join(' ')))
      .filter((t) => !t.punct && t.text.length >= 4)
      .map((t) => t.text);
    return { id: m.id, words, stems: new Set(words.map(stem)) };
  });
  const documentFrequency = new Map<string, number>();
  for (const doc of docs) for (const s of doc.stems) documentFrequency.set(s, (documentFrequency.get(s) ?? 0) + 1);

  const directors = new Map<string, { name: string; ids: string[] }>();
  for (const m of catalog) {
    for (const name of m.director.split(',').map((n) => n.trim())) {
      const surname = normalizeTitle(name).split(' ').pop()!;
      const entry = directors.get(surname) ?? { name, ids: [] };
      entry.ids.push(m.id);
      directors.set(surname, entry);
    }
  }

  function findConcept(core: string): Concept | null {
    for (const concept of CONCEPTS) {
      if (concept.not?.some((n) => core.startsWith(n))) continue;
      if (concept.words?.includes(core) || concept.stems?.some((s) => core.startsWith(s))) return concept;
    }
    return null;
  }

  /** Resolves "scarier", "darkest", "по-страшно", "най-страшния" to a concept plus the degree. */
  function matchConcept(word: string): { concept: Concept; degree: Degree } | null {
    const inflected = INFLECTIONS[word];
    if (inflected) {
      const concept = findConcept(inflected.core);
      if (concept) return { concept, degree: inflected.degree };
    }
    if (word.startsWith('по-') || word.startsWith('най-')) {
      const concept = findConcept(word.slice(word.indexOf('-') + 1));
      if (concept) return { concept, degree: word.startsWith('по-') ? 'more' : 'most' };
    }
    const concept = findConcept(word);
    return concept ? { concept, degree: '' } : null;
  }

  function keywordMatch(raw: string): ParsedEffect | null {
    const word = raw.replace(/'s$/, '');
    if (word.length < 4 || /^\d+$/.test(word)) return null;

    // Director surnames, typed in Latin or Cyrillic ("Nolan's", "Нолан", "Финчър").
    const latin = transliterate(word);
    for (const [surname, entry] of directors) {
      if (surname.length < 4 || AMBIGUOUS_SURNAMES.has(surname)) continue;
      const close = latin === surname || (surname.length >= 5 && Math.abs(latin.length - surname.length) <= 2 && dice(latin, surname) >= 0.72);
      if (close) return { kind: 'keyword', word: entry.name, movieIds: entry.ids };
    }

    const s = stem(word);
    if ((documentFrequency.get(s) ?? 0) > 6) return null;
    const ids = docs.filter((d) => d.stems.has(s) || (s.length >= 5 && d.words.some((w) => w.startsWith(s)))).map((d) => d.id);
    if (ids.length === 0 || ids.length > 8) return null;
    return { kind: 'keyword', word, movieIds: ids };
  }

  function parse(input: string): ParseResult {
    const text = normalize(input);
    const tokens = tokenize(text);
    const consumed = new Array<boolean>(tokens.length).fill(false);
    const effects: ParsedEffect[] = [];
    const moods: string[] = [];
    /** Dimensions the user qualified ("not too scary", "make me think"); a later bare word must not undo that. */
    const explicitDims = new Set<Dim>();

    const consume = (start: number, end: number) => {
      tokens.forEach((t, i) => {
        if (t.start < end && t.end > start) consumed[i] = true;
      });
    };
    const isFree = (start: number, end: number) => tokens.every((t, i) => !(t.start < end && t.end > start) || !consumed[i]);

    // 1. Film references: "like The Thing or Black Swan", quoted titles, then bare mentions.
    for (const m of text.matchAll(LIKE_CUE)) {
      const [captureStart] = m.indices![1]!;
      const capture = m[1]!;
      let matchedAny = false;
      let cursor = 0;
      const parts: Array<{ text: string; offset: number }> = [];
      for (const sep of capture.matchAll(LIST_SEPARATOR)) {
        parts.push({ text: capture.slice(cursor, sep.index), offset: cursor });
        cursor = sep.index! + sep[0].length;
      }
      parts.push({ text: capture.slice(cursor), offset: cursor });
      for (const part of parts) {
        const match = titles.matchPrefix(part.text);
        if (!match) continue;
        const words = [...part.text.matchAll(/\S+/g)];
        // "like up to two hours" is not a request for Up: tiny titles must be the whole phrase.
        if (match.matched.length <= 4 && match.words < words.length) continue;
        matchedAny = true;
        const used = words.slice(0, match.words);
        const last = used[used.length - 1]!;
        const start = captureStart + part.offset + (used[0]!.index ?? 0);
        const end = captureStart + part.offset + (last.index ?? 0) + last[0].length;
        consume(start, end);
        effects.push({ kind: 'like', movieId: match.movieId, span: text.slice(start, end) });
      }
      if (matchedAny) consume(m.index!, captureStart);
    }
    for (const m of text.matchAll(QUOTED)) {
      const [start, end] = m.indices![0]!;
      if (!isFree(start, end)) continue;
      const match = titles.match(m[1]!, 0.7);
      if (!match) continue;
      consume(start, end);
      effects.push({ kind: 'like', movieId: match.movieId, span: m[1]! });
    }
    for (const hit of titles.scan(text)) {
      if (!isFree(hit.start, hit.end)) continue;
      consume(hit.start, hit.end);
      effects.push({ kind: 'like', movieId: hit.movieId, span: text.slice(hit.start, hit.end) });
    }

    // 2. Multi-word phrases.
    for (const rule of PHRASES) {
      for (const m of text.matchAll(rule.re)) {
        const start = m.index!;
        const end = start + m[0].length;
        if (!isFree(start, end)) continue;
        const produced = rule.effects(m);
        if (!produced) continue;
        consume(start, end);
        effects.push(...produced.map((e) => ({ ...e, span: m[0] })));
        for (const e of produced) if (e.kind === 'dim') explicitDims.add(e.dim);
        if (rule.mood && !moods.includes(rule.mood)) moods.push(rule.mood);
      }
    }

    // 3. Word by word, with modifiers that reach forward ("not too scary") or back ("scary, but not too much").
    const live = tokens.map((t, i) => ({ ...t, i })).filter((t) => !consumed[t.i]);
    const unknown: string[] = [];

    interface Pending {
      level?: Level;
      delta?: number;
      post: boolean;
      at: number;
      text: string;
    }
    let pending: Pending | null = null;
    let last: { concept: Concept; from: number; to: number; at: number } | null = null;
    /** Strongest bare (unmodified) level per dimension, so "fantasy … adventure" keeps the higher of the two. */
    const bareLevels = new Map<Dim, number>();

    const nextMeaningful = (j: number): number => {
      for (let k = j + 1; k < live.length; k++) {
        const word = live[k]!.text;
        if (BOUNDARIES.has(word)) return -1;
        if (!FILLERS.has(word)) return k;
      }
      return -1;
    };

    const emit = (concept: Concept, j: number, degree: Degree, span: string) => {
      const delta = degree === 'more' ? (pending?.delta ?? 2.5) : pending?.delta;
      let produced: ParsedEffect[];
      if (delta !== undefined && (concept.deltas || concept.comparative)) {
        const direction: 1 | -1 = delta < 0 ? -1 : 1;
        produced = concept.comparative
          ? concept.comparative(direction)
          : Object.entries(concept.deltas!).map(([d, sign]) => ({ kind: 'dimDelta' as const, dim: d as Dim, delta: delta * (sign ?? 1) }));
      } else {
        const explicit = degree === 'most' || pending?.level !== undefined;
        const level: Level = degree === 'most' ? 'max' : (pending?.level ?? concept.defaultLevel ?? 'high');
        produced = concept.apply(level);
        if (explicit) {
          for (const e of produced) if (e.kind === 'dim') explicitDims.add(e.dim);
        } else {
          produced = produced.filter((e) => {
            if (e.kind !== 'dim') return true;
            if (explicitDims.has(e.dim)) return false;
            const strength = e.constraint.target;
            if ((bareLevels.get(e.dim) ?? -1) > strength) return false;
            bareLevels.set(e.dim, strength);
            return true;
          });
        }
      }
      const fullSpan = pending ? `${pending.text} ${span}` : span;
      const from = effects.length;
      effects.push(...produced.map((e) => ({ ...e, span: fullSpan, via: concept.id })));
      last = { concept, from, to: effects.length, at: j };
      pending = null;
    };

    const flush = () => {
      if (pending?.post && pending.level && last && last.at < pending.at) {
        const replacement = last.concept.apply(pending.level).map((e) => ({ ...e, span: `${effects[last!.from]?.span ?? ''}, ${pending!.text}`, via: last!.concept.id }));
        for (const e of replacement) if (e.kind === 'dim') explicitDims.add(e.dim);
        effects.splice(last.from, last.to - last.from, ...replacement);
        last = { ...last, to: last.from + replacement.length };
      }
      pending = null;
    };

    for (let j = 0; j < live.length; j++) {
      const word = live[j]!.text;
      const next = live[j + 1]?.text;

      if (BOUNDARIES.has(word)) {
        flush();
        continue;
      }
      if (NEGATORS.has(word)) {
        if (next && MODERATION_AFTER_NOT.has(next)) {
          // "not too", "nothing too", "не прекалено", "не чак толкова": moderation that may also reach backwards.
          const span = next === 'чак' && live[j + 2]?.text === 'толкова' ? 3 : 2;
          pending = { level: 'mid', post: true, at: j, text: live.slice(j, j + span).map((t) => t.text).join(' ') };
          j += span - 1;
          continue;
        }
        if (next && INTENSIFIERS[next]) {
          pending = { level: 'low', post: false, at: j, text: `${word} ${next}` };
          j += 1;
          continue;
        }
        pending = { level: 'none', post: false, at: j, text: word };
        continue;
      }
      if ((word === 'kind' || word === 'sort') && next === 'of') {
        pending = { level: 'mid', post: true, at: j, text: `${word} of` };
        j += 1;
        continue;
      }
      if (INTENSIFIERS[word]) {
        pending = { level: INTENSIFIERS[word], post: false, at: j, text: word };
        continue;
      }
      if (DIMINISHERS[word]) {
        pending = { level: DIMINISHERS[word], post: true, at: j, text: word };
        continue;
      }
      if (COMPARATIVE_UP.has(word) || COMPARATIVE_DOWN.has(word)) {
        const sign = COMPARATIVE_DOWN.has(word) ? -1 : 1;
        const boosted = (word === 'още' && next?.startsWith('по-')) || (word === 'even' && (next === 'more' || Boolean(next && INFLECTIONS[next])));
        pending = { delta: sign * (boosted ? 3.5 : 2.5), post: false, at: j, text: word };
        continue;
      }
      if (ENJOY_WORDS.has(word) && j > 0 && SPEAKER_WORDS.has(live[j - 1]!.text)) continue;

      const conditional = CONDITIONAL_INTENSIFIERS[word];
      if (conditional) {
        // "not too scary horror": with a modifier already waiting, the word is an adjective, not an intensifier.
        const k = pending ? -1 : nextMeaningful(j);
        const after = k >= 0 ? matchConcept(live[k]!.text) : null;
        const afterDims = after ? Object.keys(after.concept.deltas ?? {}) : [];
        const applies = after && (!conditional.onlyBefore || afterDims.some((d) => conditional.onlyBefore!.includes(d as Dim)));
        if (applies) {
          pending = { level: conditional.level, post: false, at: j, text: word };
          continue;
        }
        const fallback = conditional.fallback ? conceptById.get(conditional.fallback) : undefined;
        if (fallback) emit(fallback, j, '', word);
        continue;
      }
      const hit = matchConcept(word);
      if (hit) {
        emit(hit.concept, j, hit.degree, word);
        continue;
      }
      if (FILLERS.has(word) || live[j]!.punct) continue;

      const keyword = keywordMatch(word);
      if (keyword) {
        effects.push({ ...keyword, span: word });
        continue;
      }
      if (word.length >= 3 && !/^\d+$/.test(word)) unknown.push(word);
    }
    flush();

    // Two grouped phrases fighting over one dimension ("bad day… something uplifting"): the first, more specific one wins.
    const groupedKeys = new Set<string>();
    for (let i = 0; i < effects.length; i++) {
      const e = effects[i]!;
      if (!e.group || e.kind === 'dimDelta') continue;
      const key = effectKey(e);
      if (groupedKeys.has(key)) effects.splice(i--, 1);
      else groupedKeys.add(key);
    }

    // Only tweaks and filters ("less scary", "no gore") adjust what is on screen; any new taste starts over.
    const tweaksOnly =
      effects.length > 0 &&
      effects.every((e) => e.kind === 'dimDelta' || e.kind === 'deal' || e.kind === 'runtime' || e.kind === 'era' || e.kind === 'animation' || (e.kind === 'genre' && e.mode === 'exclude'));
    const mode = tweaksOnly || REFINE_CUE.test(text) ? 'refine' : 'replace';

    return { effects, mode, unknown, moods, understood: effects.length > 0 };
  }

  return { parse };
}
