import { compileChart } from '../src/atlas/compile';
import type { OsmElement } from '../src/atlas/types';
// A controlled street network, not a claim about real Slovak geography.
export function streetFixture(): OsmElement[] {
  const ways: OsmElement[] = [];
  const size = 20,
    lat = 48.15,
    lon = 17.1;
  const pos = (x: number, y: number) => ({
    lat: lat + (y - 10) * 0.0013,
    lon: lon + (x - 10) * 0.0019,
  });
  for (let y = 0; y < size; y++)
    ways.push({
      type: 'way',
      id: 100 + y,
      tags: { highway: 'residential' },
      nodes: Array.from({ length: size }, (_, x) => y * size + x + 1),
      geometry: Array.from({ length: size }, (_, x) => pos(x, y)),
    });
  for (let x = 0; x < size; x++)
    ways.push({
      type: 'way',
      id: 200 + x,
      tags: { highway: 'residential' },
      nodes: Array.from({ length: size }, (_, y) => y * size + x + 1),
      geometry: Array.from({ length: size }, (_, y) => pos(x, y)),
    });
  ways.push({
    type: 'way',
    id: 500,
    tags: { waterway: 'river' },
    geometry: [pos(3, 0), pos(4, 10), pos(3, 19)],
  });
  return ways;
}
export function regionalFixture() {
  return compileChart(
    streetFixture(),
    {
      type: 'node',
      id: 999,
      lat: 48.15,
      lon: 17.1,
      tags: { name: 'Testovce', 'name:en': 'Test City' },
    },
    'Bratislavský kraj',
    3600000001,
    '[out:json]; fixture;',
  );
}
