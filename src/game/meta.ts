import { FOES } from './bestiary';
import { KEEPERS, LORE, RELICS, STARTING_RELICS, type KeeperId, type RelicId } from './data';
import { DUSK_MAX, type Run } from './engine';

/**
 * Everything a chronicle remembers between expeditions. None of it makes a keeper stronger:
 * deeds unlock new relics to find, wins unlock harder nights, and the rest is a record.
 */
export type RunRecord = {
  keeper: KeeperId;
  dusk: number;
  score: number;
  won: boolean;
  bells: number;
  crossed: number;
  turns: number;
  atlas: boolean;
  seed: number;
  daily?: string;
};
export type Meta = {
  best: Partial<Record<KeeperId, number>>;
  /** Highest dusk level each keeper may choose. */
  dusk: Partial<Record<KeeperId, number>>;
  deeds: string[];
  relics: RelicId[];
  foes: string[];
  history: RunRecord[];
  streak: number;
  bestStreak: number;
  /** Best score on each date-seeded road, by YYYY-MM-DD. */
  daily: Record<string, number>;
  sound: boolean;
  /** The atlas passport: every real place charted, keyed by its chart. */
  cities: Record<string, CityStamp>;
};
export type CityStamp = {
  /** The fantasy title of the chart. */
  title: string;
  /** The public clue: the country or region chosen. */
  area: string;
  /** The real name, kept only once the player has named it. */
  name?: string;
  completed: boolean;
};
/** Sixteen bundled Slovak charts and the original coast. Live charts add to the passport too. */
export const KNOWN_CHARTS = 17;
export const cityKey = (run: Run) =>
  run.atlas ? (run.atlas.chart ? `c${run.atlas.chart.cityId}` : 'saltbound') : null;
export const HISTORY_LENGTH = 12;
export const DAILY_LENGTH = 60;
export function emptyMeta(): Meta {
  return {
    best: {},
    dusk: {},
    deeds: [],
    relics: [],
    foes: [],
    history: [],
    streak: 0,
    bestStreak: 0,
    daily: {},
    sound: false,
    cities: {},
  };
}

export type ScoreLine = { label: string; value: number };
/** A transparent score: every line is shown to the player on the ending screen. */
export function scoreOf(run: Run): { total: number; lines: ScoreLine[]; multiplier: number } {
  const won = run.phase === 'won' || run.phase === 'ending';
  const crossed = Math.max(0, run.phase === 'lost' ? run.depth : run.depth + 1);
  const stats = run.stats;
  const lines: ScoreLine[] = [
    { label: `${crossed} ${crossed === 1 ? 'encounter' : 'encounters'} won`, value: crossed * 10 },
    { label: `${run.bells} bells awakened`, value: run.bells * 150 },
    ...(stats?.elites
      ? [
          {
            label: `${stats.elites} ${stats.elites === 1 ? 'elite' : 'elites'} defeated`,
            value: stats.elites * 40,
          },
        ]
      : []),
    ...(stats?.staggers
      ? [
          {
            label: `${stats.staggers} ${stats.staggers === 1 ? 'stagger' : 'staggers'}`,
            value: stats.staggers * 5,
          },
        ]
      : []),
    ...(stats?.parries
      ? [
          {
            label: `${stats.parries} ${stats.parries === 1 ? 'perfect guard' : 'perfect guards'}`,
            value: stats.parries * 3,
          },
        ]
      : []),
    ...(run.atlas?.recognized ? [{ label: 'The city named', value: 100 }] : []),
    ...(won && run.atlas?.day !== undefined && run.atlas.day < 12
      ? [{ label: `Arrived on day ${run.atlas.day}`, value: (12 - run.atlas.day) * 15 }]
      : []),
    ...(won
      ? [
          { label: 'The road completed', value: 300 },
          { label: `${run.health} health to spare`, value: run.health * 2 },
        ]
      : []),
  ];
  const multiplier = 1 + (run.dusk ?? 0) * 0.2;
  const base = lines.reduce((n, l) => n + l.value, 0);
  return { total: Math.round(base * multiplier), lines, multiplier };
}

