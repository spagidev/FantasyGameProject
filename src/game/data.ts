import { EPILOGUES, KEEPER_PAGES } from './lore';
export type KeeperId = 'warden' | 'seer' | 'wayfarer';
export type RelicId =
  | 'briar'
  | 'dawn'
  | 'mothglass'
  | 'thread'
  | 'psalm'
  | 'hearthseed'
  | 'kindling'
  | 'whetstone'
  | 'dew'
  | 'ferrycoin'
  | 'vigil'
  | 'bellrope'
  | 'censer'
  | 'clapper'
  | 'wick'
  | 'thornmail'
  | 'lantern'
  | 'buckle'
  | 'echo'
  | 'gravebloom'
  | 'sprig'
  | 'scale'
  | 'chime'
  | 'hourglass'
  | 'lodestar'
  | 'cinder'
  | 'idol'
  | 'mirror'
  | 'offcut'
  | 'spa'
  | 'wellrope'
  | 'chapelstone'
  | 'wire'
  | 'clapperboard'
  | 'joinery'
  | 'window';
export type Rarity = 'common' | 'uncommon' | 'rare';
export type NodeKind = 'battle' | 'elite' | 'event' | 'camp' | 'shop' | 'boss';
export type EnemyArt = 'wraith' | 'stag' | 'sentinel' | 'king';
export type WaylightId = 'well' | 'kiln' | 'lens';
export type TalentId =
  | 'citadel'
  | 'sunsteel'
  | 'vow'
  | 'breaker'
  | 'astral'
  | 'starfall'
  | 'moonward'
  | 'longsight'
  | 'bloom'
  | 'sap'
  | 'trail'
  | 'barb';
/** Lessons that exist only in ruleset 3; earlier rulesets never offer them. */
export const NEW_TALENTS: TalentId[] = ['breaker', 'longsight', 'barb'];

export const WAYLIGHTS = {
  well: {
    name: 'Dawnwell',
    icon: 'heart',
    benefit: 'Restore 2 health on each future crossing.',
    short: '+2 health / crossing',
    text: 'A spring runs through the ruins. Clear its guardian and the people who once tended it will keep your road supplied.',
  },
  kiln: {
    name: 'Cinder Kiln',
    icon: 'coins',
    benefit: 'Gain 4 coins on each future crossing.',
    short: '+4 coins / crossing',
    text: 'The old coiners still know the weight of an honest promise. Free their kiln and they will fund the road ahead.',
  },
  lens: {
    name: 'Moth Observatory',
    icon: 'focus',
    benefit: 'Start future battles with 1 extra focus (maximum 5).',
    short: '+1 starting focus',
    text: 'Beyond the broken lens, the moths have found a star. Free the observatory and they will teach you to carry its pattern.',
  },
} as const;

export const TALENTS: Record<
  TalentId,
  { keeper: KeeperId; name: string; icon: string; description: string; flavor: string }
