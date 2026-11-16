import type { RegionalChart } from '../atlas/types';
import {
  applyAtlasAction,
  atlasSite,
  darkNights,
  encounterState,
  freeOrder,
  grantGift,
  isTrove,
  TROVES,
  travels,
  newAtlas,
  cloneAtlasRun,
  type AtlasAction,
  type AtlasState,
} from './atlas';
import { BOSSES, ELITES, FOES, ORDINARY, type Foe, type Traits } from './bestiary';
import { VOICES } from './lore';
import { omenOf } from './omens';
import {
  CHAPTERS,
  EVENTS,
  KEEPERS,
  LEGACY_EVENT_COUNT,
  LEGACY_RELICS,
  NEW_TALENTS,
  RELICS,
  STARTING_RELICS,
  TALENTS,
  WAYLIGHTS,
  type EnemyArt,
  type EventOption,
  type Intent,
  type KeeperId,
  type NodeKind,
  type RelicId,
  type TalentId,
  type WaylightId,
} from './data';

export type Phase =
  'map' | 'combat' | 'reward' | 'talent' | 'event' | 'camp' | 'shop' | 'ending' | 'won' | 'lost';
export type Ruleset = 1 | 2 | 3;
/** classic: rulesets 1–2. atlas: ruleset 3 on a chart (fixed kinds). seeded: ruleset 3 routes. */
export type Layout = 'classic' | 'atlas' | 'seeded';
export type Enemy = {
  name: string;
  art: EnemyArt;
  health: number;
  maxHealth: number;
  guard: number;
  poison: number;
  pattern: Intent[];
  // Ruleset 3
  id?: string;
  tint?: number;
  /** Index of the next intention; legacy rulesets use the turn counter instead. */
  step?: number;
  poise?: number;
  maxPoise?: number;
  /** 2: will lose its next action. 1: recovering, still exposed. 0: steady. */
  stagger?: 0 | 1 | 2;
  fury?: number;
  traits?: Traits;
  phase?: 1 | 2;
  phase2?: { name: string; pattern: Intent[] };
};
export type MapNode = {
  id: string;
  depth: number;
  lane: number;
  kind: NodeKind;
  name: string;
  eventIndex: number;
  /** Ruleset 3: the bestiary entry fought here. */
  foe?: string;
};
export type RunStats = {
  turns: number;
  staggers: number;
  parries: number;
  taken: number;
  elites: number;
  flasks: number;
  bestHit: number;
};
export type Run = {
  version: 2;
  atlas?: AtlasState;
  ruleset: Ruleset;
  seed: number;
  keeper: KeeperId;
  phase: Phase;
  depth: number;
  lane: number;
  health: number;
  maxHealth: number;
  attack: number;
  armor: number;
  coins: number;
  flasks: number;
  focus: number;
  guard: number;
  turn: number;
  enemy: Enemy | null;
  relics: RelicId[];
  rewards: RelicId[];
  log: string[];
  path: string[];
  lore: string[];
  bells: number;
  purchased: string[];
  ending: 'dawn' | 'hearth' | null;
  waylights: WaylightId[];
  talents: TalentId[];
  // Ruleset 3. Always present on a ruleset-3 run, never on an earlier one.
  /** Difficulty chosen before leaving, 0–8. */
  dusk?: number;
  /** Relics this expedition can find. */
  pool?: RelicId[];
  /** Relics the current trader has left. */
  shop?: RelicId[];
  /** Keeper actions that still deal 25% less hit damage. */
  weak?: number;
  /** Frost stacks on the keeper. */
  frost?: number;
  /** Echo Whetstone: the next Strike is sharpened. */
  charge?: boolean;
  /** Strikes made in the current battle. */
  strikes?: number;
  /** Once-per-expedition effects already used. */
  spent?: string[];
  /** Bestiary ids defeated, in order. */
  slain?: string[];
  stats?: RunStats;
  /** Set for a date-seeded expedition, as YYYY-MM-DD. */
  daily?: string;
  /** The guarded trove being fought for (v0.10): a side fight that does not advance the road. */
  side?: string;
};
export type ShopItem = 'flask' | 'heal' | 'forge' | RelicId;
export type Action =
  | AtlasAction
  | { type: 'atlas-challenge' }
  | { type: 'travel'; lane: number }
  | { type: 'strike' | 'guard' | 'skill' | 'technique' | 'flask' }
  | { type: 'reward'; id: RelicId | 'heal' }
  | { type: 'event'; option: number }
  | { type: 'camp'; choice: 'rest' | 'flask' | 'forge' }
  | { type: 'buy'; item: ShopItem }
  | { type: 'leave' }
  | { type: 'talent'; id: TalentId }
  | { type: 'ending'; choice: 'dawn' | 'hearth' };
export const DUSK_MAX = 8;
export const DUSK_RULES = [
  'Enemies have 10% more health.',
  'Elites and bell guardians hit 2 harder.',
  'You leave with one flask instead of two.',
  'Enemy poise is 25% tougher.',
  'Every enemy hits 1 harder.',
  'Resting at a sanctuary restores 6 less.',
  'Traders charge 20% more.',
  'Enemies have 15% more health again. Guardians begin with 2 fury.',
];

export function hash(seed: number, index: number): number {
  let n = (seed ^ Math.imul(index + 1, 0x9e3779b9)) >>> 0;
  n = Math.imul(n ^ (n >>> 16), 0x21f0aaad);
  n = Math.imul(n ^ (n >>> 15), 0x735a2d97);
  return (n ^ (n >>> 15)) >>> 0;
}

