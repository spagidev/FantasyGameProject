import { test, expect, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { newRun, transition, type Run } from '../src/game/engine';
import { advanceSave, emptySave, SAVE_KEY } from '../src/game/storage';
import { campaignAction } from './player';

function scenes() {
  const found = new Map<string, Run>();
  let run = newRun('warden', 123),
    steps = 0;
  while (!['won', 'lost'].includes(run.phase) && steps++ < 220) {
    if (!found.has(run.phase)) found.set(run.phase, run);
    run = transition(
      run,
      run.phase === 'map' && run.depth === 1 ? { type: 'travel', lane: 1 } : campaignAction(run),
    );
  }
  found.set(run.phase, run);
  let lost = transition(newRun('warden', 123), { type: 'travel', lane: 0 });
  lost = { ...lost, health: 1 };
  lost = transition(lost, { type: 'strike' });
  found.set('lost', lost);
  return found;
}
async function loadScene(page: Page, run: Run) {
  await page.evaluate(({ key, save }) => localStorage.setItem(key, JSON.stringify(save)), {
    key: SAVE_KEY,
    save: advanceSave(emptySave(), run),
  });
  await page.reload();
  await page.evaluate(() => document.fonts.ready);
}

test('illustrated presentation keeps every decision readable and accessible across screen sizes', async ({
  page,
}) => {
  test.setTimeout(150000);
  const states = scenes(),
    problems: unknown[] = [];
  await page.goto('/');
  async function inspect(name: string) {
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
      name + ' fits viewport',
    ).toBe(true);
    const result = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze();
    for (const v of result.violations)
      for (const node of v.nodes)
        problems.push({
          screen: name,
          id: v.id,
          target: node.target,
          html: node.html,
          contrast: node.any.map((x) => x.data),
        });
    await page.screenshot({ path: `test-results/redesign/${name}.png`, fullPage: true });
  }
  await page.setViewportSize({ width: 1440, height: 1000 });
  for (const phase of ['combat', 'reward', 'event', 'shop', 'talent', 'ending', 'won', 'lost']) {
    expect(states.has(phase), `fixture includes ${phase}`).toBe(true);
    await loadScene(page, states.get(phase)!);
    await inspect(phase + '-desktop');
  }
  await page.getByRole('button', { name: /Chronicle/ }).click();
  await inspect('chronicle-desktop');
  await page.getByRole('button', { name: 'Manage journal' }).click();
  await inspect('journal-desktop');
  await page.keyboard.press('Escape');
  await page.setViewportSize({ width: 390, height: 844 });
  for (const phase of ['combat', 'reward', 'talent']) {
    await loadScene(page, states.get(phase)!);
    await inspect(phase + '-mobile');
  }
  await page.getByRole('button', { name: 'How to play' }).click();
  await inspect('help-mobile');
  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: /Chronicle/ }).click();
  await inspect('chronicle-mobile');
  expect(problems).toEqual([]);
});
