import { describe, expect, it } from 'vitest';
import { campaignAction } from '../../tests/player';
import { EVENTS, KEEPERS, type KeeperId, type RelicId } from './data';
import {
  canBuy,
  canEvent,
  intentFor,
  newRun,
  nextNodes,
  nodeAt,
  transition,
  type Action,
  type Run,
} from './engine';
import { advanceSave, decodeSave, emptySave, MAX_SAVE_BYTES, validRun } from './storage';

function battle(keeper: KeeperId = 'warden') {
  return transition(newRun(keeper, 123), { type: 'travel', lane: 0 });
}
function act(r: Run, type: 'strike' | 'guard' | 'skill' | 'flask') {
  return transition(r, { type });
}

describe('deterministic combat', () => {
  it('applies armor, builds focus, and resolves exactly one enemy intent', () => {
    const r = battle();
    const next = act(r, 'strike');
    expect(next.enemy!.health).toBe(r.enemy!.health - 7);
    expect(next.health).toBe(44);
    expect(next.focus).toBe(3);
    expect(next.turn).toBe(1);
    expect(r.turn).toBe(0);
  });
  it('guard absorbs an attack and expires rather than accumulating', () => {
    let r = act(battle(), 'guard');
    expect(r.health).toBe(48);
    expect(r.guard).toBe(0);
    expect(r.focus).toBe(4);
    r = act(r, 'strike'); // enemy guards
    expect(r.enemy!.guard).toBe(5);
    r = act(r, 'strike'); // heavy attack, no leftover guard
    expect(r.health).toBe(39);
    expect(r.enemy!.guard).toBe(0);
  });
  it('does not advance a turn for unavailable actions', () => {
    const r = battle();
    expect(act(r, 'skill')).toBe(r);
    expect(act(r, 'flask')).toBe(r);
    const empty = { ...r, health: 30, flasks: 0 };
    expect(act(empty, 'flask')).toBe(empty);
  });
  it('flasks heal before an enemy action and respect max health', () => {
    const r = { ...battle(), health: 45 };
    const next = act(r, 'flask');
    expect(next.health).toBe(44);
    expect(next.flasks).toBe(1);
    expect(next.turn).toBe(1);
  });
  it('the seer pierces enemy guard without consuming it', () => {
    const r = { ...battle('seer'), focus: 5 };
    r.enemy!.health = 50;
    r.enemy!.maxHealth = 50;
    r.enemy!.guard = 30;
    const next = act(r, 'skill');
    expect(next.enemy!.health).toBe(31);
    expect(next.enemy!.guard).toBe(30);
    expect(next.focus).toBe(2);
  });
  it('poison ticks immediately, decays, bypasses guard and can preempt an attack', () => {
    const r = battle('wayfarer');
    r.enemy!.health = 5;
    r.enemy!.guard = 100;
    const next = act(r, 'skill');
    expect(next.phase).toBe('reward');
    expect(next.health).toBe(40);
    expect(next.enemy!.poison).toBe(4);
    expect(next.enemy!.guard).toBe(92);
  });
  it('wayfarer strikes heal 2 and focus caps at 5', () => {
    const r = { ...battle('wayfarer'), health: 20, turn: 1, focus: 5 };
    const next = act(r, 'strike');
    expect(next.health).toBe(22);
    expect(next.focus).toBe(5);
  });
  it('enemy healing cannot exceed maximum health', () => {
    const r = battle();
    r.enemy!.pattern = [{ name: 'Heal', damage: 0, heal: 100 }];
    const next = act(r, 'strike');
    expect(next.enemy!.health).toBe(next.enemy!.maxHealth);
  });
  it('focus drain respects zero, and lethal damage ends the expedition', () => {
    const r = { ...battle(), health: 1, focus: 0 };
    r.enemy!.pattern = [{ name: 'Drain', damage: 100, drain: 5 }];
    const next = act(r, 'strike');
    expect(next.phase).toBe('lost');
    expect(next.health).toBe(0);
    expect(next.focus).toBe(0);
    expect(act(next, 'strike')).toBe(next);
  });
  it('each relic has its documented mechanical effect', () => {
    const r = {
      ...battle(),
      health: 20,
      focus: 0,
      relics: ['briar', 'mothglass', 'thread'] as RelicId[],
    };
    const guarded = act(r, 'guard');
    expect(guarded.enemy!.health).toBe(r.enemy!.health - 3);
    expect(act(r, 'strike').focus).toBe(2);
    r.enemy!.health = 1;
    expect(act(r, 'strike').health).toBe(25);
    for (const [id, key, delta] of [
      ['dawn', 'attack', 2],
      ['psalm', 'armor', 1],
      ['hearthseed', 'maxHealth', 10],
    ] as const) {
      const reward = { ...r, phase: 'reward' as const, rewards: [id] };
      const next = transition(reward, { type: 'reward', id });
      expect(next[key]).toBe(r[key] + delta);
      expect(next.relics).toContain(id);
      expect(transition(next, { type: 'reward', id })).toBe(next);
    }
  });
});

