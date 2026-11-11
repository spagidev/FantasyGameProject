import { test, expect, type Page } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import AxeBuilder from '@axe-core/playwright';
import { EVENTS, KEEPERS, RELICS, TALENTS, type KeeperId } from '../src/game/data';
import { nodeAt, type Action, type Run } from '../src/game/engine';
import { SAVE_KEY, LEGACY_SAVE_KEY } from '../src/game/storage';
import legacyJournal from './fixtures/v1-journal.json' with { type: 'json' };
import { campaignAction } from './player';

async function readRun(page: Page): Promise<Run> {
  return page.evaluate((key) => JSON.parse(localStorage.getItem(key)!).run, SAVE_KEY);
}
async function clickAction(page: Page, run: Run, action: Action) {
  if (action.type === 'travel') {
    const node = nodeAt(run.seed, run.depth + 1, action.lane);
    await page.locator('.route-choice').filter({ hasText: node.name }).first().click();
  } else if (action.type === 'talent') {
    await page.locator('.talent-card').filter({ hasText: TALENTS[action.id].name }).click();
  } else if (['strike', 'guard', 'skill', 'flask'].includes(action.type)) {
    await page
      .locator('.action-button')
      .nth(['strike', 'guard', 'skill', 'flask'].indexOf(action.type))
      .click();
  } else if (action.type === 'reward') {
    if (action.id === 'heal') await page.getByRole('button', { name: /Leave the relics/ }).click();
    else await page.locator('.reward-card').filter({ hasText: RELICS[action.id].name }).click();
  } else if (action.type === 'event') {
    const event = EVENTS[nodeAt(run.seed, run.depth, run.lane).eventIndex];
    await page
      .getByRole('button', { name: new RegExp(event.options[action.option].label) })
      .click();
  } else if (action.type === 'camp') {
    await page
      .getByRole('button', {
        name: {
          rest: /Rest by the embers/,
          flask: /Bottle a little warmth/,
          forge: /Temper your blade/,
        }[action.choice],
      })
      .click();
  } else if (action.type === 'buy') {
    await page
      .getByRole('button', {
        name: { heal: /A little kindness/, flask: /A bottled sunrise/, forge: /An edge of dawn/ }[
          action.item
        ],
      })
      .click();
  } else if (action.type === 'leave')
    await page.getByRole('button', { name: /Continue without/ }).click();
  else if (action.type === 'ending')
    await page
      .getByRole('button', {
        name: action.choice === 'dawn' ? /Share the sunrise/ : /Bring the stories home/,
      })
      .click();
}

test('lobby, keeper selection, rules, keyboard focus and accessibility', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: /Carry the light/ })).toBeVisible();
  await page.getByRole('button', { name: 'Seer', exact: true }).click();
  await expect(page.getByRole('heading', { name: /Orin/ })).toBeVisible();
  await page.getByRole('button', { name: 'How to play' }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'How to play' })).toBeFocused();
  const accessibility = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze();
  expect(accessibility.violations).toEqual([]);
  await page.getByRole('button', { name: /Chronicle/ }).click();
  const chronicleAccessibility = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa'])
    .analyze();
  expect(chronicleAccessibility.violations).toEqual([]);
});

test('autosaves a turn, resumes exactly and confirms abandonment', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: /Begin expedition/ }).click();
  await page.locator('.route-choice').first().click();
  const initial = await readRun(page);
  await expect(page.locator('.action-button').nth(2)).toBeDisabled();
  await page.locator('.action-button').first().click();
  await page.keyboard.press('1'); // Shortcuts also work while an action button is focused.
  const progressed = await readRun(page);
  expect(progressed.turn).toBe(initial.turn + 2);
  await page.reload();
  expect(await readRun(page)).toEqual(progressed);
  const accessibility = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze();
  expect(accessibility.violations).toEqual([]);
  await page.getByRole('button', { name: /Leave this expedition/ }).click();
  await page.getByRole('button', { name: 'Keep walking' }).click();
  expect(await readRun(page)).toEqual(progressed);
  await page.getByRole('button', { name: /Leave this expedition/ }).click();
  await page.getByRole('button', { name: 'Leave expedition', exact: true }).click();
  await expect(page.getByRole('button', { name: /Begin expedition/ })).toBeVisible();
});

