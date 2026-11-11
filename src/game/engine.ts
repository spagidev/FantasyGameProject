import {
  CHAPTERS,
  EVENTS,
  KEEPERS,
  RELICS,
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
export type Enemy = {
  name: string;
  art: EnemyArt;
  health: number;
  maxHealth: number;
  guard: number;
  poison: number;
  pattern: Intent[];
};
export type MapNode = {
  id: string;
  depth: number;
  lane: number;
  kind: NodeKind;
  name: string;
  eventIndex: number;
};
export type Run = {
  version: 2;
  ruleset: 1 | 2;
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
};
export type Action =
  | { type: 'travel'; lane: number }
  | { type: 'strike' | 'guard' | 'skill' | 'flask' }
  | { type: 'reward'; id: RelicId | 'heal' }
  | { type: 'event'; option: number }
  | { type: 'camp'; choice: 'rest' | 'flask' | 'forge' }
  | { type: 'buy'; item: 'flask' | 'heal' | 'forge' }
  | { type: 'leave' }
  | { type: 'talent'; id: TalentId }
  | { type: 'ending'; choice: 'dawn' | 'hearth' };

export function hash(seed: number, index: number): number {
  let n = (seed ^ Math.imul(index + 1, 0x9e3779b9)) >>> 0;
  n = Math.imul(n ^ (n >>> 16), 0x21f0aaad);
  n = Math.imul(n ^ (n >>> 15), 0x735a2d97);
  return (n ^ (n >>> 15)) >>> 0;
}

export function newRun(keeper: KeeperId, seed: number): Run {
  const k = KEEPERS[keeper];
  return {
    version: 2,
    ruleset: 2,
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
    flasks: 2,
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
  };
}

export function nodeAt(seed: number, depth: number, lane: number): MapNode {
  const h = hash(seed, depth * 3 + lane);
  const chapter = Math.floor(depth / 4);
  const step = depth % 4;
  const kind: NodeKind =
    step === 3
      ? 'boss'
      : step === 0
        ? 'battle'
        : step === 1
          ? lane === 1
            ? 'elite'
            : 'event'
          : lane === 1
            ? 'shop'
            : 'camp';
  const eventIndex = h % EVENTS.length;
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
          ? ['The quiet hearth', 'A roof of stars'][lane % 2]
          : kind === 'shop'
            ? 'The lantern market'
            : kind === 'elite'
              ? ['The Thornbound', 'The Glass Captain', 'The King’s Hand'][chapter]
              : names[chapter][h % 3];
  return { id: `${depth}-${lane}`, depth, lane, kind, name, eventIndex };
}

export function nextNodes(run: Run): MapNode[] {
  if (run.phase !== 'map' || run.depth >= 11) return [];
  const d = run.depth + 1;
  return (d % 4 === 3 ? [1] : [0, 1, 2])
    .filter((l) => d % 4 === 0 || Math.abs(l - run.lane) <= 1)
    .map((l) => nodeAt(run.seed, d, l));
}

export function makeEnemy(node: MapNode, ruleset: 1 | 2 = 2): Enemy {
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
  return Math.min(5, 2 + roadBenefits(r).focus + (r.talents.includes('astral') ? 1 : 0));
}
export function strikeFocus(r: Run) {
  return 1 + (r.relics.includes('mothglass') ? 1 : 0) + (r.talents.includes('vow') ? 1 : 0);
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
export function skillDamage(r: Run) {
  return (
    (r.keeper === 'wayfarer' ? r.attack + 2 : r.attack * 2 + (r.keeper === 'seer' ? 7 : 3)) +
    (r.talents.includes('sunsteel') || r.talents.includes('starfall') ? 5 : 0)
  );
}
export function poisonAmount(r: Run) {
  return 5 + (r.talents.includes('bloom') ? 2 : 0);
}
export function strikeHealing(r: Run) {
  return r.keeper === 'wayfarer' ? (r.talents.includes('sap') ? 3 : 2) : 0;
}
export function availableTalents(r: Run): TalentId[] {
  return (Object.keys(TALENTS) as TalentId[]).filter(
    (id) => TALENTS[id].keeper === r.keeper && !r.talents.includes(id),
  );
}
export function victoryCoins(r: Run, node = nodeAt(r.seed, r.depth, r.lane)) {
  return (
    (node.kind === 'boss' ? 45 : node.kind === 'elite' ? 32 : 18) +
    (r.talents.includes('trail') ? 6 : 0)
  );
}

export function intentFor(run: Run): Intent | null {
  return run.enemy ? run.enemy.pattern[run.turn % run.enemy.pattern.length] : null;
}
export function incomingDamage(run: Run): number {
  return Math.max(0, (intentFor(run)?.damage ?? 0) - run.armor);
}
export function canEvent(run: Run, option: EventOption): boolean {
  return run.coins + (option.coins ?? 0) >= 0 && run.health + (option.health ?? 0) > 0;
}
export function canBuy(run: Run, item: 'flask' | 'heal' | 'forge'): boolean {
  const price = { flask: 14, heal: 18, forge: 35 }[item];
  return (
    run.phase === 'shop' &&
    !run.purchased.includes(item) &&
    run.coins >= price &&
    (item !== 'flask' || run.flasks < 5) &&
    (item !== 'heal' || run.health < run.maxHealth)
  );
}

function heal(r: Run, amount: number) {
  r.health = Math.min(r.maxHealth, r.health + amount);
}
function note(r: Run, text: string) {
  r.log = [...r.log, text].slice(-8);
}
function hitEnemy(r: Run, amount: number, piercing = false) {
  if (!r.enemy) return;
  const blocked = piercing ? 0 : Math.min(r.enemy.guard, amount);
  r.enemy.guard -= blocked;
  r.enemy.health = Math.max(0, r.enemy.health - (amount - blocked));
  note(r, `${amount - blocked} damage dealt${blocked ? ` · ${blocked} blocked` : ''}.`);
}
function addRelic(r: Run, id: RelicId) {
  r.relics.push(id);
  if (id === 'dawn') r.attack += 2;
  if (id === 'psalm') r.armor += 1;
  if (id === 'hearthseed') {
    r.maxHealth += 10;
    heal(r, 10);
  }
}
function victory(r: Run) {
  const kind = nodeAt(r.seed, r.depth, r.lane).kind;
  const coins = victoryCoins(r);
  r.coins += coins;
  r.guard = 0;
  if (r.relics.includes('thread')) heal(r, 5);
  if (r.talents.includes('trail')) heal(r, 2);
  const site = waylightFor(nodeAt(r.seed, r.depth, r.lane));
  if (r.ruleset === 2 && site) {
    r.waylights.push(site);
    note(r, `${WAYLIGHTS[site].name} is rekindled. ${WAYLIGHTS[site].benefit}`);
  }
  if (kind === 'boss') {
    r.bells += 1;
    r.lore.push(`bell-${r.bells}`);
  }
  const available = (Object.keys(RELICS) as RelicId[]).filter((id) => !r.relics.includes(id));
  r.rewards = available
    .sort(
      (a, b) =>
        hash(r.seed, r.depth + Object.keys(RELICS).indexOf(a) * 37) -
        hash(r.seed, r.depth + Object.keys(RELICS).indexOf(b) * 37),
    )
    .slice(0, 3);
  r.phase = r.depth === 11 ? 'ending' : 'reward';
  note(r, `${r.enemy?.name} falls. You recover ${coins} coins.`);
}

export function transition(run: Run, action: Action): Run {
  const r = structuredClone(run);
  if (action.type === 'travel') {
    if (!nextNodes(r).some((n) => n.lane === action.lane)) return run;
    const benefits = roadBenefits(r);
    heal(r, benefits.health);
    r.coins += benefits.coins;
    r.depth += 1;
    r.lane = action.lane;
    const node = nodeAt(r.seed, r.depth, r.lane);
    r.path.push(node.id);
    r.purchased = [];
    r.enemy = null;
    if (['battle', 'elite', 'boss'].includes(node.kind)) {
      r.enemy = makeEnemy(node, r.ruleset);
      r.turn = 0;
      r.focus = startingFocus(r);
      r.guard = 0;
      r.phase = 'combat';
      r.log = [`${node.name} stands between you and the next bell.`];
    } else {
      r.phase = node.kind as 'event' | 'camp' | 'shop';
    }
    return r;
  }
  if (['strike', 'guard', 'skill', 'flask'].includes(action.type)) {
    if (r.phase !== 'combat' || !r.enemy) return run;
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
        r.enemy.poison += poisonAmount(r);
      }
    } else {
      r.flasks -= 1;
      heal(r, 16);
      note(r, 'A draught of warmth. Restored up to 16 health.');
    }
    if (r.enemy.health <= 0) {
      victory(r);
      return r;
    }
    if (r.enemy.poison > 0) {
      note(r, `Nightbloom deals ${r.enemy.poison} poison damage.`);
      r.enemy.health = Math.max(0, r.enemy.health - r.enemy.poison);
      r.enemy.poison -= 1;
      if (r.enemy.health <= 0) {
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
      r.enemy.guard += intent.guard;
      note(r, `${r.enemy.name} gains ${intent.guard} guard.`);
    }
    if (intent.heal) {
      r.enemy.health = Math.min(r.enemy.maxHealth, r.enemy.health + intent.heal);
      note(r, `${r.enemy.name} restores ${intent.heal} health.`);
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
  if (action.type === 'reward' && r.phase === 'reward') {
    if (action.id === 'heal') {
      heal(r, 12);
      note(r, 'You leave the relics to the earth and recover a little strength.');
    } else if (r.rewards.includes(action.id) && !r.relics.includes(action.id)) {
      addRelic(r, action.id);
      note(r, `You carry the ${RELICS[action.id].name}. ${RELICS[action.id].flavor}`);
    } else return run;
    r.rewards = [];
    r.phase = r.ruleset === 2 && r.depth % 4 === 3 ? 'talent' : 'map';
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
    const option = EVENTS[nodeAt(r.seed, r.depth, r.lane).eventIndex].options[action.option] as
      EventOption | undefined;
    if (!option || !canEvent(r, option)) return run;
    r.coins += option.coins ?? 0;
    heal(r, option.health ?? 0);
    r.attack += option.attack ?? 0;
    r.flasks = Math.min(5, r.flasks + (option.flasks ?? 0));
    if (!r.lore.includes(option.lore)) r.lore.push(option.lore);
    note(r, option.result);
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
      heal(r, 18);
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
    r.coins -= { flask: 14, heal: 18, forge: 35 }[action.item];
    r.purchased.push(action.item);
    if (action.item === 'flask') r.flasks += 1;
    if (action.item === 'heal') heal(r, 20);
    if (action.item === 'forge') r.attack += 2;
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
    r.phase = 'won';
    return r;
  }
  return run;
}