describe('routes, choices and economy', () => {
  it('makes the same map for the same seed and rejects nonadjacent lanes', () => {
    expect(nodeAt(123, 1, 0)).toEqual(nodeAt(123, 1, 0));
    let r = battle();
    r.enemy!.health = 1;
    r = act(r, 'strike');
    r = transition(r, { type: 'reward', id: 'heal' });
    expect(nextNodes(r).map((n) => n.lane)).toEqual([0, 1]);
    expect(transition(r, { type: 'travel', lane: 2 })).toBe(r);
    expect(transition(r, { type: 'travel', lane: -1 })).toBe(r);
  });
  it('has one boss destination, reachable from every lane', () => {
    for (const lane of [0, 1, 2]) {
      expect(nextNodes({ ...newRun('warden', 1), depth: 2, lane }).map((n) => n.lane)).toEqual([1]);
    }
  });
  it('checks event health and coin costs before consuming the encounter', () => {
    const r = {
      ...newRun('warden', 1),
      phase: 'event' as const,
      depth: 1,
      lane: 0,
      health: 6,
      coins: 0,
    };
    const cost = EVENTS[0].options[0];
    expect(canEvent(r, cost)).toBe(false);
    expect(canEvent({ ...r, health: 7 }, cost)).toBe(true);
    expect(canEvent(r, EVENTS[2].options[0])).toBe(false);
    expect(transition(r, { type: 'event', option: 99 })).toBe(r);
  });
  it('caps healing and flask refills; a camp is a single choice', () => {
    const r = { ...newRun('warden', 123), phase: 'camp' as const, depth: 2, health: 45, flasks: 5 };
    expect(transition(r, { type: 'camp', choice: 'flask' })).toBe(r);
    const next = transition(r, { type: 'camp', choice: 'rest' });
    expect(next.health).toBe(48);
    expect(next.phase).toBe('map');
    expect(transition(next, { type: 'camp', choice: 'forge' })).toBe(next);
  });
  it('buys each item once and rejects unaffordable or ineffective purchases', () => {
    const r = { ...newRun('warden', 123), phase: 'shop' as const, depth: 2, coins: 100 };
    expect(canBuy(r, 'heal')).toBe(false);
    const next = transition(r, { type: 'buy', item: 'forge' });
    expect(next.coins).toBe(65);
    expect(next.attack).toBe(9);
    expect(transition(next, { type: 'buy', item: 'forge' })).toBe(next);
    expect(canBuy({ ...r, coins: 13 }, 'flask')).toBe(false);
  });
  it('does not permit skipping combat or taking unoffered rewards', () => {
    const r = battle();
    expect(transition(r, { type: 'leave' })).toBe(r);
    expect(transition(r, { type: 'reward', id: 'dawn' })).toBe(r);
    const reward = { ...r, phase: 'reward' as const, rewards: ['briar'] as RelicId[] };
    expect(transition(reward, { type: 'reward', id: 'dawn' })).toBe(reward);
  });
});

describe('save and profile validation', () => {
  it('rejects oversized journal data before parsing', () => {
    expect(decodeSave(' '.repeat(MAX_SAVE_BYTES + 1))).toBeNull();
  });
  it('roundtrips a real fight including its next intent', () => {
    const run = act(battle(), 'strike');
    const save = advanceSave(emptySave(), run);
    expect(decodeSave(JSON.stringify(save))).toEqual(save);
    expect(intentFor(decodeSave(JSON.stringify(save))!.run!)).toEqual(intentFor(run));
  });
  it('rejects malformed, incompatible, impossible, or hostile saves', () => {
    const s = advanceSave(emptySave(), battle());
    for (const input of [
      'oops',
      '{}',
      'null',
      JSON.stringify({ ...s, version: 9 }),
      JSON.stringify({ ...s, run: { ...s.run, health: -1 } }),
      JSON.stringify({ ...s, run: { ...s.run, enemy: null } }),
      JSON.stringify({ ...s, run: { ...s.run, relics: ['__proto__'] } }),
      JSON.stringify({ ...s, profile: { ...s.profile, wins: 5 } }),
    ])
      expect(decodeSave(input)).toBeNull();
    expect(validRun({ ...battle(), enemy: { ...battle().enemy, pattern: [] } })).toBe(false);
  });
  it('records finished runs and memories exactly once', () => {
    const run = { ...battle(), phase: 'lost' as const, health: 0 };
    const s = advanceSave(emptySave(), run);
    expect(s.profile.runs).toBe(1);
    expect(s.profile.wins).toBe(0);
    expect(advanceSave(s, run).profile.runs).toBe(1);
  });
});

describe('complete campaigns', () => {
  for (const keeper of Object.keys(KEEPERS) as KeeperId[]) {
    it(`${keeper} can finish a seeded campaign with legal actions and valid saves`, () => {
      let r = newRun(keeper, 8128);
      let turns = 0;
      while (!['won', 'lost'].includes(r.phase) && turns++ < 300) {
        const next = transition(r, campaignAction(r));
        expect(next).not.toBe(r);
        expect(validRun(next), JSON.stringify(next)).toBe(true);
        r = next;
      }
      expect(r.phase).toBe('won');
      expect(r.bells).toBe(3);
      expect(r.path).toHaveLength(12);
      expect(r.lore).toContain('bell-3');
      expect(r.lore).toContain('dawn');
    });
  }
});
