import { describe, expect, it } from 'vitest';
import { RELICS, RELIC_SETS, setOf, type RelicId, type SetId } from './data';
import { hasSet, makeEnemy, newRun, nodeOf, transition, type Run } from './engine';

const ALL = Object.keys(RELICS) as RelicId[];
function fight(relics: RelicId[], patch: Partial<Run> = {}): Run {
  const base = newRun('wayfarer', 123, false, { pool: ALL });
  return {
    ...base,
    relics,
    phase: 'combat',
    depth: 0,
    lane: 0,
    path: ['0-0'],
    focus: 5,
    enemy: {
      ...makeEnemy({ ...nodeOf(base, 0, 0), kind: 'battle', foe: 'watcher' }, 3),
      health: 200,
      maxHealth: 200,
    },
    ...patch,
  };
}

describe('relic sets', () => {
  it('four sets of three distinct existing relics, none shared between sets', () => {
    const members = Object.values(RELIC_SETS).flatMap((s) => s.relics);
    expect(Object.keys(RELIC_SETS)).toHaveLength(4);
    expect(new Set(members).size).toBe(12);
    for (const id of members) expect(RELICS[id]).toBeDefined();
    for (const set of Object.keys(RELIC_SETS) as SetId[])
      for (const id of RELIC_SETS[set].relics) expect(setOf(id)).toBe(set);
    expect(setOf('dawn')).toBeUndefined();
  });
  it('a set counts only when all three are carried, and only in ruleset 3', () => {
    expect(hasSet(fight(['clapper', 'chime']), 'kit')).toBe(false);
    expect(hasSet(fight(['clapper', 'chime', 'echo']), 'kit')).toBe(true);
    expect(hasSet({ relics: ['briar', 'censer', 'gravebloom'], ruleset: 2 }, 'garden')).toBe(false);
  });
  it('the bell-ringer’s kit: a stagger gives 1 more focus', () => {
    const poised = (relics: RelicId[]) => {
      const r = fight(relics, { focus: 0 });
      r.enemy = { ...r.enemy!, poise: 1 };
      return transition(r, { type: 'strike' });
    };
    const two = poised(['clapper', 'chime']);
    const three = poised(['clapper', 'chime', 'echo']);
    expect(two.stats!.staggers).toBe(1);
    expect(three.focus - two.focus).toBe(1);
  });
  it('the long watch: a perfect guard restores 2 health', () => {
    const guard = (relics: RelicId[]) => {
      const r = fight(relics, { health: 20 });
      r.enemy = { ...r.enemy!, pattern: [{ name: 'Jab', damage: 5 }] };
      return transition(r, { type: 'guard' });
    };
    expect(guard(['buckle', 'psalm', 'mirror']).health - guard(['buckle', 'psalm']).health).toBe(2);
  });
  it('the night garden: poison fades only every second turn', () => {
    const tick = (relics: RelicId[], turn: number) => {
      const r = fight(relics, { turn });
      r.enemy = { ...r.enemy!, poison: 6, pattern: [{ name: 'Wait', damage: 0, guard: 0 }] };
      return transition(r, { type: 'guard' }).enemy!.poison;
    };
    const garden: RelicId[] = ['censer', 'gravebloom', 'briar'];
    expect(tick(garden, 0)).toBe(6 + 2); // censer adds 2, nothing fades on an even turn
    expect(tick(garden, 1)).toBe(6 + 2 - 1);
    expect(tick(['censer', 'gravebloom'], 0)).toBe(6 + 2 - 1);
  });
  it('the pilgrim’s purse: each trader visit gives a flask', () => {
    for (let seed = 1; seed < 60; seed++) {
      const r = {
        ...newRun('warden', seed, false, { pool: ALL }),
        depth: 1,
        lane: 1,
        path: ['0-1', '1-1'],
      };
      const shop = [0, 1, 2].find((lane) => nodeOf(r, 2, lane).kind === 'shop');
      if (shop === undefined || Math.abs(shop - 1) > 1) continue;
      const enter = (relics: RelicId[]) =>
        transition({ ...r, relics, flasks: 2 }, { type: 'travel', lane: shop });
      expect(enter(['ferrycoin', 'scale', 'thread']).flasks).toBe(3);
      expect(enter(['ferrycoin', 'scale']).flasks).toBe(2);
      expect(enter(['ferrycoin', 'scale', 'thread']).phase).toBe('shop');
      return;
    }
    throw new Error('no seed places a reachable trader');
  });
});
