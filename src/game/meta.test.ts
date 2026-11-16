import { describe, expect, it } from 'vitest';
import { campaignAction } from '../../tests/player';
import { RELICS, STARTING_RELICS, type RelicId } from './data';
import { newRun, transition, type Run } from './engine';
import {
  DEEDS,
  HISTORY_LENGTH,
  dailyRoad,
  duskUnlocked,
  emptyMeta,
  sanitizeMeta,
  scoreOf,
  unlockedRelics,
} from './meta';
import { advanceSave, decodeSave, emptySave, metaOf, type Save } from './storage';

function finish(save: Save, run: Run): Save {
  let r = run,
    s = save,
    steps = 0;
  while (!['won', 'lost'].includes(r.phase) && steps++ < 700) {
    r = transition(r, campaignAction(r));
    s = advanceSave(s, r);
  }
  return s;
}
const stats = (patch: Partial<NonNullable<Run['stats']>>) => ({
  turns: 0,
  staggers: 0,
  parries: 0,
  taken: 0,
  elites: 0,
  flasks: 0,
  bestHit: 0,
  ...patch,
});

describe('score', () => {
  it('adds every listed line and multiplies by the dusk level', () => {
    const run: Run = {
      ...newRun('warden', 1, false, { dusk: 2 }),
      phase: 'won',
      depth: 11,
      bells: 3,
      health: 20,
      ending: 'dawn',
      stats: stats({ elites: 2, staggers: 10, parries: 4 }),
    };
    const score = scoreOf(run);
    expect(score.lines.reduce((n, l) => n + l.value, 0)).toBe(120 + 450 + 80 + 50 + 12 + 300 + 40);
    expect(score.multiplier).toBeCloseTo(1.4);
    expect(score.total).toBe(Math.round(1052 * 1.4));
    const fallen = scoreOf({ ...run, phase: 'lost', depth: 5, bells: 1, health: 0, dusk: 0 });
    expect(fallen.total).toBe(50 + 150 + 80 + 50 + 12);
  });
});