> = {
  citadel: {
    keeper: 'warden',
    name: 'The living gate',
    icon: 'shield',
    description: 'Guard blocks 4 additional damage.',
    flavor: 'A door is a promise that someone will come home.',
  },
  sunsteel: {
    keeper: 'warden',
    name: 'Sunsteel resolve',
    icon: 'sword',
    description: 'Sundering blow deals 5 additional damage.',
    flavor: 'Remember what you are fighting for.',
  },
  vow: {
    keeper: 'warden',
    name: 'An unbroken vow',
    icon: 'focus',
    description: 'Strike generates 1 extra focus.',
    flavor: 'Each footstep says: not one more left behind.',
  },
  breaker: {
    keeper: 'warden',
    name: 'The breaking wave',
    icon: 'bell',
    description: 'Whenever you stagger an enemy, gain 2 focus.',
    flavor: 'Every wall has a moment when it would rather be a door.',
  },
  astral: {
    keeper: 'seer',
    name: 'The first constellation',
    icon: 'focus',
    description: 'Start each battle with 1 extra focus (maximum 5).',
    flavor: 'The stars were never above you. They were waiting within.',
  },
  starfall: {
    keeper: 'seer',
    name: 'A falling star',
    icon: 'sparkles',
    description: 'Starfire deals 5 additional piercing damage.',
    flavor: 'Even a forgotten sky can answer.',
  },
  moonward: {
    keeper: 'seer',
    name: 'The quiet moon',
    icon: 'shield',
    description: 'Gain 1 armor. Guard blocks 2 additional damage.',
    flavor: 'Some lights are meant to shelter, not to burn.',
  },
  longsight: {
    keeper: 'seer',
    name: 'Clear sight',
    icon: 'eye',
    description: 'Every perfect guard restores 1 focus.',
    flavor: 'To see a blow coming is to have already answered it.',
  },
  bloom: {
    keeper: 'wayfarer',
    name: 'A patient garden',
    icon: 'leaf',
    description: 'Nightbloom applies 2 additional poison.',
    flavor: 'Plant something that will outlive your sorrow.',
  },
  sap: {
    keeper: 'wayfarer',
    name: 'Sap of the old wood',
    icon: 'heart',
    description: 'Strike restores 3 health instead of 2.',
    flavor: 'The forest gives back what the road takes.',
  },
  trail: {
    keeper: 'wayfarer',
    name: 'A road shared',
    icon: 'coins',
    description: 'After each victory, gain 6 extra coins and restore 2 health.',
    flavor: 'Those you helped have not forgotten you.',
  },
  barb: {
    keeper: 'wayfarer',
    name: 'A barbed blade',
    icon: 'briar',
    description: 'Strike also applies 2 poison.',
    flavor: 'A small hurt, well placed, travels a long way.',
  },
};
export type Intent = {
  name: string;
  /** Raw damage of one hit, before the keeper's armor. */
  damage: number;
  /** Number of hits; armor applies to each. Defaults to 1. */
  hits?: number;
  guard?: number;
  heal?: number;
  drain?: number;
  /** The enemy permanently adds this to every later hit. */
  fury?: number;
  /** Keeper deals 25% less hit damage for this many of their actions. */
  weak?: number;
  /** Frost stacks: each enemy turn the keeper loses that much health, then one stack melts. */
  frost?: number;
};

export const KEEPERS = {
  warden: {
    name: 'Asha',
    title: 'The Warden',
    role: 'Stand against the dark',
    health: 48,
    attack: 7,
    armor: 2,
    skill: 'Sundering blow',
    cost: 3,
    description: 'A city gate upon her arm. The names of the lost upon her lips.',
    style: 'Steady defense · crushing blows',
    skillText: 'Deal 2× attack + 3 damage. Gain 5 guard.',
    technique: 'Shield bash',
    techniqueCost: 2,
    techniqueText: 'Deal damage equal to your Guard. Wears poise twice as fast.',
  },
  seer: {
    name: 'Orin',
    title: 'The Seer',
    role: 'Find a star in the ashes',
    health: 36,
    attack: 6,
    armor: 0,
    skill: 'Starfire',
    cost: 3,
    description: 'He reads the constellations that the sky has long forgotten.',
    style: 'Deep focus · piercing magic',
    skillText: 'Deal 2× attack + 7 damage, ignoring enemy guard.',
    technique: 'Foresee',
    techniqueCost: 2,
    techniqueText: 'Guard exactly the incoming blow: always a perfect guard.',
  },
  wayfarer: {
    name: 'Sable',
    title: 'The Wayfarer',
    role: 'Leave a flower in your wake',
    health: 40,
    attack: 6,
    armor: 1,
    skill: 'Nightbloom',
    cost: 2,
    description: 'Still delivering letters to places that no longer have a name.',
    style: 'Restoring strikes · lingering venom',
    skillText: 'Deal attack + 2 damage. Apply 5 poison (ticks this turn).',
    technique: 'Quicken',
    techniqueCost: 2,
    techniqueText: 'The enemy’s poison bites twice at once, without fading.',
  },
} as const;

export const RELICS: Record<
  RelicId,
  { name: string; description: string; flavor: string; icon: string; rarity: Rarity }