export type Deed = {
  id: string;
  name: string;
  text: string;
  unlocks?: RelicId;
  /** Judged on every saved step; `before` is the previous state of the same expedition. */
  done: (run: Run, meta: Meta, lore: string[], before: Run | null) => boolean;
};
const won = (run: Run) => run.phase === 'won';
export const DEEDS: Deed[] = [
  {
    id: 'first-bell',
    name: 'The first bell',
    text: 'Awaken a bell.',
    unlocks: 'buckle',
    done: (r) => r.bells >= 1,
  },
  {
    id: 'first-dawn',
    name: 'Somebody made it',
    text: 'Complete an expedition.',
    unlocks: 'lodestar',
    done: won,
  },
  {
    id: 'warden-win',
    name: 'The gate held',
    text: 'Complete an expedition as Asha, the Warden.',
    unlocks: 'mirror',
    done: (r) => won(r) && r.keeper === 'warden',
  },
  {
    id: 'seer-win',
    name: 'A sky remembered',
    text: 'Complete an expedition as Orin, the Seer.',
    unlocks: 'lantern',
    done: (r) => won(r) && r.keeper === 'seer',
  },
  {
    id: 'wayfarer-win',
    name: 'Letters delivered',
    text: 'Complete an expedition as Sable, the Wayfarer.',
    unlocks: 'gravebloom',
    done: (r) => won(r) && r.keeper === 'wayfarer',
  },
  {
    id: 'both-endings',
    name: 'Two kinds of light',
    text: 'See both endings.',
    unlocks: 'idol',
    done: (_r, _m, lore) => lore.includes('dawn') && lore.includes('hearth'),
  },
  {
    id: 'breaker',
    name: 'Bell-breaker',
    text: 'Stagger enemies 15 times in one expedition.',
    unlocks: 'chime',
    done: (r) => (r.stats?.staggers ?? 0) >= 15,
  },
  {
    id: 'parry',
    name: 'Not one step back',
    text: 'Make 12 perfect guards in one expedition.',
    unlocks: 'echo',
    done: (r) => (r.stats?.parries ?? 0) >= 12,
  },
  {
    id: 'thread',
    name: 'By a thread',
    text: 'Win a battle with 8 health or less.',
    unlocks: 'cinder',
    done: (r, _m, _l, before) =>
      before?.phase === 'combat' &&
      (r.phase === 'reward' || r.phase === 'ending') &&
      r.ruleset === 3 &&
      r.health <= 8,
  },
  {
    id: 'hoard',
    name: 'A heavy purse',
    text: 'Carry 150 coins at once.',
    unlocks: 'scale',
    done: (r) => r.coins >= 150,
  },
  {
    id: 'collector',
    name: 'Pockets full of light',
    text: 'Carry 8 relics at once.',
    unlocks: 'hourglass',
    done: (r) => r.relics.length >= 8,
  },
  {
    id: 'hunter',
    name: 'No easy roads',
    text: 'Defeat 4 elites in one expedition.',
    unlocks: 'sprig',
    done: (r) => (r.stats?.elites ?? 0) >= 4,
  },
  {
    id: 'big-hit',
    name: 'One clear note',
    text: 'Deal 40 damage with a single blow.',
    done: (r) => (r.stats?.bestHit ?? 0) >= 40,
  },
  {
    id: 'dry',
    name: 'A dry road',
    text: 'Complete an expedition without drinking a flask.',
    done: (r) => won(r) && r.stats?.flasks === 0,
  },
  {
    id: 'swift',
    name: 'Before the candle gutters',
    text: 'Complete an expedition in 60 combat turns or fewer.',
    done: (r) => won(r) && !!r.stats && r.stats.turns <= 60,
  },
  {
    id: 'dusk-1',
    name: 'Into the dusk',
    text: 'Complete an expedition at Dusk 1 or deeper.',
    done: (r) => won(r) && (r.dusk ?? 0) >= 1,
  },
  {
    id: 'dusk-4',
    name: 'A deeper night',
    text: 'Complete an expedition at Dusk 4 or deeper.',
    done: (r) => won(r) && (r.dusk ?? 0) >= 4,
  },
  {
    id: 'dusk-8',
    name: 'The longest night',
    text: 'Complete an expedition at Dusk 8.',
    done: (r) => won(r) && (r.dusk ?? 0) >= DUSK_MAX,
  },
  {
    id: 'atlas',
    name: 'Cartographer',
    text: 'Complete a Lost Atlas expedition.',
    done: (r) => won(r) && !!r.atlas,
  },
  {
    id: 'recognize',
    name: 'It was here all along',
    text: 'Name the real city beneath a Lost Atlas chart.',
    done: (r) => !!r.atlas?.recognized,
  },
  {
    id: 'bestiary',
    name: 'Know your enemy',
    text: 'Defeat every creature in the bestiary.',
    done: (_r, m) => Object.keys(FOES).every((id) => m.foes.includes(id)),
  },
  {
    id: 'chronicle',
    name: 'Nothing forgotten',
    text: 'Recover every memory in the chronicle.',
    done: (_r, _m, lore) => LORE.every((l) => lore.includes(l.id)),
  },
];

