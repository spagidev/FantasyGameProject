export type KeeperId = 'warden' | 'seer' | 'wayfarer';
export type RelicId = 'briar' | 'dawn' | 'mothglass' | 'thread' | 'psalm' | 'hearthseed';
export type NodeKind = 'battle' | 'elite' | 'event' | 'camp' | 'shop' | 'boss';
export type EnemyArt = 'wraith' | 'stag' | 'sentinel' | 'king';
export type WaylightId = 'well' | 'kiln' | 'lens';
export type TalentId =
  'citadel' | 'sunsteel' | 'vow' | 'astral' | 'starfall' | 'moonward' | 'bloom' | 'sap' | 'trail';

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
};
export type Intent = {
  name: string;
  damage: number;
  guard?: number;
  heal?: number;
  drain?: number;
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
  },
} as const;

export const RELICS: Record<
  RelicId,
  { name: string; description: string; flavor: string; icon: string }
> = {
  briar: {
    name: 'Briar Charm',
    description: 'Guard also deals 3 damage.',
    flavor: 'Even a thorn remembers how to bloom.',
    icon: 'briar',
  },
  dawn: {
    name: 'Dawn Shard',
    description: 'Permanently gain 2 attack.',
    flavor: 'Warm, though there is no sun to warm it.',
    icon: 'sun',
  },
  mothglass: {
    name: 'Mothglass',
    description: 'Strike generates 1 extra focus.',
    flavor: 'A small light, reflected a thousand times.',
    icon: 'gem',
  },
  thread: {
    name: 'Pilgrim’s Thread',
    description: 'Restore 5 health after every victory.',
    flavor: 'Someone is waiting at the other end.',
    icon: 'thread',
  },
  psalm: {
    name: 'Iron Psalm',
    description: 'Permanently gain 1 armor.',
    flavor: 'A marching song, hammered into metal.',
    icon: 'shield',
  },
  hearthseed: {
    name: 'Hearthseed',
    description: 'Gain 10 maximum health. Heal 10.',
    flavor: 'Bury it somewhere you hope to return.',
    icon: 'seed',
  },
};

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
  lore: string;
  result: string;
};
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
] as const;

export const NODE_LABELS: Record<NodeKind, string> = {
  battle: 'Encounter',
  elite: 'Elite encounter',
  event: 'Story',
  camp: 'Sanctuary',
  shop: 'Wandering trader',
  boss: 'Bell guardian',
};
