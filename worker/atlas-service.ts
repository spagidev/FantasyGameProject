import { regionQuery } from '../src/atlas/regions';
import { compileChart } from '../src/atlas/compile';
import type { OsmElement } from '../src/atlas/types';

export type AtlasEnvironment = { OVERPASS_URL?: string };
type OsmResponse = { elements: OsmElement[]; remark?: string };
export function createAtlasService(fetcher: typeof fetch = fetch) {
  const memory = new Map<string, OsmResponse>();
  let queue: Promise<unknown> = Promise.resolve(),
    lastRequest = 0;
  async function osm(
    query: string,
    origin: string,
    env: AtlasEnvironment,
    signal: AbortSignal,
  ): Promise<OsmResponse> {
    const provider = env.OVERPASS_URL ?? 'https://overpass-api.de/api/interpreter';
    const key = Array.from(
      new Uint8Array(
        await crypto.subtle.digest('SHA-256', new TextEncoder().encode(provider + query)),
      ),
    )
      .map((n) => n.toString(16).padStart(2, '0'))
      .join('');
    if (memory.has(key)) return memory.get(key)!;
    const cache = (globalThis as unknown as { caches?: { default?: Cache } }).caches?.default;
    const cacheKey = new Request(`${origin}/__atlas-cache/${key}`);
    const cached = await cache?.match(cacheKey);
    if (cached) {
      const data = (await cached.json()) as OsmResponse;
      memory.set(key, data);
      return data;
    }
    const result = queue.then(async () => {
      if (signal.aborted) throw new Error('Map preparation was cancelled.');
      if (memory.has(key)) return memory.get(key)!;
      const wait = Math.max(0, 1500 - (Date.now() - lastRequest));
      if (wait) await new Promise((resolve) => setTimeout(resolve, wait));
      lastRequest = Date.now();
      const controller = new AbortController(),
        abort = () => controller.abort();
      signal.addEventListener('abort', abort, { once: true });
      const timer = setTimeout(abort, 35000);
      try {
        const response = await fetcher(provider, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'User-Agent': `Emberwake-LostAtlas/0.4 (${origin}; private single-player geography game)`,
          },
          body: new URLSearchParams({ data: query }),
          signal: controller.signal,
        });
        if (!response.ok)
          throw new Error(
            'The map provider is busy or unavailable. Please wait a moment and try again.',
          );
        if (Number(response.headers.get('Content-Length') ?? 0) > 12 * 1024 * 1024)
          throw new Error('This map extract is too large. Choose a smaller region.');
        const reader = response.body!.getReader(),
          decoder = new TextDecoder();
        let raw = '',
          bytes = 0;
        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            bytes += value.byteLength;
            if (bytes > 12 * 1024 * 1024)
              throw new Error('This map extract is too large. Choose a smaller region.');
            raw += decoder.decode(value, { stream: true });
          }
          raw += decoder.decode();
        } finally {
          await reader.cancel();
        }
        const data = JSON.parse(raw) as OsmResponse;
        if (!Array.isArray(data.elements) || data.elements.length > 90000 || data.remark)
          throw new Error(
            'The map provider could not finish this area. Try a smaller region or retry later.',
          );
        if (memory.size >= 24) memory.delete(memory.keys().next().value!);
        memory.set(key, data);
        await cache?.put(
          cacheKey,
          Response.json(data, { headers: { 'Cache-Control': 'public, max-age=604800' } }),
        );
        return data;
      } finally {
        clearTimeout(timer);
        signal.removeEventListener('abort', abort);
      }
    });
    queue = result.catch(() => undefined);
    return result;
  }
  return async function handleAtlas(request: Request, env: AtlasEnvironment = {}) {
    const origin = new URL(request.url).origin;
    if (request.method !== 'POST')
      return Response.json(
        { error: 'Use the expedition form to prepare a map.' },
        { status: 405, headers: { Allow: 'POST' } },
      );
    if (request.headers.get('Origin') && request.headers.get('Origin') !== origin)
      return Response.json({ error: 'Start the expedition from Emberwake.' }, { status: 403 });
    try {
      const bodyText = await request.text();
      if (bodyText.length > 4096)
        return Response.json({ error: 'The region request is too large.' }, { status: 413 });
      const input = JSON.parse(bodyText);
      if (
        typeof input.region !== 'string' ||
        !Number.isInteger(input.seed) ||
        input.seed < 0 ||
        input.seed > 0xffffffff
      )
        throw new Error('Choose a country or administrative region and a valid journey seed.');
      const region = regionQuery(input.region);
      const boundaries = await osm(
        `[out:json][timeout:25];${region.selector};out tags;`,
        origin,
        env,
        request.signal,
      );
      const areas = [
        ...new Map(
          boundaries.elements
            .filter((e) => e.type === 'area' && Number.isSafeInteger(e.id) && e.id > 0)
            .map((e) => [e.id, e]),
        ).values(),
      ];
      if (!areas.length)
        throw new Error(
          'No administrative area matched. Try its full local or English name, or one of the Slovak regions below.',
        );
      if (areas.length > 1)
        throw new Error(
          'More than one administrative area has that name. Use its ISO region code (for example SK-BL) to select the right one.',
        );
      const area = areas[0],
        label = (area.tags?.['name:en'] ?? area.tags?.name ?? region.label).slice(0, 150);
      const cityData = await osm(
        `[out:json][timeout:25];area(${area.id})->.chosen;node(area.chosen)["place"~"^(city|town)$"]["name"];out body;`,
        origin,
        env,
        request.signal,
      );
      const cities = cityData.elements
        .filter(
          (e) =>
            e.type === 'node' &&
            e.tags?.name &&
            Number.isFinite(e.lat) &&
            Number.isFinite(e.lon) &&
            Math.abs(e.lat!) < 84,
        )
        .sort((a, b) => a.id - b.id);
      if (!cities.length)
        throw new Error(
          'There are no mapped cities or towns inside that area. Choose a broader region.',
        );
      let lastError =
        'This area has no city with enough connected roads for a complete expedition.';
      // At most two city extracts per explicit user request. Never leave the selected area.
      const start = (Math.imul(input.seed ^ 0x9e3779b9, 0x85ebca6b) >>> 0) % cities.length;
      for (let attempt = 0; attempt < Math.min(2, cities.length); attempt++) {
        const city = cities[(start + attempt) % cities.length],
          lat = city.lat!,
          lon = city.lon!,
          dx = 2050 / (111200 * Math.cos((lat * Math.PI) / 180)),
          dy = 1700 / 111200;
        const bbox = [lat - dy, lon - dx, lat + dy, lon + dx].map((n) => n.toFixed(6)).join(',');
        const query = `[out:json][timeout:25];(way["highway"](${bbox});way["building"](${bbox});way["natural"~"^(water|wood|coastline)$"](${bbox});way["waterway"](${bbox});way["leisure"~"^(park|garden)$"](${bbox});way["landuse"="forest"](${bbox}););out body geom;`;
        const data = await osm(query, origin, env, request.signal);
        try {
          return Response.json(
            { chart: compileChart(data.elements, city, label, area.id, query) },
            { headers: { 'Cache-Control': 'no-store' } },
          );
        } catch (error) {
          lastError = error instanceof Error ? error.message : lastError;
        }
      }
      throw new Error(`${lastError} Try another journey seed or a broader region.`);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'The map could not be prepared. Please try again.';
      const safe =
        error instanceof SyntaxError
          ? 'The map provider returned an unreadable response. Please try again.'
          : error instanceof DOMException
            ? 'Map preparation timed out. Retry when the provider is available.'
            : message;
      return Response.json(
        { error: safe },
        { status: 422, headers: { 'Cache-Control': 'no-store' } },
      );
    }
  };
}
