import { normalizePlace } from '../atlas/regions';
import { validRegionalChart, type Geography, type RegionalChart } from '../atlas/types';
import geography from './atlas-geography.json' with { type: 'json' };
import type { Run } from './engine';

export type Point = [number, number];
export type AtlasSite = {
  id: string;
  name: string;
  subtitle: string;
  clue: string;
  depth?: number;
  lane?: number;
  kind: 'origin' | 'encounter' | 'cache' | 'haven' | 'spring' | 'lookout';
};
export const ATLAS_SITES: AtlasSite[] = [
  {
    id: 'origin',
    name: 'The Thornward Gate',
    subtitle: 'Where the old world ends',
    kind: 'origin',
    clue: 'Cliffs climb behind you. Two harbours cut into a tiny realm beside a southern sea.',
  },
  {
    id: 'watch',
    name: 'The Menagerie of Ash',
    subtitle: 'Free the Dawnwell',
    kind: 'encounter',
    depth: 0,
    lane: 0,
    clue: 'The road winds around a high rock. A forgotten crown waits on its summit.',
  },
  {
    id: 'letters',
    name: 'The Chapel of Unsent Letters',
    subtitle: 'A story kept in salt',
    kind: 'encounter',
    depth: 1,
    lane: 0,
    clue: 'Old stone lanes crowd together on a headland, with water on three sides.',
  },
  {
    id: 'hearth',
    name: 'The White Sepulchre',
    subtitle: 'Rest beneath an unlit rose window',
    kind: 'encounter',
    depth: 2,
    lane: 0,
    clue: 'A white sanctuary stands between a palace and a hall of sea creatures.',
  },
  {
    id: 'bell1',
    name: 'The Crown on the Rock',
    subtitle: 'The first bell',
    kind: 'encounter',
    depth: 3,
    lane: 1,
    clue: 'This little realm has a prince, not a king. Its oldest seat watches both harbours.',
  },
  {
    id: 'kiln',
    name: 'The Ember Docks',
    subtitle: 'Free the Cinder Kiln',
    kind: 'encounter',
    depth: 4,
    lane: 1,
    clue: 'The larger harbour is almost a square. The city climbs steeply behind it.',
  },
  {
    id: 'ferry',
    name: 'The Saltpost',
    subtitle: 'Letters for a drowned city',
    kind: 'encounter',
    depth: 5,
    lane: 0,
    clue: 'Every spring, a great race used to wind through these same cramped streets.',
  },
  {
    id: 'market',
    name: 'The Lantern Exchange',
    subtitle: 'A little preparation',
    kind: 'encounter',
    depth: 6,
    lane: 1,
    clue: 'The western neighbourhood has its own small harbour, reclaimed from the sea.',
  },
  {
    id: 'bell2',
    name: 'The Shrine in the Ravine',
    subtitle: 'The second bell',
    kind: 'encounter',
    depth: 7,
    lane: 1,
    clue: 'A tiny chapel lies in a ravine above the main harbour. Beyond it the coast turns northeast.',
  },
  {
    id: 'lens',
    name: 'The Starless Hermitage',
    subtitle: 'Free the Moth Observatory',
    kind: 'encounter',
    depth: 8,
    lane: 2,
    clue: 'Above the harbour a grand terrace overlooks the sea. The land rises sharply inland.',
  },
  {
    id: 'moths',
    name: 'The Garden of Borrowed Moons',
    subtitle: 'The moths remember',
    kind: 'encounter',
    depth: 9,
    lane: 2,
    clue: 'The gardens gather around a house once famous for games of chance.',
  },
  {
    id: 'garden',
    name: 'The Glasswater Garden',
    subtitle: 'A quiet eastern sanctuary',
    kind: 'encounter',
    depth: 10,
    lane: 2,
    clue: 'A garden of another continent nestles between the shore and the northern road.',
  },
  {
    id: 'bell3',
    name: 'The Palace of Fallen Stars',
    subtitle: 'The final bell',
    kind: 'encounter',
    depth: 11,
    lane: 1,
    clue: 'Fortune once ruled this terrace. The Hollow King wears a crown borrowed from a game of chance.',
  },
  {
    id: 'cache',
    name: 'The Arena of Echoes',
    subtitle: 'A forgotten purse · +18 coins once',
    kind: 'cache',
    clue: 'An oval arena lies west of the rock, close to the smaller harbour.',
  },
  {
    id: 'haven',
    name: 'The Rose Hearth',
    subtitle: 'A hidden comfort · heal 12 and +1 attack once',
    kind: 'haven',
    clue: 'The rose garden hides below the rock, beside the western harbour. Some kindnesses survive every name.',
  },
  {
    id: 'spring',
    name: 'The Porcelain Spring',
    subtitle: 'A sealed flask · +1 flask once',
    kind: 'spring',
    clue: 'A villa and its garden rise above the eastern shoreline.',
  },
  {
    id: 'lookout',
    name: 'The Last Sea Lantern',
    subtitle: 'Look back at the coast',
    kind: 'lookout',
    clue: 'A crescent shore, a prince’s rock, two harbours and a palace of chance: this is one of the smallest countries on Earth.',
  },
];
export const atlasPack = geography as unknown as Geography;
const regionalNames = [
  'The Ashen Gate',
  'The Briar Watch',
  'The House of Unsent Letters',
  'The Quiet Hearth',
  'The First Remembering',
  'The Cinder Yard',
  'The Moth Archive',
  'The Lantern Exchange',
  'The Glass Citadel',
  'The Starless Observatory',
  'The Garden of Borrowed Moons',
  'The Rootbound Sanctuary',
  'The Palace of Fallen Stars',
  'The Fallen Treasury',
  'The Rose Hearth',
  'The Porcelain Spring',
  'The Windward Beacon',
];
export const atlasGeography = (a?: AtlasState): Geography => a?.chart ?? atlasPack;
export const atlasSites = (a?: AtlasState): AtlasSite[] =>
  a?.chart
    ? ATLAS_SITES.map((site, i) => ({
        ...site,
        name: regionalNames[i],
        clue: a.chart!.clues[site.id],
      }))
    : ATLAS_SITES;
