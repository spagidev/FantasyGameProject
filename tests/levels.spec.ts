import { test, expect, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { LEVEL_XP, XP_FOR } from '../src/game/data';
import { newRun, transition, type Run } from '../src/game/engine';
import { advanceSave, emptySave, SAVE_KEY } from '../src/game/storage';
import { campaignAction } from './player';

test.beforeEach(async ({ page }) => {
  await page.context().addInitScript(() => {
    try {
      if (!localStorage.getItem('emberwake.lobby.mode'))
        localStorage.setItem('emberwake.lobby.mode', 'quick');
    } catch {
      /* storage unavailable */
    }
  });
});

function levelUpRun(): Run {
  let run = transition(newRun('warden', 8128), { type: 'travel', lane: 0 });
  run = { ...run, xp: LEVEL_XP - XP_FOR.battle };
  for (let i = 0; run.phase === 'combat' && i < 200; i++)
    run = transition(run, campaignAction(run));
  expect(run.phase).toBe('reward');
  run = transition(run, { type: 'reward', id: 'heal' });
  expect(run.phase).toBe('levelup');
  return run;
}

async function load(page: Page) {
  await page.goto('/');
  await page.evaluate(({ key, save }) => localStorage.setItem(key, JSON.stringify(save)), {
    key: SAVE_KEY,
    save: advanceSave(emptySave(), levelUpRun()),
  });
  await page.reload();
  await page.evaluate(() => document.fonts.ready);
}

test('a level offers three perks, and taking one returns to the road', async ({ page }) => {
  await load(page);
  await expect(page.getByRole('heading', { name: 'The road has changed you.' })).toBeVisible();
  const cards = page.locator('.perk-card');
  await expect(cards).toHaveCount(3);
  const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze();
  expect(results.violations).toEqual([]);
  await cards.first().click();
  const run = await page.evaluate((k) => JSON.parse(localStorage.getItem(k)!).run, SAVE_KEY);
  expect(run.phase).toBe('map');
  expect(run.perks).toHaveLength(1);
  await expect(page.locator('.keeper-panel')).toContainText('Level 2');
  await page.screenshot({ path: 'test-results/panel-1360.png' });
  await expect(page.locator('.keeper-panel [role="meter"][aria-label="Experience"]')).toBeVisible();
});

test('the level-up screen fits a phone', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await load(page);
  await expect(page.locator('.perk-card')).toHaveCount(3);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: 'test-results/levelup-390.png', fullPage: true });
  await page.locator('.perk-card').first().click();
  await page.screenshot({ path: 'test-results/panel-390.png' });
});

test('the level-up screen is translated', async ({ page }) => {
  await page.setViewportSize({ width: 1360, height: 900 });
  await load(page);
  await page.screenshot({ path: 'test-results/levelup-1360.png', fullPage: true });
  await page.getByRole('button', { name: 'Slovenčina' }).click();
  await expect(page.getByRole('heading', { name: 'Cesta ťa zmenila.' })).toBeVisible();
  await expect(page.locator('.perk-card')).toHaveCount(3);
});