> = {
  briar: {
    name: 'Briar Charm',
    description: 'Guard also deals 3 damage.',
    flavor: 'Even a thorn remembers how to bloom.',
    icon: 'briar',
    rarity: 'common',
  },
  dawn: {
    name: 'Dawn Shard',
    description: 'Permanently gain 2 attack.',
    flavor: 'Warm, though there is no sun to warm it.',
    icon: 'sun',
    rarity: 'common',
  },
  mothglass: {
    name: 'Mothglass',
    description: 'Strike generates 1 extra focus.',
    flavor: 'A small light, reflected a thousand times.',
    icon: 'gem',
    rarity: 'common',
  },
  thread: {
    name: 'Pilgrim’s Thread',
    description: 'Restore 5 health after every victory.',
    flavor: 'Someone is waiting at the other end.',
    icon: 'thread',
    rarity: 'common',
  },
  psalm: {
    name: 'Iron Psalm',
    description: 'Permanently gain 1 armor.',
    flavor: 'A marching song, hammered into metal.',
    icon: 'shield',
    rarity: 'common',
  },
  hearthseed: {
    name: 'Hearthseed',
    description: 'Gain 10 maximum health. Heal 10.',
    flavor: 'Bury it somewhere you hope to return.',
    icon: 'seed',
    rarity: 'common',
  },
  kindling: {
    name: 'Kindling Knife',
    description: 'Your first Strike in every battle deals double damage.',
    flavor: 'The first spark is always the bravest.',
    icon: 'flame',
    rarity: 'common',
  },
  whetstone: {
    name: 'Echo Whetstone',
    description: 'After a perfect guard, your next Strike deals 6 more damage.',
    flavor: 'It sharpens on the sound of a blow that missed.',
    icon: 'sword',
    rarity: 'common',
  },
  dew: {
    name: 'Silver Dew',
    description: 'Flasks restore 8 more health and grant 6 guard.',
    flavor: 'The moths leave it on the lips of sleepers.',
    icon: 'flask',
    rarity: 'common',
  },
  ferrycoin: {
    name: 'Ferryman’s Coin',
    description: 'Gain 8 extra coins after every victory.',
    flavor: 'He never took it. Someone should spend it.',
    icon: 'coins',
    rarity: 'common',
  },
  vigil: {
    name: 'Vigil Candle',
    description: 'Start every battle with 1 extra focus.',
    flavor: 'Lit for someone who has not come home yet.',
    icon: 'focus',
    rarity: 'common',
  },
  bellrope: {
    name: 'Frayed Bell-rope',
    description: 'Gain 1 flask after defeating an elite or a bell guardian.',
    flavor: 'Whoever rang it last did not want to let go.',
    icon: 'bell',
    rarity: 'common',
  },
  censer: {
    name: 'Nightshade Censer',
    description: 'Guard also applies 2 poison.',
    flavor: 'A patient smoke. It waits behind your shield.',
    icon: 'leaf',
    rarity: 'uncommon',
  },
  clapper: {
    name: 'Bell Clapper',
    description: 'Your hits wear down poise 50% faster.',
    flavor: 'Bronze remembers every time it was struck.',
    icon: 'bell',
    rarity: 'uncommon',
  },
  wick: {
    name: 'Starved Wick',
    description: 'While at or below half health, gain 3 attack.',
    flavor: 'It burns brightest when there is almost nothing left.',
    icon: 'flame',
    rarity: 'uncommon',
  },
  thornmail: {
    name: 'Thornmail',
    description: 'Whenever an attack costs you health, the attacker takes 4 damage.',
    flavor: 'Woven by someone tired of being polite.',
    icon: 'briar',
    rarity: 'uncommon',
  },
  lantern: {
    name: 'Moth Lantern',
    description: 'While your focus is full, Strike deals 5 more damage.',
    flavor: 'A mind with nothing left to gather turns outward.',
    icon: 'sparkles',
    rarity: 'uncommon',
  },
  buckle: {
    name: 'Oathkeeper’s Buckle',
    description: 'Keep up to 6 unused guard into your next turn.',
    flavor: 'A promise does not expire at nightfall.',
    icon: 'shield',
    rarity: 'uncommon',
  },
  echo: {
    name: 'Echo Bell',
    description: 'Every third Strike in a battle lands twice.',
    flavor: 'Ring it once. Listen. There.',
    icon: 'bell',
    rarity: 'uncommon',
  },
  gravebloom: {
    name: 'Gravebloom',
    description: 'Poisoned enemies deal 2 less damage with every hit.',
    flavor: 'Nothing with roots in it stands quite as tall.',
    icon: 'seed',
    rarity: 'uncommon',
  },
  sprig: {
    name: 'Rowan Sprig',
    description: 'You cannot be weakened, and frost never settles on you.',
    flavor: 'Hung over doors by people who remembered why.',
    icon: 'leaf',
    rarity: 'uncommon',
  },
  scale: {
    name: 'Trader’s Scale',
    description: 'Everything a trader sells costs a quarter less.',
    flavor: 'Weighted, but in your favor for once.',
    icon: 'coins',
    rarity: 'uncommon',
  },
  chime: {
    name: 'Executioner’s Chime',
    description: 'Staggered enemies take double hit damage instead of +50%.',
    flavor: 'One clear note, and then the quiet.',
    icon: 'bell',
    rarity: 'rare',
  },
  hourglass: {
    name: 'Glass Hourglass',
    description: 'Enemies begin every battle staggered.',
    flavor: 'The sand inside fell once, and thought better of it.',
    icon: 'gem',
    rarity: 'rare',
  },
  lodestar: {
    name: 'Lodestar',
    description: 'Your keeper skill costs 1 less focus.',
    flavor: 'It does not point north. It points at what you meant to do.',
    icon: 'sparkles',
    rarity: 'rare',
  },
  cinder: {
    name: 'Phoenix Cinder',
    description: 'Once per expedition, survive a killing blow with 12 health.',
    flavor: 'Still warm. It has done this before.',
    icon: 'flame',
    rarity: 'rare',
  },
  idol: {
    name: 'Ashen Idol',
    description: 'Gain 4 attack. Lose 8 maximum health.',
    flavor: 'It asks for very little. It asks every day.',
    icon: 'eye',
    rarity: 'rare',
  },
  mirror: {
    name: 'Shard of the March',
    description: 'A perfect guard also reflects half the blocked damage.',
    flavor: 'A soldier’s last look at the sky, kept in glass.',
    icon: 'gem',
    rarity: 'rare',
  },
  // Province boons (v0.11): each joins future roads when its province's legend is recovered.
  offcut: {
    name: 'Coronation Offcut',
    description: 'Gain 6 maximum health and 1 armor.',
    flavor: 'Gold left over from a crown made for somebody else’s king.',
    icon: 'sun',
    rarity: 'uncommon',
  },
  spa: {
    name: 'Warm-spring Flask',
    description: 'Flasks restore 6 more health, and so does every rest.',
    flavor: 'Filled where the plain still steams, nine hundred winters on.',
    icon: 'flask',
    rarity: 'uncommon',
  },
  wellrope: {
    name: 'Captive’s Well-rope',
    description: 'Begin every battle with 6 guard against the first blow.',
    flavor: 'Three winters of digging, for love. The rope never frayed.',
    icon: 'thread',
    rarity: 'uncommon',
  },
  chapelstone: {
    name: 'Chapel Cornerstone',
    description: 'Every bell you ring restores 15 health.',
    flavor: 'The first stone of the first chapel. It has heard every bell since.',
    icon: 'bell',
    rarity: 'uncommon',
  },
  wire: {
    name: 'Tinker’s Wire',
    description: 'Entering a trader’s stall restores 10 health.',
    flavor: 'Enough to mend a pot, a fence, or a traveller.',
    icon: 'seed',
    rarity: 'uncommon',
  },
  clapperboard: {
    name: 'Miners’ Clapper',
    description: 'Every perfect guard also strikes 3 coins.',
    flavor: 'They beat it to wake one another before a dawn that never came.',
    icon: 'coins',
    rarity: 'uncommon',
  },
  joinery: {
    name: 'Nail-less Joint',
    description: 'Thorns and plating have no effect on you.',
    flavor: 'Iron remembers violence. Good joinery remembers only the tree.',
    icon: 'leaf',
    rarity: 'rare',
  },
  window: {
    name: 'The Last Lit Window',
    description: 'Nights never toughen your enemies, and every dawn restores 3 health.',
    flavor: 'The last window in Veyr to go dark. It does not intend to again.',
    icon: 'sparkles',
    rarity: 'rare',
  },
};
/**
 * Relic sets (v0.10): carrying all three relics of a set adds one more rule. Ruleset 3 only.
 */
