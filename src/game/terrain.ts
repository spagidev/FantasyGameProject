import type { Geography } from '../atlas/types';

/**
 * The ground of an encounter (v0.13), read from the real street pattern around its site.
 * Every bundled chart carries roads only, so the ground is what the roads say: many streets
 * close together are an old town, few are open country, curving roads climb a hill, and a
 * site where four or more roads meet is a crossroads.
 */
export type TerrainId = 'streets' | 'open' | 'hills' | 'cross';
export const TERRAIN: Record<TerrainId, { name: string; rule: string; flavor: string }> = {
  streets: {
    name: 'Narrow streets',
    rule: 'No room to swing: enemy attacks of several hits land one hit fewer.',
    flavor: 'Old houses lean together overhead, close enough to whisper.',
  },
  open: {
    name: 'Open ground',
    rule: 'You see it coming: begin the battle with 1 extra focus.',
    flavor: 'Nothing for a long way in any direction, which is its own kind of shelter.',
  },
  hills: {
    name: 'Winding hill road',
    rule: 'Uneven footing: the enemy’s poise is a fifth lower.',
    flavor: 'The road doubles back on itself, as if it had forgotten something.',
  },
  cross: {
    name: 'Crossroads',
    rule: 'Where roads meet, so does trade: victory here gives 8 more coins.',
    flavor: 'Four ways out. Every traveller who ever stood here chose one.',
  },
};

/** Road metres within `radius` metres of a point, and how winding the expedition's roads are there. */
function measure(geo: Geography, at: [number, number], metresPerUnit: number) {
  const radius = 300 / metresPerUnit;
  let length = 0;
  let curve = 0;
  let straight = 0;
  for (const f of geo.features) {
    if (f.kind !== 'road') continue;
    for (let i = 1; i < f.points.length; i++) {
      const [ax, ay] = f.points[i - 1];
      const [bx, by] = f.points[i];
      if (Math.hypot((ax + bx) / 2 - at[0], (ay + by) / 2 - at[1]) > radius) continue;
      length += Math.hypot(bx - ax, by - ay) * metresPerUnit;
    }
  }
  for (const e of geo.edges) {
    const near = e.points.filter((p) => Math.hypot(p[0] - at[0], p[1] - at[1]) <= radius);
    if (near.length < 2) continue;
    for (let i = 1; i < near.length; i++)
      curve += Math.hypot(near[i][0] - near[i - 1][0], near[i][1] - near[i - 1][1]);
    straight += Math.hypot(near.at(-1)![0] - near[0][0], near.at(-1)![1] - near[0][1]);
  }
  return { length, winding: straight > 0 ? curve / straight : 1 };
}

/** Road metres within 300 m that make an old town, and below which the country is open. */
export const DENSE_METRES = 3500;
export const SPARSE_METRES = 1800;
/** Path length against straight distance on the expedition's own roads: a climbing road. */
export const WINDING = 1.4;

const cache = new WeakMap<Geography, Record<string, TerrainId | null>>();
/**
 * The ground of each encounter site, by absolute measures in real metres so that each city's
 * character shows: an old, dense town has many narrow streets, a small town much open
 * ground. In order: 3,500 m or more of road within 300 m is narrow streets; under 1,800 m is
 * open ground; otherwise winding roads (1.4 or more) are a hill road, and a site where four
 * or more of the expedition's roads meet is a crossroads; anything else is plain.
 */
export function chartTerrain(
  geo: Geography,
  sites: string[],
  metresPerUnit: number,
): Record<string, TerrainId | null> {
  const known = cache.get(geo);
  if (known) return known;
  const result: Record<string, TerrainId | null> = {};
  for (const id of sites) {
    const at = geo.points[id];
    if (!at) continue;
    const { length, winding } = measure(geo, at, metresPerUnit);
    const degree = geo.edges.filter((e) => e.a === id || e.b === id).length;
    result[id] =
      length >= DENSE_METRES
        ? 'streets'
        : length < SPARSE_METRES
          ? 'open'
          : winding >= WINDING
            ? 'hills'
            : degree >= 4
              ? 'cross'
              : null;
  }
  cache.set(geo, result);
  return result;
}
