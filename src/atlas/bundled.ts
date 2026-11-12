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
export async function bundledChart(area: string, seed: number): Promise<RegionalChart> {
  const choices = bundledChoices(area);
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
