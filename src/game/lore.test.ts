import { describe, expect, it } from 'vitest';
import { campaignAction } from '../../tests/player';
import { BOSSES, ELITES, FOES } from './bestiary';
import { KEEPERS, LORE, type KeeperId } from './data';
import { newRun, transition, type Run } from './engine';
import { EPILOGUES, KEEPER_PAGES, VOICES, pageFor } from './lore';
import { validRun } from './storage';

function play(run: Run, until: (r: Run) => boolean): Run {
  let r = run,
    steps = 0;
  while (!until(r) && !['won', 'lost'].includes(r.phase) && steps++ < 900)
    r = transition(r, campaignAction(r));
  return r;
}

describe('the voices of Veyr', () => {
  it('every guardian and elite has a voice, and every voice belongs to someone', () => {
    for (const id of Object.keys(VOICES)) expect(FOES[id], id).toBeDefined();
    for (const boss of BOSSES) {
      expect(VOICES[boss.id].arrive.length).toBeGreaterThan(40);
      expect(VOICES[boss.id].turn).toBeTruthy();
      expect(VOICES[boss.id].fall).toBeTruthy();
    }
    for (const elite of ELITES.flat()) expect(VOICES[elite.id]?.arrive).toBeTruthy();
  });
  it('each keeper has three pages and two epilogues, all part of the chronicle', () => {
    const ids = LORE.map((l) => l.id) as string[];
    expect(new Set(ids).size).toBe(ids.length);
    for (const keeper of Object.keys(KEEPERS) as KeeperId[]) {
      for (const bell of [1, 2, 3]) {
        const page = pageFor(`${keeper}-bell-${bell}`)!;
        expect(page.title.startsWith(KEEPERS[keeper].name)).toBe(true);
        expect(page.text.length).toBeGreaterThan(150);
        expect(ids).toContain(page.id);
      }
      for (const ending of ['dawn', 'hearth']) expect(ids).toContain(`${keeper}-${ending}`);
    }
    expect(KEEPER_PAGES).toHaveLength(9);
    expect(EPILOGUES).toHaveLength(6);
  });
  it('a guardian speaks when the fight begins and when it turns; the keeper writes after the bell', () => {
    const atBoss = play(newRun('seer', 8128), (r) => r.phase === 'combat' && r.depth === 3);
    expect(atBoss.log[0]).toBe(VOICES.bellwether.arrive);
    const turned = play(atBoss, (r) => r.enemy?.phase === 2 || r.phase !== 'combat');
    expect(turned.enemy?.phase).toBe(2);
    expect(turned.log).toContain(VOICES.bellwether.turn);
    const rung = play(turned, (r) => r.phase === 'reward');
    expect(rung.lore).toEqual(expect.arrayContaining(['bell-1', 'seer-bell-1']));
    expect(rung.lore).not.toContain('warden-bell-1');
    expect(validRun(rung)).toBe(true);
    const done = play(rung, () => false);
    expect(done.phase).toBe('won');
    expect(done.lore).toEqual(
      expect.arrayContaining(['seer-bell-2', 'seer-bell-3', 'dawn', 'seer-dawn']),
    );
  });
  it('journals of the first two rulesets tell the story as they always did', () => {
    const old = play(newRun('warden', 8128, false, { ruleset: 2 }), () => false);
    expect(old.phase).toBe('won');
    expect(old.lore.some((id) => id.startsWith('warden-'))).toBe(false);
  });
});
