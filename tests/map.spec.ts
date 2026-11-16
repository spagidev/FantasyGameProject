import { test, expect, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

async function begin(page: Page) {
  await page.goto('/');
  await page.getByRole('button', { name: /The Lost Atlas/ }).click();
  await page.getByRole('button', { name: 'Original offline chart', exact: true }).click();
  await page.getByRole('button', { name: /Begin expedition/ }).click();
}

const box = async (page: Page) =>
  (await page.locator('.atlas-canvas > svg').getAttribute('viewBox'))!.split(' ').map(Number);

test('the chart can be dragged, zoomed and walked with the keyboard', async ({ page }) => {
  await begin(page);
  const svg = page.locator('.atlas-canvas > svg');
  await expect(svg).toBeVisible();

  const [, , w0] = await box(page);
  await page.getByRole('button', { name: 'Zoom in' }).click();
  const [, , w1] = await box(page);
  expect(w1).toBeLessThan(w0);
  await page.getByRole('button', { name: 'Zoom out' }).click();
  await page.getByRole('button', { name: 'Zoom out' }).click();
  const [, , w2] = await box(page);
  expect(w2).toBeGreaterThan(w1);

  await page.getByRole('button', { name: 'Show whole chart' }).click();
  await page.getByRole('button', { name: 'Zoom in' }).click();
  await page.getByRole('button', { name: 'Zoom in' }).click();
  const before = await box(page);
  await svg.scrollIntoViewIfNeeded();
  const b = (await svg.boundingBox())!;
  const cx = b.x + b.width / 2;
  const cy = Math.max(b.y, 0) + 200;
  await page.mouse.move(cx, cy);
  await page.mouse.down();
  await page.mouse.move(cx + 60, cy + 40, { steps: 6 });
  await page.mouse.up();
  const dragged = await box(page);
  expect(dragged[0]).not.toBeCloseTo(before[0], 0);
  expect(dragged[1]).not.toBeCloseTo(before[1], 0);

  await page.getByRole('button', { name: 'Show whole chart' }).click();
  const whole = await box(page);
  expect(whole.join(' ')).toBe('0 0 1000 810');

  await page.getByRole('button', { name: 'Zoom in' }).click();
  await page.getByRole('button', { name: 'Zoom in' }).click();
  await page.getByRole('button', { name: 'Centre on keeper' }).click();
  const centred = await box(page);
  expect(centred[2]).toBeLessThan(1000);
  // The keeper pin sits at the middle of the window (unless clamped by a chart edge).
  const keeperPin = await page.locator('.atlas-canvas > svg image').last().getAttribute('x');
  const pinX = Number(keeperPin) + 17;
  expect(Math.abs(pinX - (centred[0] + centred[2] / 2))).toBeLessThan(centred[2] / 2);

  const map = page.getByRole('group', { name: /Pannable chart/ });
  await map.focus();
  const k0 = await box(page);
  await page.keyboard.press('ArrowRight');
  expect((await box(page))[0]).toBeGreaterThan(k0[0]);
  await page.keyboard.press('0');
  expect((await box(page)).join(' ')).toBe('0 0 1000 810');
  await page.keyboard.press('+');
  expect((await box(page))[2]).toBeLessThan(1000);
});

test('a plain click does not pan and still selects a landmark', async ({ page }) => {
  await begin(page);
  await page.getByRole('button', { name: 'Show whole chart' }).click();
  const before = await box(page);
  const landmark = page.locator('.atlas-landmark').first();
  await expect(landmark).toBeVisible();
  const panel = page.locator('.atlas-board');
  await landmark.click();
  expect(await box(page)).toEqual(before);
  await expect(panel).toContainText(/CHARTED LANDMARK|YOU ARE HERE/);
});

test('the map passes axe and fits a phone', async ({ page }) => {
  await begin(page);
  await page.getByRole('button', { name: 'Zoom in' }).click();
  const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze();
  expect(results.violations).toEqual([]);
  await page.setViewportSize({ width: 390, height: 844 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  );
  await expect(page.getByRole('button', { name: 'Centre on keeper' })).toBeVisible();
});
