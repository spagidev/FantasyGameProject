import { describe, expect, it } from 'vitest';
import { campaignAction } from '../../tests/player';
import { BOSSES, ELITES, FOES, ORDINARY } from './bestiary';
import {
  EVENTS,
  KEEPERS,
  RELICS,
  STARTING_RELICS,
  startingStats,
  type Intent,
  type KeeperId,
  type RelicId,
} from './data';
import {
  DUSK_MAX,
  DUSK_RULES,
  availableTalents,
  canBuy,
  canEvent,
  drawRelics,
  guardAmount,
  incomingDamage,
  intentFor,
  makeEnemy,
  newRun,
  nextNodes,
  nodeAt,
  nodeOf,
  priceOf,
  skillCost,
  startingFocus,
  strikeDamage,
  techniqueBlocked,
  transition,
  type Action,
  type Run,
} from './engine';
import { advanceSave, decodeSave, emptySave, validRun } from './storage';

/** A ruleset-3 run standing in front of a chosen bestiary entry at the first crossing. */
function fight(keeper: KeeperId, foe: string, patch: Partial<Run> = {}, dusk = 0): Run {
  const base = newRun(keeper, 123, false, { dusk, pool: Object.keys(RELICS) as RelicId[] });
  const kind = BOSSES.some((b) => b.id === foe)
    ? 'boss'
    : ELITES.flat().some((e) => e.id === foe)
      ? 'elite'
      : 'battle';
  return {
    ...base,
    phase: 'combat',
    depth: 0,
    lane: 0,
    path: ['0-0'],
    focus: startingFocus({ ...base, ...patch }),
    enemy: makeEnemy({ ...nodeOf(base, 0, 0), kind, foe }, 3, dusk),
    ...patch,
  };
}
const act = (r: Run, type: 'strike' | 'guard' | 'skill' | 'technique' | 'flask') =>
  transition(r, { type });
function withPattern(r: Run, pattern: Intent[], patch: Partial<NonNullable<Run['enemy']>> = {}) {
  return { ...r, enemy: { ...r.enemy!, pattern, ...patch } };
}

describe('ruleset 3 starting statistics', () => {
  it('the balance pass adjusts only new expeditions', () => {
    expect(startingStats('warden')).toEqual({ health: 48, attack: 7, armor: 2 });
    expect(startingStats('seer')).toEqual({ health: 38, attack: 6, armor: 1 });
    expect(startingStats('wayfarer')).toEqual({ health: 44, attack: 6, armor: 1 });
    for (const keeper of Object.keys(KEEPERS) as KeeperId[]) {
      const r = newRun(keeper, 1);
      expect([r.health, r.maxHealth, r.attack, r.armor]).toEqual([
        startingStats(keeper).health,
        startingStats(keeper).health,
        startingStats(keeper).attack,
        startingStats(keeper).armor,
      ]);
      const old = newRun(keeper, 1, false, { ruleset: 2 });
      expect([old.health, old.armor]).toEqual([KEEPERS[keeper].health, KEEPERS[keeper].armor]);
    }
  });
});

