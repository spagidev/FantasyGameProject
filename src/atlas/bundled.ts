import index from './bundled-index.json';
import { normalizePlace, regionQuery, SLOVAK_REGIONS } from './regions';
import { validRegionalChart, type RegionalChart } from './types';
export type AtlasSource = 'bundled' | 'live' | 'original';
/** The index deliberately lists regions and counts, never the hidden cities. */
export function bundledChoices(area: string) {
  const name = normalizePlace(area);
  if (['slovakia', 'slovensko', 'slovakrepublic', 'sk'].includes(name)) return index;
  const selector = regionQuery(area).selector;
  const region = SLOVAK_REGIONS.find((r) => selector === `area["ISO3166-2"="${r.code}"]`);
  return region ? index.filter((entry) => entry.region === region.code) : [];
}
export function bundledCount(area: string) {
  try {
    return bundledChoices(area).length;
  } catch {
    return 0;
  }
}
/**
 * Chooses a chart inside the area by seed. `rekindled` lists bundled chart ids the player has
 * already completed: while any other chart remains in the area, those are passed over, so a
 * campaign through a province reaches both of its cities instead of repeating one.
 */
export async function bundledChart(
  area: string,
  seed: number,
  rekindled: string[] = [],
): Promise<RegionalChart> {
  const all = bundledChoices(area);
  const fresh = all.filter((entry) => !rekindled.includes(entry.id));
  const choices = fresh.length ? fresh : all;
  if (!choices.length)
    throw new Error(
      'No bundled charts cover this area yet. Choose Slovakia or one of its eight kraje, or try Live map.',
    );
  const { default: maps } = await import('./bundled-charts.json');
  const selected = choices[(seed >>> 0) % choices.length];
  const chart: unknown = maps[selected.id as keyof typeof maps];
  if (!validRegionalChart(chart))
    throw new Error('The bundled chart could not be read. Reload Emberwake and try again.');
  return chart;
}
