import { EVENTS, type EventOption, type RelicId } from '../src/game/data';
import {
  canBuy,
  canEvent,
  nextNodes,
  nodeAt,
  transition,
  availableTalents,
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
    { type: 'flask' },
  ];
  let beam: Candidate[] = [{ run, first: actions[0], score: 0 }];
  let victory: Candidate | null = null;
  for (let depth = 0; depth < 12; depth++) {
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
            r.turn % 3,
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
  if (r.phase === 'combat') return bestCombatAction(r);
  if (r.phase === 'map') return { type: 'travel', lane: nextNodes(r)[0].lane };
  if (r.phase === 'reward') {
    const priority: RelicId[] = ['dawn', 'thread', 'hearthseed', 'mothglass', 'psalm', 'briar'];
    return { type: 'reward', id: priority.find((id) => r.rewards.includes(id)) ?? 'heal' };
  }
  if (r.phase === 'event') {
    const options = EVENTS[nodeAt(r.seed, r.depth, r.lane).eventIndex].options;
    return {
      type: 'event',
      option: options.findIndex(
        (o) => canEvent(r, o) && (((o as EventOption).health ?? 0) >= 0 || r.health > 20),
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
  if (r.phase === 'shop')
    return canBuy(r, 'forge')
      ? { type: 'buy', item: 'forge' }
      : canBuy(r, 'heal')
        ? { type: 'buy', item: 'heal' }
        : { type: 'leave' };
  return { type: 'ending', choice: 'dawn' };
}