export function cloneAtlasRun<T extends { atlas?: AtlasState }>(run: T): T {
  const chart = run.atlas?.chart;
  if (!chart) return structuredClone(run);
  const copy = structuredClone({ ...run, atlas: { ...run.atlas!, chart: undefined } }) as T;
  copy.atlas!.chart = chart; // geography is immutable; avoid copying it for every combat action
  return copy;
}
export type AtlasState = {
  version: 1;
  region: 'saltbound' | 'regional';
  chart?: RegionalChart;
  position: string;
  visited: string[];
  roads: number[];
  steps: number;
  collected: string[];
  recognized: boolean;
  attempts: { bell: number; name: string }[];
};
export type AtlasAction =
  | { type: 'atlas-move'; to: string }
  | { type: 'atlas-collect' }
  | { type: 'atlas-name'; name: string };
export function newAtlas(chart?: RegionalChart): AtlasState {
  return {
    version: 1,
    region: chart ? 'regional' : 'saltbound',
    ...(chart ? { chart } : {}),
    position: 'origin',
    visited: ['origin'],
    roads: [],
    steps: 0,
    collected: [],
    recognized: false,
    attempts: [],
  };
}
export const atlasSite = (id: string, state?: AtlasState) =>
  atlasSites(state).find((s) => s.id === id)!;
export const atlasObjective = (run: Run) =>
  atlasSites(run.atlas).find((s) => s.depth === run.depth + 1);
