import type { RelicId } from '../game/data';
import map from './slovakia-map.json' with { type: 'json' };

/**
 * The provinces of Veyr that lie over Slovakia. Each is a fantasy mirror of a real kraj:
 * the legend nods to what the place is actually known for without ever naming it, so that
 * learning the real country and remembering the invented one are the same act.
 *
 * Shapes are the Voronoi cells of the bundled chart centres inside the real national
 * outline (see scripts/build-campaign-map.mjs): a cartographer's provinces, not legal borders.
 */
export type ProvinceCode =
  'SK-BL' | 'SK-TA' | 'SK-TC' | 'SK-NI' | 'SK-ZI' | 'SK-BC' | 'SK-PV' | 'SK-KI';
export type Province = {
  code: ProvinceCode;
  /** The relic that joins future roads once this province's legend is recovered. */
  boon: RelicId;
  /** The real region, shown as the public clue. */
  kraj: string;
  /** Its name in Veyr. */
  name: string;
  /** A muted parchment tint for the map. */
  tint: string;
  /** One line shown before the legend is recovered. */
  rumor: string;
  /** Recovered when both of its cities are rekindled. */
  legend: string;
};
export const PROVINCES: Province[] = [
  {
    code: 'SK-BL',
    boon: 'offcut',
    kraj: 'Bratislavský kraj',
    name: 'The Reedmarch',
    tint: '#cdb98a',
    rumor: 'Where the great river loosens into reeds.',
    legend:
      'Where the great river loosens into reeds, Veyr kept its customs-house and its coronations. Crowns were made here for the kings of other countries, which is why none was left over for its own.',
  },
  {
    code: 'SK-TA',
    boon: 'spa',
    kraj: 'Trnavský kraj',
    name: 'The Belled Plain',
    tint: '#b9c398',
    rumor: 'Flat country, many spires, warm water.',
    legend:
      'A flat country of many spires and warm springs. It was said a traveler here was never out of earshot of a bell, nor more than a day from a bath. The dark found both customs difficult to break.',
  },
  {
    code: 'SK-TC',
    boon: 'wellrope',
    kraj: 'Trenčiansky kraj',
    name: 'The Castled Narrows',
    tint: '#a9b9b4',
    rumor: 'A river between cliffs, a castle on every cliff.',
    legend:
      'A river squeezed between cliffs, and a castle on every cliff. A captive once dug a well through the living rock here, for love. He struck water after three winters. Nobody now remembers whether she waited.',
  },
  {
    code: 'SK-NI',
    boon: 'chapelstone',
    kraj: 'Nitriansky kraj',
    name: 'The Old Seat',
    tint: '#d6c59c',
    rumor: 'The oldest hill of the old princes.',
    legend:
      'The oldest seat of the old princes, where the first chapel in Veyr was raised and the last fortress on the river never fell. It had nothing left to prove, and so it was the first place the fire was fed.',
  },
  {
    code: 'SK-ZI',
    boon: 'wire',
    kraj: 'Žilinský kraj',
    name: 'The Tinkers’ Fells',
    tint: '#a3bfa0',
    rumor: 'Steep green country that mended the world’s pots.',
    legend:
      'Steep green country that sent its sons out with wire and pliers to mend the pots of the world. They always came home for the hay. The fells are still waiting. The wire fences have not rusted.',
  },
  {
    code: 'SK-BC',
    boon: 'clapperboard',
    kraj: 'Banskobystrický kraj',
    name: 'The Copper Heart',
    tint: '#c9a583',
    rumor: 'Hills hollow with old mines.',
    legend:
      'Under these hills Veyr dug its copper and struck its coin. The miners beat a wooden clapper to wake one another before dawn. When there was no more dawn, they beat it anyway, and went down.',
  },
  {
    code: 'SK-PV',
    boon: 'joinery',
    kraj: 'Prešovský kraj',
    name: 'The Wooden Spires',
    tint: '#b3b3cc',
    rumor: 'The highest peaks, and churches without a nail.',
    legend:
      'The highest peaks in Veyr and, beneath them, churches built without a single nail. The carpenters held that iron remembers violence. Their spires have stood through nine hundred winters of forgetting on nothing but good joinery.',
  },
  {
    code: 'SK-KI',
    boon: 'window',
    kraj: 'Košický kraj',
    name: 'The Eastern Lantern',
    tint: '#d3aa97',
    rumor: 'Where the sun used to be seen first.',
    legend:
      'The far east of the realm, where the sun was first seen each morning and wine was pressed from grapes left to wither on the vine. The great cathedral kept one window lit for travelers. It was the last window in Veyr to go dark.',
  },
];
export const campaignMap = map as {
  width: number;
  height: number;
  outline: [number, number][];
  cities: { id: string; key: string; region: ProvinceCode; x: number; y: number }[];
  cells: { id: string; region: ProvinceCode; points: [number, number][] }[];
};
/** The province a passport key (see meta.cityKey) belongs to, if it is a bundled chart. */
export function provinceOfCity(key: string): Province | undefined {
  const city = campaignMap.cities.find((c) => c.key === key);
  return city && PROVINCES.find((p) => p.code === city.region);
}
export const provinceOfKraj = (area: string): Province | undefined =>
  PROVINCES.find((p) => p.kraj.toLowerCase() === area.trim().toLowerCase());

export type ProvinceProgress = {
  province: Province;
  total: number;
  walked: number;
  completed: number;
  named: number;
  /** Both cities rekindled: the legend is recovered. */
  recovered: boolean;
};
/** Progress of every province, from the atlas passport (meta.cities). */
export function campaignProgress(
  cities: Record<string, { completed: boolean; name?: string }>,
): ProvinceProgress[] {
  return PROVINCES.map((province) => {
    const keys = campaignMap.cities.filter((c) => c.region === province.code).map((c) => c.key);
    const stamps = keys.map((k) => cities[k]).filter(Boolean);
    const completed = stamps.filter((s) => s.completed).length;
    return {
      province,
      total: keys.length,
      walked: stamps.length,
      completed,
      named: stamps.filter((s) => s.name).length,
      recovered: completed === keys.length,
    };
  });
}
