import { writeFile } from 'node:fs/promises';
import { installBattleFixture, prepareBattle } from './battle-fixture.ts';
import { controlFrames, frames } from './frames.ts';
import { expect, test } from './test.ts';

test('larger Vessel battle supports the requested attacks, X-Slash and teammate ACTs', async ({
  page,
}, testInfo) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await controlFrames(page);
  await installBattleFixture(page);
  await page.goto('/');
  await frames(page, 1);
  await page.evaluate(async () => {
    const path = '/src/battle/vessel/entrance.ts',
      rulesPath = '/src/battle/shared/rules.ts';
    const { createVesselEncounter } = await import(path),
      { advanceBattleTime } = await import(rulesPath);
    const state = window.battleFixtureState;
    state.bossEncounter = createVesselEncounter();
    advanceBattleTime(state.bossEncounter, 1.1, state.partyHP);
    state.bossEncounter!.tp = 100;
    window.refreshBattleFixture();
  });
  await page.evaluate(async () => {
    const path = '/src/battle/vessel/drawing.ts';
    const { drawVessel } = await import(path);
    const c = document.createElement('canvas').getContext('2d')!;
    while (!drawVessel(c, 100, 200, 96)) await new Promise((r) => setTimeout(r, 25));
  });
  for (const expected of [9900, 9890, 9880, 9870]) {
    await page.locator('#battleAttack').click();
    await page.locator('#battleTargetButton').click();
    expect(await page.evaluate(() => window.battleFixtureState.bossEncounter!.enemy.hp)).toBe(expected);
  }
  await frames(page, 70);
  await expect(page.locator('#battleTurnText')).toHaveText('Kris’s turn');
  await page.locator('#battleAct').click();
  await expect(page.locator('#battleProceedButton')).toHaveText('X-Slash · 0% TP');
  await page.locator('#battleProceedButton').click();
  expect(await page.evaluate(() => window.battleFixtureState.bossEncounter!.enemy.hp)).toBe(9620);
  await frames(page, 20);
  const png = await page.evaluate(
    () => (document.querySelector('#game') as HTMLCanvasElement).toDataURL().split(',')[1],
  );
  await writeFile(testInfo.outputPath('vessel-x-slash.png'), Buffer.from(png, 'base64'));
  await expect(page.locator('#battleAttack')).toBeDisabled();
  await frames(page, 35);
  await expect(page.locator('#battleTurnText')).toHaveText('Flowey’s turn');
  await page.locator('#battleAct').click();
  await page.locator('#battleProceedButton').click();
  await frames(page, 120);
  expect(await page.evaluate(() => window.battleFixtureState.bossEncounter!.enemy.hp)).toBe(9600);
  await expect(page.locator('#battleTurnText')).toHaveText('Susie’s turn');
  await prepareBattle(page, { tp: 100 });
  await page.locator('#battleAct').click();
  await page.locator('#battleProceedButton').click();
  expect(await page.evaluate(() => window.battleFixtureState.bossEncounter!.enemy.hp)).toBe(9580);
  await expect(page.locator('#battleTurnText')).toHaveText('Ralsey’s turn');
});
