import { test, expect, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { SAVE_KEY } from '../src/game/storage';
import type { Run } from '../src/game/engine';

async function readRun(page: Page): Promise<Run> {
  return page.evaluate((key) => JSON.parse(localStorage.getItem(key)!).run, SAVE_KEY);
}

test('the hearth-wagon: one choice each evening', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: /The Lost Atlas/ }).click();
  await page.getByRole('button', { name: 'Original offline chart', exact: true }).click();
  await page.getByRole('button', { name: /Begin expedition/ }).click();
  const start = await readRun(page);
  await expect(page.getByLabel('Hearth-wagon works')).toContainText('Nothing built yet');

  await page.locator('[data-action="camp"]').click();
  const dialog = page.getByRole('dialog', { name: 'Evening at the wagon' });
  await expect(dialog).toBeVisible();
  for (const id of ['rest', 'stove', 'still', 'wheel', 'rack', 'strongbox', 'ward'])
    await expect(dialog.locator(`[data-work="${id}"]`)).toBeVisible();
  await expect(dialog.locator('[data-work="ward"]')).toBeDisabled();
  await expect(dialog.locator('[data-work="rest"]')).toBeEnabled();

  const accessibility = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze();
  expect(accessibility.violations).toEqual([]);
  await page.setViewportSize({ width: 390, height: 844 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  );
  await page.setViewportSize({ width: 1280, height: 800 });

  // Esc cancels without camping.
  await page.keyboard.press('Escape');
  await expect(dialog).toBeHidden();
  expect((await readRun(page)).atlas!.day).toBe(1);

  await page.locator('[data-action="camp"]').click();
  await dialog.locator('[data-work="stove"]').click();
  const built = await readRun(page);
  expect(built.atlas!.day).toBe(2);
  expect(built.atlas!.works).toEqual(['stove']);
  expect(built.coins).toBe(start.coins - 20);
  await expect(page.getByLabel('Hearth-wagon works')).toContainText('The iron stove');

  await page.locator('[data-action="camp"]').click();
  await expect(dialog.locator('[data-work="stove"]')).toBeDisabled();
  await expect(dialog.locator('[data-work="stove"]')).toContainText('Built');
  await dialog.locator('[data-work="rest"]').click();
  expect((await readRun(page)).atlas!.day).toBe(3);
});
