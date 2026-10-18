import { describe, expect, it } from 'vitest';
import { MOVIES } from '../src/catalog';
import { buildQuery, mergeEffects, type Effect } from '../src/effects';
import { createParser } from '../src/nlp/parse';

const parser = createParser(MOVIES);

function query(text: string) {
  const result = parser.parse(text);
  const effects = mergeEffects([], result.effects, 'replace');
  return { result, effects, q: buildQuery(effects) };
}

function fearLevel(text: string) {
  return query(text).effects.find((e): e is Extract<Effect, { kind: 'dim' }> => e.kind === 'dim' && e.dim === 'fear')?.level;
}

describe('parser – the examples from the brief', () => {
  it('"scary, but not too much" asks for moderate fear', () => {
    expect(query('I want something scary but not too much').q.dims.fear).toMatchObject({ target: 5, max: 6.5 });
  });

  it('keeps "not too" when a dealbreaker follows in the next clause', () => {
    const { q } = query('Something scary, but not too scary, no sad ending');
    expect(q.dims.fear).toMatchObject({ target: 5, max: 6.5 });
    expect(q.dealbreakers.noSadEnding).toBe(true);
  });

  it('"mind-bending like The Thing or Black Swan" picks up both references and the wish', () => {
    const { q } = query('Something mind-bending like The Thing or Black Swan');
    expect(q.like).toEqual(['the-thing-1982', 'black-swan-2010']);
    expect(q.dims.mindbend?.target).toBeGreaterThanOrEqual(7);
  });

  it('"I don\'t want films with a sad ending" switches on the sad-ending filter as a refinement', () => {
    const { q, result } = query("Pick me a movie, I don't want films with a sad ending");
    expect(q.dealbreakers.noSadEnding).toBe(true);
    expect(result.mode).toBe('refine');
  });
});

describe('parser – modifiers', () => {
  it.each([
    ['not too scary', 'mid'],
    ['nothing too scary', 'mid'],
    ['kind of scary', 'mid'],
    ['a little scary', 'low'],
    ['very scary', 'max'],
    ['the scariest film you have', 'max'],
    ['not scary at all', 'none'],
    ["I don't want anything scary", 'none'],
    ['scary, but not too much', 'mid'],
  ])('%s → fear %s', (text, level) => {
    expect(fearLevel(text)).toBe(level);
  });

  it('keeps an explicit qualifier when a genre word repeats the dimension', () => {
    const { q } = query('a not too scary horror');
    expect(q.dims.fear?.target).toBe(5);
    expect(q.genres.include).toContain('horror');
  });

  it('does not read "I\'d love something funny" as a request for romance', () => {
    const { q } = query("I'd love something funny");
    expect(q.dims.romance).toBeUndefined();
    expect(q.dims.humor).toBeDefined();
  });

  it('does not stretch a bare negation backwards', () => {
    const { q } = query('animation, but not for kids');
    expect(q.dealbreakers.animation).toBe('only');
    expect(q.dealbreakers.familyFriendly).toBeUndefined();
  });

  it('treats comparatives as refinements', () => {
    const { result } = query('less scary');
    expect(result.mode).toBe('refine');
    expect(result.effects[0]).toMatchObject({ kind: 'dimDelta', dim: 'fear' });
    const merged = mergeEffects([{ kind: 'dim', dim: 'fear', constraint: { target: 7.5, min: 5.5 } }], result.effects, 'refine');
    expect(merged[0]).toMatchObject({ kind: 'dim', dim: 'fear', constraint: { target: 5 } });
    expect(query('even scarier').result.effects[0]).toMatchObject({ kind: 'dimDelta', dim: 'fear', delta: 3.5 });
    expect(query('make it shorter').q.dealbreakers.maxRuntime).toBe(110);
  });
});