describe('poise and stagger', () => {
  it('hits wear poise; breaking it cancels the telegraphed action and exposes the enemy', () => {
    const r = fight('warden', 'watcher'); // 24 health, 11 poise, attacks for 6 raw first
    expect(r.enemy).toMatchObject({ health: 24, poise: 11, maxPoise: 11, stagger: 0 });
    r.enemy = { ...r.enemy!, health: 60, maxHealth: 60 };
    const one = act(r, 'strike');
    expect(one.enemy!.poise).toBe(4);
    expect(one.health).toBe(48 - 4);
    const two = act(one, 'strike'); // 7 more: breaks before "Gathering shadow"
    expect(two.enemy!.stagger).toBe(1);
    expect(two.enemy!.guard).toBe(0); // the guard intention never happened
    expect(two.enemy!.maxPoise).toBe(15); // 11 × 1.3, rounded up
    expect(two.enemy!.poise).toBe(15);
    expect(two.stats!.staggers).toBe(1);
    expect(two.log.join(' ')).toContain('loses “Gathering shadow”');
    expect(intentFor(two)!.name).toBe('Heavy strike'); // the pattern moved on
    const three = act(two, 'strike'); // exposed: 7 × 1.5 = 10
    expect(three.enemy!.health).toBe(60 - 14 - 10);
    expect(three.enemy!.poise).toBe(15); // poise cannot be worn while it is staggered
    expect(three.enemy!.stagger).toBe(0); // it has acted again
    expect(three.health).toBe(48 - 4 - 10);
  });
  it('a perfect guard turns the blocked damage into poise damage; a partial one does not', () => {
    const r = fight('warden', 'watcher');
    const guarded = act(r, 'guard');
    expect(guarded.health).toBe(48);
    expect(guarded.enemy!.poise).toBe(11 - 4);
    expect(guarded.stats!.parries).toBe(1);
    const heavy = withPattern(r, [{ name: 'Crush', damage: 40 }]);
    const partial = act(heavy, 'guard');
    expect(partial.health).toBe(48 - (38 - 11));
    expect(partial.enemy!.poise).toBe(11);
    expect(partial.stats!.parries).toBe(0);
  });
  it('a guard that breaks poise costs the enemy its following action', () => {
    const r = withPattern(fight('warden', 'watcher'), [
      { name: 'Big', damage: 13 },
      { name: 'Second', damage: 13 },
      { name: 'Third', damage: 13 },
    ]);
    const parried = act(r, 'guard'); // blocks 11 ≥ poise 11
    expect(parried.enemy!.stagger).toBe(2);
    expect(incomingDamage(parried)).toBe(0);
    const free = act(parried, 'strike');
    expect(free.health).toBe(48);
    expect(free.enemy!.stagger).toBe(1);
    expect(free.enemy!.health).toBe(24 - 10);
    expect(intentFor(free)!.name).toBe('Third');
  });
  it('the Executioner’s Chime and Bell Clapper change the stagger numbers', () => {
    const r = fight('warden', 'watcher', { relics: ['chime', 'clapper'] });
    const one = act(r, 'strike'); // 7 × 1.5 = 11 poise damage: breaks at once
    expect(one.enemy!.stagger).toBe(1);
    expect(one.health).toBe(48);
    const two = act(one, 'strike');
    expect(two.enemy!.health).toBe(24 - 7 - 14);
  });
});

describe('keeper techniques', () => {
  it('Shield bash hits for the guard value and wears poise twice as fast', () => {
    const r = fight('warden', 'thornbound', { focus: 2 });
    const next = act(r, 'technique');
    expect(next.focus).toBe(0);
    expect(next.enemy!.health).toBe(r.enemy!.health - guardAmount(r));
    expect(next.enemy!.stagger).toBe(1); // 22 poise damage against 16
    expect(next.health).toBe(48); // bash is not a Strike: no thorns, and the action was lost
    expect(act({ ...r, focus: 1 }, 'technique')).toEqual({ ...r, focus: 1 });
  });
  it('Foresee guards exactly the incoming blow and is refused when there is none', () => {
    const r = withPattern(fight('seer', 'watcher', { focus: 2 }), [
      { name: 'Crush', damage: 30 },
      { name: 'Wait', damage: 0, guard: 1 },
    ]);
    const next = act(r, 'technique');
    expect(next.health).toBe(38);
    expect(next.stats!.parries).toBe(1);
    expect(next.enemy!.stagger).toBe(2);
    expect(techniqueBlocked(next)).toBe('Not enough focus');
    expect(techniqueBlocked({ ...next, focus: 5 })).toBe('No blow to foresee');
    expect(act({ ...next, focus: 5 }, 'technique')).toEqual({ ...next, focus: 5 });
  });
  it('Quicken makes poison bite twice without fading', () => {
    const r = fight('wayfarer', 'thornbound', { focus: 5 });
    expect(techniqueBlocked(r)).toBe('No poison to quicken');
    const bloom = act(r, 'skill'); // 8 damage, 5 poison, ticks for 5 → 4 stacks
    expect(bloom.enemy!.poison).toBe(4);
    const quick = act(bloom, 'technique');
    expect(quick.enemy!.health).toBe(bloom.enemy!.health - 8 - 4);
    expect(quick.enemy!.poison).toBe(3);
  });
  it('the Seer begins every battle with one extra focus; older rulesets do not', () => {
    expect(startingFocus(newRun('seer', 1))).toBe(3);
    expect(startingFocus(newRun('seer', 1, false, { ruleset: 2 }))).toBe(2);
    const legacy = transition(newRun('warden', 123, false, { ruleset: 2 }), {
      type: 'travel',
      lane: 0,
    });
    expect(transition({ ...legacy, focus: 5 }, { type: 'technique' })).toEqual({
      ...legacy,
      focus: 5,
    });
  });
});

