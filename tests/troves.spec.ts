import { test, expect, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { SAVE_KEY } from '../src/game/storage';
import type { Run } from '../src/game/engine';

async function readRun(page: Page): Promise<Run> {
  return page.evaluate((key) => JSON.parse(localStorage.getItem(key)!).run, SAVE_KEY);
}

test('a guarded trove is scouted, challenged and won for a rare relic', async ({ page }) => {
  test.setTimeout(90000);
  await page.goto('/');
  await page.getByRole('button', { name: /The Lost Atlas/ }).click();
  await page.getByRole('button', { name: 'Original offline chart', exact: true }).click();
  await page.getByRole('button', { name: /Begin expedition/ }).click();
  // Walk to the Arena of Echoes, camping when the oil runs out.
  for (let i = 0; i < 12; i++) {
    const run = await readRun(page);
    if (run.atlas!.position === 'cache') break;
    const road = page.locator('[data-destination="cache"]');
    if (await road.count()) {
      if (await road.isDisabled()) await campRest(page);
      await road.click();
      continue;
    }
    await page
      .locator('.atlas-index summary')
      .click({ trial: false })
      .catch(() => {});
    await page.locator('.atlas-index button').filter({ hasText: 'Arena of Echoes' }).click();
    const walk = page.locator('[data-action="walk-route"]');
    if (await walk.isDisabled()) await campRest(page);
    await page.locator('.atlas-index button').filter({ hasText: 'Arena of Echoes' }).click();
    await page.locator('[data-action="walk-route"]').click();
  }
  expect((await readRun(page)).atlas!.position).toBe('cache');
  await expect(page.locator('.atlas-plan')).toContainText('Guarded by');
  await expect(page.getByRole('button', { name: /Gather this kindness/ })).toHaveCount(0);
  await page.getByRole('button', { name: 'Scout the guardian' }).first().click();
  await expect(page.getByRole('dialog')).toContainText('An optional fight');
  await page.keyboard.press('Escape');
  await page.locator('[data-action="challenge"]').click();
  let run = await readRun(page);
  expect(run).toMatchObject({ phase: 'combat', side: 'cache' });
  await expect(page.locator('.duel-top .eyebrow')).toHaveText('TROVE GUARDIAN');
  // Make the fight short: the rules for winning are covered by unit tests.
  await page.evaluate((key) => {
    const save = JSON.parse(localStorage.getItem(key)!);
    save.run.enemy.health = 1;
    localStorage.setItem(key, JSON.stringify(save));
  }, SAVE_KEY);
  await page.reload();
  await page.locator('.duel-action[data-action="strike"]').click();
  run = await readRun(page);
  expect(run.phase).toBe('reward');
  await expect(page.locator('.reward-board .eyebrow').first()).toContainText('THE TROVE IS YOURS');
  await expect(page.locator('.reward-card')).toHaveCount(3);
  const accessibility = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze();
  expect(accessibility.violations).toEqual([]);
  await page.locator('.reward-card').first().click();
  run = await readRun(page);
  expect(run).toMatchObject({ phase: 'map', depth: -1 });
  expect(run.side).toBeUndefined();
  expect(run.atlas!.collected).toEqual(['cache']);
  await expect(page.locator('[data-action="challenge"]')).toHaveCount(0);
});

async function campRest(page: Page) {
  await page.locator('[data-action="camp"]').click();
  await page.locator('[data-work="rest"]').click();
}