/** The relics a new expedition can find: the starting set plus everything deeds have unlocked. */
export function unlockedRelics(meta: Meta): RelicId[] {
  const earned = DEEDS.filter((d) => d.unlocks && meta.deeds.includes(d.id)).map((d) => d.unlocks!);
  return (Object.keys(RELICS) as RelicId[]).filter(
    (id) => STARTING_RELICS.includes(id) || earned.includes(id),
  );
}
export const duskUnlocked = (meta: Meta, keeper: KeeperId) =>
  Math.max(0, Math.min(DUSK_MAX, meta.dusk[keeper] ?? 0));

/** The date-seeded road: the same for everyone on the same local day, never required. */
export function dailyRoad(date: Date): { id: string; seed: number; keeper: KeeperId } {
  const id = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  const seed =
    Array.from(`emberwake:${id}`).reduce(
      (n, c) => (Math.imul(n, 31) + c.charCodeAt(0)) | 0,
      5381,
    ) >>> 0;
  const keepers = Object.keys(KEEPERS) as KeeperId[];
  return { id, seed, keeper: keepers[seed % keepers.length] };
}

/**
 * Fold one saved step of an expedition into the chronicle's records.
 * `finished` is true only on the step that ends the expedition.
 */
export function advanceMeta(
  meta: Meta,
  run: Run,
  lore: string[],
  before: Run | null,
  finished: boolean,
): Meta {
  const next: Meta = {
    ...meta,
    relics: [...new Set([...meta.relics, ...run.relics])],
    foes: [...new Set([...meta.foes, ...(run.slain ?? [])])],
  };
  const key = cityKey(run);
  if (key) {
    const chart = run.atlas!.chart;
    const before = meta.cities[key];
    const name = run.atlas!.recognized ? (chart?.city ?? 'Monaco') : before?.name;
    next.cities = {
      ...meta.cities,
      [key]: {
        title: chart?.title ?? 'The Saltbound Coast',
        area: chart?.area ?? 'A small southern coast',
        ...(name ? { name } : {}),
        completed: !!before?.completed || run.phase === 'won',
      },
    };
  }
  if (finished) {
    const victory = run.phase === 'won';
    const { total } = scoreOf(run);
    const record: RunRecord = {
      keeper: run.keeper,
      dusk: run.dusk ?? 0,
      score: total,
      won: victory,
      bells: run.bells,
      crossed: Math.max(0, victory ? run.depth + 1 : run.depth),
      turns: run.stats?.turns ?? 0,
      atlas: !!run.atlas,
      seed: run.seed,
      ...(run.daily ? { daily: run.daily } : {}),
    };
    next.history = [record, ...meta.history].slice(0, HISTORY_LENGTH);
    next.best = { ...meta.best, [run.keeper]: Math.max(meta.best[run.keeper] ?? 0, total) };
    next.streak = victory ? meta.streak + 1 : 0;
    next.bestStreak = Math.max(meta.bestStreak, next.streak);
    if (victory && run.ruleset === 3 && (run.dusk ?? 0) >= duskUnlocked(meta, run.keeper))
      next.dusk = { ...meta.dusk, [run.keeper]: Math.min(DUSK_MAX, (run.dusk ?? 0) + 1) };
    if (run.daily) {
      const days = { ...meta.daily, [run.daily]: Math.max(meta.daily[run.daily] ?? 0, total) };
      next.daily = Object.fromEntries(Object.entries(days).sort().slice(-DAILY_LENGTH));
    }
  }
  const earned = DEEDS.filter(
    (d) => !next.deeds.includes(d.id) && d.done(run, next, lore, before),
  ).map((d) => d.id);
  if (earned.length) next.deeds = [...next.deeds, ...earned];
  return next;
}