export type SetId = 'kit' | 'watch' | 'garden' | 'purse';
export const RELIC_SETS: Record<
  SetId,
  { name: string; relics: [RelicId, RelicId, RelicId]; bonus: string; flavor: string }
> = {
  kit: {
    name: 'The bell-ringer’s kit',
    relics: ['clapper', 'chime', 'echo'],
    bonus: 'Whenever you stagger an enemy, gain 1 focus.',
    flavor: 'Three ways of asking the same bell the same question.',
  },
  watch: {
    name: 'The long watch',
    relics: ['buckle', 'psalm', 'mirror'],
    bonus: 'Every perfect guard restores 2 health.',
    flavor: 'Somebody has to stand here. It may as well be someone who can sing.',
  },
  garden: {
    name: 'The night garden',
    relics: ['censer', 'gravebloom', 'briar'],
    bonus: 'Poison fades only every second turn.',
    flavor: 'Plant it at dusk. Do not water it. Do not look back.',
  },
  purse: {
    name: 'The pilgrim’s purse',
    relics: ['ferrycoin', 'scale', 'thread'],
    bonus: 'Every trader you visit gives you a flask.',
    flavor: 'The coin, the weight and the way home: everything a pilgrim needs to bargain.',
  },
};
/** The set a relic belongs to, if any. */
export const setOf = (id: RelicId): SetId | undefined =>
  (Object.keys(RELIC_SETS) as SetId[]).find((s) => RELIC_SETS[s].relics.includes(id));

