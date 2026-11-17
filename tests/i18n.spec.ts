import { test, expect, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

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

async function toSlovak(page: Page) {
  await page.getByRole('button', { name: 'Slovenčina' }).click();
  await expect(page.locator('html')).toHaveAttribute('lang', 'sk');
}

test('the interface can be read in Slovak, stays that way after a reload, and switches back', async ({
  page,
}) => {
  await page.goto('/');
  await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  const english = page.getByRole('button', { name: 'English' });
  const slovak = page.getByRole('button', { name: 'Slovenčina' });
  await expect(english).toHaveAttribute('aria-pressed', 'true');
  await expect(slovak).toHaveAttribute('aria-pressed', 'false');
  await expect(page.getByRole('button', { name: 'Begin expedition' })).toBeVisible();

  await toSlovak(page);
  await expect(slovak).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByRole('button', { name: 'Začať výpravu' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Kto ponesie uhlík?' })).toBeVisible();
  await expect(page.getByRole('navigation', { name: 'Hlavná navigácia' })).toBeVisible();
  await expect(page.getByText('Begin expedition')).toHaveCount(0);

  // The classic expedition: the first fight shows the Slovak action names.
  await page.getByLabel('Semienko cesty', { exact: false }).fill('slovak');
  await page.getByRole('button', { name: 'Začať výpravu' }).click();
  await page.locator('.route-choice').first().click();
  await expect(page.locator('.duel-action[data-action="strike"]')).toContainText('Úder');
  await expect(page.locator('.duel-action[data-action="guard"]')).toContainText('Kryt');
  await expect(page.locator('.duel-controls-top')).toContainText('TVOJ ŤAH');
  await page.locator('.duel-action[data-action="strike"]').click();

  // The choice is kept in the saved profile and survives a reload.
  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('lang', 'sk');
  await expect(page.locator('.duel-action[data-action="strike"]')).toContainText('Úder');
  await expect(page.getByRole('button', { name: 'Slovenčina' })).toHaveAttribute(
    'aria-pressed',
    'true',
  );

  await page.getByRole('button', { name: 'English' }).click();
  await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  await expect(page.locator('.duel-action[data-action="strike"]')).toContainText('Strike');
  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('lang', 'en');
});

test('the Slovak lobby is accessible and fits a phone without sideways scrolling', async ({
  page,
}) => {
  await page.goto('/');
  await toSlovak(page);
  for (const viewport of [
    { width: 1360, height: 900 },
    { width: 390, height: 844 },
  ]) {
    await page.setViewportSize(viewport);
    await page.evaluate(() => document.fonts.ready);
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
      `${viewport.width}px has no horizontal overflow`,
    ).toBe(true);
    // No button's text may spill outside its own box.
    const clipped = await page.evaluate(() =>
      [...document.querySelectorAll<HTMLElement>('button, .primary-button')]
        .filter((b) => b.offsetParent && b.textContent?.trim() && b.scrollWidth > b.clientWidth + 1)
        .map((b) => b.textContent?.trim().slice(0, 50)),
    );
    expect(clipped, `${viewport.width}px buttons keep their text inside`).toEqual([]);
    await page.screenshot({
      path: `test-results/i18n/lobby-${viewport.width}.png`,
      fullPage: true,
    });
  }
  const result = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze();
  expect(result.violations).toEqual([]);
});

test('Slovak letters in the serif come from the serif itself, not a fallback font', async ({
  page,
}) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Slovenčina' }).click();
  await page.evaluate(() => document.fonts.ready);
  // č, ď, ľ, ň, š, ť, ž live in Latin Extended-A. If the serif lacks them they are drawn by
  // the fallback font, heavier and larger. Measure each letter in "serif, monospace" against
  // monospace alone: identical widths would mean the serif had no glyph of its own.
  const missing = await page.evaluate(async () => {
    const letters = [...'čďľňšťžČĎĽŇŠŤŽ'];
    const result: string[] = [];
    for (const style of ['normal', 'italic']) {
      await document.fonts.load(`${style} 500 40px "Cormorant Garamond"`, letters.join(''));
      const ctx = document.createElement('canvas').getContext('2d')!;
      for (const letter of letters) {
        ctx.font = `${style} 500 40px "Cormorant Garamond", monospace`;
        const serif = ctx.measureText(letter).width;
        ctx.font = `${style} 500 40px monospace`;
        if (Math.abs(serif - ctx.measureText(letter).width) < 0.01)
          result.push(`${style} ${letter}`);
      }
    }
    return result;
  });
  expect(missing).toEqual([]);
});