describe('enemy intentions and traits', () => {
  it('armor applies to every hit of a multi-hit attack, and fury raises each hit', () => {
    const r = withPattern(fight('warden', 'watcher'), [
      { name: 'Roar', damage: 0, fury: 3 },
      { name: 'Flurry', damage: 5, hits: 3 },
    ]);
    const roared = act(r, 'flask'); // refused at full health
    expect(roared).toBe(r);
    const one = act(r, 'guard');
    expect(one.enemy!.fury).toBe(3);
    expect(incomingDamage(one)).toBe((5 + 3 - 2) * 3);
    const two = act(one, 'strike');
    expect(two.health).toBe(48 - 18);
  });
  it('weakness softens the next two actions; frost bites each enemy turn and a flask lifts both', () => {
    const r = withPattern(fight('seer', 'watcher', { focus: 0 }), [
      { name: 'Chill', damage: 0, weak: 2, frost: 3 },
      { name: 'Wait', damage: 0, guard: 0 },
      { name: 'Wait', damage: 0, guard: 0 },
    ]);
    const one = act(r, 'strike');
    expect(one.weak).toBe(2);
    expect(one.frost).toBe(3);
    expect(one.health).toBe(38);
    const two = act(one, 'strike'); // 6 × 0.75 = 4
    expect(two.enemy!.health).toBe(one.enemy!.health - 4);
    expect(two.weak).toBe(1);
    expect(two.health).toBe(38 - 3);
    expect(two.frost).toBe(2);
    const three = act(two, 'flask');
    expect(three.frost).toBe(0);
    expect(three.weak).toBe(0);
    expect(three.health).toBe(38);
    const warded = act({ ...r, relics: ['sprig'] }, 'strike');
    expect(warded.weak).toBe(0);
    expect(warded.frost).toBe(0);
  });
  it('thorns never take the last point of health, regrowth mends, plating blunts all but piercing', () => {
    const thorny = act(fight('warden', 'thornbound', { health: 2 }), 'guard');
    expect(act({ ...thorny, health: 2 }, 'strike').health).toBeGreaterThanOrEqual(1);
    const shade = fight('warden', 'shade');
    const hurt = act(shade, 'guard');
    expect(hurt.enemy!.health).toBe(hurt.enemy!.maxHealth);
    const struck = act(shade, 'strike');
    expect(struck.enemy!.health).toBe(shade.enemy!.health - 7 + 3);
    const plated = fight('warden', 'soldier');
    expect(act(plated, 'strike').enemy!.health).toBe(plated.enemy!.health - 5);
    const seer = fight('seer', 'soldier', { focus: 3 });
    expect(act(seer, 'skill').enemy!.health).toBe(seer.enemy!.health - 19);
  });
  it('a guardian changes its pattern only after the action in which it falls to half health', () => {
    const r = fight('warden', 'bellwether');
    r.enemy!.health = Math.floor(r.enemy!.maxHealth / 2) + 5;
    expect(intentFor(r)!.name).toBe('Antler sweep');
    const next = act(r, 'strike');
    expect(next.health).toBe(48 - 6); // the telegraphed sweep still resolved
    expect(next.enemy!.phase).toBe(2);
    expect(intentFor(next)!.name).toBe('Stampede');
    expect(next.log.join(' ')).toContain('The bell cracks');
  });
  it('every bestiary entry is well formed and reachable', () => {
    expect(Object.keys(FOES)).toHaveLength(21);
    for (const foe of Object.values(FOES)) {
      expect(foe.health).toBeGreaterThan(0);
      expect(foe.poise).toBeGreaterThan(0);
      expect(foe.pattern.some((i) => i.damage > 0)).toBe(true);
      expect(foe.blurb.length).toBeGreaterThan(20);
    }
    expect(ORDINARY.every((c) => c.length === 4)).toBe(true);
    expect(BOSSES.every((b) => b.phase2)).toBe(true);
  });
});