export type RunOptions = {
  ruleset?: Ruleset;
  dusk?: number;
  pool?: RelicId[];
  daily?: string;
};
export function newRun(
  keeper: KeeperId,
  seed: number,
  atlas: boolean | RegionalChart = false,
  options: RunOptions = {},
): Run {
  const k = KEEPERS[keeper];
  const ruleset = options.ruleset ?? 3;
  const dusk = ruleset === 3 ? Math.max(0, Math.min(DUSK_MAX, options.dusk ?? 0)) : 0;
  return {
    version: 2,
    ...(atlas
      ? { atlas: newAtlas(typeof atlas === 'object' ? atlas : undefined, ruleset === 3) }
      : {}),
    ruleset,
    seed: seed >>> 0,
    keeper,
    phase: 'map',
    depth: -1,
    lane: 1,
    health: k.health,
    maxHealth: k.health,
    attack: k.attack,
    armor: k.armor,
    coins: 35,
    flasks: dusk >= 3 ? 1 : 2,
    focus: 2,
    guard: 0,
    turn: 0,
    enemy: null,
    relics: [],
    rewards: [],
    log: ['You leave Cinderfall with a stolen ember.'],
    path: [],
    lore: ['beginning'],
    bells: 0,
    purchased: [],
    ending: null,
    waylights: [],
    talents: [],
    ...(ruleset === 3
      ? {
          dusk,
          pool: [...(options.pool ?? STARTING_RELICS)],
          shop: [],
          weak: 0,
          frost: 0,
          charge: false,
          strikes: 0,
          spent: [],
          slain: [],
          stats: { turns: 0, staggers: 0, parries: 0, taken: 0, elites: 0, flasks: 0, bestHit: 0 },
          ...(options.daily ? { daily: options.daily } : {}),
        }
      : {}),
  };
}

export const layoutOf = (r: Pick<Run, 'ruleset' | 'atlas'>): Layout =>
  r.ruleset < 3 ? 'classic' : r.atlas ? 'atlas' : 'seeded';

const PERMUTATIONS = [
  [0, 1, 2],
  [0, 2, 1],
  [1, 0, 2],
  [1, 2, 0],
  [2, 0, 1],
  [2, 1, 0],
];
/** A seeded ordering of every story scene, so one expedition never repeats a scene. */
function eventOrder(seed: number): number[] {
  return EVENTS.map((_, i) => i).sort(
    (a, b) => hash(seed, 4000 + a) - hash(seed, 4000 + b) || a - b,
  );
}
function kindAt(seed: number, depth: number, lane: number, layout: Layout): NodeKind {
  const chapter = Math.floor(depth / 4);
  const step = depth % 4;
  if (step === 3) return 'boss';
  if (step === 0) return 'battle';
  if (layout !== 'seeded')
    return step === 1 ? (lane === 1 ? 'elite' : 'event') : lane === 1 ? 'shop' : 'camp';
  // The middle of each realm is arranged by the seed. Two of the three lanes before a guardian
  // are always a sanctuary and a trader, so every route can reach one of them.
  const order = PERMUTATIONS[hash(seed, 1000 + chapter * 2 + step) % 6];
  const third: NodeKind = hash(seed, 1100 + chapter) % 5 < 3 ? 'event' : 'elite';
  const kinds: NodeKind[] = step === 1 ? ['event', 'elite', 'battle'] : ['camp', 'shop', third];
  return kinds[order[lane]];
}
function foeAt(seed: number, depth: number, lane: number, kind: NodeKind): Foe {
  const chapter = Math.floor(depth / 4);
  const step = depth % 4;
  if (kind === 'boss') return BOSSES[chapter];
  if (kind === 'elite') return ELITES[chapter][(hash(seed, 3000 + chapter) + step) % 2];
  const base = hash(seed, 2000 + chapter);
  return ORDINARY[chapter][(base + (step === 0 ? lane : 3)) % 4];
}

export function nodeAt(
  seed: number,
  depth: number,
  lane: number,
  layout: Layout = 'classic',
): MapNode {
  const h = hash(seed, depth * 3 + lane);
  const chapter = Math.floor(depth / 4);
  const kind = kindAt(seed, depth, lane, layout);
  const fights = kind === 'battle' || kind === 'elite' || kind === 'boss';
  const camp = ['The quiet hearth', 'A roof of stars'][lane % 2];
  if (layout !== 'classic') {
    const foe = fights ? foeAt(seed, depth, lane, kind) : undefined;
    // Up to two scenes per realm, each drawn once from the seeded ordering.
    const slot = chapter * 2 + (layout === 'atlas' ? (lane ? 1 : 0) : (depth % 4) - 1);
    const eventIndex = kind === 'event' ? eventOrder(seed)[slot % EVENTS.length] : 0;
    const name = foe
      ? foe.name
      : kind === 'event'
        ? EVENTS[eventIndex].name
        : kind === 'camp'
          ? camp
          : 'The lantern market';
    return {
      id: `${depth}-${lane}`,
      depth,
      lane,
      kind,
      name,
      eventIndex,
      ...(foe ? { foe: foe.id } : {}),
    };
  }
  const eventIndex = h % LEGACY_EVENT_COUNT;
  const names = [
    ['Drowned Watcher', 'Ashbound Pilgrim', 'Mire Revenant'],
    ['Glassbound Soldier', 'Pale Standard', 'Shattered Knight'],
    ['Rootbound Shade', 'Crownless Keeper', 'Forgotten Herald'],
  ];
  const name =
    kind === 'boss'
      ? CHAPTERS[chapter].boss
      : kind === 'event'
        ? EVENTS[eventIndex].name
        : kind === 'camp'
          ? camp
          : kind === 'shop'
            ? 'The lantern market'
            : kind === 'elite'
              ? ['The Thornbound', 'The Glass Captain', 'The King’s Hand'][chapter]
              : names[chapter][h % 3];
  return { id: `${depth}-${lane}`, depth, lane, kind, name, eventIndex };
}
/** The node at a position of this expedition's own route; defaults to where the keeper stands. */
export const nodeOf = (r: Run, depth = r.depth, lane = r.lane): MapNode =>
  nodeAt(r.seed, depth, lane, layoutOf(r));

/**
 * The guardian of a trove, as a scoutable node. It is drawn from the roster of the realm the
 * keeper has reached, so a trove left for later is guarded by something stronger.
 */
export function troveGuard(r: Run, id: string): MapNode | null {
  if (!isTrove(r.atlas, id)) return null;
  const chapter = Math.min(2, r.bells);
  const foe = ORDINARY[chapter][hash(r.seed, 8000 + TROVES.indexOf(id as 'cache')) % 4];
  return {
    id: `trove-${id}`,
    depth: chapter * 4 + 1,
    lane: 0,
    kind: 'battle',
    name: foe.name,
    eventIndex: 0,
    foe: foe.id,
  };
}

