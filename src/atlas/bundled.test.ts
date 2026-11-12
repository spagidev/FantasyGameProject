import { describe, expect, it, vi } from 'vitest';
import charts from './bundled-charts.json';
import { bundledChart, bundledCount } from './bundled';
import { prepareChart } from './prepare';
import { SLOVAK_REGIONS } from './regions';
import { validRegionalChart } from './types';
import { newRun, transition } from '../game/engine';
import { advanceSave, decodeSave, emptySave, validRun } from '../game/storage';
import { campaignAction } from '../../tests/player';

describe('bundled Slovak mystery atlas', () => {
  it('covers each kraj with two distinct cities, supports aliases and never substitutes an unsupported region', async () => {
    expect(bundledCount('Slovensko')).toBe(16);
    for (const r of SLOVAK_REGIONS) {
      expect(bundledCount(r.code)).toBe(2);
      expect(bundledCount(r.name.normalize('NFD').replace(/\p{M}/gu, ''))).toBe(2);
      const a = await bundledChart(r.code, 0),
        b = await bundledChart(r.code, 1);
      expect(a.area).toBe(r.name);
      expect(a.city).not.toBe(b.city);
      expect(await bundledChart(r.code, 0)).toBe(a);
    }
    expect(bundledCount('Austria')).toBe(0);
    expect(bundledCount('')).toBe(0);
    await expect(bundledChart('Austria', 0)).rejects.toThrow(/No bundled charts/);
  });
  it('plays all 16 real road charts through three bells and retains their maps in journals', () => {
    expect(Object.keys(charts)).toHaveLength(16);
    expect(new Set(Object.values(charts).map((c) => c.cityId)).size).toBe(16);
    for (const chart of Object.values(charts)) {
      expect(validRegionalChart(chart), chart.city).toBe(true);
      if (!validRegionalChart(chart)) throw new Error(chart.city);
      let run = newRun('warden', 123, chart),
        moves = 0;
      while (!['won', 'lost'].includes(run.phase) && moves++ < 240)
        run = transition(run, campaignAction(run));
      expect(run.phase, chart.city).toBe('won');
      expect(run.bells).toBe(3);
      expect(validRun(run)).toBe(true);
      expect(decodeSave(JSON.stringify(advanceSave(emptySave(), run)))?.run).toEqual(run);
    }
  }, 30000);
  it('starts bundled maps without provider calls and falls back inside the requested area after a provider failure', async () => {
    const offline = vi.fn(async () => {
      throw new Error('network down');
    });
    const signal = new AbortController().signal;
    const direct = await prepareChart('Slovakia', 7, 'bundled', signal, offline);
    expect(direct.fallback).toBe(false);
    expect(offline).not.toHaveBeenCalled();
    const fallback = await prepareChart('zilinsky', 7, 'live', signal, offline);
    expect(fallback.fallback).toBe(true);
    expect(fallback.chart.area).toBe('Žilinský kraj');
    await expect(prepareChart('Austria', 7, 'live', signal, offline)).rejects.toThrow(
      /No bundled charts cover this area/,
    );
  });
  it('never falls back after the player cancels preparation', async () => {
    const controller = new AbortController();
    const fetcher = vi.fn(async () => {
      controller.abort();
      throw new DOMException('Cancelled', 'AbortError');
    });
    await expect(prepareChart('Slovakia', 7, 'live', controller.signal, fetcher)).rejects.toThrow(
      /Cancelled/,
    );
    expect(fetcher).toHaveBeenCalledOnce();
  });
});
