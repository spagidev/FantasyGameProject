import { test, expect } from '@playwright/test';

// The lobby opens on the campaign; these specs exercise the classic quick road.
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
const SAVE_KEY = 'emberwake.save.v2';

const begin = (page: import('@playwright/test').Page) =>
  page.getByRole('button', { name: /Begin expedition/ });

test('a shared road pre-fills the lobby and begins with the exact seed', async ({ page }) => {
  await page.goto('/?road=abc12&keeper=seer&dusk=0');
  await expect(page.locator('#journey-seed')).toHaveValue('abc12');
  await expect(page.getByRole('button', { name: 'Seer', exact: true })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  await expect.poll(() => page.url()).not.toContain('road=');
  await begin(page).click();
  await expect
    .poll(() =>
      page.evaluate((key) => {
        const run = JSON.parse(localStorage.getItem(key)!).run;
        return run && [run.keeper, run.seed];
      }, SAVE_KEY),
    )
    .toEqual(['seer', parseInt('abc12', 36)]);
});

test('a share link never replaces a run in progress', async ({ page }) => {
  await page.goto('/');
  await begin(page).click();
  await expect
    .poll(() => page.evaluate((k) => !!JSON.parse(localStorage.getItem(k)!).run, SAVE_KEY))
    .toBe(true);
  const before = await page.evaluate(
    (k) => JSON.stringify(JSON.parse(localStorage.getItem(k)!).run),
    SAVE_KEY,
  );
  await page.goto('/?road=abc12&keeper=seer&dusk=0');
  await expect(page.locator('.site-footer')).toBeVisible();
  await page.waitForTimeout(300);
  const after = await page.evaluate(
    (k) => JSON.stringify(JSON.parse(localStorage.getItem(k)!).run),
    SAVE_KEY,
  );
  expect(after).toBe(before);
});

test('the manifest is linked and served', async ({ page, request }) => {
  await page.goto('/');
  await expect(page.locator('head link[rel="manifest"]')).toHaveAttribute(
    'href',
    '/manifest.webmanifest',
  );
  const res = await request.get('/manifest.webmanifest');
  expect(res.status()).toBe(200);
  expect(await res.text()).toContain('"short_name": "Emberwake"');
});
