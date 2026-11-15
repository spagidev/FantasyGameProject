import type { EnemyArt, Intent } from './data';

/** Passive enemy rules. All are shown on the enemy before and during a fight. */
export type Traits = {
  /** Each Strike against it costs the keeper this much health (never the last point). */
  thorns?: number;
  /** Restores this much health after each of its own actions. */
  regen?: number;
  /** Every non-piercing hit against it is reduced by this much, to a minimum of 1. */
  plated?: number;
};
export type Foe = {
  id: string;
  name: string;
  art: EnemyArt;
  /** Hue rotation of the shared portrait, in degrees. */
  tint: number;
  health: number;
  poise: number;
  pattern: Intent[];
  traits?: Traits;
  /** Guardians change their pattern after the action in which they fall to half health. */
  phase2?: { name: string; pattern: Intent[] };
  blurb: string;
};

/** Four ordinary enemies per realm. Three guard the waylights; the fourth walks the middle roads. */
export const ORDINARY: Foe[][] = [
  [
    {
      id: 'watcher',
      name: 'Drowned Watcher',
      art: 'wraith',
      tint: 0,
      health: 24,
      poise: 11,
      pattern: [
        { name: 'Lunging strike', damage: 6 },
        { name: 'Gathering shadow', damage: 0, guard: 6 },
        { name: 'Heavy strike', damage: 12 },
      ],
      blurb: 'It kept watch over the flood, and then under it. One slow, heavy blow in three.',
    },
    {
      id: 'pilgrim',
      name: 'Ashbound Pilgrim',
      art: 'wraith',
      tint: 35,
      health: 21,
      poise: 10,
      pattern: [
        { name: 'First ember', damage: 3, hits: 2 },
        { name: 'Second ember', damage: 3, hits: 2 },
        { name: 'Cinder storm', damage: 11 },
      ],
      blurb: 'Never stops attacking. Its small double blows break against armor.',
    },
    {
      id: 'revenant',
      name: 'Mire Revenant',
      art: 'wraith',
      tint: 150,
      health: 27,
      poise: 13,
      pattern: [
        { name: 'Clammy grasp', damage: 5, frost: 2 },
        { name: 'Drag under', damage: 9 },
        { name: 'Sink into the mire', damage: 0, heal: 7 },
      ],
      blurb: 'Cold hands, and a habit of sinking away to mend. Do not give it the time.',
    },
    {
      id: 'eater',
      name: 'Lantern-eater',
      art: 'wraith',
      tint: 250,
      health: 21,
      poise: 10,
      pattern: [
        { name: 'Unravel the light', damage: 5, drain: 1 },
        { name: 'Veil of moths', damage: 0, guard: 7 },
        { name: 'A stolen star', damage: 10 },
      ],
      blurb: 'It feeds on focus. Spend yours before it does.',
    },
  ],
  [
    {
      id: 'soldier',
      name: 'Glassbound Soldier',
      art: 'sentinel',
      tint: 0,
      health: 41,
      poise: 19,
      traits: { plated: 2 },
      pattern: [
        { name: 'Marching blow', damage: 9 },
        { name: 'Shield wall', damage: 0, guard: 10 },
        { name: 'Shatter', damage: 16 },
      ],
      blurb: 'Stained-glass plate turns small blows aside. Hit hard, or not at all.',
    },
    {
      id: 'standard',
      name: 'The Pale Standard',
      art: 'sentinel',
      tint: 60,
      health: 36,
      poise: 16,
      pattern: [
        { name: 'Raise the colors', damage: 0, fury: 2 },
        { name: 'Pike thrust', damage: 8 },
        { name: 'Pike thrust', damage: 8 },
      ],
      blurb: 'Every time the banner goes up, every blow after it lands harder. End it quickly.',
    },
    {
      id: 'knight',
      name: 'Shattered Knight',
      art: 'sentinel',
      tint: 200,
      health: 45,
      poise: 21,
      pattern: [
        { name: 'Sweeping cut', damage: 8, weak: 2 },
        { name: 'Riposte stance', damage: 0, guard: 12 },
        { name: 'Executioner’s arc', damage: 18 },
      ],
      blurb: 'A cut that weakens your arm, a wall of guard, then the arc. Break it before the arc.',
    },
    {
      id: 'wisp',
      name: 'Mirror Wisp',
      art: 'wraith',
      tint: 200,
      health: 32,
      poise: 14,
      pattern: [
        { name: 'Dazzle', damage: 7, drain: 2 },
        { name: 'Refract', damage: 0, guard: 8 },
        { name: 'Prism lance', damage: 4, hits: 3 },
      ],
      blurb: 'Light with nowhere to go. Its lance is three thin blows; armor blunts each one.',
    },
  ],
  [
    {
      id: 'shade',
      name: 'Rootbound Shade',
      art: 'wraith',
      tint: 90,
      health: 59,
      poise: 24,
      traits: { regen: 3 },
      pattern: [
        { name: 'Grasping roots', damage: 12, weak: 2 },
        { name: 'Entwine', damage: 0, guard: 12 },
        { name: 'Uproot', damage: 21 },
      ],
      blurb: 'It knits itself back together every turn. Slow fights are lost fights.',
    },
    {
      id: 'crownless',
      name: 'Crownless Keeper',
      art: 'king',
      tint: 160,
      health: 63,
      poise: 26,
      pattern: [
        { name: 'Lantern lash', damage: 11, drain: 1 },
        { name: 'Lantern lash', damage: 11, drain: 1 },
        { name: 'Snuff the light', damage: 20 },
      ],
      blurb: 'A keeper who went before you. It knows exactly what focus is worth.',
    },
    {
      id: 'herald',
      name: 'Forgotten Herald',
      art: 'sentinel',
      tint: 300,
      health: 55,
      poise: 22,
      pattern: [
        { name: 'Proclaim', damage: 0, fury: 3 },
        { name: 'Edict', damage: 12 },
        { name: 'Edict', damage: 12 },
        { name: 'Silence', damage: 7, drain: 3 },
      ],
      blurb: 'Each proclamation makes the next edict worse. It has a great many proclamations.',
    },
    {
      id: 'courtier',
      name: 'Hollow Courtier',
      art: 'king',
      tint: 250,
      health: 57,
      poise: 24,
      traits: { thorns: 3 },
      pattern: [
        { name: 'A cold bow', damage: 9, frost: 3 },
        { name: 'Raise the mask', damage: 0, guard: 10 },
        { name: 'The knife behind', damage: 19 },
      ],
      blurb: 'Dressed in briars for court. Every Strike you land costs you a little.',
    },
  ],
];