export function atlasNeighbours(state: AtlasState) {
  return atlasGeography(state).edges.flatMap((e, index) =>
    e.a === state.position
      ? [{ id: e.b, index, ...e }]
      : e.b === state.position
        ? [{ id: e.a, index, ...e }]
        : [],
  );
}
export function charted(state: AtlasState, id: string) {
  const pack = atlasGeography(state);
  const p = pack.points[id];
  if (state.visited.includes(id) || (state.recognized && id === 'haven')) return true;
  const pts = [
    ...state.visited.map((n) => pack.points[n]),
    ...state.roads.flatMap((i) => pack.edges[i].points),
  ];
  return pts.some((q) => Math.hypot(p[0] - q[0], p[1] - q[1]) <= 85);
}
export function bearing(from: string, to: string, state?: AtlasState) {
  const pack = atlasGeography(state);
  const a = pack.points[from],
    b = pack.points[to];
  const angle = ((Math.atan2(b[0] - a[0], a[1] - b[1]) * 180) / Math.PI + 360) % 360;
  return ['north', 'northeast', 'east', 'southeast', 'south', 'southwest', 'west', 'northwest'][
    Math.round(angle / 45) % 8
  ];
}
export function applyAtlasAction(run: Run, action: AtlasAction): Run {
  if (!run.atlas || run.phase !== 'map') return run;
  const r = cloneAtlasRun(run),
    a = r.atlas!;
  let message = '';
  if (action.type === 'atlas-move') {
    const edge = atlasNeighbours(a).find((e) => e.id === action.to);
    if (!edge) return run;
    a.position = action.to;
    a.steps++;
    if (!a.visited.includes(action.to)) a.visited.push(action.to);
    if (!a.roads.includes(edge.index)) a.roads.push(edge.index);
    message = `You reach ${atlasSite(action.to, a).name}. A little more of the world returns.`;
  } else if (action.type === 'atlas-collect') {
    const site = atlasSite(a.position, a);
    if (a.collected.includes(site.id)) return run;
    if (site.kind === 'cache') {
      r.coins += 18;
      message = a.chart
        ? 'The treasury gives back 18 forgotten coins.'
        : 'The arena gives back 18 forgotten coins.';
    } else if (site.kind === 'haven') {
      r.health = Math.min(r.maxHealth, r.health + 12);
      r.attack++;
      message = 'The Rose Hearth restores up to 12 health. Your blade remembers: +1 attack.';
    } else if (site.kind === 'spring' && r.flasks < 5) {
      r.flasks++;
      message = 'You bottle a little warmth. Gained one flask.';
    } else return run;
    a.collected.push(site.id);
  } else {
    const name = action.name.trim().slice(0, 80);
    if (!name || a.recognized || a.attempts.some((g) => g.bell === r.bells)) return run;
    a.attempts.push({ bell: r.bells, name });
    const normalized = normalizePlace(name);
    const aliases = a.chart?.aliases ?? [
      'monaco',
      'montecarlo',
      'principalityofmonaco',
      'monacoville',
      'monacomontecarlo',
    ];
    if (aliases.some((alias) => normalizePlace(alias) === normalized)) {
      a.recognized = true;
      r.attack += 2;
      message = `${a.chart?.city ?? 'Monaco'}. Beneath Veyr, the Earth remembers. +2 attack; the Rose Hearth is charted.`;
    } else message = 'The name does not settle. Ring another bell before naming this land again.';
  }
  r.log = [...r.log, message].slice(-8);
  return r;
}
export function validAtlas(x: unknown): x is AtlasState {
  if (typeof x !== 'object' || x === null || Array.isArray(x)) return false;
  const a = x as AtlasState;
  if (!(
    (a.region === 'saltbound' && a.chart === undefined) ||
    (a.region === 'regional' && validRegionalChart(a.chart))
  ))
    return false;
  const list = (v: unknown, max: number): v is string[] =>
    Array.isArray(v) &&
    v.length <= max &&
    new Set(v).size === v.length &&
    v.every((id) => typeof id === 'string' && ATLAS_SITES.some((s) => s.id === id));
  return (
    a.version === 1 &&
    typeof a.position === 'string' &&
    ATLAS_SITES.some((s) => s.id === a.position) &&
    list(a.visited, 17) &&
    a.visited.includes('origin') &&
    a.visited.includes(a.position) &&
    list(a.collected, 3) &&
    a.collected.every(
      (id) => ['cache', 'haven', 'spring'].includes(id) && a.visited.includes(id),
    ) &&
    Array.isArray(a.roads) &&
    a.roads.length <= atlasGeography(a).edges.length &&
    new Set(a.roads).size === a.roads.length &&
    a.roads.every((n) => Number.isInteger(n) && n >= 0 && n < atlasGeography(a).edges.length) &&
    Number.isInteger(a.steps) &&
    a.steps >= 0 &&
    a.steps <= 100000 &&
    typeof a.recognized === 'boolean' &&
    Array.isArray(a.attempts) &&
    a.attempts.length <= 4 &&
    new Set(a.attempts.map((g) => g?.bell)).size === a.attempts.length &&
    a.attempts.every(
      (g) =>
        g &&
        Number.isInteger(g.bell) &&
        g.bell >= 0 &&
        g.bell <= 3 &&
        typeof g.name === 'string' &&
        g.name.length > 0 &&
        g.name.length <= 80,
    )
  );
}