/** The realm (0–2) the keeper is in; a trove fight belongs to the realm reached so far. */
export const realmOf = (r: Pick<Run, 'side' | 'bells' | 'phase' | 'depth'>) =>
  r.side
    ? Math.min(2, r.bells)
    : Math.max(0, Math.floor(Math.min(11, r.phase === 'map' ? r.depth + 1 : r.depth) / 4));

/** Encounters entered so far, including one in progress. */
export const encountersEntered = (r: Pick<Run, 'path'>) => r.path.length;
/** Encounters won: those entered, less one lost in (a trove fight is not an encounter). */
export const encountersWon = (r: Pick<Run, 'path' | 'phase' | 'side'>) =>
  Math.max(0, r.path.length - (r.phase === 'lost' && !r.side ? 1 : 0));

export function nextNodes(run: Run): MapNode[] {
  if (run.phase !== 'map' || run.depth >= 11) return [];
  const d = run.depth + 1;
  if (run.atlas) {
    const site = atlasSite(run.atlas.position, run.atlas);
    return encounterState(run, site) === 'open' ? [nodeOf(run, site.depth!, site.lane!)] : [];
  }
  return (d % 4 === 3 ? [1] : [0, 1, 2])
    .filter((l) => d % 4 === 0 || Math.abs(l - run.lane) <= 1)
    .map((l) => nodeOf(run, d, l));
}

function legacyEnemy(node: MapNode, ruleset: 1 | 2): Enemy {
  const c = Math.floor(node.depth / 4);
  const boss = node.kind === 'boss';
  const elite = node.kind === 'elite';
  const health = boss ? [48, 64, 84][c] : elite ? 35 + c * 13 : 24 + c * 11 + node.lane * 2;
  const damage = (boss ? 9 : elite ? 8 : 6) + c * 3;
  let pattern: Intent[] = boss
    ? c === 0
      ? [
          { name: 'Antler sweep', damage },
          { name: 'Gather the lost', damage: 0, guard: 8 },
          { name: 'The bell tolls', damage: damage + 7 },
        ]
      : c === 1
        ? [
            { name: 'Marching blow', damage },
            { name: 'Raise the standard', damage: 0, guard: 12 },
            { name: 'Shattering oath', damage: damage + 8 },
          ]
        : [
            { name: 'The weight of names', damage, drain: 1 },
            { name: 'A king’s sorrow', damage: 0, heal: 8 },
            { name: 'The long night', damage: damage + 9 },
          ]
    : [
        { name: 'Lunging strike', damage },
        { name: 'Gathering shadow', damage: 0, guard: 5 + c * 2 },
        { name: 'Heavy strike', damage: damage + 5 },
      ];
  if (ruleset === 2 && !boss) {
    if (elite) {
      pattern = [
        { name: 'Test your resolve', damage, drain: 1 },
        { name: 'Close ranks', damage: 0, guard: 8 + c * 2 },
        { name: 'Break the line', damage: damage + 6 },
      ];
    } else if (node.lane === 1) {
      pattern = [
        { name: 'First ember', damage: damage - 1 },
        { name: 'Second ember', damage: damage - 1 },
        { name: 'Cinder storm', damage: damage + 3 },
      ];
    } else if (node.lane === 2) {
      pattern = [
        { name: 'Unravel the light', damage: damage - 1, drain: 1 },
        { name: 'Veil of moths', damage: 0, guard: 6 + c * 2 },
        { name: 'A stolen star', damage: damage + 4 },
      ];
    }
  }
  return {
    name: node.name,
    art: boss ? CHAPTERS[c].art : elite || (ruleset === 2 && c === 1) ? 'sentinel' : 'wraith',
    health,
    maxHealth: health,
    guard: 0,
    poison: 0,
    pattern,
  };
}

/** Nights that count on an Atlas chart (halved by the ward-lantern): each adds 2% health to enemies not yet fought, up to 30%. */
export const nightsOf = (r: Pick<Run, 'atlas'>) => darkNights(r.atlas);
export function makeEnemy(node: MapNode, ruleset: Ruleset = 3, dusk = 0, nights = 0): Enemy {
  if (ruleset < 3 || !node.foe) return legacyEnemy(node, ruleset === 1 ? 1 : 2);
  const foe = FOES[node.foe];
  const big = node.kind !== 'battle';
  const extra = (dusk >= 5 ? 1 : 0) + (big && dusk >= 2 ? 2 : 0);
  const grow = (p: Intent[]) => p.map((i) => ({ ...i, damage: i.damage ? i.damage + extra : 0 }));
  const health = Math.round(
    foe.health *
      (1 + (dusk >= 1 ? 0.1 : 0) + (dusk >= 8 ? 0.15 : 0) + Math.min(0.3, nights * 0.02)),
  );
  const poise = Math.round(foe.poise * (dusk >= 4 ? 1.25 : 1));
  return {
    id: foe.id,
    name: foe.name,
    art: foe.art,
    tint: foe.tint,
    health,
    maxHealth: health,
    guard: 0,
    poison: 0,
    pattern: grow(foe.pattern),
    step: 0,
    poise,
    maxPoise: poise,
    stagger: 0,
    fury: node.kind === 'boss' && dusk >= 8 ? 2 : 0,
    ...(foe.traits ? { traits: { ...foe.traits } } : {}),
    phase: 1,
    ...(foe.phase2 ? { phase2: { name: foe.phase2.name, pattern: grow(foe.phase2.pattern) } } : {}),
  };
}

