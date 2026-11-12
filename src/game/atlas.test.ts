import { describe, expect, it } from 'vitest';
import { ATLAS_SITES, atlasNeighbours, atlasObjective, atlasPack, charted } from './atlas';
import { newRun, transition, type Run } from './engine';
import { advanceSave, decodeSave, emptySave, validRun } from './storage';
import { campaignAction } from '../../tests/player';

export function pathTo(run: Run, to: string): string[] {
  const queue: string[][] = [[run.atlas!.position]];
  const seen = new Set(queue[0]);
  while (queue.length) {
    const path = queue.shift()!,
      last = path.at(-1)!;
    if (last === to) return path.slice(1);
    for (const e of atlasPack.edges) {
      const next = e.a === last ? e.b : e.b === last ? e.a : null;
      if (next && !seen.has(next)) {
        seen.add(next);
        queue.push([...path, next]);
      }
    }
  }
  throw new Error(`No route to ${to}`);
}
function walk(run: Run, to: string) {
  for (const id of pathTo(run, to)) run = transition(run, { type: 'atlas-move', to: id });
  return run;
}

describe('Lost Atlas expedition', () => {
  it('makes every authored landmark reachable on real, connected road geometry', () => {
    const run = newRun('warden', 123, true);
    for (const site of ATLAS_SITES) {
      const reached = walk(run, site.id);
      expect(reached.atlas!.position).toBe(site.id);
      expect(validRun(reached)).toBe(true);
    }
    for (const edge of atlasPack.edges) {
      expect(edge.metres).toBeGreaterThan(0);
      expect(edge.points[0]).toEqual(atlasPack.points[edge.a]);
      expect(edge.points.at(-1)).toEqual(atlasPack.points[edge.b]);
    }
  });
  it('rejects teleporting, premature encounters, repeat income and movement during combat', () => {
    let r = newRun('warden', 123, true);
    expect(transition(r, { type: 'atlas-move', to: 'bell3' })).toBe(r);
    expect(transition(r, { type: 'travel', lane: 0 })).toBe(r);
    const future = walk(r, 'bell1');
    expect(transition(future, { type: 'travel', lane: 1 })).toBe(future);
    r = walk(r, 'watch');
    r = transition(r, { type: 'travel', lane: 0 });
    expect(transition(r, { type: 'atlas-move', to: 'origin' })).toBe(r);
    expect(transition(r, { type: 'atlas-name', name: 'Monaco' })).toBe(r);
    expect(transition(r, { type: 'atlas-collect' })).toBe(r);
    const free = walk({ ...r, phase: 'map', waylights: ['well', 'kiln'], health: 1 }, 'cache');
    expect(free.health).toBe(1);
    expect(free.coins).toBe(r.coins);
    const gift = transition(free, { type: 'atlas-collect' });
    expect(gift.coins).toBe(free.coins + 18);
    expect(transition(gift, { type: 'atlas-collect' })).toBe(gift);
  });
  it('keeps fog and recognition across journals; wrong guesses wait for the next bell', () => {
    let r = newRun('seer', 123, true);
    expect(charted(r.atlas!, 'bell3')).toBe(false);
    r = transition(r, { type: 'atlas-name', name: 'Venice' });
    expect(r.attack).toBe(6);
    expect(transition(r, { type: 'atlas-name', name: 'Monaco' })).toBe(r);
    r = transition({ ...r, bells: 1 }, { type: 'atlas-name', name: 'Monte-Carlo' });
    expect(r.attack).toBe(8);
    expect(r.atlas!.recognized).toBe(true);
    expect(charted(r.atlas!, 'haven')).toBe(true);
    expect(transition(r, { type: 'atlas-name', name: 'Monaco' })).toBe(r);
    r = walk(r, 'haven');
    const collected = transition(r, { type: 'atlas-collect' });
    expect(collected.attack).toBe(9);
    expect(decodeSave(JSON.stringify(advanceSave(emptySave(), collected)))?.run).toEqual(collected);
    const broken = structuredClone(collected);
    broken.atlas!.roads = [999];
    expect(validRun(broken)).toBe(false);
    expect(
      decodeSave(
        JSON.stringify({
          version: 2,
          profile: emptySave().profile,
          run: { ...collected, atlas: { ...collected.atlas, visited: ['unknown'] } },
        }),
      ),
    ).toBeNull();
  });
  it.each(['warden', 'seer', 'wayfarer'] as const)(
    '%s can finish all twelve encounters without recognizing the geography',
    (keeper) => {
      let r = newRun(keeper, 123, true),
        moves = 0;
      while (!['won', 'lost'].includes(r.phase) && moves++ < 240) {
        if (r.phase === 'map') r = walk(r, atlasObjective(r)!.id);
        r = transition(r, campaignAction(r));
        expect(validRun(r)).toBe(true);
        expect(decodeSave(JSON.stringify(advanceSave(emptySave(), r)))?.run).toEqual(r);
      }
      expect(r.phase).toBe('won');
      expect(r.bells).toBe(3);
      expect(r.path).toHaveLength(12);
      expect(r.atlas!.recognized).toBe(false);
      expect(r.talents).toHaveLength(2);
    },
  );
});