/** The six relics of the first two rulesets, in their original order. */
export const LEGACY_RELICS: RelicId[] = [
  'briar',
  'dawn',
  'mothglass',
  'thread',
  'psalm',
  'hearthseed',
];
/** Relics available to a brand-new chronicle; deeds unlock the rest. */
export const STARTING_RELICS: RelicId[] = [
  ...LEGACY_RELICS,
  'kindling',
  'whetstone',
  'dew',
  'ferrycoin',
  'vigil',
  'bellrope',
  'censer',
  'clapper',
  'wick',
  'thornmail',
];

export const CHAPTERS = [
  {
    name: 'The Sunken Reach',
    short: 'The Reach',
    subtitle: 'Where the water remembers',
    color: '#76b6a5',
    boss: 'The Bellwether',
    art: 'stag' as EnemyArt,
    passage: 'The first bell is silent. Beneath the black water, a village dreams of morning.',
    memory: 'The bell was never a warning of danger. It was a call to come home.',
  },
  {
    name: 'The Glass March',
    short: 'The March',
    subtitle: 'An oath without a kingdom',
    color: '#a4afce',
    boss: 'The Oathless Sentinel',
    art: 'sentinel' as EnemyArt,
    passage: 'An army of glass guards an empty border. Somewhere, a soldier is still singing.',
    memory: 'They were not guarding a kingdom. They were keeping a path open for refugees.',
  },
  {
    name: 'The Rootbound Crown',
    short: 'The Crown',
    subtitle: 'Every promise has a root',
    color: '#d6ae7b',
    boss: 'The Hollow King',
    art: 'king' as EnemyArt,
    passage:
      'The palace hangs beneath the world. The king has waited nine hundred winters for a name.',
    memory: 'Her name was Eira. She taught her father the word for dawn.',
  },
] as const;

