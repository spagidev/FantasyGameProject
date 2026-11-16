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
  // Travel rules (v0.8). Absent on charts begun earlier, which keep free walking.
  /** The current day, starting at 1. */
  day?: number;
  /** Metres of road the keeper can still walk today. */
  oil?: number;
  /** Metres of road one day's lamp oil lasts on this chart. */
  range?: number;
  /** Road indices whose wayside find has been gathered. */
  finds?: number[];
  /** Works built onto the hearth-wagon (v0.9). Absent means none. */
  works?: WorkId[];
};
/**
 * The hearth-wagon: the keeper's camp is a small town that travels with her. Each evening
 * she may build one work onto it or rest by its fire — never both.
 */
export type WorkId = 'stove' | 'still' | 'wheel' | 'rack' | 'strongbox' | 'ward';
export const WORKS: Record<WorkId, { name: string; cost: number; effect: string; flavor: string }> =
  {
    stove: {
      name: 'The iron stove',
      cost: 20,
      effect: 'Every dawn restores 4 health.',
      flavor: 'It was a bell once. It prefers this.',
    },
    still: {
      name: 'The dew-still',
      cost: 25,
      effect: 'Every dawn fills one flask, if you carry fewer than two.',
      flavor: 'Moths drink from it first. That is how you know it is ready.',
    },
    wheel: {
      name: 'The whetwheel',
      cost: 35,
      effect: 'Gain 2 attack at once.',
      flavor: 'It sings a little as it turns: one note, the right one.',
    },
    rack: {
      name: 'The lamp-rack',
      cost: 20,
      effect: 'A day’s lamp oil carries you a quarter farther.',
      flavor: 'Six lamps where there was one. The road looks shorter already.',
    },
    strongbox: {
      name: 'The toll-box',
      cost: 30,
      effect: 'Every dawn collects 6 coins.',
      flavor: 'People leave what they can, for the light going by.',
    },
    ward: {
      name: 'The ward-lantern',
      cost: 40,
      effect: 'The dark gathers half as fast: only every second night toughens your enemies.',
      flavor: 'It does not push the night back. It asks it, politely, to wait.',
    },
  };
export const REST_HEALING = 8;
export const worksOf = (a?: AtlasState): WorkId[] => a?.works ?? [];
/** Nights that count toward the gathering dark. */
export const darkNights = (a?: AtlasState) => {
  if (a?.day === undefined) return 0;
  const nights = a.day - 1;
  return worksOf(a).includes('ward') ? Math.ceil(nights / 2) : nights;
};
/** Whether a work can be built this evening, and why not. */
export function workBlocked(run: Run, id: WorkId): string | null {
  const a = run.atlas;
  if (!a || a.day === undefined || run.phase !== 'map') return 'Not now';
  if (worksOf(a).includes(id)) return 'Already built';
  if (run.coins < WORKS[id].cost) return 'Not enough coins';
  return null;
}
export type AtlasAction =
  | { type: 'atlas-move'; to: string }
  | { type: 'atlas-walk'; to: string }
  | { type: 'atlas-camp'; work?: WorkId }
  | { type: 'atlas-collect' }
  | { type: 'atlas-name'; name: string };