const isRecord = (x: unknown): x is Record<string, unknown> =>
  typeof x === 'object' && x !== null && !Array.isArray(x);
const whole = (x: unknown, max: number) =>
  typeof x === 'number' && Number.isInteger(x) && x >= 0 && x <= max ? x : 0;
/**
 * Records are a convenience, not rules: anything unreadable is dropped rather than
 * invalidating the player's journal.
 */
export function sanitizeMeta(x: unknown): Meta {
  const meta = emptyMeta();
  if (!isRecord(x)) return meta;
  const keepers = Object.keys(KEEPERS) as KeeperId[];
  const ids = (v: unknown, known: (id: string) => boolean) =>
    Array.isArray(v) ? [...new Set(v.filter((id) => typeof id === 'string' && known(id)))] : [];
  for (const k of keepers) {
    if (isRecord(x.best) && whole(x.best[k], 1e7)) meta.best[k] = whole(x.best[k], 1e7);
    if (isRecord(x.dusk) && whole(x.dusk[k], DUSK_MAX)) meta.dusk[k] = whole(x.dusk[k], DUSK_MAX);
  }
  meta.deeds = ids(x.deeds, (id) => DEEDS.some((d) => d.id === id));
  meta.relics = ids(x.relics, (id) => Object.hasOwn(RELICS, id)) as RelicId[];
  meta.foes = ids(x.foes, (id) => Object.hasOwn(FOES, id));
  meta.streak = whole(x.streak, 1e6);
  meta.bestStreak = Math.max(meta.streak, whole(x.bestStreak, 1e6));
  meta.sound = x.sound === true;
  if (Array.isArray(x.history))
    meta.history = x.history
      .filter(
        (h): h is RunRecord =>
          isRecord(h) && typeof h.keeper === 'string' && Object.hasOwn(KEEPERS, h.keeper),
      )
      .slice(0, HISTORY_LENGTH)
      .map((h) => ({
        keeper: h.keeper,
        dusk: whole(h.dusk, DUSK_MAX),
        score: whole(h.score, 1e7),
        won: h.won === true,
        bells: whole(h.bells, 3),
        crossed: whole(h.crossed, 12),
        turns: whole(h.turns, 1e6),
        atlas: h.atlas === true,
        seed: whole(h.seed, 0xffffffff),
        ...(typeof h.daily === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(h.daily)
          ? { daily: h.daily }
          : {}),
      }));
  if (isRecord(x.daily))
    meta.daily = Object.fromEntries(
      Object.entries(x.daily)
        .filter(([k, v]) => /^\d{4}-\d{2}-\d{2}$/.test(k) && whole(v, 1e7) === v)
        .sort()
        .slice(-DAILY_LENGTH),
    ) as Record<string, number>;
  if (isRecord(x.cities))
    for (const [key, v] of Object.entries(x.cities).slice(0, 300)) {
      const text = (t: unknown) => (typeof t === 'string' ? t.slice(0, 120) : '');
      if (!/^(saltbound|c\d{1,12})$/.test(key) || !isRecord(v) || !text(v.title)) continue;
      meta.cities[key] = {
        title: text(v.title),
        area: text(v.area),
        ...(text(v.name) ? { name: text(v.name) } : {}),
        completed: v.completed === true,
      };
    }
  return meta;
}
