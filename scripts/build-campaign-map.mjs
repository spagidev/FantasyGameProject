// Builds src/atlas/slovakia-map.json: the country outline, the sixteen bundled chart
// centres and one Voronoi cell per chart, all in one flat projection.
//
// Outline: Natural Earth 1:10m Admin 0 (public domain), Slovakia, extracted once from the
// `world-atlas` package into scripts/slovakia-outline.geo.json. City centres: the bundled
// OpenStreetMap-derived charts. The provinces drawn in the game are the Voronoi cells of
// those centres grouped by kraj: a fantasy cartographer's provinces, not legal boundaries.
//
// Run: node scripts/build-campaign-map.mjs
import { readFile, writeFile } from 'node:fs/promises';

const outline = JSON.parse(await readFile('scripts/slovakia-outline.geo.json', 'utf8'));
const charts = JSON.parse(await readFile('src/atlas/bundled-charts.json', 'utf8'));
const index = JSON.parse(await readFile('src/atlas/bundled-index.json', 'utf8'));
const ring = outline.coordinates[0];
const lons = ring.map((p) => p[0]);
const lats = ring.map((p) => p[1]);
const [west, east, south, north] = [
  Math.min(...lons),
  Math.max(...lons),
  Math.min(...lats),
  Math.max(...lats),
];
const squeeze = Math.cos((((south + north) / 2) * Math.PI) / 180);
const width = 1000;
const pad = 24;
const scale = (width - pad * 2) / ((east - west) * squeeze);
const height = Math.round((north - south) * scale + pad * 2);
const round = (n) => Math.round(n * 10) / 10;
const project = ([lon, lat]) => [
  round(pad + (lon - west) * squeeze * scale),
  round(pad + (north - lat) * scale),
];
// Drop outline points closer than 1.5 units to the previous one: plenty at this size.
const shape = [];
for (const p of ring.map(project)) {
  const last = shape.at(-1);
  if (!last || Math.hypot(p[0] - last[0], p[1] - last[1]) >= 1.5) shape.push(p);
}
const cities = index.map(({ id, region }) => {
  const [x, y] = project(charts[id].centre);
  return { id, key: `c${charts[id].cityId}`, region, x, y };
});
// Voronoi cell of each city: the map rectangle clipped by every perpendicular bisector.
function clip(polygon, a, b) {
  const inside = (p) => Math.hypot(p[0] - a.x, p[1] - a.y) <= Math.hypot(p[0] - b.x, p[1] - b.y);
  const mx = (a.x + b.x) / 2;
  const my = (a.y + b.y) / 2;
  const nx = b.x - a.x;
  const ny = b.y - a.y;
  const cross = (p, q) => {
    const t = (nx * (mx - p[0]) + ny * (my - p[1])) / (nx * (q[0] - p[0]) + ny * (q[1] - p[1]));
    return [p[0] + t * (q[0] - p[0]), p[1] + t * (q[1] - p[1])];
  };
  const out = [];
  polygon.forEach((p, i) => {
    const q = polygon[(i + 1) % polygon.length];
    if (inside(p)) out.push(p);
    if (inside(p) !== inside(q)) out.push(cross(p, q));
  });
  return out;
}
const cells = cities.map((city) => {
  let polygon = [
    [0, 0],
    [width, 0],
    [width, height],
    [0, height],
  ];
  for (const other of cities) if (other !== city) polygon = clip(polygon, city, other);
  return { id: city.id, region: city.region, points: polygon.map((p) => p.map(round)) };
});
await writeFile(
  'src/atlas/slovakia-map.json',
  JSON.stringify({ width, height, outline: shape, cities, cells }),
);
console.log(`${shape.length} outline points, ${cities.length} cities, ${width}×${height}`);