describe('records, deeds and unlocks', () => {
  it('a finished expedition is recorded once, with best score, streak and the next dusk', () => {
    const first = finish(emptySave(), newRun('warden', 8128));
    const meta = metaOf(first.profile);
    expect(first.run!.phase).toBe('won');
    expect(first.profile).toMatchObject({ runs: 1, wins: 1 });
    expect(meta.history).toHaveLength(1);
    expect(meta.history[0]).toMatchObject({ keeper: 'warden', won: true, bells: 3, crossed: 12 });
    expect(meta.best.warden).toBe(scoreOf(first.run!).total);
    expect(meta.streak).toBe(1);
    expect(duskUnlocked(meta, 'warden')).toBe(1);
    expect(duskUnlocked(meta, 'seer')).toBe(0);
    expect(meta.foes.length).toBeGreaterThanOrEqual(6);
    expect(meta.relics.length).toBeGreaterThan(0);
    expect(meta.deeds).toEqual(expect.arrayContaining(['first-bell', 'first-dawn', 'warden-win']));
    expect(advanceSave(first, first.run!).profile).toEqual(first.profile);
    // The deeds just earned widen the next expedition's relic pool, and nothing else.
    const pool = unlockedRelics(meta);
    expect(pool).toEqual(expect.arrayContaining(['buckle', 'lodestar', 'mirror']));
    expect(pool).not.toContain('idol'); // needs both endings
    expect(STARTING_RELICS.every((id) => pool.includes(id))).toBe(true);
    const again = newRun('warden', 5, false, { pool });
    expect([again.health, again.attack, again.armor, again.coins]).toEqual([48, 7, 2, 35]);
    // A loss ends the streak and never unlocks a deeper night.
    let lost = transition(newRun('seer', 3), { type: 'travel', lane: 0 });
    lost = { ...lost, health: 1 };
    let save = advanceSave(first, lost);
    while (lost.phase === 'combat') {
      lost = transition(lost, { type: 'strike' });
      save = advanceSave(save, lost);
    }
    expect(lost.phase).toBe('lost');
    expect(metaOf(save.profile)).toMatchObject({ streak: 0, bestStreak: 1 });
    expect(metaOf(save.profile).history).toHaveLength(2);
    expect(duskUnlocked(metaOf(save.profile), 'seer')).toBe(0);
  });
  it('a dusk level only unlocks the one above the deepest already open', () => {
    const base = { ...emptySave() };
    base.profile.meta = { ...emptyMeta(), dusk: { warden: 3 } };
    const shallow: Run = {
      ...newRun('warden', 1, false, { dusk: 1 }),
      phase: 'won',
      depth: 11,
      bells: 3,
      ending: 'dawn',
    };
    expect(duskUnlocked(metaOf(advanceSave(base, shallow).profile), 'warden')).toBe(3);
    const deep = { ...shallow, dusk: 3 };
    expect(duskUnlocked(metaOf(advanceSave(base, deep).profile), 'warden')).toBe(4);
    const deepest = { ...shallow, dusk: 8 };
    base.profile.meta = { ...emptyMeta(), dusk: { warden: 8 } };
    expect(duskUnlocked(metaOf(advanceSave(base, deepest).profile), 'warden')).toBe(8);
  });
  it('every deed is reachable in principle and unlocks exactly the locked relics', () => {
    const locked = (Object.keys(RELICS) as RelicId[]).filter((id) => !STARTING_RELICS.includes(id));
    expect(
      DEEDS.map((d) => d.unlocks)
        .filter(Boolean)
        .sort(),
    ).toEqual([...locked].sort());
    expect(new Set(DEEDS.map((d) => d.id)).size).toBe(DEEDS.length);
    const all = { ...emptyMeta(), deeds: DEEDS.map((d) => d.id) };
    expect(unlockedRelics(all)).toHaveLength(Object.keys(RELICS).length);
    const run: Run = {
      ...newRun('warden', 1),
      coins: 150,
      relics: STARTING_RELICS.slice(0, 8),
      stats: stats({ staggers: 15, parries: 12, elites: 4, bestHit: 40 }),
    };
    const earned = metaOf(advanceSave(emptySave(), run).profile).deeds;
    expect(earned.sort()).toEqual(['big-hit', 'breaker', 'collector', 'hoard', 'hunter', 'parry']);
  });
  it('the daily road is the same all day, records a best score and keeps a bounded history', () => {
    const noon = dailyRoad(new Date(2026, 10, 15, 12));
    expect(noon).toEqual(dailyRoad(new Date(2026, 10, 15, 23, 59)));
    expect(noon.id).toBe('2026-11-15');
    expect(dailyRoad(new Date(2026, 10, 16)).seed).not.toBe(noon.seed);
    const run: Run = {
      ...newRun(noon.keeper, noon.seed, false, { daily: noon.id }),
      phase: 'lost',
      depth: 4,
      bells: 1,
      health: 0,
    };
    let save = advanceSave(emptySave(), run);
    expect(metaOf(save.profile).daily).toEqual({ '2026-11-15': scoreOf(run).total });
    for (let i = 0; i < 20; i++) {
      save = advanceSave({ ...save, run: null }, { ...run, seed: i + 1 });
    }
    expect(metaOf(save.profile).history).toHaveLength(HISTORY_LENGTH);
    expect(save.profile.runs).toBe(21);
  });
  it('older journals gain empty records and hostile records are dropped, not fatal', () => {
    const old = JSON.parse(JSON.stringify(emptySave()));
    delete old.profile.meta;
    expect(metaOf(decodeSave(JSON.stringify(old))!.profile)).toEqual(emptyMeta());
    const hostile = {
      best: { warden: -5, seer: 1e99, wayfarer: 12, __proto__: 1 },
      dusk: { warden: 99, seer: 2 },
      deeds: ['first-bell', 'first-bell', 'made-up', 7],
      relics: ['briar', 'nope'],
      foes: ['watcher', 'dragon'],
      history: [{ keeper: 'dragon' }, { keeper: 'seer', score: 'lots', won: 'yes', daily: 'x' }],
      streak: 5,
      bestStreak: 2,
      daily: { '2026-11-15': 40, nonsense: 9, '2026-11-16': -1 },
      sound: 'yes',
    };
    const clean = sanitizeMeta(hostile);
    expect(clean).toEqual({
      best: { wayfarer: 12 },
      dusk: { seer: 2 },
      deeds: ['first-bell'],
      relics: ['briar'],
      foes: ['watcher'],
      history: [
        {
          keeper: 'seer',
          dusk: 0,
          score: 0,
          won: false,
          bells: 0,
          crossed: 0,
          turns: 0,
          atlas: false,
          seed: 0,
        },
      ],
      streak: 5,
      bestStreak: 5,
      daily: { '2026-11-15': 40 },
      sound: false,
    });
    const save = { ...emptySave(), profile: { ...emptySave().profile, meta: hostile } };
    expect(metaOf(decodeSave(JSON.stringify(save))!.profile)).toEqual(clean);
    expect(sanitizeMeta(null)).toEqual(emptyMeta());
  });
});