for (const keeper of ['warden', 'seer', 'wayfarer'] as KeeperId[]) {
  test(`${keeper} completes a campaign through the browser`, async ({ page }) => {
    test.setTimeout(90000);
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await page.goto('/');
    await page
      .getByRole('button', { name: KEEPERS[keeper].title.replace('The ', ''), exact: true })
      .click();
    await page.getByLabel('Journey seed').fill('the-first-crossing');
    await page.getByRole('button', { name: /Begin expedition/ }).click();
    let run = await readRun(page);
    let moves = 0;
    while (!['won', 'lost'].includes(run.phase) && moves++ < 220) {
      const action =
        run.phase === 'ending' && keeper === 'seer'
          ? ({ type: 'ending', choice: 'hearth' } as const)
          : campaignAction(run);
      await clickAction(page, run, action);
      const next = await readRun(page);
      expect(next).not.toEqual(run);
      run = next;
    }
    expect(run.phase).toBe('won');
    expect(run.bells).toBe(3);
    expect(run.path).toHaveLength(12);
    expect(run.talents).toHaveLength(2);
    expect(run.waylights).toHaveLength(3);
    await expect(page.getByRole('button', { name: /Walk another road/ })).toBeVisible();
    await page.reload();
    expect((await readRun(page)).phase).toBe('won');
    await page.getByRole('button', { name: /Chronicle/ }).click();
    await expect(page.locator('.chronicle-counts')).toContainText('1 crossings completed');
    await page.getByRole('button', { name: /Return to the expedition/ }).click();
    await page.getByRole('button', { name: /Walk another road/ }).click();
    await expect(page.getByRole('button', { name: /Begin expedition/ })).toBeVisible();
    expect(errors).toEqual([]);
  });
}

test('mobile layout stays within the viewport and supports combat', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await page.screenshot({ path: 'test-results/mobile-lobby.png', fullPage: true });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  );
  await page.getByRole('button', { name: /Begin expedition/ }).click();
  await page.locator('.route-choice').first().click();
  await page.locator('.action-button').first().click();
  expect((await readRun(page)).turn).toBe(1);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  );
  await page.screenshot({ path: 'test-results/mobile-combat.png', fullPage: true });
});

test('scouting is free, exposes future patterns, and only travels reachable lanes', async ({
  page,
}) => {
  await page.goto('/');
  await page.getByRole('button', { name: /Scout Bell guardian/ }).click();
  await expect(page.getByRole('dialog')).toContainText('Antler sweep');
  await expect(page.getByRole('button', { name: 'Take this path' })).toHaveCount(0);
  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: /Begin expedition/ }).click();
  const original = await readRun(page);
  await page.getByRole('button', { name: /Scout Bell guardian/ }).click();
  expect(await readRun(page)).toEqual(original);
  await expect(page.getByRole('dialog')).toContainText('A future crossing');
  await page.keyboard.press('Escape');
  await page.locator('.map-stop.available button').nth(1).click();
  await expect(page.getByRole('dialog')).toContainText('Cinder Kiln');
  await expect(page.getByRole('dialog')).toContainText('Second ember');
  const accessibility = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze();
  expect(accessibility.violations).toEqual([]);
  expect(await readRun(page)).toEqual(original);
  await page.getByRole('button', { name: 'Take this path' }).click();
  const entered = await readRun(page);
  expect(entered.depth).toBe(0);
  expect(entered.lane).toBe(1);
  expect(entered.waylights).toEqual([]);
});

test('an existing version 1 save resumes its exact turn and keeps a legacy backup', async ({
  page,
}) => {
  await page.addInitScript(({ key, save }) => localStorage.setItem(key, JSON.stringify(save)), {
    key: LEGACY_SAVE_KEY,
    save: legacyJournal,
  });
  await page.goto('/');
  const restored = await readRun(page);
  expect(restored).toEqual({
    ...legacyJournal.run,
    version: 2,
    ruleset: 1,
    waylights: [],
    talents: [],
  });
  await expect(page.locator('.classic-notice')).toContainText('original rules are preserved');
  await page.locator('.action-button').first().click();
  const next = await readRun(page);
  expect(next.turn).toBe(2);
  expect(next.health).toBe(44);
  expect(next.enemy!.health).toBe(10);
  expect(next.enemy!.guard).toBe(5);
  await page.reload();
  expect(await readRun(page)).toEqual(next);
  expect(
    await page.evaluate((key) => JSON.parse(localStorage.getItem(key)!), LEGACY_SAVE_KEY),
  ).toEqual(legacyJournal);
});

test('corrupt or unavailable storage never prevents starting a game', async ({ page }) => {
  await page.addInitScript((key) => localStorage.setItem(key, '{broken'), SAVE_KEY);
  await page.goto('/');
  await expect(page.getByRole('alert')).toContainText('previous save could not be read');
  await page.getByRole('button', { name: /Begin expedition/ }).click();
  await expect(page.getByRole('heading', { name: /Choose your path/ })).toBeVisible();
});

