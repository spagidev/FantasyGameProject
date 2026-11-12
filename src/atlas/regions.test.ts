import { describe, expect, it } from 'vitest';
import { SLOVAK_REGIONS, regionQuery, normalizePlace } from './regions';
import { compileChart } from './compile';
import { SITE_IDS, validRegionalChart, type OsmElement } from './types';
import { newRun, transition } from '../game/engine';
import { atlasGeography } from '../game/atlas';
import { advanceSave, emptySave, decodeSave, validRun } from '../game/storage';
import { campaignAction } from '../../tests/player';

import { regionalFixture } from '../../tests/atlas-fixture';

describe('regional mystery atlases', () => {
  it('maps all eight kraje, accentless names and region codes to their exact ISO boundary', () => {
    expect(SLOVAK_REGIONS).toHaveLength(8);
    for (const r of SLOVAK_REGIONS)
      for (const name of [
        r.name,
        r.name.normalize('NFD').replace(/\p{M}/gu, ''),
        r.code,
        ...r.aliases,
      ])
        expect(regionQuery(name).selector).toBe(`area["ISO3166-2"="${r.code}"]`);
    expect(regionQuery('Slovensko').selector).toContain('"SK"');
  });
  it('treats arbitrary text as a literal boundary name and preserves non-Latin city names', () => {
    expect(regionQuery('austria').selector).toContain('["name:en"~"^austria$",i]');
    expect(regionQuery('name.*').selector).toContain('name\\\\.\\\\*');
    expect(normalizePlace('Košice')).toBe(normalizePlace('kosice'));
    expect(normalizePlace('Київ')).not.toBe('');
  });
  it('compiles a connected chart, refuses sparse geography and validates journal geometry', () => {
    const chart = regionalFixture();
    expect(validRegionalChart(chart)).toBe(true);
    expect(chart.edges).toHaveLength(24);
    expect(Object.keys(chart.points)).toEqual([...SITE_IDS]);
    expect(() =>
      compileChart(
        [],
        { type: 'node', id: 1, lat: 48, lon: 17, tags: { name: 'Empty' } },
        'Slovakia',
        360001,
        'empty',
      ),
    ).toThrow(/connected/);
    const bad = structuredClone(chart);
    bad.edges[0].points[0] = [NaN, 0];
    expect(validRegionalChart(bad)).toBe(false);
    const disconnected = structuredClone(chart);
    disconnected.edges = disconnected.edges.filter((e) => e.a !== 'lookout' && e.b !== 'lookout');
    expect(validRegionalChart(disconnected)).toBe(false);
  });
  it('accepts only the chosen city, preserves its geography across journals, and shares immutable terrain', () => {
    const chart = regionalFixture(),
      initial = newRun('warden', 123, chart);
    const wrong = transition(initial, { type: 'atlas-name', name: 'Slovakia' });
    expect(wrong.atlas!.recognized).toBe(false);
    expect(wrong.attack).toBe(initial.attack);
    const right = transition(initial, { type: 'atlas-name', name: 'test city' });
    expect(right.atlas!.recognized).toBe(true);
    expect(right.attack).toBe(initial.attack + 2);
    const next = transition(right, { type: 'atlas-move', to: 'watch' });
    expect(atlasGeography(next.atlas)).toBe(chart);
    expect(decodeSave(JSON.stringify(advanceSave(emptySave(), next)))?.run).toEqual(next);
    const old = newRun('warden', 123, true);
    expect(decodeSave(JSON.stringify(advanceSave(emptySave(), old)))?.run).toEqual(old);
  });
  it('completes the same twelve encounters over generated geography with no city guess', () => {
    let run = newRun('warden', 123, regionalFixture()),
      steps = 0;
    while (!['won', 'lost'].includes(run.phase) && steps++ < 240) {
      run = transition(run, campaignAction(run));
      expect(validRun(run)).toBe(true);
    }
    expect(run.phase).toBe('won');
    expect(run.bells).toBe(3);
    expect(run.atlas?.recognized).toBe(false);
  });
});

import { coastLands } from './coast';
it('fills the land side of a directed coastline and keeps islands as separate land', () => {
  expect(
    coastLands([
      [
        [-50, 600],
        [400, 400],
        [1050, 200],
      ],
    ])![0],
  ).toContainEqual([0, 0]);
  expect(
    coastLands([
      [
        [-50, 600],
        [400, 400],
        [1050, 200],
      ],
    ])![0],
  ).not.toContainEqual([1000, 810]);
  const island: [[number, number], [number, number], [number, number], [number, number]] = [
    [100, 100],
    [200, 100],
    [150, 200],
    [100, 100],
  ];
  expect(coastLands([island])).toEqual([island]);
  expect(() =>
    coastLands([
      [
        [50, 50],
        [300, 300],
      ],
    ]),
  ).toThrow(/incomplete/);
});