describe('relics of the long night', () => {
  it('strike relics: Kindling, Echo Bell, Moth Lantern, Starved Wick, Echo Whetstone', () => {
    const base = fight('warden', 'hand');
    expect(strikeDamage({ ...base, relics: ['kindling'] })).toEqual({ damage: 14, hits: 1 });
    expect(strikeDamage({ ...base, relics: ['kindling'], strikes: 1 }).damage).toBe(7);
    expect(strikeDamage({ ...base, relics: ['echo'], strikes: 2 }).hits).toBe(2);
    expect(strikeDamage({ ...base, relics: ['lantern'], focus: 5 }).damage).toBe(12);
    expect(strikeDamage({ ...base, relics: ['wick'], health: 24 }).damage).toBe(10);
    const partial = act(
      withPattern({ ...base, relics: ['whetstone'] }, [{ name: 'Crush', damage: 30 }]),
      'guard',
    );
    expect(partial.charge).toBe(false);
    const perfect = act(
      withPattern({ ...base, relics: ['whetstone'] }, [{ name: 'Jab', damage: 6 }]),
      'guard',
    );
    expect(perfect.charge).toBe(true);
    const struck = act(perfect, 'strike');
    expect(struck.charge).toBe(false);
    expect(struck.enemy!.health).toBe(perfect.enemy!.health - 13);
    const echoed = act({ ...base, relics: ['echo'], strikes: 2 }, 'strike');
    expect(echoed.enemy!.health).toBe(base.enemy!.health - 14);
  });
  it('guard relics: Censer, Buckle, Mirror, Thornmail, Gravebloom', () => {
    const base = withPattern(fight('warden', 'hand'), [
      { name: 'Jab', damage: 6 },
      { name: 'Jab', damage: 6 },
    ]);
    const smoked = act({ ...base, relics: ['censer'] }, 'guard');
    expect(smoked.enemy!.poison).toBe(1);
    expect(smoked.enemy!.health).toBe(base.enemy!.health - 2);
    const kept = act({ ...base, relics: ['buckle'] }, 'guard');
    expect(kept.guard).toBe(6);
    expect(act(kept, 'strike').health).toBe(48); // six carried guard absorbs the next jab
    const mirrored = act({ ...base, relics: ['mirror'] }, 'guard');
    expect(mirrored.enemy!.health).toBe(base.enemy!.health - 2);
    const pricked = act({ ...base, relics: ['thornmail'] }, 'strike');
    expect(pricked.enemy!.health).toBe(base.enemy!.health - 7 - 4);
    const wilted = { ...base, relics: ['gravebloom'] as RelicId[] };
    wilted.enemy = { ...wilted.enemy!, poison: 3 };
    expect(incomingDamage(wilted)).toBe(2);
  });
  it('Lodestar, Vigil Candle, Silver Dew, Hourglass, Idol and Phoenix Cinder', () => {
    const base = fight('warden', 'hand');
    expect(skillCost({ ...base, relics: ['lodestar'] })).toBe(2);
    expect(startingFocus({ ...base, relics: ['vigil'] })).toBe(3);
    const dewy = act({ ...base, relics: ['dew'], health: 10 }, 'flask');
    expect(dewy.health).toBe(10 + 24 - (11 - 6));
    const reward = { ...base, phase: 'reward' as const, rewards: ['idol'] as RelicId[] };
    const idol = transition(reward, { type: 'reward', id: 'idol' });
    expect([idol.attack, idol.maxHealth, idol.health]).toEqual([11, 40, 40]);
    const dying = withPattern({ ...base, relics: ['cinder'], health: 3 }, [
      { name: 'End', damage: 99 },
    ]);
    const saved = act(dying, 'strike');
    expect(saved.phase).toBe('combat');
    expect(saved.health).toBe(12);
    expect(saved.spent).toEqual(['cinder']);
    expect(act(saved, 'strike').phase).toBe('lost');
    const start = transition(
      { ...newRun('warden', 123), relics: ['hourglass'] },
      { type: 'travel', lane: 0 },
    );
    expect(start.enemy!.stagger).toBe(2);
    expect(incomingDamage(start)).toBe(0);
  });
  it('victory relics: Ferryman’s Coin and Frayed Bell-rope', () => {
    const r = fight('warden', 'thornbound', { relics: ['ferrycoin', 'bellrope'] });
    r.enemy!.health = 1;
    // an elite stands at a seeded position; the victory reads the node the keeper is on
    const elite = [0, 1, 2].find((lane) => nodeOf(r, 1, lane).kind === 'elite')!;
    const won = act({ ...r, depth: 1, lane: elite, path: ['0-0', `1-${elite}`] }, 'strike');
    expect(won.coins).toBe(35 + 32 + 8);
    expect(won.flasks).toBe(3);
    expect(won.stats!.elites).toBe(1);
    expect(won.slain).toEqual(['thornbound']);
  });
  it('draws distinct, unowned relics deterministically and favors rarity for guardians', () => {
    const r = newRun('warden', 99, false, { pool: Object.keys(RELICS) as RelicId[] });
    const offer = drawRelics(r, 'battle', 3, 5000);
    expect(new Set(offer).size).toBe(3);
    expect(drawRelics(r, 'battle', 3, 5000)).toEqual(offer);
    expect(
      drawRelics({ ...r, relics: offer }, 'battle', 3, 5000).some((id) => offer.includes(id)),
    ).toBe(false);
    let rare = 0;
    for (let seed = 1; seed <= 200; seed++)
      rare += drawRelics({ ...r, seed }, 'boss', 3, 5000).filter(
        (id) => RELICS[id].rarity === 'rare',
      ).length;
    expect(rare).toBeGreaterThan(200);
    const starter = newRun('warden', 99);
    expect(starter.pool).toEqual(STARTING_RELICS);
    expect(drawRelics(starter, 'boss', 3, 5000).every((id) => STARTING_RELICS.includes(id))).toBe(
      true,
    );
    expect(drawRelics({ ...starter, relics: [...STARTING_RELICS] }, 'battle', 3, 1)).toEqual([]);
  });
});