export function waylightFor(node: MapNode): WaylightId | null {
  return node.depth % 4 === 0 ? (['well', 'kiln', 'lens'] as const)[node.lane] : null;
}
export function roadBenefits(r: Run) {
  return {
    health: r.waylights.filter((id) => id === 'well').length * 2,
    coins: r.waylights.filter((id) => id === 'kiln').length * 4,
    focus: r.waylights.filter((id) => id === 'lens').length,
  };
}
export function startingFocus(r: Run) {
  return Math.min(
    5,
    2 +
      roadBenefits(r).focus +
      (r.ruleset === 3 && r.keeper === 'seer' ? 1 : 0) +
      (r.talents.includes('astral') ? 1 : 0) +
      (r.relics.includes('vigil') ? 1 : 0) +
      (omenOf(r) === 'moth' ? 1 : 0),
  );
}
/** Attack as it stands right now, including conditional relics. */
export function attackOf(r: Run) {
  return r.attack + (r.relics.includes('wick') && r.health * 2 <= r.maxHealth ? 3 : 0);
}
export function strikeFocus(r: Run) {
  return 1 + (r.relics.includes('mothglass') ? 1 : 0) + (r.talents.includes('vow') ? 1 : 0);
}
/** Damage of the next Strike before the enemy's own defenses, and how many times it lands. */
export function strikeDamage(r: Run): { damage: number; hits: number } {
  let damage =
    attackOf(r) + (r.relics.includes('lantern') && r.focus === 5 ? 5 : 0) + (r.charge ? 6 : 0);
  if (r.relics.includes('kindling') && r.strikes === 0) damage *= 2;
  return { damage, hits: r.relics.includes('echo') && (r.strikes ?? 0) % 3 === 2 ? 2 : 1 };
}
export function guardAmount(r: Run) {
  return (
    9 +
    r.armor +
    (r.keeper === 'seer' ? 4 : 0) +
    (r.talents.includes('citadel') ? 4 : 0) +
    (r.talents.includes('moonward') ? 2 : 0)
  );
}
export function skillCost(r: Run) {
  return Math.max(1, KEEPERS[r.keeper].cost - (r.relics.includes('lodestar') ? 1 : 0));
}
export function skillDamage(r: Run) {
  const attack = attackOf(r);
  return (
    (r.keeper === 'wayfarer' ? attack + 2 : attack * 2 + (r.keeper === 'seer' ? 7 : 3)) +
    (r.talents.includes('sunsteel') || r.talents.includes('starfall') ? 5 : 0)
  );
}
export function poisonAmount(r: Run) {
  return 5 + (r.talents.includes('bloom') ? 2 : 0);
}
export function strikeHealing(r: Run) {
  return r.keeper === 'wayfarer' ? (r.talents.includes('sap') ? 3 : 2) : 0;
}
export function flaskHealing(r: Run) {
  return 16 + (r.relics.includes('dew') ? 8 : 0);
}
export function restAmount(r: Run) {
  return r.ruleset < 3 ? 18 : 20 - ((r.dusk ?? 0) >= 6 ? 6 : 0);
}
export function staggerBonus(r: Run) {
  return r.relics.includes('chime') ? 2 : 1.5;
}
/** Lessons the keeper may choose from right now. Ruleset 3 offers three of the unlearned four. */
export function availableTalents(r: Run): TalentId[] {
  const open = (Object.keys(TALENTS) as TalentId[]).filter(
    (id) =>
      TALENTS[id].keeper === r.keeper &&
      !r.talents.includes(id) &&
      (r.ruleset === 3 || !NEW_TALENTS.includes(id)),
  );
  if (r.ruleset < 3 || open.length <= 3) return open;
  const hidden = hash(r.seed, 777) % open.length;
  return open.filter((_, i) => i !== hidden);
}
export function victoryCoins(r: Run, node = nodeOf(r)) {
  return (
    (node.kind === 'boss' ? 45 : node.kind === 'elite' ? 32 : 18) +
    (r.talents.includes('trail') ? 6 : 0) +
    (r.relics.includes('ferrycoin') ? 8 : 0)
  );
}

export function intentFor(run: Run): Intent | null {
  const e = run.enemy;
  if (!e) return null;
  return e.pattern[(e.step ?? run.turn) % e.pattern.length];
}
/** The intention after the current one, assuming the pattern does not change. */
export function nextIntent(run: Run): Intent | null {
  const e = run.enemy;
  if (!e) return null;
  return e.pattern[((e.step ?? run.turn) + 1) % e.pattern.length];
}
/** Health one hit of this intention would cost an unguarded keeper. */
export function hitDamage(run: Run, intent: Intent): number {
  if (!intent.damage) return 0;
  const e = run.enemy;
  const softened = run.relics.includes('gravebloom') && e && e.poison > 0 ? 2 : 0;
  return Math.max(0, intent.damage + (e?.fury ?? 0) - softened - run.armor);
}
/** Total health the current intention will cost if nothing is guarded. Zero while it is staggered. */
export function incomingDamage(run: Run): number {
  const intent = intentFor(run);
  if (!intent || run.enemy?.stagger === 2) return 0;
  return hitDamage(run, intent) * (intent.hits ?? 1);
}
export function canEvent(run: Run, option: EventOption): boolean {
  return (
    run.coins + (option.coins ?? 0) >= 0 &&
    run.health + Math.min(0, option.health ?? 0) > 0 &&
    run.flasks + (option.flasks ?? 0) >= 0 &&
    run.maxHealth + (option.maxHealth ?? 0) >= 10
  );
}
const BASE_PRICES = { flask: 14, heal: 18, forge: 35 };
const RELIC_PRICES = { common: 40, uncommon: 55, rare: 75 };
export function priceOf(run: Run, item: ShopItem): number {
  const base =
    item === 'flask' || item === 'heal' || item === 'forge'
      ? BASE_PRICES[item]
      : RELIC_PRICES[RELICS[item].rarity];
  if (run.ruleset < 3) return base;
  const price = Math.ceil(
    base * ((run.dusk ?? 0) >= 7 ? 1.2 : 1) * (run.relics.includes('scale') ? 0.75 : 1),
  );
  return omenOf(run) === 'fair' ? Math.ceil(price * 0.8) : price;
}
export function canBuy(run: Run, item: ShopItem): boolean {
  if (run.phase !== 'shop' || run.purchased.includes(item) || run.coins < priceOf(run, item))
    return false;
  if (item === 'flask') return run.flasks < 5;
  if (item === 'heal') return run.health < run.maxHealth;
  if (item === 'forge') return true;
  return run.ruleset === 3 && !!run.shop?.includes(item) && !run.relics.includes(item);
}

