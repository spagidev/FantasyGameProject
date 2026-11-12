export type Point = [number, number];
export const SITE_IDS = [
  'origin',
  'watch',
  'letters',
  'hearth',
  'bell1',
  'kiln',
  'ferry',
  'market',
  'bell2',
  'lens',
  'moths',
  'garden',
  'bell3',
  'cache',
  'haven',
  'spring',
  'lookout',
] as const;
export type Geography = {
  width: number;
  height: number;
  land: Point[];
  lands?: Point[][];
  features: { id: string; kind: string; points: Point[] }[];
  points: Record<string, Point>;
  edges: { a: string; b: string; metres: number; points: Point[] }[];
};
export type RegionalChart = Geography & {
  version: 1;
  area: string;
  areaId: number;
  cityId: number;
  city: string;
  aliases: string[];
  centre: Point;
  metresPerPixel: number;
  title: string;
  clues: Record<string, string>;
  source: {
    licence: 'ODbL-1.0';
    retrieved: string;
    provider: 'OpenStreetMap / Overpass';
    query: string;
  };
};
export type OsmElement = {
  type: string;
  id: number;
  lat?: number;
  lon?: number;
  tags?: Record<string, string>;
  nodes?: number[];
  geometry?: { lat: number; lon: number }[];
};
export function validRegionalChart(x: unknown): x is RegionalChart {
  if (!x || typeof x !== 'object' || Array.isArray(x)) return false;
  const c = x as RegionalChart;
  const text = (v: unknown, max = 150): v is string =>
    typeof v === 'string' && v.length > 0 && v.length <= max;
  const point = (p: unknown): p is Point =>
    Array.isArray(p) &&
    p.length === 2 &&
    p.every((n) => typeof n === 'number' && Number.isFinite(n) && Math.abs(n) <= 10000);
  let budget = 0;
  const points = (p: unknown, min: number, max: number): p is Point[] =>
    Array.isArray(p) &&
    p.length >= min &&
    p.length <= max &&
    (budget += p.length) <= 22000 &&
    p.every(point);
  if (
    c.version !== 1 ||
    c.width !== 1000 ||
    c.height !== 810 ||
    !text(c.area) ||
    !text(c.city, 80) ||
    !text(c.title) ||
    !Number.isSafeInteger(c.areaId) ||
    c.areaId <= 0 ||
    !Number.isSafeInteger(c.cityId) ||
    c.cityId <= 0 ||
    !point(c.centre) ||
    Math.abs(c.centre[0]) > 180 ||
    Math.abs(c.centre[1]) > 85 ||
    !Number.isFinite(c.metresPerPixel) ||
    c.metresPerPixel <= 0 ||
    c.metresPerPixel > 100
  )
    return false;
  if (
    c.lands !== undefined &&
    (!Array.isArray(c.lands) || c.lands.length > 20 || !c.lands.every((p) => points(p, 3, 2000)))
  )
    return false;
  if (
    !Array.isArray(c.aliases) ||
    c.aliases.length < 1 ||
    c.aliases.length > 20 ||
    !c.aliases.every((a) => text(a, 80)) ||
    !points(c.land, 3, 2000) ||
    !Array.isArray(c.features) ||
    c.features.length > 1200 ||
    !c.features.every(
      (f) =>
        f &&
        text(f.id, 40) &&
        ['road', 'water', 'river', 'grove', 'ruin', 'coast'].includes(f.kind) &&
        points(f.points, 2, 1000),
    )
  )
    return false;
  if (
    !c.points ||
    !c.clues ||
    !SITE_IDS.every((id) => point(c.points[id]) && text(c.clues[id], 500)) ||
    new Set(SITE_IDS.map((id) => c.points[id].join(','))).size !== SITE_IDS.length
  )
    return false;
  if (
    !Array.isArray(c.edges) ||
    c.edges.length < 16 ||
    c.edges.length > 40 ||
    !c.edges.every(
      (e) =>
        e &&
        SITE_IDS.includes(e.a as (typeof SITE_IDS)[number]) &&
        SITE_IDS.includes(e.b as (typeof SITE_IDS)[number]) &&
        e.a !== e.b &&
        Number.isFinite(e.metres) &&
        e.metres > 0 &&
        e.metres < 100000 &&
        points(e.points, 2, 2500) &&
        e.points[0].join(',') === c.points[e.a].join(',') &&
        e.points.at(-1)!.join(',') === c.points[e.b].join(','),
    )
  )
    return false;
  const reachable = new Set(['origin']);
  for (let i = 0; i < SITE_IDS.length; i++)
    for (const e of c.edges) {
      if (reachable.has(e.a)) reachable.add(e.b);
      if (reachable.has(e.b)) reachable.add(e.a);
    }
  if (
    reachable.size !== SITE_IDS.length ||
    new Set(c.edges.map((e) => [e.a, e.b].sort().join(':'))).size !== c.edges.length
  )
    return false;
  return (
    !!c.source &&
    c.source.licence === 'ODbL-1.0' &&
    c.source.provider === 'OpenStreetMap / Overpass' &&
    text(c.source.retrieved, 40) &&
    text(c.source.query, 4000)
  );
}