describe('seeded routes, traders and scenes', () => {
  it('every realm keeps its skeleton while the middle is arranged by the seed', () => {
    const layouts = new Set<string>();
    for (let seed = 1; seed <= 60; seed++) {
      const scenes: number[] = [];
      for (let chapter = 0; chapter < 3; chapter++) {
        const row = (step: number) =>
          [0, 1, 2].map((lane) => nodeAt(seed, chapter * 4 + step, lane, 'seeded'));
        expect(row(0).every((n) => n.kind === 'battle')).toBe(true);
        expect(new Set(row(0).map((n) => n.foe)).size).toBe(3);
        expect(
          row(1)
            .map((n) => n.kind)
            .sort(),
        ).toEqual(['battle', 'elite', 'event']);
        const before = row(2).map((n) => n.kind);
        expect(before).toContain('camp');
        expect(before).toContain('shop');
        expect(nodeAt(seed, chapter * 4 + 3, 1, 'seeded')).toMatchObject({
          kind: 'boss',
          foe: BOSSES[chapter].id,
        });
        for (const n of [...row(1), ...row(2)]) if (n.kind === 'event') scenes.push(n.eventIndex);
        if (chapter === 0) layouts.add([...row(1), ...row(2)].map((n) => n.kind).join());
      }
      expect(new Set(scenes).size).toBe(scenes.length); // no scene repeats in one expedition
    }
    expect(layouts.size).toBeGreaterThan(12);
    expect(nodeAt(7, 5, 2, 'seeded')).toEqual(nodeAt(7, 5, 2, 'seeded'));
    expect(nodeAt(7, 1, 1).kind).toBe('elite'); // the classic layout is untouched
    expect(nodeAt(7, 2, 1, 'atlas').kind).toBe('shop'); // charts keep their fixed encounters
  });
  it('a trader stocks three relics; purchases, prices and the Trader’s Scale are exact', () => {
    let r = newRun('warden', 2026);
    while (r.phase !== 'shop') r = transition(r, routeTo(r, 'shop'));
    expect(r.shop).toHaveLength(3);
    const [first] = r.shop!;
    const rich = { ...r, coins: 500 };
    expect(priceOf(rich, first)).toBe({ common: 40, uncommon: 55, rare: 75 }[RELICS[first].rarity]);
    const bought = transition(rich, { type: 'buy', item: first });
    expect(bought.relics).toContain(first);
    expect(bought.shop).not.toContain(first);
    expect(bought.coins).toBe(500 - priceOf(rich, first));
    expect(canBuy(bought, first)).toBe(false);
    expect(canBuy({ ...r, coins: priceOf(r, first) - 1 }, first)).toBe(false);
    expect(priceOf({ ...rich, relics: ['scale'] }, 'forge')).toBe(27);
    expect(priceOf({ ...rich, dusk: 7 }, 'forge')).toBe(42);
    expect(canBuy(rich, 'lodestar' as RelicId)).toBe(r.shop!.includes('lodestar'));
    const reloaded = decodeSave(JSON.stringify(advanceSave(emptySave(), bought)))!.run!;
    expect(reloaded).toEqual(bought);
  });
  it('story scenes apply every documented cost and reward, and refuse unaffordable ones', () => {
    const at = (name: string, patch: Partial<Run> = {}): Run => {
      for (let seed = 1; seed < 400; seed++) {
        const base = newRun('warden', seed);
        for (const lane of [0, 1, 2]) {
          const node = nodeOf(base, 1, lane);
          if (node.kind === 'event' && node.name === name)
            return { ...base, phase: 'event', depth: 1, lane, path: ['0-1', node.id], ...patch };
        }
      }
      throw new Error(`no seed places ${name}`);
    };
    const founder = at('The bell-founder’s ghost', { health: 20 });
    expect(transition(founder, { type: 'event', option: 0 })).toMatchObject({
      armor: 3,
      coins: 10,
    });
    const gift = transition(founder, { type: 'event', option: 1 });
    expect(gift.health).toBe(12);
    expect(gift.relics).toHaveLength(1);
    expect(gift.lore).toContain('founder');
    const hedge = at('The hedge that asks', { health: 20 });
    expect(transition(hedge, { type: 'event', option: 0 })).toMatchObject({
      maxHealth: 58,
      health: 13,
    });
    expect(transition(hedge, { type: 'event', option: 1 })).toMatchObject({
      flasks: 1,
      attack: 9,
    });
    expect(canEvent({ ...hedge, flasks: 0 }, EVENTS[4].options[1])).toBe(false);
    const face = at('The face that asks your name');
    expect(transition(face, { type: 'event', option: 0 })).toMatchObject({
      maxHealth: 42,
      health: 42,
      attack: 10,
    });
    for (const event of EVENTS)
      for (const option of event.options) {
        expect(option.description.length).toBeGreaterThan(5);
        expect(option.lore.length).toBeGreaterThan(2);
      }
  });
  it('offers three of four lessons after a bell in ruleset 3', () => {
    for (const keeper of Object.keys(KEEPERS) as KeeperId[]) {
      const r = { ...newRun(keeper, 55), phase: 'talent' as const, depth: 3, bells: 1 };
      expect(availableTalents(r)).toHaveLength(3);
      const learned = transition(r, { type: 'talent', id: availableTalents(r)[0] });
      expect(availableTalents({ ...learned, phase: 'talent', depth: 7, bells: 2 })).toHaveLength(3);
    }
  });
});

