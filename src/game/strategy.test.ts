import { describe, expect, it } from 'vitest';
import { TALENTS, type KeeperId, type TalentId } from './data';
import {
  availableTalents,
  guardAmount,
  makeEnemy,
  newRun,
  nodeAt,
  poisonAmount,
  roadBenefits,
  skillDamage,
  startingFocus,
  strikeFocus,
  strikeHealing,
  transition,
  type Run,
} from './engine';
import { advanceSave, decodeSave, emptySave, validRun } from './storage';
import { campaignAction } from '../../tests/player';

function winFirst(lane: number) {
  let run = transition(newRun('warden', 123), { type: 'travel', lane });
  run.enemy!.health = 1;
  return transition(run, { type: 'strike' });
}
function atFirstLesson(keeper: KeeperId = 'warden'): Run {
  return {
    ...newRun(keeper, 123),
    phase: 'talent',
    depth: 3,
    bells: 1,
    path: ['0-0', '1-0', '2-0', '3-1'],
    lore: ['beginning', 'bell-1'],
  };
}

describe('waylights and linked strategic rewards', () => {
  it.each([0, 1, 2])('rescues lane %i only after winning its guard', (lane) => {
    const before = transition(newRun('warden', 123), { type: 'travel', lane });
    expect(before.waylights).toEqual([]);
    const won = winFirst(lane);
    expect(won.waylights).toEqual([['well', 'kiln', 'lens'][lane]]);
    const rewarded = transition(won, { type: 'reward', id: 'heal' });
    expect(rewarded.waylights).toEqual(won.waylights);
    expect(transition(rewarded, { type: 'reward', id: 'heal' })).toBe(rewarded);
  });
  it('pays income once per legal crossing and never on purchases, rewards, or rejected moves', () => {
    let run = transition(winFirst(1), { type: 'reward', id: 'heal' });
    const coins = run.coins;
    run = transition(run, { type: 'travel', lane: 0 });
    expect(run.coins).toBe(coins + 4);
    const eventCoins = run.coins;
    expect(transition(run, { type: 'travel', lane: 0 })).toBe(run);
    expect(run.coins).toBe(eventCoins);
    const shop = { ...run, phase: 'shop' as const, depth: 2 };
    expect(transition(shop, { type: 'buy', item: 'forge' }).coins).toBe(shop.coins - 35);
  });
  it('heals before a crossing, respects the cap, and stacks sites', () => {
    const run = {
      ...newRun('warden', 123),
      health: 40,
      waylights: ['well', 'well', 'kiln'] as Run['waylights'],
    };
    const entered = transition(run, { type: 'travel', lane: 0 });
    expect(entered.health).toBe(44);
    expect(entered.coins).toBe(39);
    expect(roadBenefits(run)).toEqual({ health: 4, coins: 4, focus: 0 });
    expect(transition({ ...run, health: 47 }, { type: 'travel', lane: 0 }).health).toBe(48);
  });
  it('observatories and seer training grant opening focus only at battle entry, with a cap', () => {
    const run = {
      ...newRun('seer', 123),
      waylights: ['lens', 'lens', 'lens'] as Run['waylights'],
      talents: ['astral'] as TalentId[],
    };
    expect(startingFocus(run)).toBe(5);
    const battle = transition(run, { type: 'travel', lane: 0 });
    expect(battle.focus).toBe(5);
    const next = transition(battle, { type: 'skill' });
    expect(next.focus).toBe(2);
  });
  it('uses different, reproducible lane patterns and stronger elite focus pressure', () => {
    const patterns = [0, 1, 2].map((lane) => makeEnemy(nodeAt(123, 0, lane)).pattern);
    expect(new Set(patterns.map((p) => JSON.stringify(p))).size).toBe(3);
    expect(patterns[1].every((p) => p.damage > 0)).toBe(true);
    expect(patterns[2][0].drain).toBe(1);
    expect(makeEnemy(nodeAt(123, 1, 1)).pattern[0].drain).toBe(1);
  });
});

