import { describe, expect, it } from 'vitest';
import charts from '../atlas/bundled-charts.json';
import { validRegionalChart, type Geography } from '../atlas/types';
import { ATLAS_SITES, atlasPack, atlasSite } from './atlas';
import { makeEnemy, newRun, nodeOf, transition, victoryCoins, type Run } from './engine';
import { chartTerrain, TERRAIN, type TerrainId } from './terrain';
import { validRun } from './storage';

const mpp = (g: Geography) => (g as { metresPerPixel?: number }).metresPerPixel ?? 3.52;
const encounters = ATLAS_SITES.filter((s) => s.depth !== undefined).map((s) => s.id);
const all: [string, Geography][] = [
  ['coast', atlasPack],
  ...Object.entries(charts).map(
    ([id, c]) => [id, c as unknown as Geography] as [string, Geography],
  ),
];

describe('the ground of an encounter', () => {
  it('grounds follow each city’s real density: dense towns get streets, small towns open ground', () => {
    const counts = (geo: Geography) => {
      const grounds = chartTerrain(geo, encounters, mpp(geo));
      expect(Object.keys(grounds).sort()).toEqual([...encounters].sort());
      expect(chartTerrain(geo, encounters, mpp(geo))).toBe(grounds); // cached per chart
      const c: Record<string, number> = {};
      for (const g of Object.values(grounds)) c[g ?? 'plain'] = (c[g ?? 'plain'] ?? 0) + 1;
      return c;
    };
    const by = Object.fromEntries(all.map(([id, geo]) => [id, counts(geo)]));
    // Michalovce (sk-16) is the sparsest town, Nitra (sk-07) among the densest.
    expect(by['sk-16'].open ?? 0).toBeGreaterThan(by['sk-07'].open ?? 0);
    expect(by['sk-07'].streets ?? 0).toBeGreaterThan(by['sk-16'].streets ?? 0);
    // Across the collection every ground occurs, and most charts mix at least two.
    const seen = new Set(Object.values(by).flatMap((c) => Object.keys(c)));
    for (const t of Object.keys(TERRAIN)) expect(seen).toContain(t);
    expect(
      Object.values(by).filter((c) => Object.keys(c).length >= 2).length,
    ).toBeGreaterThanOrEqual(14);
    expect(Object.keys(TERRAIN)).toHaveLength(4);
  });
  it('each ground does exactly what it says, and only on charts begun from v0.13', () => {
    const run = newRun('warden', 123, true);
    expect(run.atlas!.ground).toBe(true);
    const grounds = chartTerrain(atlasPack, encounters, 3.52);
    const siteOf = (t: TerrainId) => encounters.find((id) => grounds[id] === t);
    const nodeFor = (id: string, r: Run = run) =>
      nodeOf(r, atlasSite(id).depth!, atlasSite(id).lane!);
    for (const t of Object.keys(TERRAIN) as TerrainId[]) {
      const id = siteOf(t);
      if (!id) continue;
      const node = nodeFor(id);
      expect(node.terrain).toBe(t);
      const plain = { ...node, terrain: undefined };
      if (node.foe) {
        const here = makeEnemy(node, 3);
        const there = makeEnemy(plain, 3);
        if (t === 'hills') expect(here.maxPoise).toBe(Math.round(there.maxPoise! * 0.8));
        if (t === 'streets')
          here.pattern.forEach((intent, i) =>
            expect(intent.hits ?? 1).toBe(
              Math.max(
                1,
                (there.pattern[i].hits ?? 1) - ((there.pattern[i].hits ?? 1) > 1 ? 1 : 0),
              ),
            ),
          );
      }
      if (t === 'cross') expect(victoryCoins(run, node) - victoryCoins(run, plain)).toBe(8);
    }
    // Older charts have no ground.
    const old = { ...run, atlas: { ...run.atlas!, ground: undefined } };
    expect(nodeFor('watch', old).terrain).toBeUndefined();
    expect(validRun(old)).toBe(true);
    expect(validRun({ ...run, atlas: { ...run.atlas!, ground: 'yes' as never } })).toBe(false);
  });
  it('open ground starts the battle with one more focus', () => {
    // The first realm's only battle is at 'watch'; find charts where its ground is open and not.
    const withGround = (want: boolean) =>
      Object.values(charts).find(
        (c) => (chartTerrain(c as unknown as Geography, encounters, 4).watch === 'open') === want,
      );
    const enter = (chart: unknown) => {
      const run = newRun('warden', 123, chart as never);
      return transition(
        { ...run, atlas: { ...run.atlas!, position: 'watch', visited: ['origin', 'watch'] } },
        { type: 'travel', lane: atlasSite('watch').lane! },
      );
    };
    const open = withGround(true);
    const other = withGround(false);
    expect(open && other).toBeTruthy();
    expect(enter(open)).toMatchObject({ phase: 'combat', focus: 3 });
    expect(enter(other)).toMatchObject({ phase: 'combat', focus: 2 });
  });
  it('all bundled charts are still valid journals', () => {
    for (const [, c] of Object.entries(charts)) expect(validRegionalChart(c)).toBe(true);
  });
});
