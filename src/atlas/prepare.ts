import { bundledChart, bundledCount } from './bundled';
import { validRegionalChart } from './types';
export async function prepareChart(
  area: string,
  seed: number,
  source: 'bundled' | 'live',
  signal: AbortSignal,
  fetcher: typeof fetch = fetch,
) {
  if (signal.aborted) throw new DOMException('Cancelled', 'AbortError');
  if (source === 'bundled') return { chart: await bundledChart(area, seed), fallback: false };
  try {
    const response = await fetcher('/api/atlas', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ region: area.trim(), seed }),
      signal,
    });
    const data = await response.json();
    if (!response.ok || !validRegionalChart(data.chart))
      throw new Error(
        typeof data.error === 'string'
          ? data.error
          : 'The returned map could not be read. Please try again.',
      );
    return { chart: data.chart, fallback: false };
  } catch (error) {
    // A cancelled request must never start another expedition or change its region.
    if (signal.aborted) throw error;
    if (bundledCount(area)) return { chart: await bundledChart(area, seed), fallback: true };
    const message = error instanceof Error ? error.message : 'The live map could not be prepared.';
    throw new Error(
      `${message} No bundled charts cover this area yet. Bundled maps are available for Slovakia and all eight kraje.`,
    );
  }
}