test('blocked browser storage allows a complete in-memory turn', async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(window, 'localStorage', {
      get() {
        throw new DOMException('Storage disabled', 'SecurityError');
      },
    });
  });
  await page.goto('/');
  await expect(page.getByRole('alert')).toContainText('Browser storage is unavailable');
  await page.getByRole('button', { name: /Begin expedition/ }).click();
  await page.locator('.route-choice').first().click();
  await page.locator('.action-button').first().click();
  await expect(page.locator('.turn-label')).toHaveText('TURN 02');
});

test('desktop presentation and map have no browser errors', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1100 });
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('/');
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({ path: 'test-results/desktop-lobby.png', fullPage: true });
  await page.getByRole('button', { name: /Begin expedition/ }).click();
  await page.screenshot({ path: 'test-results/desktop-map.png', fullPage: true });
  expect(errors).toEqual([]);
});

test('elite and trader routes honor purchases across reloads', async ({ page }) => {
  test.setTimeout(60000);
  await page.goto('/');
  await page.getByLabel('Journey seed').fill('trader-crossing');
  await page.getByRole('button', { name: /Begin expedition/ }).click();
  let run = await readRun(page);
  await clickAction(page, run, { type: 'travel', lane: 1 });
  run = await readRun(page);
  let moves = 0;
  while (!(run.phase === 'map' && run.depth === 1) && moves++ < 60) {
    await clickAction(
      page,
      run,
      run.phase === 'map' ? { type: 'travel', lane: 1 } : campaignAction(run),
    );
    run = await readRun(page);
    expect(run.phase).not.toBe('lost');
  }
  expect(run.depth).toBe(1);
  await clickAction(page, run, { type: 'travel', lane: 1 });
  run = await readRun(page);
  expect(run.phase).toBe('shop');
  const coins = run.coins;
  const attack = run.attack;
  await page.getByRole('button', { name: /An edge of dawn/ }).click();
  expect((await readRun(page)).coins).toBe(coins - 35);
  expect((await readRun(page)).attack).toBe(attack + 2);
  await expect(page.getByRole('button', { name: /An edge of dawn/ })).toBeDisabled();
  await page.reload();
  await expect(page.getByRole('button', { name: /An edge of dawn/ })).toBeDisabled();
  const flaskCount = (await readRun(page)).flasks;
  await page.getByRole('button', { name: /A bottled sunrise/ }).click();
  expect((await readRun(page)).flasks).toBe(flaskCount + 1);
  await page.getByRole('button', { name: /Continue without buying/ }).click();
  expect((await readRun(page)).phase).toBe('map');
});

test('journal export/import restores an exact turn and rejects invalid files', async ({
  page,
  browser,
}) => {
  await page.goto('/');
  await page.getByRole('button', { name: /Begin expedition/ }).click();
  await page.locator('.route-choice').first().click();
  await page.locator('.action-button').first().click();
  const original = await readRun(page);
  await page.getByRole('button', { name: 'Manage journal' }).click();
  const exported = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Download journal' }).click();
  const download = await exported;
  const contents = await readFile((await download.path())!, 'utf8');
  expect(JSON.parse(contents).run).toEqual(original);
  const newContext = await browser.newContext();
  const restoredPage = await newContext.newPage();
  await restoredPage.goto('/');
  await restoredPage.getByRole('button', { name: 'Seer', exact: true }).click();
  await restoredPage.getByRole('button', { name: /Begin expedition/ }).click();
  const beforeRestore = await readRun(restoredPage);
  await restoredPage.getByRole('button', { name: 'Manage journal' }).click();
  const fileInput = restoredPage.getByLabel('Choose a journal file');
  await fileInput.setInputFiles({
    name: 'broken.json',
    mimeType: 'application/json',
    buffer: Buffer.from('{bad'),
  });
  await expect(restoredPage.getByRole('alert')).toContainText('not a compatible Emberwake journal');
  expect(await readRun(restoredPage)).toEqual(beforeRestore);
  await fileInput.setInputFiles({
    name: 'too-large.json',
    mimeType: 'application/json',
    buffer: Buffer.alloc(65537, 'x'),
  });
  await expect(restoredPage.getByRole('alert')).toContainText('too large');
  await fileInput.setInputFiles({
    name: 'journal.json',
    mimeType: 'application/json',
    buffer: Buffer.from(contents),
  });
  await expect(restoredPage.getByText('A story ready to return', { exact: false })).toBeVisible();
  expect(await readRun(restoredPage)).toEqual(beforeRestore); // File selection never replaces progress.
  const accessibility = await new AxeBuilder({ page: restoredPage })
    .withTags(['wcag2a', 'wcag2aa'])
    .analyze();
  expect(accessibility.violations).toEqual([]);
  await restoredPage.getByRole('button', { name: /Restore this journal/ }).click();
  expect(await readRun(restoredPage)).toEqual(original);
  await restoredPage.reload();
  expect(await readRun(restoredPage)).toEqual(original);
  await newContext.close();
});
