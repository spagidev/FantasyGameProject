import { travels } from './atlas';
import { hash, type Run } from './engine';

export type OmenId = 'moth' | 'hoarfrost' | 'fair' | 'shadows' | 'bells' | 'kind';

/** The almanac's six omens, in the order the seeded draw counts them. */
export const OMEN_IDS: OmenId[] = ['moth', 'hoarfrost', 'fair', 'shadows', 'bells', 'kind'];

export const OMENS: Record<OmenId, { name: string; rule: string; flavor: string }> = {
  moth: {
    name: 'Moth-light',
    rule: 'Battles start with 1 extra focus.',
    flavor: 'Pale wings gather at the lamp, and for a while the dark holds still.',
  },
  hoarfrost: {
    name: 'Hoarfrost',
    rule: 'When a battle begins, the keeper has 1 frost.',
    flavor: 'The cold arrived before you did, and it has been waiting politely.',
  },
  fair: {
    name: 'Fair days',
    rule: 'Trader prices are 20% lower.',
    flavor: 'Even the merchants smile, as if someone had promised them a morning.',
  },
  shadows: {
    name: 'Long shadows',
    rule: 'Every road costs 15% more lamp oil (never more than a full day).',
    flavor: 'Nothing casts them, and still they stretch toward the road ahead.',
  },
  bells: {
    name: 'Clear bells',
    rule: 'Perfect guards wear 25% more poise.',
    flavor: 'Every note rings true tonight, and the dark cannot help but listen.',
  },
  kind: {
    name: 'Kind weather',
    rule: 'Resting by the wagon fire restores 12 instead of 8.',
    flavor: 'The wind has forgotten to be cruel, and the fire remembers to be warm.',
  },
};

/** Omens begin on day 4 and change every three days: days 4-6, 7-9, 10-12, and so on. */
export const omenPeriod = (day: number) => (day < 4 ? -1 : Math.floor((day - 4) / 3));
/** Whether this day is the first of an omen's three days. */
export const omenBegins = (day: number) => day >= 4 && (day - 4) % 3 === 0;

/** The almanac: a pure function of the run's seed and the day. Never repeats back to back. */
export function omenAt(seed: number, day: number): OmenId | null {
  const period = omenPeriod(day);
  if (period < 0) return null;
  let prev = -1;
  for (let p = 0; p <= period; p++) {
    let pick = hash(seed, 6100 + p) % OMEN_IDS.length;
    if (pick === prev) pick = (pick + 1) % OMEN_IDS.length;
    prev = pick;
  }
  return OMEN_IDS[prev]!;
}

/** The omen in effect for this run now: none off the Atlas days, or before day 4. */
export function omenOf(run: Pick<Run, 'seed' | 'atlas'>): OmenId | null {
  const a = run.atlas;
  return travels(a) ? omenAt(run.seed, a.day) : null;
}
