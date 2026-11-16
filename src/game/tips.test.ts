import { describe, expect, it } from 'vitest';
import { atlasSite } from './atlas';
import { newRun, transition, type Run } from './engine';
import { emptyMeta, sanitizeMeta } from './meta';
import { TIPS, tipFor, type TipId } from './tips';
import { omenAt } from './omens';

const seen = (...tips: TipId[]) => ({ ...emptyMeta(), tips });

describe('the keeper’s guide', () => {
  it('teaches the Atlas in order, one note at a time, never twice', () => {
    let r = newRun('warden', 123, true);
    expect(tipFor(r, emptyMeta())).toBe('atlas');
    expect(tipFor(r, seen('atlas'))).toBe(null);
    r = transition(r, { type: 'atlas-move', to: 'watch' });
    expect(tipFor(r, seen('atlas'))).toBe('oil');
    r = transition(r, { type: 'atlas-camp' });
    expect(tipFor(r, seen('atlas', 'oil'))).toBe('wagon');
    // Entering and winning an encounter reveals that a realm has free order.
    const won: Run = {
      ...r,
      atlas: { ...r.atlas!, done: ['watch'], position: 'watch' },
      path: [`${atlasSite('watch').depth}-${atlasSite('watch').lane}`],
      depth: 0,
      lane: 0,
    };
    expect(tipFor(won, seen('atlas', 'oil', 'wagon'))).toBe('order');
    // A guarded trove at the keeper's feet.
    const trove: Run = { ...r, atlas: { ...r.atlas!, position: 'cache' } };
    expect(tipFor(trove, seen('atlas', 'oil', 'wagon', 'order'))).toBe('trove');
  });
  it('omens, rewards, traders, lessons, sets and provinces each have their moment', () => {
    const base = newRun('seer', 7, true);
    let day = 4;
    while (!omenAt(base.seed, day)) day++;
    const omen: Run = { ...base, atlas: { ...base.atlas!, day } };
    const all = Object.keys(TIPS) as TipId[];
    const except = (id: TipId) => seen(...all.filter((t) => t !== id));
    expect(tipFor(omen, except('omen'))).toBe('omen');
    expect(tipFor({ ...base, phase: 'reward' }, except('reward'))).toBe('reward');
    expect(tipFor({ ...base, phase: 'shop' }, except('shop'))).toBe('shop');
    expect(tipFor({ ...base, phase: 'talent' }, except('lesson'))).toBe('lesson');
    expect(tipFor({ ...base, relics: ['clapper'] }, except('set'))).toBe('set');
    expect(tipFor({ ...base, relics: ['dawn'] }, except('set'))).toBe(null);
    const chart = { ...base, atlas: { ...base.atlas!, chart: {} as never } };
    expect(tipFor({ ...chart, phase: 'won' }, except('province'))).toBe('province');
    expect(tipFor({ ...base, phase: 'won' }, except('province'))).toBe(null); // the coast is no province
  });
  it('stays quiet when turned off, for older rulesets, and with no run', () => {
    const r = newRun('warden', 123, true);
    expect(tipFor(r, { ...emptyMeta(), tipsOff: true })).toBe(null);
    expect(tipFor(newRun('warden', 123, true, { ruleset: 2 }), emptyMeta())).toBe(null);
    expect(tipFor(null, emptyMeta())).toBe(null);
  });
  it('records keep only known notes', () => {
    const clean = sanitizeMeta({ tips: ['atlas', 'atlas', 'nonsense', 3], tipsOff: 'yes' });
    expect(clean.tips).toEqual(['atlas']);
    expect(clean.tipsOff).toBeUndefined();
    expect(sanitizeMeta({ tipsOff: true }).tipsOff).toBe(true);
  });
});
