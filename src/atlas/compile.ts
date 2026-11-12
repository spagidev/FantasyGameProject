import { coastLands } from './coast';
import {
  SITE_IDS,
  validRegionalChart,
  type Geography,
  type OsmElement,
  type Point,
  type RegionalChart,
} from './types';

class Heap {
  values: [number, number][] = [];
  push(v: [number, number]) {
    const a = this.values;
    a.push(v);
    let i = a.length - 1;
    while (i > 0) {
      const p = (i - 1) >> 1;
      if (a[p][0] <= v[0]) break;
      a[i] = a[p];
      i = p;
    }
    a[i] = v;
  }
  pop() {
    const a = this.values,
      first = a[0],
      last = a.pop()!;
    if (a.length) {
      let i = 0;
      while (i * 2 + 1 < a.length) {
        let n = i * 2 + 1;
        if (n + 1 < a.length && a[n + 1][0] < a[n][0]) n++;
        if (last[0] <= a[n][0]) break;
        a[i] = a[n];
        i = n;
      }
      a[i] = last;
    }
    return first;
  }
}
export function compileChart(
  elements: OsmElement[],
  city: OsmElement,
  area: string,
  areaId: number | null,
  query: string,
  provenance?: RegionalChart['source'],
): RegionalChart {
  if (!city.tags?.name || !Number.isFinite(city.lat) || !Number.isFinite(city.lon))
    throw new Error('The chosen city has no usable centre.');
  const lat = city.lat!,
    lon = city.lon!,
    scaleX = 111200 * Math.cos((lat * Math.PI) / 180),
    mpp = 4;
  const project = (p: { lat: number; lon: number }): Point => [
    Math.round((500 + ((p.lon - lon) * scaleX) / mpp) * 10) / 10,
    Math.round((405 - ((p.lat - lat) * 111200) / mpp) * 10) / 10,
  ];
  const coords = new Map<number, Point>(),
    graph = new Map<number, Map<number, number>>();
  const allFeatures: Geography['features'] = [];
  for (const e of elements) {
    const t = e.tags ?? {},
      g = e.geometry;
    if (e.type !== 'way' || !g || g.length < 2) continue;
    let pts = g.filter((p) => Number.isFinite(p.lat) && Number.isFinite(p.lon)).map(project);
    if (pts.length < 2) continue;
    const kind =
      t.natural === 'water' || t.waterway === 'riverbank'
        ? 'water'
        : t.waterway === 'river' || t.waterway === 'stream'
          ? 'river'
          : t.natural === 'coastline'
            ? 'coast'
            : t.leisure === 'park' ||
                t.leisure === 'garden' ||
                t.landuse === 'forest' ||
                t.natural === 'wood'
              ? 'grove'
              : t.building
                ? 'ruin'
                : t.highway
                  ? 'road'
                  : null;
    // Preserve line endings while thinning only very detailed display geometry.
    if (pts.length > 350) {
      const step = Math.ceil(pts.length / 350);
      pts = pts.filter((_, i) => i % step === 0 || i === pts.length - 1);
    }
    if (kind && pts.some((p) => p[0] >= -60 && p[0] <= 1060 && p[1] >= -60 && p[1] <= 870))
      allFeatures.push({ id: String(e.id), kind, points: pts });
    if (
      !t.highway ||
      ['motorway', 'motorway_link', 'construction', 'proposed'].includes(t.highway) ||
      t.foot === 'no' ||
      ['private', 'no'].includes(t.access ?? '') ||
      !e.nodes ||
      e.nodes.length !== g.length
    )
      continue;
    for (let i = 0; i < g.length - 1; i++) {
      const p = project(g[i]),
        q = project(g[i + 1]);
      if ([p, q].some((p) => p[0] < 20 || p[0] > 980 || p[1] < 20 || p[1] > 790)) continue;
      const a = e.nodes[i],
        b = e.nodes[i + 1],
        d = Math.hypot(p[0] - q[0], p[1] - q[1]) * mpp;
      if (!d) continue;
      coords.set(a, p);
      coords.set(b, q);
      if (!graph.has(a)) graph.set(a, new Map());
      if (!graph.has(b)) graph.set(b, new Map());
      graph.get(a)!.set(b, d);
      graph.get(b)!.set(a, d);
    }
  }
  const unseen = new Set(graph.keys());
  let component: number[] = [];
  while (unseen.size) {
    const todo = [unseen.values().next().value!],
      part: number[] = [];
    unseen.delete(todo[0]);
    while (todo.length) {
      const id = todo.pop()!;
      part.push(id);
      for (const n of graph.get(id)!.keys()) if (unseen.delete(n)) todo.push(n);
    }
    if (part.length > component.length) component = part;
  }
  if (component.length < 100)
    throw new Error('This city has too few connected walking roads for a full expedition.');
  const targets: Point[] = [
    [150, 650],
    [300, 580],
    [300, 730],
    [480, 660],
    [630, 690],
    [800, 600],
    [720, 440],
    [840, 280],
    [630, 170],
    [500, 330],
    [320, 200],
    [180, 340],
    [460, 480],
    [100, 500],
    [800, 760],
    [890, 130],
    [110, 110],
  ];
  const anchors: Record<string, number> = {},
    points: Record<string, Point> = {};
  SITE_IDS.forEach((id, i) => {
    let best = 0,
      dist = Infinity;
    for (const n of component) {
      const p = coords.get(n)!;
      if (Object.values(points).some((q) => Math.hypot(p[0] - q[0], p[1] - q[1]) < 65)) continue;
      const d = Math.hypot(p[0] - targets[i][0], p[1] - targets[i][1]);
      if (d < dist) {
        best = n;
        dist = d;
      }
    }
    if (!best || dist > 390)
      throw new Error('The city roads are too concentrated to place the complete adventure.');
    anchors[id] = best;
    points[id] = coords.get(best)!;
  });
  const pairs: [string, string][] = SITE_IDS.slice(0, 12).map((id, i) => [id, SITE_IDS[i + 1]]);
  pairs.push(
    ['origin', 'cache'],
    ['cache', 'haven'],
    ['haven', 'hearth'],
    ['cache', 'bell1'],
    ['watch', 'market'],
    ['market', 'kiln'],
    ['ferry', 'watch'],
    ['bell2', 'ferry'],
    ['bell2', 'moths'],
    ['lens', 'bell3'],
    ['garden', 'spring'],
    ['spring', 'lookout'],
  );
  const edges = pairs.map(([a, b]) => {
    const start = anchors[a],
      end = anchors[b],
      queue = new Heap(),
      cost = new Map([[start, 0]]),
      prev = new Map<number, number>();
    queue.push([0, start]);
    while (queue.values.length) {
      const [d, n] = queue.pop();
      if (n === end) break;
      if (d > cost.get(n)!) continue;
      for (const [next, dd] of graph.get(n)!) {
        const nd = d + dd;
        if (nd < (cost.get(next) ?? Infinity)) {
          cost.set(next, nd);
          prev.set(next, n);
          queue.push([nd, next]);
        }
      }
    }
    if (!cost.has(end)) throw new Error('The city contains an unreachable encounter.');
    const path = [end];
    while (path.at(-1) !== start) path.push(prev.get(path.at(-1)!)!);
    return {
      a,
      b,
      metres: Math.round(cost.get(end)!),
      points: path.reverse().map((n) => coords.get(n)!),
    };
  });
  const priority = { water: 0, river: 1, coast: 2, grove: 3, road: 4, ruin: 5 };
  let size = 0;
  const features = allFeatures
    .sort(
      (a, b) =>
        priority[a.kind as keyof typeof priority] - priority[b.kind as keyof typeof priority],
    )
    .filter((f) => {
      if (size + f.points.length > 12500) return false;
      size += f.points.length;
      return true;
    })
    .slice(0, 1200);
  const water = features.filter((f) => ['water', 'river', 'coast'].includes(f.kind));
  const clues = Object.fromEntries(
    SITE_IDS.map((id) => {
      const p = points[id];
      let nearest: Point | undefined,
        dist = Infinity;
      for (const f of water)
        for (const q of f.points) {
          const d = Math.hypot(q[0] - p[0], q[1] - p[1]);
          if (d < dist) {
            dist = d;
            nearest = q;
          }
        }
      const direction = nearest
        ? ['north', 'northeast', 'east', 'southeast', 'south', 'southwest', 'west', 'northwest'][
            Math.round(
              (((Math.atan2(nearest[0] - p[0], p[1] - nearest[1]) * 180) / Math.PI + 360) % 360) /
                45,
            ) % 8
          ]
        : '';
      const nearby = features.filter(
        (f) =>
          f.kind === 'grove' && f.points.some((q) => Math.hypot(q[0] - p[0], q[1] - p[1]) < 130),
      );
      return [
        id,
        nearest && dist < 260
          ? `A ribbon of water lies ${direction} of this place. Follow its real shape through the veil; the old street pattern survived.`
          : nearby.length
            ? 'Trees gather near this place. The grove is real, though its keepers have become something stranger.'
            : 'The roads retain their old shape here. Study their crossings and bends; the city is hidden in the pattern, not in its forgotten names.',
      ];
    }),
  );
  const aliases = [
    ...new Set(
      [
        city.tags.name,
        ...['name:en', 'name:sk', 'official_name', 'alt_name', 'old_name'].flatMap((k) =>
          (city.tags![k] ?? '').split(';'),
        ),
      ].filter((n) => n.length > 0 && n.length <= 80),
    ),
  ].slice(0, 20);
  const lands = coastLands(allFeatures.filter((f) => f.kind === 'coast').map((f) => f.points));
  const chart: RegionalChart = {
    version: 1,
    area,
    areaId,
    cityId: city.id,
    city: city.tags.name.slice(0, 80),
    aliases,
    centre: [lon, lat],
    metresPerPixel: mpp,
    title: 'The Veiled Crossroads',
    width: 1000,
    height: 810,
    ...(lands ? { lands } : {}),
    land: [
      [-100, -100],
      [1100, -100],
      [1100, 910],
      [-100, 910],
    ],
    features,
    points,
    edges,
    clues,
    source: provenance ?? {
      licence: 'ODbL-1.0',
      retrieved: new Date().toISOString(),
      provider: 'OpenStreetMap / Overpass',
      query,
    },
  };
  if (!validRegionalChart(chart))
    throw new Error(
      'The compiled geography exceeds the expedition limits. Try another journey seed.',
    );
  return chart;
}
