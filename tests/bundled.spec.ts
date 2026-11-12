import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { SAVE_KEY } from '../src/game/storage';

test('bundled regional charts start with a blocked provider, conceal the city, and persist the map', async ({
  page,
}) => {
  let providerCalls = 0;
  await page.route('**/api/atlas', (r) => {
    providerCalls++;
    return r.abort();
  });
  await page.goto('/');
  await page.getByRole('button', { name: /The Lost Atlas/ }).click();
  await expect(page.getByRole('button', { name: 'Bundled maps', exact: true })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  await expect(page.locator('.bundled-availability')).toContainText('16 bundled charts');
  await page.getByLabel('Country or region', { exact: true }).fill('zilinsky');
  await expect(page.locator('.bundled-availability')).toContainText('2 bundled charts');
  await page.getByRole('button', { name: /Begin expedition/ }).click();
  await expect(page.locator('.atlas-area-hint')).toContainText('Žilinský kraj');
  const run = await page.evaluate((key) => JSON.parse(localStorage.getItem(key)!).run, SAVE_KEY);
  expect(providerCalls).toBe(0);
  expect(run.atlas.chart.source.provider).toBe('OpenStreetMap / Geofabrik');
  await expect(page.locator('main')).not.toContainText(run.atlas.chart.city);
  await page.getByRole('button', { name: 'Show whole chart' }).click();
  await page.screenshot({ path: 'test-results/bundled-chart-desktop.png', fullPage: true });
  await page.reload();
  expect(
    await page.evaluate((key) => JSON.parse(localStorage.getItem(key)!).run.atlas.chart, SAVE_KEY),
  ).toEqual(run.atlas.chart);
  expect(providerCalls).toBe(0);
  await page.getByLabel('Which city lies beneath the veil?').fill(run.atlas.chart.city);
  await page.getByRole('button', { name: 'Remember its name' }).click();
  await expect(
    page.getByRole('heading', { name: run.atlas.chart.city + ' remembers.' }),
  ).toBeVisible();
});

test('live failures fall back within the chosen kraj and unsupported bundled areas are clear on mobile', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.route('**/api/atlas', (r) =>
    r.fulfill({ status: 422, json: { error: 'The map provider is busy or unavailable.' } }),
  );
  await page.goto('/');
  await page.getByRole('button', { name: /The Lost Atlas/ }).click();
  await page.getByLabel('Country or region', { exact: true }).fill('Austria');
  await expect(page.locator('.bundled-availability')).toContainText('No bundled charts');
  await expect(page.getByRole('button', { name: /Begin expedition/ })).toBeDisabled();
  expect(
    (await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze()).violations,
  ).toEqual([]);
  await page.getByLabel('Country or region', { exact: true }).fill('Trnavsky kraj');
  await page.screenshot({ path: 'test-results/bundled-setup-mobile.png', fullPage: true });
  await page.getByRole('button', { name: 'Live map', exact: true }).click();
  await page.getByRole('button', { name: /Begin expedition/ }).click();
  await expect(page.locator('.atlas-fallback-notice')).toContainText(
    'bundled chart inside Trnavsky kraj',
  );
  await expect(page.locator('.atlas-area-hint')).toContainText('Trnavský kraj');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  expect(
    (await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze()).violations,
  ).toEqual([]);
  await page.screenshot({ path: 'test-results/bundled-fallback-mobile.png', fullPage: true });
});