describe('parser – dealbreakers, length and era', () => {
  it.each([
    ['no gore please', 'noGore'],
    ['nothing too violent', 'noGore'],
    ['no jump scares', 'noJumpscares'],
    ["the dog doesn't die", 'noAnimalDeath'],
    ['no animal deaths', 'noAnimalDeath'],
    ['something to watch with the kids', 'familyFriendly'],
    ['with a happy ending', 'happyOnly'],
    ['nobody dies', 'noSadEnding'],
  ] as const)('%s → %s', (text, key) => {
    expect(query(text).q.dealbreakers[key]).toBe(true);
  });

  it.each([
    ['under 2 hours', 120],
    ['less than 90 minutes', 90],
    ['an hour and a half max', 90],
    ['up to two hours', 120],
  ])('%s → at most %i minutes', (text, minutes) => {
    expect(query(text).q.dealbreakers.maxRuntime).toBe(minutes);
  });

  it('understands decades and year ranges', () => {
    expect(query('something from the 80s').q.dealbreakers).toMatchObject({ minYear: 1980, maxYear: 1989 });
    expect(query('the nineties').q.dealbreakers).toMatchObject({ minYear: 1990, maxYear: 1999 });
    expect(query('since 2015').q.dealbreakers).toMatchObject({ minYear: 2015 });
    expect(query('between 1990 and 1999').q.dealbreakers).toMatchObject({ minYear: 1990, maxYear: 1999 });
  });

  it('does not treat "something new" as a release-year filter', () => {
    expect(query('something new and funny').q.dealbreakers.minYear).toBeUndefined();
  });
});

describe('parser – references, moods and keywords', () => {
  it('matches titles, short forms and aliases', () => {
    expect(query('like Interstellar').q.like).toEqual(['interstellar-2014']);
    expect(query('like spirited away').q.like).toEqual(['spirited-away-2001']);
    expect(query('like Harry Potter').q.like).toEqual(['harry-potter-azkaban-2004']);
    expect(query('like Up').q.like).toEqual(['up-2009']);
  });

  it('does not mistake everyday phrases for titles', () => {
    expect(query("I'm home alone tonight").q.like).toEqual([]);
    expect(query("I'd like up to two hours").q.like).toEqual([]);
    expect(query('I like dark movies').q.like).toEqual([]);
    expect(query('it is about time').q.like).toEqual([]);
  });

  it('detects the viewer having a bad day and lifts the mood instead of matching sadness', () => {
    const { result, q } = query('had a bad day, cheer me up');
    expect(result.moods).toContain('Bad day');
    expect(q.dims.sadness?.max).toBeLessThanOrEqual(5);
    expect(q.dims.humor?.target).toBeGreaterThanOrEqual(6);
  });

  it('falls back to a keyword search through the blurbs', () => {
    expect(query('a movie with a shark').q.boostIds).toContain('jaws-1975');
    expect(query('something with dinosaurs').q.boostIds).toContain('jurassic-park-1993');
  });

  it('recognises directors by surname', () => {
    expect(query("something like Nolan's films").q.boostIds).toEqual(expect.arrayContaining(['inception-2010', 'memento-2000', 'interstellar-2014']));
  });

  it('reports when it understood nothing', () => {
    expect(parser.parse('qwrtz plmkj').understood).toBe(false);
  });
});

describe('parser – Bulgarian input still works', () => {
  it('understands the original brief in Bulgarian', () => {
    const { q } = query('Нещо страшно, но не прекалено, без тъжен край');
    expect(q.dims.fear).toMatchObject({ target: 5, max: 6.5 });
    expect(q.dealbreakers.noSadEnding).toBe(true);
  });

  it('matches Bulgarian release titles', () => {
    expect(query('нещо объркващо като The Thing или Черният лебед').q.like).toEqual(['the-thing-1982', 'black-swan-2010']);
  });

  it('handles moods, comparatives and runtime', () => {
    expect(query('кофти ден съм').result.moods).toContain('Bad day');
    expect(query('по-малко страшно').result.mode).toBe('refine');
    expect(query('с децата, до 2 часа').q.dealbreakers).toMatchObject({ familyFriendly: true, maxRuntime: 120 });
  });
});