/** Two elites per realm. */
export const ELITES: Foe[][] = [
  [
    {
      id: 'thornbound',
      name: 'The Thornbound',
      art: 'sentinel',
      tint: 100,
      health: 38,
      poise: 16,
      traits: { thorns: 2 },
      pattern: [
        { name: 'Test your resolve', damage: 7, drain: 1 },
        { name: 'Close ranks', damage: 0, guard: 9 },
        { name: 'Break the line', damage: 14 },
      ],
      blurb: 'A warden the hedge grew through. Strikes cost blood; skills and patience do not.',
    },
    {
      id: 'tollkeeper',
      name: 'The Tollkeeper',
      art: 'stag',
      tint: 200,
      health: 35,
      poise: 14,
      pattern: [
        { name: 'Count the dead', damage: 0, fury: 2 },
        { name: 'The toll', damage: 7 },
        { name: 'The toll', damage: 7 },
        { name: 'Final demand', damage: 12 },
      ],
      blurb: 'It adds to the bill every time it counts. Interrupt the counting.',
    },
  ],
  [
    {
      id: 'captain',
      name: 'The Glass Captain',
      art: 'sentinel',
      tint: 320,
      health: 62,
      poise: 26,
      traits: { plated: 2 },
      pattern: [
        { name: 'Test your resolve', damage: 10, drain: 1 },
        { name: 'Close ranks', damage: 0, guard: 12, fury: 1 },
        { name: 'Break the line', damage: 19 },
      ],
      blurb: 'Plated, disciplined, and angrier each time it closes ranks.',
    },
    {
      id: 'chorister',
      name: 'The Chorister',
      art: 'wraith',
      tint: 300,
      health: 56,
      poise: 22,
      pattern: [
        { name: 'Dirge', damage: 5, frost: 3 },
        { name: 'Rising verse', damage: 9 },
        { name: 'Rising verse', damage: 13 },
        { name: 'Final chord', damage: 18 },
        { name: 'Hymn of mending', damage: 0, heal: 12 },
      ],
      blurb: 'A song in five parts that ends by starting again. Silence it before the hymn.',
    },
  ],
  [
    {
      id: 'hand',
      name: 'The King’s Hand',
      art: 'sentinel',
      tint: 40,
      health: 85,
      poise: 34,
      pattern: [
        { name: 'Test your resolve', damage: 13, drain: 1 },
        { name: 'Close ranks', damage: 0, guard: 14 },
        { name: 'Break the line', damage: 22 },
        { name: 'Sign the warrant', damage: 8, fury: 2 },
      ],
      blurb: 'It does what the king no longer can bring himself to do.',
    },
    {
      id: 'unnamed',
      name: 'The Unnamed',
      art: 'wraith',
      tint: 320,
      health: 77,
      poise: 30,
      traits: { regen: 4 },
      pattern: [
        { name: 'Forget', damage: 10, weak: 2 },
        { name: 'Forget', damage: 10, frost: 3 },
        { name: 'Erase', damage: 23 },
      ],
      blurb:
        'Whatever it was, the fire took all of it. It heals because there is nothing to wound.',
    },
  ],
];