export type EventOption = {
  label: string;
  description: string;
  health?: number;
  coins?: number;
  flasks?: number;
  attack?: number;
  /** Ruleset 3 only. */
  armor?: number;
  maxHealth?: number;
  /** Grants one seeded relic the keeper does not carry yet. */
  relic?: true;
  lore: string;
  result: string;
};
/** Story scenes of the first two rulesets: the first three entries of EVENTS. */
export const LEGACY_EVENT_COUNT = 3;
export const EVENTS = [
  {
    name: 'The ferryman’s fare',
    eyebrow: 'A crossing without a shore',
    text: 'An old man waits beside a boat full of candles. “I take no coin,” he says. “Only a little of the warmth you carry. There are people on the far shore who have forgotten what it feels like.”',
    options: [
      {
        label: 'Share your ember',
        description: 'Lose 6 health · gain 2 attack',
        health: -6,
        attack: 2,
        lore: 'ferryman',
        result: 'The candles catch. In their light, your blade remembers the shape of sunrise.',
      },
      {
        label: 'Help him mend the boat',
        description: 'Gain 15 coins · restore 5 health',
        coins: 15,
        health: 5,
        lore: 'ferryman',
        result: 'You work in companionable silence. When you leave, the boat has two oars again.',
      },
    ],
  },
  {
    name: 'Letters to the lost',
    eyebrow: 'Some words still find a home',
    text: 'Beneath a fallen milestone is a satchel of undelivered letters. The last is addressed to you. Inside: a pressed flower, a tiny map, and the words “You have been here before. Be kind this time.”',
    options: [
      {
        label: 'Follow the tiny map',
        description: 'Gain 22 coins',
        coins: 22,
        lore: 'letters',
        result:
          'The map leads to a cache tucked into the roots. Someone believed you would make it.',
      },
      {
        label: 'Deliver the letters',
        description: 'Restore 14 health',
        health: 14,
        lore: 'letters',
        result:
          'You lay each letter on a doorstep. For a moment, warm light shines through the empty windows.',
      },
    ],
  },
  {
    name: 'The moth archivist',
    eyebrow: 'A library with wings',
    text: 'A thousand pale moths settle into the shape of a woman. “We keep what the fire cannot,” she whispers. “Give us a little gold. We will give you a memory worth carrying.”',
    options: [
      {
        label: 'Buy a forgotten memory',
        description: 'Pay 15 coins · gain 2 attack',
        coins: -15,
        attack: 2,
        lore: 'moths',
        result:
          'You remember someone teaching you to hold a sword. You have never met them. You miss them.',
      },
      {
        label: 'Offer a story of your own',
        description: 'Gain 1 flask',
        flasks: 1,
        lore: 'moths',
        result: 'You tell them of Cinderfall. The moths leave a bottle of silver dew in your hand.',
      },
    ],
  },
  {
    name: 'The bell-founder’s ghost',
    eyebrow: 'Bronze that never cools',
    text: 'A founder’s ghost still tends a crucible that has glowed for nine hundred winters. “Every bell is made of something given up,” she says, without looking round. “What have you brought me?”',
    options: [
      {
        label: 'Give her your coins to melt',
        description: 'Pay 25 coins · gain 1 armor',
        coins: -25,
        armor: 1,
        lore: 'founder',
        result:
          'She pours a thin bright plate and rivets it over your heart. It rings when you breathe.',
      },
      {
        label: 'Give her a little of your warmth',
        description: 'Lose 8 health · receive a relic',
        health: -8,
        relic: true,
        lore: 'founder',
        result:
          'The bronze takes the heat from your hands. When it sets, there is something inside the mold.',
      },
      {
        label: 'Work the bellows a while',
        description: 'Gain 12 coins',
        coins: 12,
        lore: 'founder',
        result: 'She pays you in old coin, the kind with a sun on it.',
      },
    ],
  },
  {
    name: 'The hedge that asks',
    eyebrow: 'Some doors want to be paid in kind',
    text: 'Black briars have swallowed the road. Where a traveler bled on them, long ago, a single arch of roses still stands open. The hedge leans toward you, patient as a toll-keeper.',
    options: [
      {
        label: 'Walk through the thorns',
        description: 'Lose 7 health · gain 10 maximum health',
        health: -7,
        maxHealth: 10,
        lore: 'hedge',
        result: 'It hurts exactly as much as it should. On the far side you stand a little taller.',
      },
      {
        label: 'Pour out a flask at its roots',
        description: 'Lose 1 flask · gain 2 attack',
        flasks: -1,
        attack: 2,
        lore: 'hedge',
        result:
          'The briars drink, and part. One long thorn comes away in your hand, straight as a blade.',
      },
      {
        label: 'Find the long way round',
        description: 'Restore 6 health',
        health: 6,
        lore: 'hedge',
        result: 'It costs you an hour and nothing else. The roses watch you go.',
      },
    ],
  },
  {
    name: 'The lamplighter’s ledger',
    eyebrow: 'One street at a time',
    text: 'A woman with a ladder is lighting lamps along a street with no houses. Her ledger lists every window that used to be here. “Oil is dear,” she says. “But a lit street gets walked on.”',
    options: [
      {
        label: 'Pay for the whole street',
        description: 'Pay 30 coins · gain 8 maximum health · restore 8 health',
        coins: -30,
        maxHealth: 8,
        health: 8,
        lore: 'lamplighter',
        result: 'She writes your name in the ledger, under the heading “returned”.',
      },
      {
        label: 'Carry her ladder to the end',
        description: 'Gain 1 flask',
        flasks: 1,
        lore: 'lamplighter',
        result: 'At the last lamp she fills your flask with oil that smells of oranges.',
      },
    ],
  },
  {
    name: 'The well that answers',
    eyebrow: 'It gives back what it thinks you need',
    text: 'A well stands in the middle of the road, as wells do not. A bucket comes up empty and waits. Carved on the rim: “Something for something. I am not a thief.”',
    options: [
      {
        label: 'Lower your purse',
        description: 'Pay 12 coins · restore 18 health',
        coins: -12,
        health: 18,
        lore: 'well',
        result: 'The bucket returns full of water as warm as a hand. The coins do not come back.',
      },
      {
        label: 'Lower a full flask',
        description: 'Lose 1 flask · receive a relic',
        flasks: -1,
        relic: true,
        lore: 'well',
        result:
          'A long silence. Then the rope goes taut, and something heavy comes up in the dark.',
      },
      {
        label: 'Lower nothing, and listen',
        description: 'Gain 8 coins',
        coins: 8,
        lore: 'well',
        result: 'After a while the well sighs, and sends up a little of someone else’s offering.',
      },
    ],
  },
  {
    name: 'A wager in glass',
    eyebrow: 'He has stood here a very long time',
    text: 'A soldier of stained glass blocks the path, sword grounded. “Orders,” he says, apologetically. “But a soldier may accept a challenge. Break my guard and my shield is yours. Or sit, and tell me who won the war.”',
    options: [
      {
        label: 'Accept the challenge',
        description: 'Lose 10 health · gain 1 armor · gain 15 coins',
        health: -10,
        armor: 1,
        coins: 15,
        lore: 'wager',
        result:
          'He fights like a man relieved to be asked. When his guard breaks he laughs, and unbuckles the shield.',
      },
      {
        label: 'Sit, and tell him the truth',
        description: 'Restore 12 health',
        health: 12,
        lore: 'wager',
        result:
          '“Nobody,” you say. He thinks about that. Then he shares his fire, which is more than orders allow.',
      },
    ],
  },
  {
    name: 'The library grown shut',
    eyebrow: 'Roots are a kind of handwriting',
    text: 'The palace library has been eaten by roots; the books are closed inside the wood like flies in amber. One shelf is still within reach. Each spine has a title, and a price in something other than coin.',
    options: [
      {
        label: '“The Warden’s Drills”',
        description: 'Lose 6 health · gain 2 attack',
        health: -6,
        attack: 2,
        lore: 'library',
        result: 'The pages cut your fingers. The footwork is worth it.',
      },
      {
        label: '“On Keeping Warm”',
        description: 'Gain 6 maximum health · gain 1 flask',
        maxHealth: 6,
        flasks: 1,
        lore: 'library',
        result: 'A recipe, a lullaby, and a way of banking a fire so that it lasts until morning.',
      },
      {
        label: 'Pry out the gilt lettering',
        description: 'Gain 24 coins',
        coins: 24,
        lore: 'library',
        result: 'It is only gold. The book lets you have it, and keeps the words.',
      },
    ],
  },
  {
    name: 'The face that asks your name',
    eyebrow: 'Do not give it everything',
    text: 'A hollow thing wearing the king’s face is sitting on a milestone, very politely. “I have lost mine,” it says. “Might I borrow a little of yours? I will give you something sharp in return.”',
    options: [
      {
        label: 'Lend it a syllable',
        description: 'Lose 6 maximum health · gain 3 attack',
        maxHealth: -6,
        attack: 3,
        lore: 'face',
        result:
          'It says the sound over and over, delighted. You feel thinner, and much more dangerous.',
      },
      {
        label: 'Give it a name you made up',
        description: 'Gain 14 coins',
        coins: 14,
        lore: 'face',
        result:
          'It thanks you gravely, and pays for the lie with a real coin. You feel slightly ashamed.',
      },
    ],
  },
  {
    name: 'The moth-eaten map',
    eyebrow: 'Half a road is still a road',
    text: 'Nailed to a signpost is a map with most of the country chewed out of it. What remains shows a shortcut through the marsh, and a cross in red ink, and in a child’s hand: “dont”.',
    options: [
      {
        label: 'Take the shortcut',
        description: 'Lose 9 health · gain 34 coins',
        health: -9,
        coins: 34,
        lore: 'map',
        result:
          'The child was right. But the thing in the marsh had been sitting on a great deal of money.',
      },
      {
        label: 'Burn the map for warmth',
        description: 'Restore 10 health',
        health: 10,
        lore: 'map',
        result: 'It burns a long time for so little paper. Old roads usually do.',
      },
    ],
  },
  {
    name: 'The last smith of Veyr',
    eyebrow: 'She has been waiting for a customer',
    text: 'A forge glows under a fallen arch. The smith is very old and has, it turns out, been keeping the fire in for someone exactly like you. “I can do one good thing today,” she says. “Choose.”',
    options: [
      {
        label: 'An edge',
        description: 'Pay 22 coins · gain 2 attack',
        coins: -22,
        attack: 2,
        lore: 'smith',
        result: 'She works without hurry. The edge she puts on it will outlast both of you.',
      },
      {
        label: 'A rivet in the right place',
        description: 'Pay 22 coins · gain 1 armor',
        coins: -22,
        armor: 1,
        lore: 'smith',
        result: 'One plate, one rivet. “There,” she says. “That is where it was going to go in.”',
      },
      {
        label: 'Just sit by the fire',
        description: 'Restore 8 health',
        health: 8,
        lore: 'smith',
        result: 'She seems glad of the company, which may have been the one good thing.',
      },
    ],
  },
] satisfies { name: string; eyebrow: string; text: string; options: EventOption[] }[];