function heal(r: Run, amount: number) {
  r.health = Math.min(r.maxHealth, r.health + amount);
}
function note(r: Run, text: string) {
  r.log = [...r.log, text].slice(-8);
}
function gainFocus(r: Run, amount: number) {
  r.focus = Math.max(0, Math.min(5, r.focus + amount));
}
function hitEnemy(r: Run, amount: number, piercing = false) {
  if (!r.enemy) return;
  const blocked = piercing ? 0 : Math.min(r.enemy.guard, amount);
  r.enemy.guard -= blocked;
  r.enemy.health = Math.max(0, r.enemy.health - (amount - blocked));
  note(r, `${amount - blocked} damage dealt${blocked ? ` · ${blocked} blocked` : ''}.`);
}
/** Ruleset 3: wear poise down; at zero the enemy is staggered and its poise hardens. */
function wear(r: Run, amount: number) {
  const e = r.enemy!;
  if (e.maxPoise === undefined || e.stagger || amount <= 0 || e.health <= 0) return;
  e.poise = Math.max(0, e.poise! - amount);
  if (e.poise > 0) return;
  e.stagger = 2;
  e.maxPoise = Math.ceil(e.maxPoise * 1.3);
  e.poise = e.maxPoise;
  r.stats!.staggers++;
  note(r, `${e.name} is staggered: it loses its next action and takes more damage.`);
  if (r.talents.includes('breaker')) gainFocus(r, 2);
}
/**
 * What a hit of this base damage becomes against the current enemy, before its guard:
 * weakness, then stagger, then plating. Earlier rulesets have none of the three.
 */
export function effectiveHit(r: Run, base: number, pierce = false): number {
  const e = r.enemy;
  if (r.ruleset < 3 || !e) return base;
  let amount = base;
  if (r.weak) amount = Math.floor(amount * 0.75);
  if (e.stagger) amount = Math.floor(amount * staggerBonus(r));
  if (e.traits?.plated && !pierce) amount = Math.max(1, amount - e.traits.plated);
  return amount;
}
/** Ruleset 3 hit: weakness, stagger, plating, guard, then poise. */
function hit3(r: Run, base: number, options: { pierce?: boolean; poise?: number } = {}) {
  const e = r.enemy!;
  const amount = effectiveHit(r, base, options.pierce);
  const blocked = options.pierce ? 0 : Math.min(e.guard, amount);
  e.guard -= blocked;
  e.health = Math.max(0, e.health - (amount - blocked));
  r.stats!.bestHit = Math.max(r.stats!.bestHit, amount - blocked);
  note(r, `${amount - blocked} damage dealt${blocked ? ` · ${blocked} blocked` : ''}.`);
  wear(r, Math.ceil(amount * (options.poise ?? 1) * (r.relics.includes('clapper') ? 1.5 : 1)));
}
function addRelic(r: Run, id: RelicId) {
  r.relics.push(id);
  if (id === 'dawn') r.attack += 2;
  if (id === 'psalm') r.armor += 1;
  if (id === 'hearthseed') {
    r.maxHealth += 10;
    heal(r, 10);
  }
  if (id === 'idol') {
    r.attack += 4;
    r.maxHealth = Math.max(10, r.maxHealth - 8);
    r.health = Math.min(r.health, r.maxHealth);
  }
}
const RARITY_INDEX = { common: 0, uncommon: 1, rare: 2 };
const OFFER_WEIGHTS = {
  battle: [60, 33, 7],
  elite: [12, 50, 38],
  boss: [0, 45, 55],
  shop: [40, 40, 20],
  event: [45, 40, 15],
};
/**
 * Ruleset 3: draw distinct relics the keeper does not carry, weighted by rarity. Integer
 * arithmetic only, so every browser draws the same relics from the same seed.
 */
export function drawRelics(
  r: Run,
  source: keyof typeof OFFER_WEIGHTS,
  count: number,
  salt: number,
): RelicId[] {
  const order = Object.keys(RELICS) as RelicId[];
  const pool = order.filter((id) => r.pool?.includes(id) && !r.relics.includes(id));
  const picked: RelicId[] = [];
  for (let n = 0; n < count && pool.length; n++) {
    const weights = pool.map((id) => OFFER_WEIGHTS[source][RARITY_INDEX[RELICS[id].rarity]] || 1);
    let roll = hash(r.seed, salt + n * 131) % weights.reduce((a, b) => a + b, 0);
    const index = weights.findIndex((w) => (roll -= w) < 0);
    picked.push(...pool.splice(index, 1));
  }
  return picked;
}
/** Hoarfrost: the keeper begins the battle with 1 frost, unless a sprig already forbids it. */
function omenFrost(r: Run) {
  if (r.ruleset === 3 && omenOf(r) === 'hoarfrost' && !r.relics.includes('sprig')) r.frost = 1;
}
function clearBattle(r: Run) {
  r.guard = 0;
  if (r.ruleset === 3) {
    r.weak = 0;
    r.frost = 0;
    r.charge = false;
    r.strikes = 0;
  }
}
function victory(r: Run) {
  if (r.side) {
    // A trove won: its gift and an elite's choice of relics. The road does not advance.
    const id = r.side;
    clearBattle(r);
    if (r.relics.includes('thread')) heal(r, 5);
    if (r.talents.includes('trail')) heal(r, 2);
    if (r.enemy?.id) r.slain!.push(r.enemy.id);
    note(r, `${r.enemy?.name} falls. The trove is yours.`);
    note(r, grantGift(r, id) ?? '');
    r.rewards = drawRelics(r, 'elite', 3, 9000 + TROVES.indexOf(id as 'cache') * 17);
    r.phase = 'reward';
    return;
  }
  const node = nodeOf(r);
  const kind = node.kind;
  const coins = victoryCoins(r);
  r.coins += coins;
  clearBattle(r);
  if (r.relics.includes('thread')) heal(r, 5);
  if (r.talents.includes('trail')) heal(r, 2);
  const site = waylightFor(node);
  if (r.ruleset >= 2 && site) {
    r.waylights.push(site);
    note(r, `${WAYLIGHTS[site].name} is rekindled. ${WAYLIGHTS[site].benefit}`);
  }
  if (kind === 'boss') {
    r.bells += 1;
    r.lore.push(`bell-${r.bells}`);
    // Each keeper writes their own page after a bell.
    if (r.ruleset === 3) r.lore.push(`${r.keeper}-bell-${r.bells}`);
  }
  if (r.ruleset === 3) {
    if (r.enemy?.id) r.slain!.push(r.enemy.id);
    if (kind === 'elite') r.stats!.elites++;
    if (kind !== 'battle' && r.relics.includes('bellrope') && r.flasks < 5) r.flasks++;
    r.rewards = drawRelics(r, kind as 'battle' | 'elite' | 'boss', 3, 5000 + r.depth * 17);
  } else {
    const available = LEGACY_RELICS.filter((id) => !r.relics.includes(id));
    r.rewards = available
      .sort(
        (a, b) =>
          hash(r.seed, r.depth + LEGACY_RELICS.indexOf(a) * 37) -
          hash(r.seed, r.depth + LEGACY_RELICS.indexOf(b) * 37),
      )
      .slice(0, 3);
  }
  r.phase = r.depth === 11 ? 'ending' : 'reward';
  note(r, `${r.enemy?.name} falls. You recover ${coins} coins.`);
}