/** One bell guardian per realm, each with a second pattern below half health. */
export const BOSSES: Foe[] = [
  {
    id: 'bellwether',
    name: 'The Bellwether',
    art: 'stag',
    tint: 0,
    health: 58,
    poise: 19,
    pattern: [
      { name: 'Antler sweep', damage: 8 },
      { name: 'Gather the lost', damage: 0, guard: 8 },
      { name: 'The bell tolls', damage: 16 },
    ],
    phase2: {
      name: 'The bell cracks',
      pattern: [
        { name: 'Stampede', damage: 4, hits: 3 },
        { name: 'Lower the horns', damage: 0, guard: 6, fury: 2 },
        { name: 'The bell tolls', damage: 16 },
      ],
    },
    blurb: 'A warning bell given flesh. It has forgotten whom it was meant to warn.',
  },
  {
    id: 'sentinel',
    name: 'The Oathless Sentinel',
    art: 'sentinel',
    tint: 0,
    health: 94,
    poise: 29,
    pattern: [
      { name: 'Marching blow', damage: 11 },
      { name: 'Raise the standard', damage: 0, guard: 14 },
      { name: 'Shattering oath', damage: 21 },
    ],
    phase2: {
      name: 'The oath breaks',
      pattern: [
        { name: 'Glass storm', damage: 5, hits: 3 },
        { name: 'Reform', damage: 0, heal: 10, fury: 2 },
        { name: 'Shattering oath', damage: 21 },
      ],
    },
    blurb: 'It remembers the command, not the cause. Its armor breaks in the rhythm of a march.',
  },
  {
    id: 'king',
    name: 'The Hollow King',
    art: 'king',
    tint: 0,
    health: 132,
    poise: 37,
    pattern: [
      { name: 'The weight of names', damage: 14, drain: 1 },
      { name: 'A king’s sorrow', damage: 0, heal: 10 },
      { name: 'The long night', damage: 23 },
    ],
    phase2: {
      name: 'He remembers her name',
      pattern: [
        { name: 'Grief', damage: 8, hits: 2 },
        { name: 'Eclipse', damage: 0, guard: 12, fury: 3 },
        { name: 'The long night', damage: 23 },
        { name: 'Unmaking', damage: 14, hits: 2 },
      ],
    },
    blurb: 'He has kept a promise for nine hundred winters. He will not be argued out of it.',
  },
];

export const FOES: Record<string, Foe> = Object.fromEntries(
  [...ORDINARY.flat(), ...ELITES.flat(), ...BOSSES].map((f) => [f.id, f]),
);
export function describeTraits(t: Traits | undefined): { label: string; text: string }[] {
  if (!t) return [];
  return [
    ...(t.thorns
      ? [{ label: `Thorns ${t.thorns}`, text: `Each Strike costs you ${t.thorns} health.` }]
      : []),
    ...(t.regen
      ? [{ label: `Regrowth ${t.regen}`, text: `Restores ${t.regen} health after each action.` }]
      : []),
    ...(t.plated
      ? [
          {
            label: `Plated ${t.plated}`,
            text: `Hits deal ${t.plated} less. Piercing and poison ignore it.`,
          },
        ]
      : []),
  ];
}
