import { afterEach, describe, it, expect, vi } from 'vitest';
import { createAtlasService } from '../../worker/atlas-service';
import { streetFixture } from '../../tests/atlas-fixture';

const request = (region = 'Slovakia') =>
  new Request('https://emberwake.example/api/atlas', {
    method: 'POST',
    body: JSON.stringify({ region, seed: 123 }),
    headers: { 'Content-Type': 'application/json' },
  });
describe('private geographic preparation service', () => {
  afterEach(() => vi.unstubAllGlobals());
  it('continues to the provider when the platform denies access to its default cache', async () => {
    vi.stubGlobal('caches', {
      get default() {
        throw new Error('This Worker is not permitted to access the default cache.');
      },
    });
    const fetcher = vi.fn(async () => Response.json({ elements: [] }));
    const response = await createAtlasService(fetcher)(request());
    expect(fetcher).toHaveBeenCalledOnce();
    expect((await response.json()).error).toMatch(/No administrative area matched/);
  });
  it('ignores a failed cache read while retaining in-memory responses', async () => {
    vi.stubGlobal('caches', {
      default: {
        match: async () => {
          throw new Error('Cache access denied');
        },
      },
    });
    const fetcher = vi.fn(async () => Response.json({ elements: [] }));
    const handler = createAtlasService(fetcher);
    await handler(request());
    await handler(request());
    expect(fetcher).toHaveBeenCalledOnce();
  });
  it('selects cities by membership in the resolved administrative area, caches data, and returns a usable chart', async () => {
    const queries: string[] = [];
    const fake = vi.fn(async (_url: unknown, options?: RequestInit) => {
      const q = (options!.body as URLSearchParams).get('data')!;
      queries.push(q);
      if (q.includes('out tags'))
        return Response.json({
          elements: [{ type: 'area', id: 360001, tags: { name: 'Slovakia' } }],
        });
      if (q.includes('node(area.chosen)'))
        return Response.json({
          elements: [{ type: 'node', id: 999, lat: 48.15, lon: 17.1, tags: { name: 'Testovce' } }],
        });
      return Response.json({ elements: streetFixture() });
    }) as unknown as typeof fetch;
    {
      const handler = createAtlasService(fake),
        pending = handler(request());
      const result = await pending;
      expect(result.status).toBe(200);
      const data = await result.json();
      expect(data.chart.area).toBe('Slovakia');
      expect(data.chart.city).toBe('Testovce');
      expect(queries[1]).toContain('area(360001)->.chosen;node(area.chosen)');
      expect(fake).toHaveBeenCalledTimes(3);
      expect((await handler(request())).status).toBe(200);
      expect(fake).toHaveBeenCalledTimes(3);
    }
  });
  it('does not substitute another region when the provider fails or the area is ambiguous', async () => {
    const unavailable = createAtlasService(
      vi.fn(async () => new Response('unavailable', { status: 503 })) as unknown as typeof fetch,
    );
    expect((await (await unavailable(request())).json()).error).toMatch(/unavailable/);
    const ambiguous = createAtlasService(
      vi.fn(async () =>
        Response.json({
          elements: [
            { type: 'area', id: 1 },
            { type: 'area', id: 2 },
          ],
        }),
      ) as unknown as typeof fetch,
    );
    expect((await (await ambiguous(request('Georgia'))).json()).error).toMatch(/More than one/);
  });
  it('rejects cross-site requests, non-POST methods and malformed input without upstream traffic', async () => {
    const upstream = vi.fn(),
      handler = createAtlasService(upstream);
    expect((await handler(new Request('https://emberwake.example/api/atlas'))).status).toBe(405);
    expect(
      (
        await handler(
          new Request('https://emberwake.example/api/atlas', {
            method: 'POST',
            headers: { Origin: 'https://elsewhere.example' },
            body: '{}',
          }),
        )
      ).status,
    ).toBe(403);
    expect(
      (
        await handler(
          new Request('https://emberwake.example/api/atlas', { method: 'POST', body: '{}' }),
        )
      ).status,
    ).toBe(422);
    expect(upstream).not.toHaveBeenCalled();
  });
});
