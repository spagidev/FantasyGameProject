import type { Point } from './types';
const W = 1000,
  H = 810,
  P = 2 * (W + H);
const same = (a: Point, b: Point) => a[0] === b[0] && a[1] === b[1];
function clip(a: Point, b: Point): [Point, Point] | null {
  let lo = 0,
    hi = 1;
  const dx = b[0] - a[0],
    dy = b[1] - a[1];
  for (const [p, q] of [
    [-dx, a[0]],
    [dx, W - a[0]],
    [-dy, a[1]],
    [dy, H - a[1]],
  ]) {
    if (p === 0) {
      if (q < 0) return null;
      continue;
    }
    const t = q / p;
    if (p < 0) lo = Math.max(lo, t);
    else hi = Math.min(hi, t);
    if (lo > hi) return null;
  }
  const point = (t: number): Point => [
    Math.round((a[0] + t * dx) * 10) / 10,
    Math.round((a[1] + t * dy) * 10) / 10,
  ];
  return [point(lo), point(hi)];
}
function perimeter(p: Point) {
  if (p[1] === 0) return p[0];
  if (p[0] === W) return W + p[1];
  if (p[1] === H) return W + H + W - p[0];
  if (p[0] === 0) return P - p[1];
  throw new Error('The coastline is incomplete inside this chart. Try another journey seed.');
}
/** OSM coastline direction keeps land on the left (geographic coordinates). */
export function coastLands(lines: Point[][]): Point[][] | undefined {
  if (!lines.length) return undefined;
  const chains = lines.map((p) => [...p]);
  let joined = true;
  while (joined) {
    joined = false;
    outer: for (let i = 0; i < chains.length; i++)
      for (let j = 0; j < chains.length; j++)
        if (i !== j && same(chains[i].at(-1)!, chains[j][0])) {
          chains[i].push(...chains[j].slice(1));
          chains.splice(j, 1);
          joined = true;
          break outer;
        }
  }
  const islands: Point[][] = [],
    segments: Point[][] = [];
  for (const chain of chains) {
    if (same(chain[0], chain.at(-1)!)) {
      if (chain.every((p) => p[0] >= 0 && p[0] <= W && p[1] >= 0 && p[1] <= H)) {
        islands.push(chain);
        continue;
      }
    }
    let current: Point[] = [];
    for (let i = 1; i < chain.length; i++) {
      const part = clip(chain[i - 1], chain[i]);
      if (!part) {
        if (current.length > 1) segments.push(current);
        current = [];
        continue;
      }
      if (current.length && same(current.at(-1)!, part[0])) current.push(part[1]);
      else {
        if (current.length > 1) segments.push(current);
        current = [...part];
      }
    }
    if (current.length > 1) segments.push(current);
  }
  if (segments.length > 1)
    throw new Error('This coastline needs a more detailed chart. Try another journey seed.');
  if (!segments.length) {
    if (!islands.length)
      throw new Error('The coastline could not be reconstructed. Try another journey seed.');
    return islands;
  }
  const coast = segments[0],
    first = perimeter(coast[0]),
    last = perimeter(coast.at(-1)!);
  let target = first;
  while (target > last) target -= P;
  const corners: [number, Point][] = [
    [0, [0, 0]],
    [W, [W, 0]],
    [W + H, [W, H]],
    [2 * W + H, [0, H]],
  ];
  const between = corners
    .flatMap(
      ([t, p]) =>
        [
          [t, p],
          [t - P, p],
        ] as [number, Point][],
    )
    .filter(([t]) => t < last && t > target)
    .sort((a, b) => b[0] - a[0])
    .map(([, p]) => p);
  return [[...coast, ...between, coast[0]], ...islands];
}
