import { expect, test } from 'vitest';
import { mkdir, writeFile } from 'node:fs/promises';
import { format } from 'prettier';
import { type KeeperId, type TalentId, type WaylightId } from '../src/game/data';
import { availableTalents, newRun, nextNodes, transition, type Run } from '../src/game/engine';
import { campaignAction } from './player';

test('record a reproducible ruleset / keeper / strategic-route matrix', async () => {
  const seeds = [42, 2026, 8128, 16384, 65537];
  const results: {
    ruleset: number;
    keeper: string;
    plan: string;
    seed: number;
    outcome: string;
    health: number;
    coins: number;
    actions: number;
    combatTurns: number;
    talents: TalentId[];
    sites: WaylightId[];
  }[] = [];
  for (const ruleset of [1, 2] as const)
    for (const keeper of ['warden', 'seer', 'wayfarer'] as KeeperId[])
      for (const plan of ['well', 'kiln', 'lens'] as const)
        for (const seed of seeds) {
          let run: Run = newRun(keeper, seed, false, { ruleset });
          let actions = 0;
          let combatTurns = 0;
          while (!['won', 'lost'].includes(run.phase) && actions < 300) {
            let action = campaignAction(run);
            if (run.phase === 'map') {
              const step = (run.depth + 1) % 4;
              const lane =
                step === 3
                  ? 1
                  : step === 0
                    ? ['well', 'kiln', 'lens'].indexOf(plan)
                    : step === 2 && plan === 'kiln'
                      ? 1
                      : plan === 'lens'
                        ? 2
                        : 0;
              action = {
                type: 'travel',
                lane: nextNodes(run).some((n) => n.lane === lane) ? lane : nextNodes(run)[0].lane,
              };
            }
            if (run.phase === 'talent') {
              const priority: Record<KeeperId, TalentId[]> = {
                warden:
                  plan === 'well' ? ['citadel', 'sunsteel', 'vow'] : ['vow', 'sunsteel', 'citadel'],
                seer: ['astral', 'starfall', 'moonward'],
                wayfarer: plan === 'kiln' ? ['trail', 'bloom', 'sap'] : ['bloom', 'sap', 'trail'],
              };
              action = {
                type: 'talent',
                id: priority[keeper].find((id) => availableTalents(run).includes(id))!,
              };
            }
            const next = transition(run, action);
            expect(next).not.toBe(run);
            if (run.phase === 'combat') combatTurns++;
            run = next;
            actions++;
          }
          expect(['won', 'lost']).toContain(run.phase);
          results.push({
            ruleset,
            keeper,
            plan,
            seed,
            outcome: run.phase,
            health: run.health,
            coins: run.coins,
            actions,
            combatTurns,
            talents: run.talents,
            sites: run.waylights,
          });
        }
  // Ruleset 3: the seeded routes of The Long Night at the first and the deepest dusk.
  const night: {
    keeper: string;
    dusk: number;
    seed: number;
    outcome: string;
    health: number;
    combatTurns: number;
    staggers: number;
    perfectGuards: number;
  }[] = [];
  for (const dusk of [0, 8])
    for (const keeper of ['warden', 'seer', 'wayfarer'] as KeeperId[])
      for (const seed of seeds) {
        let run: Run = newRun(keeper, seed, false, { dusk });
        let actions = 0;
        while (!['won', 'lost'].includes(run.phase) && actions++ < 900) {
          const next = transition(run, campaignAction(run));
          expect(next).not.toBe(run);
          run = next;
        }
        night.push({
          keeper,
          dusk,
          seed,
          outcome: run.phase,
          health: run.health,
          combatTurns: run.stats!.turns,
          staggers: run.stats!.staggers,
          perfectGuards: run.stats!.parries,
        });
      }
  const nightGroups = [0, 8].flatMap((dusk) =>
    (['warden', 'seer', 'wayfarer'] as const).map((keeper) => {
      const group = night.filter((r) => r.dusk === dusk && r.keeper === keeper);
      const mean = (f: (r: (typeof night)[number]) => number) =>
        Math.round((group.reduce((n, r) => n + f(r), 0) / group.length) * 10) / 10;
      return {
        key: `3/${keeper}/dusk ${dusk}`,
        runs: group.length,
        wins: group.filter((r) => r.outcome === 'won').length,
        meanCombatTurns: mean((r) => r.combatTurns),
        meanStaggers: mean((r) => r.staggers),
        meanPerfectGuards: mean((r) => r.perfectGuards),
      };
    }),
  );
  expect(nightGroups.filter((g) => g.key.endsWith('dusk 0')).every((g) => g.wins === g.runs)).toBe(
    true,
  );
  console.table(nightGroups);
  const groups = [...new Set(results.map((r) => `${r.ruleset}/${r.keeper}/${r.plan}`))].map(
    (key) => {
      const group = results.filter((r) => `${r.ruleset}/${r.keeper}/${r.plan}` === key);
      return {
        key,
        runs: group.length,
        wins: group.filter((r) => r.outcome === 'won').length,
        meanFinalHealth:
          Math.round((group.reduce((n, r) => n + r.health, 0) / group.length) * 10) / 10,
        meanCombatTurns:
          Math.round((group.reduce((n, r) => n + r.combatTurns, 0) / group.length) * 10) / 10,
      };
    },
  );
  await mkdir('docs', { recursive: true });
  expect(
    groups.every((group) => group.wins > 0),
    'Every keeper / route plan must have at least one winning seed in the sample.',
  ).toBe(true);
  await writeFile(
    'docs/BALANCE_REPORT.json',
    await format(
      JSON.stringify(
        {
          generatedAt: new Date().toISOString(),
          seeds,
          policy:
            'Bounded 12-action search, beam width 18. Three fixed route plans; legal transitions only. Evidence of automated reachability, not novice difficulty or fun.',
          groups,
          results,
          longNight: {
            policy:
              'Ruleset 3, seeded routes. The same bounded search player (9 actions deep, beam 18) with rarity-first relic choices. A search player is far stronger than a person: Dusk 0 must always be winnable; Dusk 8 is expected to defeat it sometimes.',
            groups: nightGroups,
            results: night,
          },
        },
        null,
        2,
      ),
      { parser: 'json', printWidth: 100 },
    ),
  );
  console.table(groups);
  expect(results).toHaveLength(90);
});
