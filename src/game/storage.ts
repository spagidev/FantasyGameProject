import { validAtlas } from './atlas';
import { KEEPERS, LORE, RELICS, TALENTS, WAYLIGHTS, type KeeperId } from './data';
import type { Run } from './engine';

export const SAVE_KEY = 'emberwake.save.v2';
export const LEGACY_SAVE_KEY = 'emberwake.save.v1';
export const MAX_SAVE_BYTES = 2 * 1024 * 1024;
export type Profile = { runs: number; wins: number; lore: string[]; lastKeeper: KeeperId };
export type Save = { version: 2; run: Run | null; profile: Profile };
export function emptySave(): Save {
  return {
    version: 2,
    run: null,
    profile: { runs: 0, wins: 0, lore: ['beginning'], lastKeeper: 'warden' },
  };
}

const record = (x: unknown): x is Record<string, unknown> =>
  typeof x === 'object' && x !== null && !Array.isArray(x);
const integer = (x: unknown, min: number, max = 100000): x is number =>
  typeof x === 'number' && Number.isInteger(x) && x >= min && x <= max;
const strings = (x: unknown, max = 100): x is string[] =>
  Array.isArray(x) && x.length <= max && x.every((s) => typeof s === 'string' && s.length <= 500);
const knownLore = (x: unknown): x is string[] =>
  strings(x) && x.every((id) => LORE.some((l) => l.id === id));

export function validRun(x: unknown): x is Run {
  if (
    !record(x) ||
    x.version !== 2 ||
    (x.ruleset !== 1 && x.ruleset !== 2) ||
    typeof x.keeper !== 'string' ||
    !Object.hasOwn(KEEPERS, x.keeper)
  )
    return false;
  if (
    ![
      'map',
      'combat',
      'reward',
      'talent',
      'event',
      'camp',
      'shop',
      'ending',
      'won',
      'lost',
    ].includes(String(x.phase))
  )
    return false;
  if (!integer(x.seed, 0, 0xffffffff) || !integer(x.depth, -1, 11) || !integer(x.lane, 0, 2))
    return false;
  if (
    !integer(x.maxHealth, 1, 1000) ||
    !integer(x.health, 0, x.maxHealth) ||
    !integer(x.attack, 1, 1000) ||
    !integer(x.armor, 0, 1000)
  )
    return false;
  if (
    !integer(x.coins, 0) ||
    !integer(x.flasks, 0, 5) ||
    !integer(x.focus, 0, 5) ||
    !integer(x.guard, 0, 1000) ||
    !integer(x.turn, 0) ||
    !integer(x.bells, 0, 3)
  )
    return false;
  for (const key of ['relics', 'rewards']) {
    if (
      !strings(x[key], 6) ||
      !x[key].every((id) => Object.hasOwn(RELICS, id)) ||
      new Set(x[key]).size !== x[key].length
    )
      return false;
  }
  if (!strings(x.waylights, 3) || !x.waylights.every((id) => Object.hasOwn(WAYLIGHTS, id)))
    return false;
  if (
    !strings(x.talents, 2) ||
    new Set(x.talents).size !== x.talents.length ||
    !x.talents.every(
      (id) => Object.hasOwn(TALENTS, id) && TALENTS[id as keyof typeof TALENTS].keeper === x.keeper,
    )
  )
    return false;
  if (
    x.atlas !== undefined &&
    (!validAtlas(x.atlas) ||
      x.ruleset !== 2 ||
      x.atlas.attempts.some((g) => g.bell > (x.bells as number)))
  )
    return false;
  if (x.ruleset === 1 && (x.waylights.length || x.talents.length || x.phase === 'talent'))
    return false;
  if (x.talents.length > x.bells) return false;
  if (x.phase === 'talent' && (![3, 7].includes(x.depth) || x.talents.length !== x.bells - 1))
    return false;
  if (
    !strings(x.log, 8) ||
    !strings(x.path, 12) ||
    x.path.length !== x.depth + 1 ||
    !knownLore(x.lore) ||
    !strings(x.purchased, 3) ||
    !x.purchased.every((p) => ['flask', 'heal', 'forge'].includes(p))
  )
    return false;
  if (x.ending !== null && x.ending !== 'dawn' && x.ending !== 'hearth') return false;
  if (x.enemy !== null) {
    const e = x.enemy;
    if (
      !record(e) ||
      typeof e.name !== 'string' ||
      e.name.length > 100 ||
      !['wraith', 'stag', 'sentinel', 'king'].includes(String(e.art))
    )
      return false;
    if (
      !integer(e.maxHealth, 1, 1000) ||
      !integer(e.health, 0, e.maxHealth) ||
      !integer(e.guard, 0, 10000) ||
      !integer(e.poison, 0, 10000)
    )
      return false;
    if (
      !Array.isArray(e.pattern) ||
      e.pattern.length < 1 ||
      e.pattern.length > 10 ||
      !e.pattern.every(
        (i) =>
          record(i) &&
          typeof i.name === 'string' &&
          i.name.length <= 100 &&
          integer(i.damage, 0, 1000) &&
          ['guard', 'heal', 'drain'].every((k) => i[k] === undefined || integer(i[k], 0, 1000)),
      )
    )
      return false;
  }
  if (x.phase === 'combat' && (!record(x.enemy) || x.enemy.health === 0 || x.health === 0))
    return false;
  if (x.phase === 'lost' ? x.health !== 0 : x.health === 0) return false;
  if (x.phase !== 'map' && x.depth < 0) return false;
  if (x.phase === 'map' && x.depth === 11) return false;
  if ((x.phase === 'won' || x.phase === 'ending') && (x.depth !== 11 || x.bells !== 3))
    return false;
  if (x.phase === 'won' && x.ending === null) return false;
  if (x.phase === 'event' && x.depth % 4 !== 1) return false;
  if (['camp', 'shop'].includes(String(x.phase)) && x.depth % 4 !== 2) return false;
  return true;
}

export function decodeSave(raw: string): Save | null {
  if (raw.length > MAX_SAVE_BYTES) return null;
  try {
    let x: unknown = JSON.parse(raw);
    if (record(x) && x.version === 1) {
      if (x.run !== null && (!record(x.run) || x.run.version !== 1)) return null;
      x = {
        ...x,
        version: 2,
        run:
          x.run === null
            ? null
            : {
                ...(x.run as Record<string, unknown>),
                version: 2,
                ruleset: 1,
                waylights: [],
                talents: [],
              },
      };
    }
    if (!record(x) || x.version !== 2 || (x.run !== null && !validRun(x.run)) || !record(x.profile))
      return null;
    const p = x.profile;
    if (
      !integer(p.runs, 0) ||
      !integer(p.wins, 0) ||
      p.wins > p.runs ||
      !knownLore(p.lore) ||
      typeof p.lastKeeper !== 'string' ||
      !Object.hasOwn(KEEPERS, p.lastKeeper)
    )
      return null;
    return x as Save;
  } catch {
    return null;
  }
}

export function advanceSave(save: Save, run: Run): Save {
  const terminal = run.phase === 'won' || run.phase === 'lost';
  const alreadyTerminal = save.run?.phase === 'won' || save.run?.phase === 'lost';
  return {
    version: 2,
    run,
    profile: {
      runs: save.profile.runs + (terminal && !alreadyTerminal ? 1 : 0),
      wins: save.profile.wins + (run.phase === 'won' && !alreadyTerminal ? 1 : 0),
      lastKeeper: run.keeper,
      lore: [...new Set([...save.profile.lore, ...run.lore])],
    },
  };
}
