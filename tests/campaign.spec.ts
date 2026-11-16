import { test, expect, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { SAVE_KEY, emptySave } from '../src/game/storage';
import { readFileSync } from 'node:fs';

const campaignMap = JSON.parse(readFileSync('src/atlas/slovakia-map.json', 'utf8')) as {
  cities: { key: string; region: string }[];
};

async function readRun(page: Page) {
  return page.evaluate((key) => JSON.parse(localStorage.getItem(key)!).run, SAVE_KEY);
}
async function openLobby(page: Page) {
  await page.goto('/');
  await page.getByRole('button', { name: /The Lost Atlas/ }).click();
}
const axe = (page: Page) => new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze();

test('choosing a province on the map sets the kraj and begins there', async ({ page }) => {
  await openLobby(page);
  await expect(page.locator('.campaign-svg')).toBeVisible();
  await expect(page.locator('.campaign-buttons [data-province]')).toHaveCount(8);
  await page.locator('[data-province="SK-ZI"]').click();
  const detail = page.locator('.campaign-detail');
  await expect(detail).toContainText('The Tinkers’ Fells');
  await expect(detail).toContainText('Žilinský kraj');
  await expect(detail).toContainText('Steep green country that mended the world’s pots.');
  await page.getByRole('button', { name: /Begin expedition/ }).click();
  await expect(page.locator('.atlas-area-hint')).toContainText('Žilinský kraj');
  expect((await readRun(page)).atlas.chart.area).toBe('Žilinský kraj');
});

test('a recovered legend and a named city show in the Chronicle atlas', async ({ page }) => {
  const save = emptySave();
  const keys = campaignMap.cities.filter((c) => c.region === 'SK-ZI').map((c) => c.key);
  keys.forEach((key, i) => {
    save.profile.meta!.cities[key] = {
      title: 'The Veiled Crossroads',
      area: 'Žilinský kraj',
      completed: true,
      ...(i === 0 ? { name: 'Testgrad' } : {}),
    };
  });
  await page.addInitScript(
    ([k, v]) => {
      if (!localStorage.getItem(k)) localStorage.setItem(k, v);
    },
    [SAVE_KEY, JSON.stringify(save)],
  );
  await page.goto('/');
  await page.getByRole('button', { name: /Chronicle/ }).click();
  await page.getByRole('tab', { name: /Atlas/ }).click();
  await expect(page.locator('.campaign-legends')).toContainText(
    'Steep green country that sent its sons',
  );
  await expect(page.locator('.campaign-city')).toContainText('Testgrad');
  expect((await axe(page)).violations).toEqual([]);
});

test('the lobby map passes axe with a province selected', async ({ page }) => {
  await openLobby(page);
  await page.locator('[data-province="SK-KI"]').click();
  await expect(page.locator('[data-province="SK-KI"]')).toHaveAttribute('aria-pressed', 'true');
  expect((await axe(page)).violations).toEqual([]);
});

test('the lobby map fits a phone screen', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await openLobby(page);
  await page.locator('[data-province="SK-BC"]').click();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});