function legacyCombat(run: Run, r: Run, action: { type: 'strike' | 'guard' | 'skill' | 'flask' }) {
  const k = KEEPERS[r.keeper];
  const intent = intentFor(r)!;
  if (action.type === 'skill' && r.focus < k.cost) return run;
  if (action.type === 'flask' && (r.flasks === 0 || r.health === r.maxHealth)) return run;
  r.guard = 0;
  if (action.type === 'strike') {
    hitEnemy(r, r.attack);
    r.focus = Math.min(5, r.focus + strikeFocus(r));
    if (strikeHealing(r)) heal(r, strikeHealing(r));
  } else if (action.type === 'guard') {
    r.guard = guardAmount(r);
    r.focus = Math.min(5, r.focus + 2);
    note(r, `You brace with ${r.guard} guard.`);
    if (r.relics.includes('briar')) hitEnemy(r, 3);
  } else if (action.type === 'skill') {
    r.focus -= k.cost;
    note(r, `${k.skill}.`);
    if (r.keeper === 'warden') {
      hitEnemy(r, skillDamage(r));
      r.guard = 5;
    }
    if (r.keeper === 'seer') hitEnemy(r, skillDamage(r), true);
    if (r.keeper === 'wayfarer') {
      hitEnemy(r, skillDamage(r));
      r.enemy!.poison += poisonAmount(r);
    }
  } else {
    r.flasks -= 1;
    heal(r, 16);
    note(r, 'A draught of warmth. Restored up to 16 health.');
  }
  const e = r.enemy!;
  if (e.health <= 0) {
    victory(r);
    return r;
  }
  if (e.poison > 0) {
    note(r, `Nightbloom deals ${e.poison} poison damage.`);
    e.health = Math.max(0, e.health - e.poison);
    e.poison -= 1;
    if (e.health <= 0) {
      victory(r);
      return r;
    }
  }
  const damage = Math.max(0, intent.damage - r.armor);
  const blocked = Math.min(r.guard, damage);
  r.health = Math.max(0, r.health - (damage - blocked));
  if (intent.damage)
    note(
      r,
      `${intent.name}: ${damage - blocked} damage taken${blocked ? ` · ${blocked} guarded` : ''}.`,
    );
  if (intent.guard) {
    e.guard += intent.guard;
    note(r, `${e.name} gains ${intent.guard} guard.`);
  }
  if (intent.heal) {
    e.health = Math.min(e.maxHealth, e.health + intent.heal);
    note(r, `${e.name} restores ${intent.heal} health.`);
  }
  if (intent.drain) {
    r.focus = Math.max(0, r.focus - intent.drain);
    note(r, `Lost ${intent.drain} focus.`);
  }
  r.guard = 0;
  r.turn += 1;
  if (r.health === 0) r.phase = 'lost';
  return r;
}

