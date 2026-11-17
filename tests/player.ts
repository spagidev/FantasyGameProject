import { atlasObjective, atlasGeography, roadCost } from '../src/game/atlas';
import { EVENTS, RELICS, type EventOption, type RelicId } from '../src/game/data';
import {
  canBuy,
  canEvent,
  nextNodes,
  nodeOf,
  transition,
  availableTalents,
  perkChoices,
  flaskHealing,
  incomingDamage,
  skillCost,
  type Action,
  type Run,
} from '../src/game/engine';

// Used by both campaign simulations and real browser tests. This looks ahead at
// actual engine transitions; it is a test player, never a second combat engine.
export function bestCombatAction(run: Run): Action {
  type Candidate = { run: Run; first: Action; score: number };
  const actions: Action[] = [
    { type: 'strike' },
    { type: 'guard' },
    { type: 'skill' },
    { type: 'technique' },
    { type: 'flask' },
  ];
  let beam: Candidate[] = [{ run, first: actions[0], score: 0 }];
  let victory: Candidate | null = null;
  for (let depth = 0; depth < (run.ruleset === 3 ? 9 : 12); depth++) {
    const next: Candidate[] = [];
    const seen = new Set<string>();
    for (const c of beam)
      for (const action of actions) {
        const r = transition(c.run, action);
        if (r === c.run || r.phase === 'lost') continue;
        const score =
          r.health +
          r.flasks * 13 +
          r.focus * 1.1 -
          (r.enemy?.health ?? 0) * 0.75 -
          (r.enemy?.guard ?? 0) * 0.15 -
          (r.frost ?? 0) * 1.5 -
          (r.enemy?.fury ?? 0) * 2 +
          (r.enemy?.stagger ? 3 : 0) -
          depth * 0.12;
        const candidate = { run: r, first: depth ? c.first : action, score };
        if (r.phase !== 'combat') {
          if (!victory || score > victory.score) victory = candidate;
        } else {
          const key = [
            r.health,
            r.flasks,
            r.focus,
            r.enemy?.health,
            r.enemy?.guard,
            r.enemy?.poison,
            r.enemy?.step === undefined ? r.turn % 3 : r.enemy.step % r.enemy.pattern.length,
            r.enemy?.poise,
            r.enemy?.stagger,
            r.enemy?.phase,
            r.guard,
            r.weak,
            r.frost,
            r.charge,
          ].join();
          if (!seen.has(key)) {
            seen.add(key);
            next.push(candidate);
          }
        }
      }
    beam = next.sort((a, b) => b.score - a.score).slice(0, 18);
    if (!beam.length) break;
  }
  return victory?.first ?? beam[0]?.first ?? { type: 'strike' };
}

export function campaignAction(r: Run): Action {
  if (r.phase === 'talent') return { type: 'talent', id: availableTalents(r)[0] };
  if (r.phase === 'levelup') return { type: 'perk', id: perkChoices(r)[0] };
  if (r.phase === 'combat') return bestCombatAction(r);
  if (r.phase === 'map') {
    if (r.atlas && !nextNodes(r).length) {
      const target = atlasObjective(r)!.id;
      const queue = [[r.atlas.position]],
        seen = new Set(queue[0]);
      while (queue.length) {
        const path = queue.shift()!,
          last = path.at(-1)!;
        if (last === target) {
          const road = atlasGeography(r.atlas).edges.find(
            (e) => (e.a === path[0] && e.b === path[1]) || (e.b === path[0] && e.a === path[1]),
          )!;
          return r.atlas.oil !== undefined && r.atlas.oil < roadCost(r, road.metres)
            ? { type: 'atlas-camp' }
            : { type: 'atlas-move', to: path[1] };
        }
        for (const edge of atlasGeography(r.atlas).edges) {
          const next = edge.a === last ? edge.b : edge.b === last ? edge.a : null;
          if (next && !seen.has(next)) {
            seen.add(next);
            queue.push([...path, next]);
          }
        }
      }
      throw new Error('Atlas objective is unreachable');
    }
    return { type: 'travel', lane: nextNodes(r)[0].lane };
  }
  if (r.phase === 'reward') {
    const priority: RelicId[] = ['dawn', 'thread', 'hearthseed', 'mothglass', 'psalm', 'briar'];
    if (r.ruleset === 3) {
      if (r.health * 3 < r.maxHealth || !r.rewards.length) return { type: 'reward', id: 'heal' };
      const rank = { rare: 2, uncommon: 1, common: 0 };
      return {
        type: 'reward',
        id: [...r.rewards].sort((a, b) => rank[RELICS[b].rarity] - rank[RELICS[a].rarity])[0],
      };
    }
    return { type: 'reward', id: priority.find((id) => r.rewards.includes(id)) ?? 'heal' };
  }
  if (r.phase === 'event') {
    const options: EventOption[] = EVENTS[nodeOf(r).eventIndex].options;
    return {
      type: 'event',
      option: options.findIndex(
        (o) =>
          canEvent(r, o) &&
          ((o.health ?? 0) >= 0 || r.health > 24) &&
          ((o.flasks ?? 0) >= 0 || r.flasks > 2) &&
          (o.maxHealth ?? 0) >= 0,
      ),
    };
  }
  if (r.phase === 'camp')
    return r.health < r.maxHealth - 8
      ? { type: 'camp', choice: 'rest' }
      : r.coins >= 30
        ? { type: 'camp', choice: 'forge' }
        : r.flasks < 5
          ? { type: 'camp', choice: 'flask' }
          : { type: 'leave' };
  if (r.phase === 'shop' && r.ruleset === 3) {
    const relic = r.shop?.find((id) => canBuy(r, id));
    if (relic && r.health * 2 > r.maxHealth) return { type: 'buy', item: relic };
    return canBuy(r, 'heal') && r.health * 2 <= r.maxHealth
      ? { type: 'buy', item: 'heal' }
      : canBuy(r, 'forge')
        ? { type: 'buy', item: 'forge' }
        : canBuy(r, 'flask') && r.flasks < 3
          ? { type: 'buy', item: 'flask' }
          : { type: 'leave' };
  }
  if (r.phase === 'shop')
    return canBuy(r, 'forge')
      ? { type: 'buy', item: 'forge' }
      : canBuy(r, 'heal')
        ? { type: 'buy', item: 'heal' }
        : { type: 'leave' };
  return { type: 'ending', choice: 'dawn' };
}

/**
 * A scripted beginner: guards blows of 10 or more, drinks when the next blow would kill or
 * health is low, uses the keeper skill whenever affordable, otherwise strikes. Never uses the
 * second technique. Out of combat it plays the same choices as campaignAction. Used by the
 * balance report as a rough stand-in for a new player, not as evidence of human difficulty.
 */
export function beginnerAction(r: Run): Action {
  if (r.phase !== 'combat') return campaignAction(r);
  const incoming = incomingDamage(r);
  const canDrink = r.flasks > 0 && r.health < r.maxHealth;
  if (r.health <= incoming && canDrink && r.health + flaskHealing(r) > incoming)
    return { type: 'flask' };
  if (incoming >= 10 || incoming >= r.health) return { type: 'guard' };
  if (r.health * 3 < r.maxHealth && canDrink && incoming < 8) return { type: 'flask' };
  if (r.focus >= skillCost(r)) return { type: 'skill' };
  return { type: 'strike' };
}
