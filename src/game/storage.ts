import { TROVES, atlasSites, encounterState, validAtlas } from './atlas';
import { FOES } from './bestiary';
import { KEEPERS, LORE, NEW_TALENTS, RELICS, TALENTS, WAYLIGHTS, type KeeperId } from './data';
import { DUSK_MAX, nodeOf, type Run } from './engine';
import { advanceMeta, emptyMeta, sanitizeMeta, type Meta } from './meta';

export const SAVE_KEY = 'emberwake.save.v2';
export const LEGACY_SAVE_KEY = 'emberwake.save.v1';
export const MAX_SAVE_BYTES = 2 * 1024 * 1024;
export type Profile = {
  runs: number;
  wins: number;
  lore: string[];
  lastKeeper: KeeperId;
  /** Records, deeds and unlocks. Journals written before v0.7 do not carry it. */
  meta?: Meta;
};
export const metaOf = (profile: Profile): Meta => profile.meta ?? emptyMeta();
export type Save = { version: 2; run: Run | null; profile: Profile };
export function emptySave(): Save {
  return {
    version: 2,
    run: null,
    profile: { runs: 0, wins: 0, lore: ['beginning'], lastKeeper: 'warden', meta: emptyMeta() },
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
    (x.ruleset !== 1 && x.ruleset !== 2 && x.ruleset !== 3) ||
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
  const v3 = x.ruleset === 3;
  const freeAtlas = record(x.atlas) && x.atlas.done !== undefined;
  const relicIds = (v: unknown, max: number): v is string[] =>
    strings(v, max) && v.every((id) => Object.hasOwn(RELICS, id)) && new Set(v).size === v.length;
  for (const key of ['relics', 'rewards']) {
    if (
      !strings(x[key], v3 ? Object.keys(RELICS).length : 6) ||
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
      (id) =>
        Object.hasOwn(TALENTS, id) &&
        TALENTS[id as keyof typeof TALENTS].keeper === x.keeper &&
        (v3 || !(NEW_TALENTS as string[]).includes(id)),
    )
  )
    return false;
  if (v3) {
    const s = x.stats;
    if (
      !integer(x.dusk, 0, DUSK_MAX) ||
      !relicIds(x.pool, Object.keys(RELICS).length) ||
      !relicIds(x.shop, 3) ||
      !integer(x.weak, 0, 99) ||
      !integer(x.frost, 0, 999) ||
      typeof x.charge !== 'boolean' ||
      !integer(x.strikes, 0) ||
      !strings(x.spent, 4) ||
      !x.spent.every((id) => id === 'cinder') ||
      !strings(x.slain, 12) ||
      !x.slain.every((id) => Object.hasOwn(FOES, id)) ||
      !record(s) ||
      !['turns', 'staggers', 'parries', 'taken', 'elites', 'flasks', 'bestHit'].every((k) =>
        integer(s[k], 0, 1000000),
      ) ||
      (x.daily !== undefined &&
        (typeof x.daily !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(x.daily)))
    )
      return false;
  }
  if (
    x.atlas !== undefined &&
    (!validAtlas(x.atlas) ||
      x.ruleset === 1 ||
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
    (!freeAtlas && x.path.length !== x.depth + 1) ||
    !knownLore(x.lore) ||
    !strings(x.purchased, v3 ? 6 : 3) ||
    !x.purchased.every(
      (p) => ['flask', 'heal', 'forge'].includes(p) || (v3 && Object.hasOwn(RELICS, p)),
    )
  )
    return false;
  if (freeAtlas && !validFreeOrder(x as unknown as Run)) return false;
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
    const validPattern = (pattern: unknown[]) =>
      pattern.length >= 1 &&
      pattern.length <= 10 &&
      pattern.every(
        (i) =>
          record(i) &&
          typeof i.name === 'string' &&
          i.name.length <= 100 &&
          integer(i.damage, 0, 1000) &&
          ['guard', 'heal', 'drain', 'hits', 'fury', 'weak', 'frost'].every(
            (k) => i[k] === undefined || integer(i[k], 0, 1000),
          ),
      );
    if (!Array.isArray(e.pattern) || !validPattern(e.pattern)) return false;
    if (v3) {
      const t = e.traits;
      const p2 = e.phase2;
      if (
        typeof e.id !== 'string' ||
        !Object.hasOwn(FOES, e.id) ||
        !integer(e.tint, 0, 360) ||
        !integer(e.step, 0) ||
        !integer(e.maxPoise, 1, 100000) ||
        !integer(e.poise, 0, e.maxPoise) ||
        !integer(e.stagger, 0, 2) ||
        !integer(e.fury, 0, 1000) ||
        (e.phase !== 1 && e.phase !== 2) ||
        (t !== undefined &&
          (!record(t) ||
            !Object.entries(t).every(
              ([k, v]) => ['thorns', 'regen', 'plated'].includes(k) && integer(v, 1, 100),
            ))) ||
        (p2 !== undefined &&
          (!record(p2) ||
            typeof p2.name !== 'string' ||
            p2.name.length > 100 ||
            !Array.isArray(p2.pattern) ||
            !validPattern(p2.pattern)))
      )
        return false;
    }
  }
  if (x.phase === 'combat' && (!record(x.enemy) || x.enemy.health === 0 || x.health === 0))
    return false;
  if (x.phase === 'lost' ? x.health !== 0 : x.health === 0) return false;
  if (x.phase !== 'map' && x.depth < 0 && x.side === undefined) return false;
  if (x.phase === 'map' && x.depth === 11) return false;
  if ((x.phase === 'won' || x.phase === 'ending') && (x.depth !== 11 || x.bells !== 3))
    return false;
  if (x.phase === 'won' && x.ending === null) return false;
  if (v3) {
    const kind = x.depth >= 0 ? nodeOf(x as unknown as Run).kind : null;
    if (['event', 'camp', 'shop'].includes(String(x.phase)) && kind !== x.phase) return false;
    if (x.side !== undefined) {
      if (
        typeof x.side !== 'string' ||
        !(TROVES as readonly string[]).includes(x.side) ||
        !record(x.atlas) ||
        x.atlas.done === undefined ||
        !['combat', 'reward', 'lost'].includes(String(x.phase)) ||
        (x.phase === 'reward') !== (x.atlas.collected as string[]).includes(x.side)
      )
        return false;
    } else if (x.phase === 'combat' && !['battle', 'elite', 'boss'].includes(String(kind)))
      return false;
  } else {
    if (x.phase === 'event' && x.depth % 4 !== 1) return false;
    if (['camp', 'shop'].includes(String(x.phase)) && x.depth % 4 !== 2) return false;
  }
  return true;
}

/**
 * A free-order chart's entered sites must replay as a legal sequence: each one open when it
 * was entered, path and position agreeing with it, bells matching the guardians beaten.
 */
function validFreeOrder(run: Run): boolean {
  const a = run.atlas!;
  const done = a.done!;
  if (run.path.length !== done.length) return false;
  let bells = 0;
  const replay: Run = { ...run, atlas: { ...a, done: [] }, bells: 0 };
  for (let i = 0; i < done.length; i++) {
    const site = atlasSites(a).find((s) => s.id === done[i]);
    if (!site || site.depth === undefined) return false;
    replay.bells = bells;
    if (encounterState(replay, site) !== 'open') return false;
    if (run.path[i] !== `${site.depth}-${site.lane}`) return false;
    replay.atlas!.done = done.slice(0, i + 1);
    // A guardian already left behind has rung its bell.
    if (site.depth % 4 === 3 && i < done.length - 1) bells++;
  }
  const last = done.length ? atlasSites(a).find((s) => s.id === done.at(-1))! : null;
  if (last ? run.depth !== last.depth || run.lane !== last.lane : run.depth !== -1) return false;
  // The last entered may be a guardian whose bell has rung (after victory) or not (in combat).
  return (
    run.bells === bells ||
    (last?.depth !== undefined && last.depth % 4 === 3 && run.bells === bells + 1)
  );
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
    return { ...x, profile: { ...p, meta: sanitizeMeta(p.meta) } } as Save;
  } catch {
    return null;
  }
}

export function advanceSave(save: Save, run: Run): Save {
  const terminal = run.phase === 'won' || run.phase === 'lost';
  const alreadyTerminal = save.run?.phase === 'won' || save.run?.phase === 'lost';
  const finished = terminal && !alreadyTerminal;
  const lore = [...new Set([...save.profile.lore, ...run.lore])];
  // Only the same expedition's previous step counts as "before".
  const before = save.run && save.run.seed === run.seed ? save.run : null;
  return {
    version: 2,
    run,
    profile: {
      runs: save.profile.runs + (finished ? 1 : 0),
      wins: save.profile.wins + (finished && run.phase === 'won' ? 1 : 0),
      lastKeeper: run.keeper,
      lore,
      meta: advanceMeta(metaOf(save.profile), run, lore, before, finished),
    },
  };
}
