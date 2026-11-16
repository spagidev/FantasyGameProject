import { test, expect, type Page } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import AxeBuilder from '@axe-core/playwright';
import { EVENTS, KEEPERS, RELICS, TALENTS, type KeeperId, type RelicId } from '../src/game/data';
import { makeEnemy, nextNodes, nodeOf, type Action, type Run } from '../src/game/engine';
import { SAVE_KEY, LEGACY_SAVE_KEY, MAX_SAVE_BYTES } from '../src/game/storage';
import { dailyRoad, scoreOf } from '../src/game/meta';
import legacyJournal from './fixtures/v1-journal.json' with { type: 'json' };
import { campaignAction } from './player';

async function readRun(page: Page): Promise<Run> {
  return page.evaluate((key) => JSON.parse(localStorage.getItem(key)!).run, SAVE_KEY);
}
async function clickAction(page: Page, run: Run, action: Action) {
  if (action.type === 'atlas-move') {
    await page.locator(`[data-destination="${action.to}"]`).click();
  } else if (action.type === 'travel' && run.atlas) {
    await page.getByRole('button', { name: 'Enter encounter' }).click();
  } else if (action.type === 'travel') {
    const node = nodeOf(run, run.depth + 1, action.lane);
    await page.locator('.route-choice').filter({ hasText: node.name }).first().click();
  } else if (action.type === 'talent') {
    await page.locator('.talent-card').filter({ hasText: TALENTS[action.id].name }).click();
  } else if (['strike', 'guard', 'skill', 'technique', 'flask'].includes(action.type)) {
    await page.locator(`.duel-action[data-action="${action.type}"]`).click();
  } else if (action.type === 'reward') {
    if (action.id === 'heal') await page.getByRole('button', { name: /Leave the relics/ }).click();
    else await page.locator('.reward-card').filter({ hasText: RELICS[action.id].name }).click();
  } else if (action.type === 'event') {
    const event = EVENTS[nodeOf(run).eventIndex];
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
    const services = {
      heal: /A little kindness/,
      flask: /A bottled sunrise/,
      forge: /An edge of dawn/,
    } as Record<string, RegExp>;
    await page
      .getByRole('button', {
        name: services[action.item] ?? new RegExp(RELICS[action.item as RelicId].name),
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
  await expect(page.locator('.duel-action').nth(2)).toBeDisabled();
  await page.locator('.duel-action').first().click();
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
    await expect(page.locator('.score-total strong')).toHaveText(
      scoreOf(run).total.toLocaleString('en'),
    );
    await expect(page.locator('.score-news')).toContainText('Dusk 1 is open');
    await expect(page.locator('.score-news')).toContainText('Somebody made it');
    await page.reload();
    expect((await readRun(page)).phase).toBe('won');
    await page.getByRole('button', { name: /Chronicle/ }).click();
    await expect(page.locator('.chronicle-counts')).toContainText('1 crossings completed');
    await page.getByRole('tab', { name: /Records/ }).click();
    await expect(page.locator('.history tbody tr')).toHaveCount(1);
    await expect(page.locator('.history')).toContainText('Completed');
    await page.getByRole('tab', { name: /Bestiary/ }).click();
    await expect(page.locator('.foe-card.is-done').first()).toBeVisible();
    await page.getByRole('button', { name: /Return to the expedition/ }).click();
    if (keeper === 'warden') {
      // One click starts the next, harder night with the same keeper.
      await page.getByRole('button', { name: /Walk again as Asha/ }).click();
      const again = await readRun(page);
      expect(again).toMatchObject({ keeper: 'warden', dusk: 1, phase: 'map', depth: -1 });
      expect(again.seed).not.toBe(run.seed);
      expect(again.pool).toEqual(expect.arrayContaining(['buckle', 'lodestar', 'mirror']));
    } else {
      await page.getByRole('button', { name: /Choose another road/ }).click();
      await expect(page.getByRole('button', { name: /Begin expedition/ })).toBeVisible();
      await expect(page.getByRole('button', { name: 'Dusk 1', exact: true })).toBeEnabled();
      await expect(page.getByRole('button', { name: 'Dusk 2, locked' })).toBeDisabled();
    }
    expect(errors).toEqual([]);
  });
}

test('today’s road, the codex and combat previews', async ({ page }) => {
  await page.goto('/');
  const road = await page.evaluate(() => {
    const d = new Date();
    return [d.getFullYear(), d.getMonth(), d.getDate()];
  });
  const today = dailyRoad(new Date(road[0], road[1], road[2]));
  await page.getByRole('button', { name: /Today’s road/ }).click();
  let run = await readRun(page);
  expect(run).toMatchObject({ seed: today.seed, keeper: today.keeper, daily: today.id, dusk: 0 });
  await page.locator('.route-choice').first().click();
  run = await readRun(page);
  // Every enabled action states its exact result; the engine agrees after the click.
  const strike = page.locator('.duel-action[data-action="strike"]');
  await expect(strike.locator('.action-result')).toContainText(/Enemy −\d+/);
  const promised = Number(
    (await strike.locator('.action-result').innerText()).match(/Enemy −(\d+)/)![1],
  );
  await expect(page.getByRole('meter', { name: 'Enemy poise' })).toBeVisible();
  await expect(page.locator('.intent-next')).toContainText('Then:');
  await page.keyboard.press('1');
  const after = await readRun(page);
  expect(run.enemy!.health - after.enemy!.health).toBe(promised);
  await expect(page.locator('.duel-action')).toHaveCount(5);
  await page.getByRole('button', { name: /Chronicle/ }).click();
  for (const tab of ['Deeds', 'Relics', 'Bestiary', 'Records', 'Memories']) {
    await page.getByRole('tab', { name: new RegExp(tab) }).click();
    await expect(page.getByRole('tabpanel')).toBeVisible();
  }
  await page.getByRole('tab', { name: /Relics/ }).click();
  await expect(page.getByRole('tabpanel')).toContainText('16 of 28 relics');
  const accessibility = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze();
  expect(accessibility.violations).toEqual([]);
});

test('mobile layout stays within the viewport and supports combat', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await page.screenshot({ path: 'test-results/mobile-lobby.png', fullPage: true });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  );
  await page.getByRole('button', { name: /Begin expedition/ }).click();
  await page.locator('.route-choice').first().click();
  await page.locator('.duel-action').first().click();
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
  await expect(page.getByRole('dialog')).toContainText(
    makeEnemy(nodeOf(original, 0, 1)).pattern[1].name,
  );
  await expect(page.getByRole('dialog')).toContainText('Poise');
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
  await page.locator('.duel-action').first().click();
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
  await page.locator('.duel-action').first().click();
  await expect(page.locator('.duel-turn')).toHaveText('TURN 02');
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

test('trader routes honor purchases across reloads', async ({ page }) => {
  test.setTimeout(90000);
  await page.goto('/');
  await page.getByLabel('Journey seed').fill('trader-crossing');
  await page.getByRole('button', { name: /Begin expedition/ }).click();
  let run = await readRun(page);
  // Walk toward the first trader: at every fork prefer a lane that still reaches one.
  const towardShop = (r: Run): Action => {
    const options = nextNodes(r);
    const shop = options.find((n) => n.kind === 'shop');
    const reaches = options.find((n) =>
      [0, 1, 2].some(
        (lane) => Math.abs(lane - n.lane) <= 1 && nodeOf(r, n.depth + 1, lane).kind === 'shop',
      ),
    );
    return { type: 'travel', lane: (shop ?? reaches ?? options[0]).lane };
  };
  let moves = 0;
  while (run.phase !== 'shop' && moves++ < 120) {
    await clickAction(page, run, run.phase === 'map' ? towardShop(run) : campaignAction(run));
    run = await readRun(page);
    expect(run.phase).not.toBe('lost');
  }
  expect(run.phase).toBe('shop');
  const coins = run.coins;
  const attack = run.attack;
  await page.getByRole('button', { name: /An edge of dawn/ }).click();
  expect(coins).toBeGreaterThanOrEqual(35);
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
  await page.locator('.duel-action').first().click();
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
    buffer: Buffer.alloc(MAX_SAVE_BYTES + 1, 'x'),
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

test('Lost Atlas completes a real-road campaign, persists its fog, and keeps maps local', async ({
  page,
}) => {
  test.setTimeout(120000);
  const errors: string[] = [],
    external: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('request', (req) => {
    if (!req.url().startsWith('http://127.0.0.1:4173') && !req.url().startsWith('data:'))
      external.push(req.url());
  });
  await page.goto('/');
  await page.getByRole('button', { name: /The Lost Atlas/ }).click();
  await page.getByRole('button', { name: 'Original offline chart', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'The Saltbound Coast' })).toBeVisible();
  await page.getByLabel('Journey seed').fill('the-atlas-crossing');
  await page.getByRole('button', { name: /Begin expedition/ }).click();
  await expect(page.locator('.atlas-discovery')).toContainText('1/17');
  await page.locator('[data-destination="watch"]').click();
  const explored = await readRun(page);
  await page.screenshot({ path: 'test-results/atlas-first-discovery.png', fullPage: true });
  await page.reload();
  expect(await readRun(page)).toEqual(explored);
  let run = await readRun(page),
    moves = 0;
  while (!['won', 'lost'].includes(run.phase) && moves++ < 240) {
    const action = campaignAction(run);
    await clickAction(page, run, action);
    const next = await readRun(page);
    expect(next).not.toEqual(run);
    run = next;
  }
  expect(run.phase).toBe('won');
  expect(run.bells).toBe(3);
  expect(run.atlas?.recognized).toBe(false);
  await page.locator('.atlas-fold > summary').click();
  await page.getByRole('button', { name: 'Show whole chart' }).click();
  await page.screenshot({ path: 'test-results/atlas-complete.png', fullPage: true });
  expect(errors).toEqual([]);
  expect(external).toEqual([]);
});

test('Lost Atlas recognition, keyboard roads, mobile layout and accessible controls', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await page.getByRole('button', { name: /The Lost Atlas/ }).click();
  await page.getByRole('button', { name: 'Original offline chart', exact: true }).click();
  await page.getByRole('button', { name: /Begin expedition/ }).click();
  await page.getByLabel('Does this coast feel familiar?').fill('Monaco');
  await page.getByRole('button', { name: 'Remember its name' }).click();
  const recognized = await readRun(page);
  expect(recognized.atlas?.recognized).toBe(true);
  expect(recognized.attack).toBe(9);
  await expect(page.getByRole('heading', { name: 'Monaco remembers.' })).toBeVisible();
  const road = page.locator('[data-destination="cache"]');
  await road.focus();
  await page.keyboard.press('Enter');
  expect((await readRun(page)).atlas?.position).toBe('cache');
  await page.getByRole('button', { name: 'Gather this kindness' }).click();
  expect((await readRun(page)).coins).toBe(53);
  await expect(page.getByText('This kindness is already gathered.')).toBeVisible();
  await page.screenshot({ path: 'test-results/atlas-mobile.png', fullPage: true });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  const accessibility = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze();
  expect(accessibility.violations).toEqual([]);
  const saved = await readRun(page);
  await page.reload();
  expect(await readRun(page)).toEqual(saved);
});

test('a chosen Slovak kraj starts a hidden city, city-only recognition survives journal reload', async ({
  page,
}) => {
  const { regionalFixture } = await import('./atlas-fixture');
  const chart = regionalFixture();
  const requested: string[] = [];
  await page.route('**/api/atlas', async (route) => {
    requested.push(route.request().postDataJSON().region);
    await route.fulfill({ json: { chart } });
  });
  await page.goto('/');
  await page.getByRole('button', { name: /The Lost Atlas/ }).click();
  await page.getByRole('button', { name: 'Live map', exact: true }).click();
  await expect(page.getByLabel('Country or region', { exact: true })).toHaveValue('Slovakia');
  await page.getByLabel('Country or region', { exact: true }).fill('Bratislavsky kraj');
  await expect(page.locator('main')).not.toContainText('Testovce');
  await page.getByRole('button', { name: /Begin expedition/ }).click();
  await expect(page.getByText('Hidden city · Bratislavský kraj', { exact: true })).toBeVisible();
  expect(requested).toEqual(['Bratislavsky kraj']);
  await expect(page.locator('main')).not.toContainText('Testovce');
  await expect(page.locator('main')).not.toContainText('Monaco');
  const generated = await readRun(page);
  expect(generated.atlas?.region).toBe('regional');
  await page.reload();
  expect(await readRun(page)).toEqual(generated);
  await page.getByLabel('Which city lies beneath the veil?').fill('Test City');
  await page.getByRole('button', { name: 'Remember its name' }).click();
  await expect(page.getByRole('heading', { name: 'Testovce remembers.' })).toBeVisible();
  expect((await readRun(page)).attack).toBe(generated.attack + 2);
  await page.getByRole('button', { name: 'Manage journal' }).click();
  const downloadEvent = page.waitForEvent('download');
  await page.getByRole('button', { name: /Download journal/ }).click();
  const download = await downloadEvent;
  const journal = JSON.parse(await readFile((await download.path())!, 'utf8'));
  expect(journal.run.atlas.chart).toEqual(chart);
});

test('regional setup lists all eight kraje, handles unavailable maps and permits cancellation without creating a run', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.route('**/api/atlas', (route) =>
    route.fulfill({ status: 422, json: { error: 'The map provider is busy. Try again later.' } }),
  );
  await page.goto('/');
  await page.getByRole('button', { name: /The Lost Atlas/ }).click();
  await page.getByRole('button', { name: 'Live map', exact: true }).click();
  await page.getByText('Slovakia · choose one of the eight kraje', { exact: true }).click();
  const regionButtons = page.locator('.slovak-regions button');
  expect(await regionButtons.count()).toBe(9);
  await page.getByRole('button', { name: 'Košický kraj', exact: true }).click();
  await expect(page.getByLabel('Country or region', { exact: true })).toHaveValue('Košický kraj');
  await page.getByLabel('Country or region', { exact: true }).fill('Austria');
  await page.getByRole('button', { name: /Begin expedition/ }).click();
  await expect(page.getByRole('alert')).toContainText('provider is busy');
  expect(
    await page.evaluate((key) => JSON.parse(localStorage.getItem(key)!).run, SAVE_KEY),
  ).toBeNull();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  const accessibility = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze();
  expect(accessibility.violations).toEqual([]);
  await page.screenshot({ path: 'test-results/regional-setup-mobile.png', fullPage: true });
  await page.unroute('**/api/atlas');
  let pending: (() => void) | undefined;
  await page.route('**/api/atlas', async (route) => {
    await new Promise<void>((resolve) => {
      pending = resolve;
    });
    await route.fulfill({ json: { error: 'cancelled' } }).catch(() => {});
  });
  await page.getByRole('button', { name: /Begin expedition/ }).click();
  await expect(page.locator('.atlas-loading')).toContainText('Charting an unknown city');
  await page.getByRole('button', { name: 'Cancel', exact: true }).click();
  pending?.();
  await expect(page.getByRole('button', { name: /Begin expedition/ })).toBeEnabled();
  expect(
    await page.evaluate((key) => JSON.parse(localStorage.getItem(key)!).run, SAVE_KEY),
  ).toBeNull();
});
