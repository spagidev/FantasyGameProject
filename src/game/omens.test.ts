import { describe, expect, it } from 'vitest';
import {
  atlasPack,
  atlasSite,
  dayRange,
  REST_HEALING,
  KIND_HEALING,
  atlasNeighbours,
  roadCost,
} from './atlas';
import { newRun, priceOf, startingFocus, transition, type Run } from './engine';
import { OMEN_IDS, OMENS, omenAt, omenOf, type OmenId } from './omens';

/** The first seed whose almanac names this omen on this day. */
function seedFor(omen: OmenId, day: number, avoid?: OmenId): number {
  for (let seed = 1; seed < 5000; seed++)
    if (omenAt(seed, day) === omen && (!avoid || omenAt(seed, day - 3) !== avoid)) return seed;
  throw new Error(`no seed for ${omen}`);
}
/** An Atlas run on a given day. */
function onDay(seed: number, day: number, patch: Partial<Run> = {}): Run {
  const r = newRun('warden', seed, true);
  return { ...r, ...patch, atlas: { ...r.atlas!, day } };
}
/** Enter the open encounter at the watch and return the battle. */
function battle(run: Run): Run {
  const atlas = { ...run.atlas!, position: 'watch' };
  const r = transition(
    { ...run, atlas },
    { type: 'travel', lane: atlasSite('watch', atlas).lane! },
  );
  expect(r.phase).toBe('combat');
  return r;
}
const shopping = (run: Run): Run => ({ ...run, phase: 'shop', depth: 2, coins: 100 });

describe('the almanac', () => {
  it('has no omen on days 1 to 3, and one per three days from day 4', () => {
    for (let seed = 1; seed <= 20; seed++)
      for (const day of [1, 2, 3]) expect(omenAt(seed, day)).toBeNull();
    for (const [a, b] of [
      [4, 6],
      [7, 9],
      [10, 12],
    ] as const) {
      expect(omenAt(77, a)).not.toBeNull();
      expect(omenAt(77, a)).toBe(omenAt(77, a + 1));
      expect(omenAt(77, a)).toBe(omenAt(77, b));
    }
    for (let seed = 1; seed <= 50; seed++) {
      expect(omenAt(seed, 7)).not.toBe(omenAt(seed, 6));
      expect(omenAt(seed, 10)).not.toBe(omenAt(seed, 9));
    }
  });
  it('is deterministic for a seed', () => {
    for (let day = 1; day <= 40; day++) expect(omenAt(4242, day)).toBe(omenAt(4242, day));
  });
  it('never repeats an omen in consecutive periods, and every omen is drawn somewhere', () => {
    const seen = new Set<OmenId>();
    for (let seed = 1; seed <= 50; seed++)
      for (let p = 0; p < 30; p++) {
        const now = omenAt(seed, 4 + p * 3)!;
        seen.add(now);
        if (p) expect(now).not.toBe(omenAt(seed, 4 + (p - 1) * 3));
      }
    expect([...seen].sort()).toEqual([...OMEN_IDS].sort());
  });
  it('is quiet off the Atlas days', () => {
    expect(omenOf(newRun('warden', 5))).toBeNull();
    expect(omenOf(newRun('warden', 5, true, { ruleset: 2 }))).toBeNull();
    expect(omenOf(onDay(seedFor('moth', 4), 3))).toBeNull();
    expect(omenOf(onDay(seedFor('moth', 4), 4))).toBe('moth');
    for (const id of OMEN_IDS) expect(OMENS[id].flavor.length).toBeGreaterThan(10);
  });
});

