import { expect, test, type Page } from '@playwright/test';

async function toFirstDuel(page: Page) {
  await page.addInitScript(() => {
    if (!localStorage.getItem('emberwake.lobby.mode'))
      localStorage.setItem('emberwake.lobby.mode', 'quick');
  });
  await page.goto('/');
  await page.getByRole('button', { name: /Begin expedition/ }).click();
  await page.locator('.route-choice').first().click();
  await expect(page.locator('.duel-portrait').first()).toBeVisible();
}

test('reduced motion: portraits do not animate after a strike', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await toFirstDuel(page);
  await page.keyboard.press('1');
  await page.waitForTimeout(100);
  const names = await page.$$eval('.duel-portrait, .duel-portrait > *', (els) =>
    els.map((el) => getComputedStyle(el).animationName),
  );
  expect(names.length).toBeGreaterThan(0);
  for (const n of names) expect(n).toBe('none');
});

test('a strike makes the keeper lunge', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await toFirstDuel(page);
  await page.keyboard.press('1');
  await expect(page.locator('.combatant-hero .duel-portrait.lunge-keeper')).toBeVisible();
  await page.screenshot({ path: 'test-results/feel-lunge.png' });
  await expect(page.locator('.lunge-keeper')).toHaveCount(0);
});

test('turning sound on and fighting throws no errors', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await toFirstDuel(page);
  await page.getByRole('button', { name: /Turn sound on/ }).click();
  await page.keyboard.press('1');
  await page.keyboard.press('2');
  await page.waitForTimeout(300);
  expect(errors).toEqual([]);
});
