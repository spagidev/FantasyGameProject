import { atlasNeighbours, freeOrder, roadCost, travels } from './atlas';
import { setOf } from './data';
import { troveGuard, type Run } from './engine';
import type { Meta } from './meta';
import { omenOf } from './omens';

/**
 * The keeper's guide (v0.13): one short note the first time each system matters, in the order
 * a new player meets them. A note is a pure function of the run and the records, so it shows
 * at exactly the right moment, never twice, and the rules themselves stay the same for
 * everyone. Combat basics are taught by the coach line on the combat board; these notes cover
 * everything around the fights.
 */
export type TipId =
  | 'atlas'
  | 'oil'
  | 'wagon'
  | 'order'
  | 'trove'
  | 'omen'
  | 'reward'
  | 'shop'
  | 'lesson'
  | 'set'
  | 'province';

export const TIPS: Record<TipId, { title: string; text: string }> = {
  atlas: {
    title: 'Real roads, a hidden city',
    text: 'These are the true streets of a real place, with every name forgotten. Walk the roads to lift the veil. The glowing rings are encounters you can enter now.',
  },
  oil: {
    title: 'A day’s lamp oil',
    text: 'Each road costs its true length in lamp oil. When the oil runs low, make camp: a new day dawns with a full lamp, but every night the enemies ahead grow a little stronger.',
  },
  wagon: {
    title: 'The hearth-wagon',
    text: 'Your camp is a small town that travels with you. Each evening, build one work onto it or rest by its fire — never both. Works pay every dawn, so the early ones pay longest.',
  },
  order: {
    title: 'Any order you like',
    text: 'The three encounters of a realm can be taken in any order. Plan a route that spends your oil well; the bell guardian waits until all three are done.',
  },
  trove: {
    title: 'A guarded trove',
    text: 'Something is guarding this place. The fight is optional: win it for the trove and a choice of rare relics. Leave it for later, and something stronger will stand guard.',
  },
  omen: {
    title: 'The almanac turns',
    text: 'Every three days brings an omen with one rule, shown in the day bar. Tap it to read what it changes until the almanac turns again.',
  },
  reward: {
    title: 'Something worth carrying',
    text: 'Take one relic or recover 12 health. Relics last this expedition only. Rarer ones come from elites, guardians and troves.',
  },
  shop: {
    title: 'The lantern market',
    text: 'Buy any combination you can afford; each item once per visit. Coins are worth nothing once the expedition ends.',
  },
  lesson: {
    title: 'A lesson remembered',
    text: 'After each of the first two bells, your keeper learns one lesson. It lasts this expedition and shapes how you will fight the next realm.',
  },
  set: {
    title: 'Part of a set',
    text: 'This relic belongs to a set of three. Carry all three in one expedition for one more rule; relic cards show how many you have.',
  },
  province: {
    title: 'A province of Veyr',
    text: 'Every city you rekindle is stamped in the chronicle’s atlas. Rekindle both hidden cities of a province to recover its legend — and a new relic for future roads.',
  },
};

/** Notes that would help right now, in teaching order. */
function due(run: Run): TipId[] {
  const a = run.atlas;
  const list: TipId[] = [];
  if (run.phase === 'map' && a && travels(a)) {
    list.push('atlas');
    if (a.steps >= 1 || atlasNeighbours(a).some((n) => roadCost(run, n.metres) > a.oil!))
      list.push('oil');
    if (a.day! >= 2) list.push('wagon');
    if (freeOrder(a) && a.done.length >= 1 && run.bells === 0) list.push('order');
    if (troveGuard(run, a.position)) list.push('trove');
    if (omenOf(run)) list.push('omen');
  }
  if (run.phase === 'reward') list.push('reward');
  if (run.phase === 'shop') list.push('shop');
  if (run.phase === 'talent') list.push('lesson');
  if (run.phase === 'map' && run.relics.some((id) => setOf(id))) list.push('set');
  if (run.phase === 'won' && a?.chart) list.push('province');
  return list;
}

/** The single note to show now, if any: the first due note not yet seen. */
export function tipFor(run: Run | null, meta: Meta): TipId | null {
  if (!run || run.ruleset !== 3 || meta.tipsOff) return null;
  return due(run).find((id) => !(meta.tips ?? []).includes(id)) ?? null;
}
