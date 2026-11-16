import { describe, expect, it } from 'vitest';
import { en } from './en';
import { sk } from './sk';
import { plural } from './plural';
import { emptyMeta, sanitizeMeta } from '../game/meta';

type Tree = { [key: string]: unknown };
const isTree = (x: unknown): x is Tree => typeof x === 'object' && x !== null;

/** Every leaf of a dictionary as `path → value`. */
function leaves(node: Tree, path = ''): Map<string, unknown> {
  const out = new Map<string, unknown>();
  for (const [key, value] of Object.entries(node)) {
    const here = path ? `${path}.${key}` : key;
    if (isTree(value)) for (const [k, v] of leaves(value, here)) out.set(k, v);
    else out.set(here, value);
  }
  return out;
}

/** Call a text function with plausible numbers, then plausible words. */
function sample(fn: (...args: never[]) => unknown): string {
  const attempts: unknown[][] = [
    [3, 3, 3, 3],
    ['Ab', 'Ab', 'Ab', 'Ab'],
    ['dawn', 2, 'Ab'],
    [true, 2, 'Ab'],
  ];
  for (const args of attempts) {
    try {
      const result = (fn as (...a: unknown[]) => unknown)(...args);
      if (typeof result === 'string') return result;
    } catch {
      /* try the next set */
    }
  }
  throw new Error(`could not call ${fn.toString().slice(0, 60)}`);
}

describe('interface dictionaries', () => {
  const english = leaves(en);
  const slovak = leaves(sk);

  it('sk has exactly the keys of en', () => {
    expect([...slovak.keys()].sort()).toEqual([...english.keys()].sort());
  });

  it('every entry is a non-empty string or a function that returns one', () => {
    for (const [name, dict] of [
      ['en', english],
      ['sk', slovak],
    ] as const) {
      for (const [key, value] of dict) {
        const text = typeof value === 'function' ? sample(value as never) : value;
        expect(typeof text, `${name}.${key}`).toBe('string');
        expect((text as string).trim().length, `${name}.${key}`).toBeGreaterThan(0);
      }
    }
  });

  it('keeps ids and numbers in functions that take them', () => {
    expect(sk.app.encountersCount(4)).toContain('4');
    expect(sk.atlas.roadCount(2)).toBe('2 cesty');
    expect(sk.atlas.roadCount(5)).toBe('5 ciest');
    expect(en.atlas.roadCount(1)).toBe('1 road');
  });
});

describe('plural', () => {
  it('picks the Slovak form for 1, 2–4 and 5+', () => {
    const f = (n: number) => plural(n, 'one', 'few', 'many');
    expect([1, 2, 4, 5, 11, 21].map(f)).toEqual(['one', 'few', 'few', 'many', 'many', 'many']);
    expect([0, 3, 12, 14, 22, 100].map(f)).toEqual(['many', 'few', 'many', 'many', 'many', 'many']);
  });
});

describe('the saved language', () => {
  it('keeps only en or sk; absent means English', () => {
    expect(sanitizeMeta({ lang: 'sk' }).lang).toBe('sk');
    expect(sanitizeMeta({ lang: 'en' }).lang).toBe('en');
    expect(sanitizeMeta({ lang: 'fr' }).lang).toBeUndefined();
    expect(sanitizeMeta({}).lang).toBeUndefined();
    expect(emptyMeta().lang).toBeUndefined();
  });
});