/** Whether the keeper's second technique can be used right now, and why not. */
export function techniqueBlocked(r: Run): string | null {
  if (r.ruleset < 3 || !r.enemy) return 'Not available';
  if (r.focus < KEEPERS[r.keeper].techniqueCost) return 'Not enough focus';
  if (r.keeper === 'seer' && incomingDamage(r) === 0) return 'No blow to foresee';
  if (r.keeper === 'wayfarer' && r.enemy.poison === 0) return 'No poison to quicken';
  return null;
}
function fall(r: Run) {
  if (r.health > 0) return false;
  if (r.relics.includes('cinder') && !r.spent!.includes('cinder')) {
    r.spent!.push('cinder');
    r.health = Math.min(12, r.maxHealth);
    note(r, 'The Phoenix Cinder flares. You are still here.');
    return false;
  }
  r.health = 0;
  r.phase = 'lost';
  return true;
}
function combat3(
  run: Run,
  r: Run,
  action: { type: 'strike' | 'guard' | 'skill' | 'technique' | 'flask' },
) {
  const k = KEEPERS[r.keeper];
  const e = r.enemy!;
  const intent = intentFor(r)!;
  const stats = r.stats!;
  if (action.type === 'skill' && r.focus < skillCost(r)) return run;
  if (action.type === 'technique' && techniqueBlocked(r)) return run;
  if (
    action.type === 'flask' &&
    (r.flasks === 0 || (r.health === r.maxHealth && !r.frost && !r.weak))
  )
    return run;
  stats.turns++;
  if (action.type === 'strike') {
    const { damage, hits } = strikeDamage(r);
    r.charge = false;
    r.strikes = (r.strikes ?? 0) + 1;
    hit3(r, damage);
    if (hits > 1 && e.health > 0) hit3(r, damage);
    gainFocus(r, strikeFocus(r));
    if (strikeHealing(r)) heal(r, strikeHealing(r));
    if (r.talents.includes('barb')) e.poison += 2;
    if (e.traits?.thorns) {
      r.health = Math.max(1, r.health - e.traits.thorns);
      note(r, `Thorns cost you ${e.traits.thorns} health.`);
    }
  } else if (action.type === 'guard') {
    r.guard += guardAmount(r);
    gainFocus(r, 2);
    note(r, `You brace with ${r.guard} guard.`);
    if (r.relics.includes('briar')) hit3(r, 3);
    if (r.relics.includes('censer')) e.poison += 2;
  } else if (action.type === 'skill') {
    r.focus -= skillCost(r);
    note(r, `${k.skill}.`);
    if (r.keeper === 'warden') {
      hit3(r, skillDamage(r));
      r.guard += 5;
    } else if (r.keeper === 'seer') hit3(r, skillDamage(r), { pierce: true });
    else {
      hit3(r, skillDamage(r));
      e.poison += poisonAmount(r);
    }
  } else if (action.type === 'technique') {
    r.focus -= k.techniqueCost;
    note(r, `${k.technique}.`);
    if (r.keeper === 'warden') hit3(r, guardAmount(r), { poise: 2 });
    else if (r.keeper === 'seer') r.guard = Math.max(r.guard, incomingDamage(r));
    else {
      const bite = e.poison * 2;
      e.health = Math.max(0, e.health - bite);
      stats.bestHit = Math.max(stats.bestHit, bite);
      note(r, `The poison bites twice: ${bite} damage.`);
    }
  } else {
    r.flasks -= 1;
    stats.flasks++;
    heal(r, flaskHealing(r));
    if (r.relics.includes('dew')) r.guard += 6;
    r.frost = 0;
    r.weak = 0;
    note(r, `A draught of warmth. Restored up to ${flaskHealing(r)} health; the cold lifts.`);
  }
  if (r.weak && action.type !== 'flask') r.weak--;
  if (e.health <= 0) {
    victory(r);
    return r;
  }
  if (e.poison > 0) {
    note(r, `Poison deals ${e.poison} damage.`);
    e.health = Math.max(0, e.health - e.poison);
    e.poison -= 1;
    if (e.health <= 0) {
      victory(r);
      return r;
    }
  }
  // The enemy's half of the turn.
  if (r.frost) {
    r.health -= r.frost;
    stats.taken += r.frost;
    note(r, `Frost costs you ${r.frost} health.`);
    r.frost--;
    if (fall(r)) return r;
  }
  if (e.stagger === 2) {
    e.stagger = 1;
    note(r, `Staggered, ${e.name} loses “${intent.name}”.`);
  } else {
    e.stagger = 0;
    if (intent.damage) {
      const total = hitDamage(r, intent) * (intent.hits ?? 1);
      const blocked = Math.min(r.guard, total);
      const taken = total - blocked;
      r.guard -= blocked;
      r.health -= taken;
      stats.taken += taken;
      note(r, `${intent.name}: ${taken} damage taken${blocked ? ` · ${blocked} guarded` : ''}.`);
      if (taken === 0 && blocked > 0) {
        stats.parries++;
        note(r, 'A perfect guard.');
        if (r.relics.includes('whetstone')) r.charge = true;
        if (r.talents.includes('longsight')) gainFocus(r, 1);
        if (r.relics.includes('mirror')) e.health = Math.max(0, e.health - Math.floor(blocked / 2));
        wear(r, omenOf(r) === 'bells' ? Math.ceil(blocked * 1.25) : blocked);
      }
      if (taken > 0 && r.relics.includes('thornmail')) e.health = Math.max(0, e.health - 4);
    }
    if (intent.guard) {
      e.guard += intent.guard;
      note(r, `${e.name} gains ${intent.guard} guard.`);
    }
    if (intent.heal) {
      e.health = Math.min(e.maxHealth, e.health + intent.heal);
      note(r, `${e.name} restores ${intent.heal} health.`);
    }
    if (intent.fury) {
      e.fury = (e.fury ?? 0) + intent.fury;
      note(r, `${e.name} grows fiercer: every blow lands ${intent.fury} harder.`);
    }
    if (intent.drain) {
      gainFocus(r, -intent.drain);
      note(r, `Lost ${intent.drain} focus.`);
    }
    if (!r.relics.includes('sprig')) {
      if (intent.weak) {
        r.weak = Math.max(r.weak ?? 0, intent.weak);
        note(r, `Weakened: your next ${intent.weak} actions hit 25% softer.`);
      }
      if (intent.frost) {
        r.frost = (r.frost ?? 0) + intent.frost;
        note(r, `Frost settles on you: ${r.frost}.`);
      }
    }
  }
  e.step = (e.step ?? 0) + 1;
  if (fall(r)) return r;
  if (e.health <= 0) {
    victory(r);
    return r;
  }
  if (e.traits?.regen && e.health < e.maxHealth)
    e.health = Math.min(e.maxHealth, e.health + e.traits.regen);
  if (e.phase2 && e.phase === 1 && e.health * 2 <= e.maxHealth) {
    e.phase = 2;
    e.pattern = e.phase2.pattern;
    e.step = 0;
    note(r, `${e.phase2.name}. ${e.name} changes its pattern.`);
    if (e.id && VOICES[e.id]?.turn) note(r, VOICES[e.id].turn!);
  }
  r.guard = r.relics.includes('buckle') ? Math.min(6, r.guard) : 0;
  r.turn += 1;
  return r;
}