export function newAtlas(chart?: RegionalChart, travel = true): AtlasState {
  const state: AtlasState = {
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
  if (!travel) return state;
  const range = dayRange(state);
  return { ...state, day: 1, oil: range, range, finds: [], works: [] };
}

/** Shortest road distances from one site to every other, over the whole chart. */
function distances(state: AtlasState, from: string, allowed?: (index: number) => boolean) {
  const pack = atlasGeography(state);
  const best: Record<string, { metres: number; via: number; previous: string } | undefined> = {};
  const done = new Set<string>();
  const cost: Record<string, number> = { [from]: 0 };
  for (;;) {
    let here: string | null = null;
    for (const id of Object.keys(cost))
      if (!done.has(id) && (here === null || cost[id] < cost[here])) here = id;
    if (here === null) break;
    done.add(here);
    pack.edges.forEach((e, index) => {
      if ((e.a !== here && e.b !== here) || (allowed && !allowed(index))) return;
      const next = e.a === here ? e.b : e.a;
      const total = cost[here!] + e.metres;
      if (cost[next] === undefined || total < cost[next]) {
        cost[next] = total;
        best[next] = { metres: total, via: index, previous: here! };
      }
    });
  }
  return { cost, best };
}
/**
 * One day's lamp oil: a seventh of the shortest road through all twelve encounters, and never
 * less than the longest single road, so a fresh day can always walk any one stretch.
 */
export function dayRange(state: AtlasState): number {
  const pack = atlasGeography(state);
  const stops = [
    'origin',
    ...ATLAS_SITES.filter((s) => s.depth !== undefined)
      .sort((a, b) => a.depth! - b.depth!)
      .map((s) => s.id),
  ];
  let road = 0;
  for (let i = 1; i < stops.length; i++) road += distances(state, stops[i - 1]).cost[stops[i]] ?? 0;
  const longest = Math.max(...pack.edges.map((e) => e.metres));
  return Math.ceil(Math.max(longest, road / 7) / 100) * 100;
}
/** Whether this chart uses days and lamp oil. */
export const travels = (
  a?: AtlasState,
): a is AtlasState & { day: number; oil: number; range: number; finds: number[] } =>
  a?.day !== undefined;

export type FindKind = 'purse' | 'herbs' | 'oil';
export const FINDS: Record<FindKind, { name: string; text: string }> = {
  purse: { name: 'A dropped purse', text: '+14 coins' },
  herbs: { name: 'Roadside herbs', text: 'restore 8 health' },
  oil: { name: 'A cached oil flask', text: 'walk a third of a day farther today' },
};
/** Five seeded wayside finds, each lying on a different road. Gathered by walking that road. */
export function atlasFinds(
  seed: number,
  state: AtlasState,
): { edge: number; kind: FindKind; point: Point }[] {
  const pack = atlasGeography(state);
  const mix = (i: number) => {
    let n = (seed ^ Math.imul(i + 9001, 0x9e3779b9)) >>> 0;
    n = Math.imul(n ^ (n >>> 16), 0x21f0aaad);
    n = Math.imul(n ^ (n >>> 15), 0x735a2d97);
    return (n ^ (n >>> 15)) >>> 0;
  };
  const kinds: FindKind[] = ['purse', 'herbs', 'oil', 'purse', 'herbs'];
  return pack.edges
    .map((_, index) => index)
    .sort((a, b) => mix(a) - mix(b) || a - b)
    .slice(0, kinds.length)
    .map((edge, i) => {
      const points = pack.edges[edge].points;
      return { edge, kind: kinds[i], point: points[Math.floor(points.length / 2)] };
    });
}
/**
 * The shortest route to a site along roads the keeper knows: roads already walked, and
 * roads whose both ends are charted.
 */
export function atlasRoute(state: AtlasState, to: string) {
  const pack = atlasGeography(state);
  if (to === state.position || !pack.points[to]) return null;
  const known = (index: number) =>
    state.roads.includes(index) ||
    (charted(state, pack.edges[index].a) && charted(state, pack.edges[index].b));
  const { best } = distances(state, state.position, known);
  if (!best[to]) return null;
  const sites: string[] = [];
  const edges: number[] = [];
  for (let at = to; at !== state.position; at = best[at]!.previous) {
    sites.unshift(at);
    edges.unshift(best[at]!.via);
  }
  return { sites, edges, metres: best[to]!.metres };
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
  const step = (to: string): boolean => {
    const edge = atlasNeighbours(a).find((e) => e.id === to);
    if (!edge || (travels(a) && a.oil < edge.metres)) return false;
    if (travels(a)) a.oil -= edge.metres;
    a.position = to;
    a.steps++;
    if (!a.visited.includes(to)) a.visited.push(to);
    if (!a.roads.includes(edge.index)) a.roads.push(edge.index);
    message = `You reach ${atlasSite(to, a).name}. A little more of the world returns.`;
    const find = travels(a) ? atlasFinds(r.seed, a).find((f) => f.edge === edge.index) : null;
    if (find && travels(a) && !a.finds.includes(edge.index)) {
      a.finds.push(edge.index);
      if (find.kind === 'purse') r.coins += 14;
      else if (find.kind === 'herbs') r.health = Math.min(r.maxHealth, r.health + 8);
      else a.oil += Math.round(a.range / 3);
      message += ` On the way: ${FINDS[find.kind].name.toLowerCase()} (${FINDS[find.kind].text}).`;
    }
    return true;
  };
  if (action.type === 'atlas-move') {
    if (!step(action.to)) return run;
  } else if (action.type === 'atlas-walk') {
    const route = atlasRoute(a, action.to);
    if (!route) return run;
    let walked = 0;
    for (const site of route.sites) {
      if (!step(site)) break;
      walked++;
    }
    if (!walked) return run;
  } else if (action.type === 'atlas-camp') {
    if (!travels(a)) return run;
    // The evening: build one work onto the wagon, or rest by its fire.
    let evening: string;
    if (action.work) {
      if (!Object.hasOwn(WORKS, action.work) || workBlocked(r, action.work)) return run;
      const work = WORKS[action.work];
      r.coins -= work.cost;
      a.works = [...worksOf(a), action.work];
      if (action.work === 'wheel') r.attack += 2;
      if (action.work === 'rack') a.range = Math.round((a.range * 1.25) / 100) * 100;
      evening = `You build ${work.name.toLowerCase()} onto the wagon.`;
    } else {
      r.health = Math.min(r.maxHealth, r.health + REST_HEALING);
      evening = 'You rest by the wagon’s fire.';
    }
    // Dawn.
    a.day++;
    a.oil = a.range;
    const works = worksOf(a);
    const health =
      r.waylights.filter((id) => id === 'well').length * 2 + (works.includes('stove') ? 4 : 0);
    const coins =
      r.waylights.filter((id) => id === 'kiln').length * 4 + (works.includes('strongbox') ? 6 : 0);
    const flask = works.includes('still') && r.flasks < 2;
    r.health = Math.min(r.maxHealth, r.health + health);
    r.coins += coins;
    if (flask) r.flasks++;
    const gifts = [
      ...(coins ? [`${coins} coins`] : []),
      ...(health ? [`${health} health`] : []),
      ...(flask ? ['a full flask'] : []),
    ];
    message = `${evening} Day ${a.day} dawns${
      gifts.length ? ` with ${gifts.join(', ')}` : ''
    }. The dark has gathered a little.`;
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
    (a.day === undefined
      ? a.oil === undefined &&
        a.range === undefined &&
        a.finds === undefined &&
        a.works === undefined
      : Number.isInteger(a.day) &&
        a.day >= 1 &&
        a.day <= 10000 &&
        Number.isInteger(a.range) &&
        a.range! >= 100 &&
        a.range! <= 1000000 &&
        Number.isInteger(a.oil) &&
        a.oil! >= 0 &&
        a.oil! <= a.range! * 3 &&
        Array.isArray(a.finds) &&
        a.finds.length <= 5 &&
        new Set(a.finds).size === a.finds.length &&
        a.finds.every((n) => Number.isInteger(n) && n >= 0 && n < atlasGeography(a).edges.length) &&
        (a.works === undefined ||
          (Array.isArray(a.works) &&
            a.works.length <= Object.keys(WORKS).length &&
            new Set(a.works).size === a.works.length &&
            a.works.every((id) => typeof id === 'string' && Object.hasOwn(WORKS, id))))) &&
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
