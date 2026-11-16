import { describe, expect, it } from 'vitest';
import { bundledChart } from './bundled';
import index from './bundled-index.json';
import {
  PROVINCES,
  campaignMap,
  campaignProgress,
  provinceOfCity,
  provinceOfKraj,
} from './provinces';

describe('the provinces of Veyr', () => {
  it('cover every bundled chart exactly, with two charts each', () => {
    expect(PROVINCES).toHaveLength(8);
    expect(campaignMap.cities.map((c) => c.id)).toEqual(index.map((e) => e.id));
    for (const p of PROVINCES) {
      expect(campaignMap.cities.filter((c) => c.region === p.code)).toHaveLength(2);
      expect(campaignMap.cells.filter((c) => c.region === p.code)).toHaveLength(2);
      expect(p.legend.length).toBeGreaterThan(120);
      expect(provinceOfKraj(p.kraj.toUpperCase())).toBe(p);
      // A legend never gives the real names away.
      expect(p.legend).not.toMatch(
        /Slovak|Bratislav|Trnav|Trenč|Nitr|Žilin|Bystric|Prešov|Košic|Tatra|Danube|Váh/,
      );
    }
    for (const city of campaignMap.cities) {
      expect(city.x).toBeGreaterThan(0);
      expect(city.x).toBeLessThan(campaignMap.width);
      expect(city.y).toBeGreaterThan(0);
      expect(city.y).toBeLessThanOrEqual(campaignMap.height);
      expect(provinceOfCity(city.key)?.code).toBe(city.region);
    }
    expect(provinceOfCity('saltbound')).toBeUndefined();
  });
  it('a province campaign passes over rekindled charts until none are left', async () => {
    const [a, b] = campaignMap.cities.filter((c) => c.region === 'SK-ZI');
    const chart = (rekindled: string[], seed: number) => bundledChart('SK-ZI', seed, rekindled);
    for (const seed of [0, 1, 2, 3]) {
      expect(`c${(await chart([a.id], seed)).cityId}`).toBe(b.key);
      expect(`c${(await chart([b.id], seed)).cityId}`).toBe(a.key);
    }
    const seen = new Set<string>();
    for (const seed of [0, 1]) seen.add(`c${(await chart([a.id, b.id], seed)).cityId}`);
    expect(seen).toEqual(new Set([a.key, b.key])); // all rekindled: the seed chooses again
  });
  it('recovers a legend only when both cities of a province are rekindled', () => {
    const [a, b] = campaignMap.cities.filter((c) => c.region === 'SK-ZI');
    const none = campaignProgress({});
    expect(none.every((p) => p.walked === 0 && !p.recovered)).toBe(true);
    const half = campaignProgress({
      [a.key]: { completed: true, name: 'X' },
      [b.key]: { completed: false },
    });
    expect(half.find((p) => p.province.code === 'SK-ZI')).toMatchObject({
      total: 2,
      walked: 2,
      completed: 1,
      named: 1,
      recovered: false,
    });
    const both = campaignProgress({ [a.key]: { completed: true }, [b.key]: { completed: true } });
    expect(both.find((p) => p.province.code === 'SK-ZI')!.recovered).toBe(true);
    expect(both.filter((p) => p.recovered)).toHaveLength(1);
  });
});