describe('remembered lessons', () => {
  it('offers only the keeper’s lessons and rejects duplicates and foreign lessons', () => {
    const run = atFirstLesson();
    expect(availableTalents(run)).toHaveLength(3);
    expect(transition(run, { type: 'talent', id: 'bloom' })).toBe(run);
    const next = transition(run, { type: 'talent', id: 'sunsteel' });
    expect(next.phase).toBe('map');
    expect(next.talents).toEqual(['sunsteel']);
    expect(availableTalents(next)).not.toContain('sunsteel');
    expect(transition(next, { type: 'talent', id: 'citadel' })).toBe(next);
  });
  it('requires a lesson after a boss reward but not after ordinary fights', () => {
    const bossReward = { ...atFirstLesson(), phase: 'reward' as const, rewards: [] };
    expect(transition(bossReward, { type: 'reward', id: 'heal' }).phase).toBe('talent');
    expect(transition(winFirst(0), { type: 'reward', id: 'heal' }).phase).toBe('map');
  });
  it('all nine lesson effects match their combat descriptions', () => {
    const warden = newRun('warden', 123);
    expect(guardAmount({ ...warden, talents: ['citadel'] })).toBe(guardAmount(warden) + 4);
    expect(skillDamage({ ...warden, talents: ['sunsteel'] })).toBe(skillDamage(warden) + 5);
    expect(strikeFocus({ ...warden, talents: ['vow'], relics: ['mothglass'] })).toBe(3);
    const seer = atFirstLesson('seer');
    expect(startingFocus({ ...seer, talents: ['astral'] })).toBe(3);
    expect(skillDamage({ ...seer, talents: ['starfall'] })).toBe(skillDamage(seer) + 5);
    const moonward = transition(seer, { type: 'talent', id: 'moonward' });
    expect(moonward.armor).toBe(1);
    expect(guardAmount(moonward)).toBe(16);
    const wayfarer = newRun('wayfarer', 123);
    expect(poisonAmount({ ...wayfarer, talents: ['bloom'] })).toBe(7);
    expect(strikeHealing({ ...wayfarer, talents: ['sap'] })).toBe(3);
    const fight = transition(
      { ...wayfarer, health: 20, talents: ['trail'] },
      { type: 'travel', lane: 0 },
    );
    fight.enemy!.health = 1;
    const won = transition(fight, { type: 'strike' });
    expect(won.health).toBe(24);
    expect(won.coins).toBe(35 + 18 + 6);
    expect(Object.keys(TALENTS)).toHaveLength(9);
  });
  it('roundtrips an unchosen lesson without paying for it twice', () => {
    const run = atFirstLesson('seer');
    expect(validRun(run)).toBe(true);
    const save = advanceSave(emptySave(), run);
    expect(decodeSave(JSON.stringify(save))).toEqual(save);
    const next = transition(run, { type: 'talent', id: 'moonward' });
    expect(transition(next, { type: 'talent', id: 'moonward' })).toBe(next);
  });
});

describe('version 1 compatibility', () => {
  function legacySave(run: Run | null) {
    if (!run) return JSON.stringify({ ...emptySave(), version: 1 });
    const { ruleset: _r, waylights: _w, talents: _t, ...old } = run;
    return JSON.stringify({ ...emptySave(), version: 1, run: { ...old, version: 1 } });
  }
  it('migrates the profile and exact active turn without adding new mechanics', () => {
    const source = { ...newRun('seer', 981), ruleset: 1 as const };
    const fight = transition(transition(source, { type: 'travel', lane: 2 }), { type: 'guard' });
    const restored = decodeSave(legacySave(fight))!;
    expect(restored.version).toBe(2);
    expect(restored.run).toEqual(fight);
    expect(restored.run!.ruleset).toBe(1);
    expect(decodeSave(legacySave(null))).toEqual(emptySave());
  });
  it('retains original lane and elite patterns and skips lesson selection', () => {
    for (const lane of [0, 1, 2]) {
      const node = nodeAt(123, 0, lane);
      expect(makeEnemy(node, 1).pattern.map((p) => p.name)).toEqual([
        'Lunging strike',
        'Gathering shadow',
        'Heavy strike',
      ]);
    }
    const old = { ...atFirstLesson(), ruleset: 1 as const, phase: 'reward' as const, bells: 1 };
    expect(transition(old, { type: 'reward', id: 'heal' }).phase).toBe('map');
    const first = { ...newRun('warden', 123), ruleset: 1 as const };
    const fight = transition(first, { type: 'travel', lane: 1 });
    fight.enemy!.health = 1;
    expect(transition(fight, { type: 'strike' }).waylights).toEqual([]);
  });
  it('can finish a migrated campaign using only the original rules', () => {
    let run = decodeSave(legacySave(newRun('warden', 8128)))!.run!;
    for (let moves = 0; !['won', 'lost'].includes(run.phase) && moves < 250; moves++)
      run = transition(run, campaignAction(run));
    expect(run.phase).toBe('won');
    expect(run.talents).toEqual([]);
    expect(run.waylights).toEqual([]);
  });
  it('rejects tampered talent ownership, invalid lesson phases, and unknown rulesets', () => {
    const run = atFirstLesson();
    for (const candidate of [
      { ...run, ruleset: 9 },
      { ...run, talents: ['bloom'] },
      { ...run, talents: ['citadel', 'citadel'] },
      { ...run, waylights: ['constructor'] },
      { ...run, depth: 2 },
      { ...run, ruleset: 1 },
    ])
      expect(validRun(candidate)).toBe(false);
  });
});
