import { test, expect, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { SAVE_KEY } from '../src/game/storage';

const readSave = (page: Page) =>
  page.evaluate((key) => JSON.parse(localStorage.getItem(key)!), SAVE_KEY);

async function beginAtlas(page: Page) {
  await page.goto('/');
  await page.getByRole('button', { name: /The Lost Atlas/ }).click();
  await page.getByRole('button', { name: 'Original offline chart', exact: true }).click();
  await page.getByRole('button', { name: /Begin expedition/ }).click();
}

const card = (page: Page) => page.getByRole('note');
const turnNotesBackOn = async (page: Page, name: RegExp) => {
  await page.getByRole('button', { name: /Keep a little light|Nos so sebou/ }).click();
  await page.getByRole('button', { name }).click();
  await page.keyboard.press('Escape');
};

test('the keeper’s guide: one note at a time, read once, and switchable', async ({ page }) => {
  await beginAtlas(page);
  await expect(card(page)).toContainText('From the keeper’s guide');
  await expect(page.getByRole('heading', { name: 'Real roads, a hidden city' })).toBeVisible();
  // It sits directly above the board, inside the main column.
  const order = await page.evaluate(() => {
    const main = document.querySelector('.game-main')!;
    return main.children[0].getAttribute('role');
  });
  expect(order).toBe('note');

  await page.getByRole('button', { name: 'Got it' }).click();
  await expect(card(page)).toHaveCount(0);
  expect((await readSave(page)).profile.meta.tips).toContain('atlas');

  await page.locator('[data-destination="watch"]').click();
  await expect(page.getByRole('heading', { name: 'A day’s lamp oil' })).toBeVisible();

  await page.reload();
  await expect(page.getByRole('heading', { name: 'A day’s lamp oil' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Real roads, a hidden city' })).toHaveCount(0);

  await page.getByRole('button', { name: 'Hide guide notes' }).click();
  await expect(card(page)).toHaveCount(0);
  expect((await readSave(page)).profile.meta.tipsOff).toBe(true);

  await turnNotesBackOn(page, /Guide notes: off/);
  await expect(page.getByRole('heading', { name: 'A day’s lamp oil' })).toBeVisible();
  expect((await readSave(page)).profile.meta.tips).toContain('atlas');
});

test('the guide speaks Slovak', async ({ page }) => {
  await beginAtlas(page);
  await page.getByRole('button', { name: 'Slovenčina' }).click();
  await expect(page.locator('html')).toHaveAttribute('lang', 'sk');
  await expect(page.getByRole('heading', { name: 'Skutočné cesty, skryté mesto' })).toBeVisible();
  await expect(card(page)).toContainText('Z príručky strážcu');
  await expect(page.getByRole('button', { name: 'Rozumiem' })).toBeVisible();
});

test('the guide card passes axe and fits a phone', async ({ page }) => {
  await beginAtlas(page);
  await expect(card(page)).toBeVisible();
  const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze();
  expect(results.violations).toEqual([]);
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(card(page)).toBeVisible();
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(overflow).toBeLessThanOrEqual(0);
  const box = (await card(page).boundingBox())!;
  expect(box.y + box.height).toBeLessThan(844);
});