function routeTo(r: Run, kind: string): Action {
  if (r.phase !== 'map') return campaignAction(r);
  const options = nextNodes(r);
  // Prefer a lane from which the wanted kind is still reachable on the next crossing.
  const wanted = options.find((n) => n.kind === kind);
  if (wanted) return { type: 'travel', lane: wanted.lane };
  const ahead = options.find((n) =>
    [0, 1, 2].some(
      (lane) => Math.abs(lane - n.lane) <= 1 && nodeOf(r, n.depth + 1, lane).kind === kind,
    ),
  );
  return { type: 'travel', lane: (ahead ?? options[0]).lane };
}

describe('dusk, saves and complete expeditions', () => {
  it('each dusk level applies exactly its listed rule', () => {
    expect(DUSK_RULES).toHaveLength(DUSK_MAX);
    const node = { ...nodeAt(1, 0, 0, 'seeded'), foe: 'watcher' };
    const boss = { ...nodeAt(1, 3, 1, 'seeded') };
    expect(makeEnemy(node, 3, 0)).toMatchObject({ maxHealth: 24, maxPoise: 11 });
    expect(makeEnemy(node, 3, 1).maxHealth).toBe(26);
    expect(makeEnemy(boss, 3, 1).pattern[0].damage).toBe(8);
    expect(makeEnemy(boss, 3, 2).pattern[0].damage).toBe(10);
    expect(makeEnemy(node, 3, 2).pattern[0].damage).toBe(6);
    expect(newRun('warden', 1, false, { dusk: 2 }).flasks).toBe(2);
    expect(newRun('warden', 1, false, { dusk: 3 }).flasks).toBe(1);
    expect(makeEnemy(node, 3, 4).maxPoise).toBe(14);
    expect(makeEnemy(node, 3, 5).pattern[0].damage).toBe(7);
    expect(makeEnemy(node, 3, 8).maxHealth).toBe(30);
    expect(makeEnemy(boss, 3, 8).fury).toBe(2);
    expect(makeEnemy(boss, 3, 7).fury).toBe(0);
    expect(newRun('warden', 1, false, { dusk: 99 }).dusk).toBe(DUSK_MAX);
    const camp = { ...newRun('warden', 1, false, { dusk: 6 }), health: 10, phase: 'camp' as const };
    expect(transition(camp, { type: 'camp', choice: 'rest' }).health).toBe(24);
  });
  it('validates every ruleset-3 field and rejects impossible states', () => {
    const r = act(fight('warden', 'watcher'), 'strike');
    expect(validRun(r)).toBe(true);
    const save = advanceSave(emptySave(), r);
    expect(decodeSave(JSON.stringify(save))).toEqual(save);
    for (const bad of [
      { ...r, dusk: 9 },
      { ...r, pool: ['nope'] },
      { ...r, frost: -1 },
      { ...r, stats: { ...r.stats, turns: -1 } },
      { ...r, spent: ['briar'] },
      { ...r, slain: ['dragon'] },
      { ...r, daily: 'tomorrow' },
      { ...r, enemy: { ...r.enemy, poise: 999 } },
      { ...r, enemy: { ...r.enemy, stagger: 3 } },
      { ...r, enemy: { ...r.enemy, id: 'dragon' } },
      { ...r, enemy: { ...r.enemy, traits: { wings: 2 } } },
      { ...r, phase: 'shop' },
      { ...r, talents: ['breaker'], bells: 1, ruleset: 2 },
    ])
      expect(validRun(bad), JSON.stringify(bad).slice(0, 200)).toBe(false);
  });
  for (const keeper of Object.keys(KEEPERS) as KeeperId[]) {
    it(`${keeper} completes a ruleset-3 expedition with legal actions and valid saves`, () => {
      let r = newRun(keeper, 8128);
      let actions = 0;
      while (!['won', 'lost'].includes(r.phase) && actions++ < 600) {
        const next = transition(r, campaignAction(r));
        expect(next).not.toBe(r);
        expect(validRun(next), JSON.stringify(next).slice(0, 400)).toBe(true);
        r = next;
      }
      expect(r.phase).toBe('won');
      expect(r.bells).toBe(3);
      expect(r.path).toHaveLength(12);
      expect(r.slain!.length).toBeGreaterThanOrEqual(6);
      expect(r.stats!.staggers).toBeGreaterThan(0);
      expect(r.stats!.turns).toBeGreaterThan(30);
    });
  }
});
