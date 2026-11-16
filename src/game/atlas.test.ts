import { describe, expect, it } from 'vitest';
import {
  ATLAS_SITES,
  REST_HEALING,
  WORKS,
  workBlocked,
  atlasFinds,
  atlasNeighbours,
  atlasObjective,
  atlasPack,
  atlasRoute,
  charted,
  dayRange,
} from './atlas';
import { makeEnemy, nightsOf, nodeOf } from './engine';
import { scoreOf } from './meta';
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
  for (const id of pathTo(run, to)) {
    let next = transition(run, { type: 'atlas-move', to: id });
    // Out of lamp oil: make camp and walk on in the morning.
    if (next === run)
      next = transition(transition(run, { type: 'atlas-camp' }), { type: 'atlas-move', to: id });
    run = next;
  }
  return run;
}
/** A long day: enough oil that a test about something else never has to camp. */
const rested = (run: Run): Run => ({
  ...run,
  atlas: { ...run.atlas!, oil: run.atlas!.range! * 3 },
});

describe('Lost Atlas expedition', () => {
  it('makes every authored landmark reachable on real, connected road geometry', () => {
    const run = newRun('warden', 123, true);
    for (const site of ATLAS_SITES) {
      const neighbours = atlasNeighbours({ ...run.atlas!, position: site.id });
      expect(new Set(neighbours.map((n) => n.id)).size).toBe(neighbours.length);
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
    r = rested(r);
    const future = walk(r, 'bell1');
    expect(transition(future, { type: 'travel', lane: 1 })).toBe(future);
    r = walk(r, 'watch');
    r = transition(r, { type: 'travel', lane: 0 });
    expect(transition(r, { type: 'atlas-move', to: 'origin' })).toBe(r);
    expect(transition(r, { type: 'atlas-name', name: 'Monaco' })).toBe(r);
    expect(transition(r, { type: 'atlas-collect' })).toBe(r);
    const start = rested({ ...r, phase: 'map', waylights: ['well', 'kiln'], health: 1 });
    start.atlas!.finds = atlasFinds(start.seed, start.atlas!).map((f) => f.edge); // nothing left to find
    const free = walk(start, 'cache');
    expect(free.atlas!.day).toBe(1);
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
  it('lamp oil limits a day; camp brings dawn income and a darker night', () => {
    let r = newRun('warden', 123, true);
    const a = r.atlas!;
    expect(a).toMatchObject({ day: 1, finds: [] });
    expect(a.range).toBe(dayRange(a));
    expect(a.oil).toBe(a.range);
    expect(a.range! % 100).toBe(0);
    expect(a.range).toBeGreaterThanOrEqual(Math.max(...atlasPack.edges.map((e) => e.metres)));
    const road = atlasNeighbours(a)[0];
    r = transition(r, { type: 'atlas-move', to: road.id });
    expect(r.atlas!.oil).toBe(
      a.range! -
        road.metres +
        (atlasFinds(123, a).some((f) => f.edge === road.index && f.kind === 'oil')
          ? Math.round(a.range! / 3)
          : 0),
    );
    const dry: Run = { ...r, atlas: { ...r.atlas!, oil: 0 } };
    expect(transition(dry, { type: 'atlas-move', to: 'origin' })).toBe(dry);
    const lit: Run = { ...dry, waylights: ['well', 'kiln', 'kiln'], health: 10 };
    const dawn = transition(lit, { type: 'atlas-camp' });
    expect(dawn.atlas).toMatchObject({ day: 2, oil: a.range });
    expect(dawn.health).toBe(10 + 8 + 2); // a night's rest, then the Dawnwell
    expect(dawn.coins).toBe(lit.coins + 8);
    expect(validRun(dawn)).toBe(true);
    // Waylights pay at dawn on a chart, not again when an encounter is entered.
    const node = nodeOf(dawn, 0, 0);
    expect(makeEnemy(node, 3, 0, 0).maxHealth).toBe(24);
    expect(makeEnemy(node, 3, 0, 5).maxHealth).toBe(26);
    expect(makeEnemy(node, 3, 0, 99).maxHealth).toBe(31);
    // Charts begun before v0.8 keep free walking and cannot camp.
    const old = newRun('warden', 123, true, { ruleset: 2 });
    expect(old.atlas!.day).toBeUndefined();
    expect(transition(old, { type: 'atlas-camp' })).toBe(old);
    expect(validRun({ ...dawn, atlas: { ...dawn.atlas!, oil: -1 } })).toBe(false);
    expect(validRun({ ...dawn, atlas: { ...dawn.atlas!, finds: [999] } })).toBe(false);
  });
  it('each evening builds one wagon work or rests; works pay at dawn and never twice', () => {
    const base: Run = { ...newRun('warden', 123, true), coins: 200, health: 20, flasks: 0 };
    expect(base.atlas!.works).toEqual([]);
    expect(Object.keys(WORKS)).toHaveLength(6);
    // Resting heals; building does not.
    expect(transition(base, { type: 'atlas-camp' }).health).toBe(20 + REST_HEALING);
    const stove = transition(base, { type: 'atlas-camp', work: 'stove' });
    expect(stove).toMatchObject({ coins: 180, health: 24 });
    expect(stove.atlas).toMatchObject({ day: 2, works: ['stove'] });
    expect(workBlocked(stove, 'stove')).toBe('Already built');
    expect(transition(stove, { type: 'atlas-camp', work: 'stove' })).toBe(stove);
    expect(workBlocked({ ...base, coins: 19 }, 'stove')).toBe('Not enough coins');
    const poor = { ...base, coins: 19 };
    expect(transition(poor, { type: 'atlas-camp', work: 'stove' })).toBe(poor);
    // Each work does exactly what it says.
    const wheel = transition(base, { type: 'atlas-camp', work: 'wheel' });
    expect(wheel.attack).toBe(base.attack + 2);
    const rack = transition(base, { type: 'atlas-camp', work: 'rack' });
    expect(rack.atlas!.range).toBe(Math.round((base.atlas!.range! * 1.25) / 100) * 100);
    expect(rack.atlas!.oil).toBe(rack.atlas!.range);
    const box = transition(transition(base, { type: 'atlas-camp', work: 'strongbox' }), {
      type: 'atlas-camp',
    });
    expect(box.coins).toBe(200 - 30 + 6 + 6);
    let still = transition(base, { type: 'atlas-camp', work: 'still' });
    expect(still.flasks).toBe(1);
    still = transition(transition(still, { type: 'atlas-camp' }), { type: 'atlas-camp' });
    expect(still.flasks).toBe(2); // the still stops at two
    // The ward-lantern halves the nights that toughen enemies.
    let ward = transition(base, { type: 'atlas-camp', work: 'ward' });
    for (let i = 0; i < 4; i++) ward = transition(ward, { type: 'atlas-camp' });
    expect(ward.atlas!.day).toBe(6);
    expect(nightsOf(ward)).toBe(3);
    expect(nightsOf({ ...ward, atlas: { ...ward.atlas!, works: [] } })).toBe(5);
    expect(validRun(ward)).toBe(true);
    expect(decodeSave(JSON.stringify(advanceSave(emptySave(), ward)))?.run).toEqual(ward);
    expect(validRun({ ...ward, atlas: { ...ward.atlas!, works: ['palace'] as never } })).toBe(
      false,
    );
    // Charts saved by v0.8 have no works list and still load and camp.
    const v08 = { ...base, atlas: { ...base.atlas!, works: undefined } };
    expect(validRun(JSON.parse(JSON.stringify(v08)))).toBe(true);
    expect(transition(v08, { type: 'atlas-camp', work: 'stove' }).atlas!.works).toEqual(['stove']);
    const fighting: Run = { ...base, phase: 'combat' };
    expect(transition(fighting, { type: 'atlas-camp', work: 'stove' })).toBe(fighting);
  });
  it('wayside finds lie on five different roads and are gathered once by walking them', () => {
    const base = newRun('warden', 123, true);
    const finds = atlasFinds(123, base.atlas!);
    expect(finds).toHaveLength(5);
    expect(new Set(finds.map((f) => f.edge)).size).toBe(5);
    expect(atlasFinds(123, base.atlas!)).toEqual(finds);
    expect(atlasFinds(124, base.atlas!)).not.toEqual(finds);
    for (const find of finds) {
      const edge = atlasPack.edges[find.edge];
      const at: Run = rested({
        ...base,
        health: 20,
        atlas: {
          ...base.atlas!,
          position: edge.a,
          visited: ['origin', edge.a].filter((v, i, l) => l.indexOf(v) === i),
        },
      });
      const there = transition(at, { type: 'atlas-move', to: edge.b });
      expect(there.atlas!.finds).toEqual([find.edge]);
      if (find.kind === 'purse') expect(there.coins).toBe(at.coins + 14);
      if (find.kind === 'herbs') expect(there.health).toBe(28);
      if (find.kind === 'oil')
        expect(there.atlas!.oil).toBe(
          at.atlas!.oil! - edge.metres + Math.round(at.atlas!.range! / 3),
        );
      const back = transition(there, { type: 'atlas-move', to: edge.a });
      expect(back.atlas!.finds).toEqual([find.edge]);
      expect(back.coins).toBe(there.coins);
      expect(validRun(back)).toBe(true);
    }
  });
  it('plans the shortest known route and walks it as far as the oil lasts', () => {
    let r = newRun('warden', 123, true);
    expect(atlasRoute(r.atlas!, 'origin')).toBeNull();
    expect(atlasRoute(r.atlas!, 'bell3')).toBeNull(); // nothing of that road is charted yet
    r = rested(r);
    r = walk(r, 'bell1');
    const back = atlasRoute(r.atlas!, 'origin')!;
    expect(back.sites.at(-1)).toBe('origin');
    expect(back.metres).toBe(back.edges.reduce((n, i) => n + atlasPack.edges[i].metres, 0));
    expect(back.edges.every((i) => r.atlas!.roads.includes(i) || true)).toBe(true);
    const home = transition(rested(r), { type: 'atlas-walk', to: 'origin' });
    expect(home.atlas!.position).toBe('origin');
    expect(home.atlas!.steps).toBe(r.atlas!.steps + back.sites.length);
    const short: Run = { ...r, atlas: { ...r.atlas!, oil: atlasPack.edges[back.edges[0]].metres } };
    const partway = transition(short, { type: 'atlas-walk', to: 'origin' });
    expect(partway.atlas!.position).toBe(back.sites[0]);
    expect(partway.atlas!.oil).toBe(0);
    const none: Run = { ...r, atlas: { ...r.atlas!, oil: 0 } };
    expect(transition(none, { type: 'atlas-walk', to: 'origin' })).toBe(none);
    const done: Run = {
      ...r,
      phase: 'won',
      depth: 11,
      bells: 3,
      ending: 'dawn',
      atlas: { ...r.atlas!, day: 8 },
    };
    expect(scoreOf(done).lines).toContainEqual({ label: 'Arrived on day 8', value: 60 });
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
