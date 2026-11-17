import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const SAVE_KEY = 'emberwake.save.v2';
const atlasButton = (page: import('@playwright/test').Page) =>
  page.getByRole('button', { name: /The Lost Atlas/ });
const crossingButton = (page: import('@playwright/test').Page) =>
  page.getByRole('button', { name: /The First Crossing/ });

test('a fresh profile opens on the campaign with the province map', async ({ page }) => {
  await page.goto('/');
  await expect(atlasButton(page)).toHaveAttribute('aria-pressed', 'true');
  await expect(crossingButton(page)).toHaveAttribute('aria-pressed', 'false');
  await expect(page.locator('.campaign-svg')).toBeVisible();
  await expect(page.getByText('CAMPAIGN', { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Begin the campaign' })).toBeVisible();
});

test('the quick road is remembered and begins a classic run', async ({ page }) => {
  await page.goto('/');
  await crossingButton(page).click();
  await page.reload();
  await expect(crossingButton(page)).toHaveAttribute('aria-pressed', 'true');
  await expect(atlasButton(page)).toHaveAttribute('aria-pressed', 'false');
  await page.getByRole('button', { name: /Begin expedition/ }).click();
  const run = await page.evaluate((key) => JSON.parse(localStorage.getItem(key)!).run, SAVE_KEY);
  expect(run).toBeTruthy();
  expect(run.atlas).toBeUndefined();
});

test('the front door passes axe and fits a phone', async ({ page }) => {
  await page.goto('/');
  const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze();
  expect(results.violations).toEqual([]);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(overflow).toBeLessThanOrEqual(0);
});

test('the campaign tag and quick-road line are translated', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Slovenčina' }).click();
  await expect(page.locator('html')).toHaveAttribute('lang', 'sk');
  await expect(page.getByText('KAMPAŇ', { exact: true })).toBeVisible();
  await expect(page.getByText('Rýchla cesta · asi 15 minút')).toBeVisible();
  await expect(page.getByText('Kampaň · skutočné mapy ôsmich slovenských krajov')).toBeVisible();
});