export const LORE = [
  {
    id: 'beginning',
    title: 'The stolen ember',
    text: 'Cinderfall burns memories to survive. This morning, you found one that would not burn: a child teaching her father the word for dawn. Tonight, you take an ember from the Last Hearth and follow it into the dark.',
  },
  { id: 'bell-1', title: 'A call to come home', text: CHAPTERS[0].memory },
  { id: 'bell-2', title: 'The open road', text: CHAPTERS[1].memory },
  { id: 'bell-3', title: 'The name of the dawn', text: CHAPTERS[2].memory },
  {
    id: 'ferryman',
    title: 'The ferryman',
    text: 'He has carried nine hundred winters of travelers across a river that no longer has a far bank. He lights a candle for each of them. He is still waiting for his wife.',
  },
  {
    id: 'letters',
    title: 'Letters to the lost',
    text: 'A town is not gone while someone still writes to it. The couriers of Veyr delivered letters for forty years after the roads disappeared.',
  },
  {
    id: 'moths',
    title: 'The moth archivists',
    text: 'The moths were once keepers of the royal library. When the books caught fire, they took the words upon their wings. There is no such thing as an empty page in Veyr.',
  },
  {
    id: 'dawn',
    title: 'A shared sunrise',
    text: 'No one person can carry a sun. You ring the bells, and a thousand windows open. Every remembered name becomes a little light. Eira is the first. She will not be the last.',
  },
  {
    id: 'hearth',
    title: 'A different kind of light',
    text: 'You leave the sun to sleep and bring the king home. Cinderfall builds a library around the hearth. The stories warm the city without being burned. Some nights are worth keeping.',
  },
  {
    id: 'founder',
    title: 'What bells are made of',
    text: 'The three bells of Veyr were cast from wedding rings, door hinges and one small spoon. The founder kept a list of who gave what. She is still adding to it.',
  },
  {
    id: 'hedge',
    title: 'The rose arch',
    text: 'The briars were planted to keep the dark out of the orchards. They cannot tell the dark from a traveler any more. They can still tell who is willing to bleed for the road.',
  },
  {
    id: 'lamplighter',
    title: 'A street with no houses',
    text: 'The lamplighter was paid a year in advance, the week before the sun was sealed away. She considers the contract unfinished.',
  },
  {
    id: 'well',
    title: 'Something for something',
    text: 'The well was a tax office once. When the clerks forgot what taxes were for, it went on collecting, and tried very hard to be fair.',
  },
  {
    id: 'wager',
    title: 'Who won the war',
    text: 'The Glass March was never an army of conquest. Its soldiers were told to hold a road open until everyone was through. No one came to tell them that everyone was.',
  },
  {
    id: 'library',
    title: 'Closed in the wood',
    text: 'When the palace turned upside down, the roots took the library first. Not to destroy it. Roots keep things. That is all they have ever done.',
  },
  {
    id: 'face',
    title: 'The borrowed face',
    text: 'The Hollow are not cruel. They are what is left when a name is burned for light: a shape that remembers being loved, and would like to know by whom.',
  },
  {
    id: 'map',
    title: '“dont”',
    text: 'The map was drawn by a girl called Eira for her father, who got lost easily. He kept it in his crown.',
  },
  {
    id: 'smith',
    title: 'One good thing',
    text: 'The last smith of Veyr made the lock on the sun’s second heart. She has spent nine hundred winters wishing she had made it a little worse.',
  },
  ...KEEPER_PAGES,
  ...EPILOGUES,
] as const;

export const NODE_LABELS: Record<NodeKind, string> = {
  battle: 'Encounter',
  elite: 'Elite encounter',
  event: 'Story',
  camp: 'Sanctuary',
  shop: 'Wandering trader',
  boss: 'Bell guardian',
};