describe('each omen has one effect', () => {
  it('Moth-light: battles start with 1 extra focus', () => {
    const seed = seedFor('moth', 4);
    expect(startingFocus(onDay(seed, 4))).toBe(startingFocus(onDay(seed, 3)) + 1);
    expect(battle(onDay(seed, 4)).focus).toBe(battle(onDay(seed, 3)).focus + 1);
    expect(
      startingFocus(onDay(seed, 4, { relics: ['vigil'], talents: ['astral'] })),
    ).toBeLessThanOrEqual(5);
    expect(startingFocus(onDay(seedFor('bells', 4), 4))).toBe(startingFocus(onDay(seed, 3)));
  });
  it('Hoarfrost: the keeper begins the battle with 1 frost, unless a sprig prevents it', () => {
    const seed = seedFor('hoarfrost', 4);
    expect(battle(onDay(seed, 4)).frost).toBe(1);
    expect(battle(onDay(seed, 3)).frost ?? 0).toBe(0);
    expect(battle(onDay(seedFor('moth', 4), 4)).frost ?? 0).toBe(0);
    expect(battle(onDay(seed, 4, { relics: ['sprig'] })).frost ?? 0).toBe(0);
  });
  it('Fair days: trader prices are 20% lower, rounded up', () => {
    const seed = seedFor('fair', 4);
    const fair = shopping(onDay(seed, 4));
    const plain = shopping(onDay(seed, 3));
    for (const item of ['flask', 'heal', 'forge'] as const)
      expect(priceOf(fair, item)).toBe(Math.ceil(priceOf(plain, item) * 0.8));
    expect(priceOf(fair, 'forge')).toBe(28);
    expect(priceOf(shopping(onDay(seedFor('moth', 4), 4)), 'forge')).toBe(35);
  });
  it('Long shadows: every road costs 15% more oil, never more than a full day', () => {
    const seed = seedFor('shadows', 4);
    const shadowed = onDay(seed, 4);
    const plain = onDay(seed, 3);
    const range = shadowed.atlas!.range!;
    expect(roadCost(plain, 1000)).toBe(1000);
    expect(roadCost(shadowed, 1000)).toBe(1150);
    expect(roadCost(shadowed, 999)).toBe(Math.ceil(999 * 1.15));
    expect(roadCost(shadowed, range)).toBe(range); // a fresh day still walks the longest road
    expect(roadCost(onDay(seedFor('moth', 4), 4), 1000)).toBe(1000);
    // Walking spends the higher cost.
    const road = atlasNeighbours(shadowed.atlas!)[0];
    const walked = transition(shadowed, { type: 'atlas-move', to: road.id });
    const found = walked.atlas!.oil! - (shadowed.atlas!.oil! - roadCost(shadowed, road.metres));
    expect([0, Math.round(range / 3)]).toContain(found); // an oil flask may lie on the road
    // A road the oil covers plainly can be out of reach under the omen.
    const tight = { ...shadowed, atlas: { ...shadowed.atlas!, oil: road.metres } };
    expect(transition(tight, { type: 'atlas-move', to: road.id })).toBe(tight);
    const loose = { ...plain, atlas: { ...plain.atlas!, oil: road.metres } };
    expect(transition(loose, { type: 'atlas-move', to: road.id })).not.toBe(loose);
  });
  it('Clear bells: perfect guards wear 25% more poise', () => {
    const guarded = (seed: number, day: number) => {
      const r = battle(onDay(seed, day));
      const e = {
        ...r.enemy!,
        pattern: [{ name: 'Jab', damage: 6 }],
        step: 0,
        poise: 99,
        maxPoise: 99,
      };
      const after = transition({ ...r, enemy: e }, { type: 'guard' });
      expect(after.stats!.parries).toBe(1);
      return 99 - after.enemy!.poise!;
    };
    const seed = seedFor('bells', 4);
    const base = guarded(seed, 3);
    expect(base).toBeGreaterThan(0);
    expect(guarded(seed, 4)).toBe(Math.ceil(base * 1.25));
    expect(guarded(seedFor('moth', 4), 4)).toBe(base);
  });
  it('Kind weather: resting restores 12 instead of 8, and only on its days', () => {
    const seed = seedFor('kind', 7);
    // Resting uses the evening's day: day 6 camps into day 7, so the rest is not yet kind.
    const before = transition(onDay(seed, 6, { health: 10 }), { type: 'atlas-camp' });
    expect(before.health).toBe(10 + REST_HEALING);
    const during = transition(onDay(seed, 7, { health: 10 }), { type: 'atlas-camp' });
    expect(during.health).toBe(10 + KIND_HEALING);
    expect(transition(onDay(seed, 9, { health: 10 }), { type: 'atlas-camp' }).health).toBe(
      10 + KIND_HEALING,
    );
    expect(transition(onDay(seed, 10, { health: 10 }), { type: 'atlas-camp' }).health).toBe(
      10 + REST_HEALING,
    );
    expect(transition(onDay(seed, 3, { health: 10 }), { type: 'atlas-camp' }).health).toBe(
      10 + REST_HEALING,
    );
  });
  it('the dawn message announces an omen on the first day of its period only', () => {
    const seed = seedFor('moth', 4);
    const dawn = transition(onDay(seed, 3), { type: 'atlas-camp' });
    expect(dawn.log.at(-1)).toContain('The almanac turns: Moth-light — battles start');
    expect(transition(dawn, { type: 'atlas-camp' }).log.at(-1)).not.toContain('almanac');
  });
});