export function transition(run: Run, action: Action): Run {
  if (
    action.type === 'atlas-move' ||
    action.type === 'atlas-walk' ||
    action.type === 'atlas-camp' ||
    action.type === 'atlas-name' ||
    action.type === 'atlas-collect'
  )
    return applyAtlasAction(run, action);
  const r = cloneAtlasRun(run);
  const v3 = r.ruleset === 3;
  if (action.type === 'atlas-challenge') {
    const guard = r.phase === 'map' && r.atlas ? troveGuard(r, r.atlas.position) : null;
    if (!guard) return run;
    r.side = r.atlas!.position;
    r.enemy = makeEnemy(guard, 3, r.dusk ?? 0, nightsOf(r));
    r.turn = 0;
    clearBattle(r);
    omenFrost(r);
    r.focus = startingFocus(r);
    r.phase = 'combat';
    r.log = [`${guard.name} guards ${atlasSite(r.side, r.atlas).name}.`];
    return r;
  }
  if (action.type === 'travel') {
    const target = nextNodes(r).find((n) => n.lane === action.lane);
    if (!target) return run;
    // On a chart with days, waylights pay at dawn instead of at each crossing.
    const benefits = travels(r.atlas) ? { health: 0, coins: 0 } : roadBenefits(r);
    heal(r, benefits.health);
    r.coins += benefits.coins;
    // On a free-order chart the encounter belongs to its site, so depth can step back within
    // a realm; elsewhere the target is always the next depth.
    r.depth = target.depth;
    r.lane = action.lane;
    const node = nodeOf(r);
    r.path.push(node.id);
    if (freeOrder(r.atlas))
      r.atlas.done = [...r.atlas.done, atlasSite(r.atlas.position, r.atlas).id];
    r.purchased = [];
    r.enemy = null;
    if (v3) r.shop = [];
    if (['battle', 'elite', 'boss'].includes(node.kind)) {
      r.enemy = makeEnemy(node, r.ruleset, r.dusk ?? 0, nightsOf(r));
      r.turn = 0;
      clearBattle(r);
      omenFrost(r);
      r.focus = startingFocus(r);
      r.phase = 'combat';
      r.log = [
        (v3 && node.foe && VOICES[node.foe]?.arrive) ||
          `${node.name} stands between you and the next bell.`,
      ];
      if (v3 && r.relics.includes('hourglass')) {
        r.enemy.stagger = 2;
        note(r, 'The Glass Hourglass turns. Your enemy begins staggered.');
      }
    } else {
      r.phase = node.kind as 'event' | 'camp' | 'shop';
      if (v3 && node.kind === 'shop') r.shop = drawRelics(r, 'shop', 3, 6000 + r.depth * 17);
    }
    return r;
  }
  if (
    action.type === 'strike' ||
    action.type === 'guard' ||
    action.type === 'skill' ||
    action.type === 'technique' ||
    action.type === 'flask'
  ) {
    if (r.phase !== 'combat' || !r.enemy) return run;
    if (v3) return combat3(run, r, action);
    if (action.type === 'technique') return run;
    return legacyCombat(run, r, { type: action.type });
  }
  if (action.type === 'reward' && r.phase === 'reward') {
    if (action.id === 'heal') {
      heal(r, 12);
      note(r, 'You leave the relics to the earth and recover a little strength.');
    } else if (r.rewards.includes(action.id) && !r.relics.includes(action.id)) {
      addRelic(r, action.id);
      note(r, `You carry the ${RELICS[action.id].name}. ${RELICS[action.id].flavor}`);
    } else return run;
    r.rewards = [];
    r.phase = !r.side && r.ruleset >= 2 && r.depth % 4 === 3 ? 'talent' : 'map';
    delete r.side;
    return r;
  }
  if (action.type === 'talent' && r.phase === 'talent') {
    if (!availableTalents(r).includes(action.id) || r.talents.length >= 2) return run;
    r.talents.push(action.id);
    if (action.id === 'moonward') r.armor += 1;
    note(r, `${TALENTS[action.id].name}: ${TALENTS[action.id].description}`);
    r.phase = 'map';
    return r;
  }
  if (action.type === 'event' && r.phase === 'event') {
    const option = EVENTS[nodeOf(r).eventIndex].options[action.option] as EventOption | undefined;
    if (!option || !canEvent(r, option)) return run;
    r.coins += option.coins ?? 0;
    if (option.maxHealth) {
      r.maxHealth += option.maxHealth;
      r.health = Math.min(r.health, r.maxHealth);
    }
    if ((option.health ?? 0) < 0) r.health += option.health!;
    else heal(r, option.health ?? 0);
    r.attack += option.attack ?? 0;
    r.armor += option.armor ?? 0;
    r.flasks = Math.max(0, Math.min(5, r.flasks + (option.flasks ?? 0)));
    if (!r.lore.includes(option.lore)) r.lore.push(option.lore);
    note(r, option.result);
    if (option.relic) {
      const [found] = drawRelics(r, 'event', 1, 7000 + r.depth * 17);
      if (found) {
        addRelic(r, found);
        note(r, `You carry the ${RELICS[found].name}. ${RELICS[found].description}`);
      } else {
        r.coins += 30;
        note(r, 'There is nothing left you do not already carry. You find 30 coins instead.');
      }
    }
    r.phase = 'map';
    return r;
  }
  if (action.type === 'camp' && r.phase === 'camp') {
    if (action.choice === 'forge') {
      if (r.coins < 30) return run;
      r.coins -= 30;
      r.attack += 2;
    } else if (action.choice === 'rest') {
      if (r.health === r.maxHealth) return run;
      heal(r, restAmount(r));
    } else {
      if (r.flasks >= 5) return run;
      r.flasks += 1;
    }
    note(
      r,
      action.choice === 'rest'
        ? 'The fire keeps watch while you sleep.'
        : action.choice === 'forge'
          ? 'Your blade holds a little more of the light.'
          : 'You bottle a little warmth for the road.',
    );
    r.phase = 'map';
    return r;
  }
  if (action.type === 'buy' && canBuy(r, action.item)) {
    r.coins -= priceOf(r, action.item);
    r.purchased.push(action.item);
    if (action.item === 'flask') r.flasks += 1;
    else if (action.item === 'heal') heal(r, 20);
    else if (action.item === 'forge') r.attack += 2;
    else {
      addRelic(r, action.item);
      r.shop = r.shop!.filter((id) => id !== action.item);
      note(r, `You carry the ${RELICS[action.item].name}. ${RELICS[action.item].flavor}`);
    }
    return r;
  }
  if (action.type === 'leave' && (r.phase === 'shop' || r.phase === 'camp')) {
    r.phase = 'map';
    return r;
  }
  if (
    action.type === 'ending' &&
    r.phase === 'ending' &&
    ['dawn', 'hearth'].includes(action.choice)
  ) {
    r.ending = action.choice;
    r.lore.push(action.choice);
    if (v3) r.lore.push(`${r.keeper}-${action.choice}`);
    r.phase = 'won';
    return r;
  }
  return run;
}
