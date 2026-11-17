import { describe, expect, it } from 'vitest';
import { campaignAction } from '../../tests/player';
import { LEVEL_XP, PERKS, XP_FOR, type PerkId } from './data';
import {
  enemyFor,
  flaskHealing,
  LEVEL_TOUGHNESS,
  levelOf,
  makeEnemy,
  newRun,
  nodeOf,
  pendingLevels,
  perkChoices,
  startingFocus,
  techniqueCost,
  transition,
  type Run,
} from './engine';
import { advanceSave, decodeSave, emptySave, validRun } from './storage';

const win = (r: Run): Run => {
  let run = r;
  let steps = 0;
  while (run.phase === 'combat' && steps++ < 300) run = transition(run, campaignAction(run));
  return run;
};

describe('keeper levels', () => {
  it('new expeditions earn experience; older rulesets and journals do not', () => {
    const r = newRun('warden', 8128);
    expect([r.xp, r.perks]).toEqual([0, []]);
    expect(levelOf(r)).toBe(1);
    const old = newRun('warden', 8128, false, { ruleset: 2 });
    expect(old.xp).toBeUndefined();
    expect(pendingLevels(old)).toBe(0);
    // A ruleset-3 journal saved before v0.13 has no xp and plays on without levels.
    const before = { ...r, xp: undefined, perks: undefined };
    expect(validRun(before)).toBe(true);
    expect(pendingLevels(before)).toBe(0);
  });
  it('a victory gives experience; a level is offered after the spoils and is spent once', () => {
    let r = transition(newRun('seer', 8128), { type: 'travel', lane: 0 });
    r = { ...r, xp: LEVEL_XP - XP_FOR.battle }; // one battle short of a level
    r = win(r);
    expect(r.phase).toBe('reward');
    expect(r.xp).toBe(LEVEL_XP);
    expect(pendingLevels(r)).toBe(1);
    r = transition(r, { type: 'reward', id: 'heal' });
    expect(r.phase).toBe('levelup');
    expect(validRun(r)).toBe(true);
    expect(decodeSave(JSON.stringify(advanceSave(emptySave(), r)))?.run).toEqual(r);
    const choices = perkChoices(r);
    expect(choices).toHaveLength(3);
    expect(new Set(choices).size).toBe(3);
    expect(perkChoices(r)).toEqual(choices); // seeded
    const unoffered = (Object.keys(PERKS) as PerkId[]).find((id) => !choices.includes(id))!;
    expect(transition(r, { type: 'perk', id: unoffered })).toBe(r);
    const leveled = transition(r, { type: 'perk', id: choices[0] });
    expect(leveled.phase).toBe('map');
    expect(leveled.perks).toEqual([choices[0]]);
    expect(levelOf(leveled)).toBe(2);
    expect(transition(leveled, { type: 'perk', id: choices[1] })).toBe(leveled);
  });
  it('each perk does what it says, and limited perks are no longer offered', () => {
    const base = { ...newRun('wayfarer', 3), phase: 'levelup' as const, xp: 50, health: 20 };
    const take = (id: PerkId, r: Run = base) => {
      // Force the offer to include id by testing through the effect helpers where possible.
      const run = { ...r };
      const choices = perkChoices(run);
      if (!choices.includes(id)) return null;
      return transition(run, { type: 'perk', id });
    };
    const effects: Record<PerkId, (before: Run, after: Run) => void> = {
      might: (b, a) => expect(a.attack - b.attack).toBe(2),
      vigor: (b, a) => expect([a.maxHealth - b.maxHealth, a.health - b.health]).toEqual([6, 6]),
      ward: (b, a) => expect(a.armor - b.armor).toBe(1),
      insight: (b, a) => expect(startingFocus(a) - startingFocus(b)).toBe(1),
      herbs: (b, a) => {
        expect(a.flasks - b.flasks).toBe(1);
        expect(flaskHealing(a) - flaskHealing(b)).toBe(6);
      },
      mastery: (b, a) => expect(techniqueCost(b) - techniqueCost(a)).toBe(1),
    };
    let checked = 0;
    for (let seed = 1; seed < 200 && checked < 6; seed++)
      for (const id of Object.keys(PERKS) as PerkId[]) {
        const b = { ...base, seed };
        const a = take(id, b);
        if (!a) continue;
        effects[id](b, a);
        checked++;
      }
    expect(checked).toBeGreaterThanOrEqual(6);
    const capped = { ...base, perks: ['ward', 'insight', 'herbs', 'mastery'] as PerkId[] };
    expect(perkChoices(capped).every((id) => id === 'might' || id === 'vigor')).toBe(true);
    const maxed = {
      ...base,
      perks: [
        'ward',
        'insight',
        'herbs',
        'mastery',
        'might',
        'might',
        'might',
        'vigor',
        'vigor',
        'vigor',
      ] as PerkId[],
    };
    expect(perkChoices(maxed)).toEqual([]);
  });
  it('enemies on levelled expeditions are hardier, and scouting shows the same number', () => {
    const r = newRun('warden', 1);
    const node = nodeOf(r, 0, 0);
    expect(enemyFor(r, node).maxHealth).toBe(
      Math.round(makeEnemy(node, 3).maxHealth * (1 + LEVEL_TOUGHNESS)),
    );
    expect(enemyFor({ ...r, xp: undefined, perks: undefined }, node).maxHealth).toBe(
      makeEnemy(node, 3).maxHealth,
    );
    expect(transition(r, { type: 'travel', lane: 0 }).enemy!.maxHealth).toBe(
      enemyFor(r, node).maxHealth,
    );
  });
  it('rejects impossible level journals', () => {
    const r = { ...newRun('warden', 1), xp: 5 };
    for (const bad of [
      { ...r, perks: ['might', 'might'] }, // more perks than levels
      { ...r, xp: 20, perks: ['ward', 'ward'] }, // over a perk's limit
      { ...r, perks: ['flying'] },
      { ...r, perks: undefined },
      { ...r, phase: 'levelup', perks: ['might'] }, // nothing left to spend
      { ...newRun('warden', 1, false, { ruleset: 2 }), phase: 'levelup' },
    ])
      expect(validRun(bad as Run), JSON.stringify(bad.perks)).toBe(false);
  });
  it('a full expedition reaches several levels', () => {
    let r = newRun('wayfarer', 8128);
    let steps = 0;
    while (!['won', 'lost'].includes(r.phase) && steps++ < 900)
      r = transition(r, campaignAction(r));
    expect(r.phase).toBe('won');
    expect(r.perks!.length).toBeGreaterThanOrEqual(4);
    expect(validRun(r)).toBe(true);
  });
});
