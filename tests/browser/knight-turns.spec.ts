import { writeFile } from 'node:fs/promises';
import { installBattleFixture } from './battle-fixture.ts';
import { controlFrames, frames } from './frames.ts';
import { seedProgress } from './progress.ts';
import { expect, test } from './test.ts';

test('knight battle supports party ACTs, target choice, items and a protected enemy turn', async ({
  page,
}, testInfo) => {
  await controlFrames(page);
  await installBattleFixture(page);
  await seedProgress(
    page,
    'postShowPassage',
    { tennaFinaleComplete: true, knightStatuesExplained: true },
    { x: 140, y: 360 },
    { tpElixir: 2 },
  );
  await page.goto('/');
  await frames(page, 1);
  await page.evaluate(() => {
    window.battleFixtureState.knightPath!.duelAge = 11;
  });
  await frames(page, 2);
  await expect(page.locator('#bossControls')).toBeVisible();
  await expect(page.locator('#battleTurnText')).toHaveText('Kris’s turn');
  await page.locator('#battleAct').click();
  await expect(page.locator('#battleProceedButton')).toHaveText('Hold Breath · 0% TP');
  await expect(page.locator('#battleProceedButton')).toBeEnabled();
  await page.locator('#battleProceedButton').click();
  await expect(page.locator('#battleTurnText')).toHaveText('Flowey’s turn');
  await page.locator('#battleAct').click();
  await expect(page.locator('#battleProceedButton')).toHaveText('Friendlyness Pellets · 65% TP');
  await expect(page.locator('#battleProceedButton')).toBeDisabled();
  await page.locator('#battleMenuBack').click();
  await page.locator('#battleItem').click();
  await expect(page.locator('#inventoryDialog')).toBeVisible();
  await page.locator('#closeInventoryButton').click();
  await page.evaluate(() => {
    const s = window.battleFixtureState;
    s.partyHP.Flowey = 50;
    s.bossEncounter!.tp = 100;
    window.refreshBattleFixture();
  });
  await page.locator('#battleAct').click();
  await page.locator('#battleKnightTarget').selectOption('kaizo');
  await expect(page.locator('#battleProceedCount')).toContainText('Deal 20 damage to Kaizo Knight.');
  await page.locator('#battleProceedButton').click();
  await frames(page, 120);
  await expect(page.locator('#battleTurnText')).toHaveText('Susie’s turn');
  expect(await page.evaluate(() => window.battleFixtureState.bossEncounter!.knightEnemies!.kaizo.hp)).toBe(
    29980,
  );
  await page.evaluate(() => {
    window.battleFixtureState.bossEncounter!.tp = 100;
    window.refreshBattleFixture();
  });
  await page.locator('#battleAct').click();
  await expect(page.locator('#battleProceedButton')).toHaveText('Rude Buster · 70% TP');
  await page.locator('#battleProceedButton').click();
  await expect(page.locator('#battleTurnText')).toHaveText('Ralsey’s turn');
  expect(await page.evaluate(() => window.battleFixtureState.bossEncounter!.knightEnemies!.kaizo.hp)).toBe(
    29960,
  );
  await page.evaluate(() => {
    window.battleFixtureState.bossEncounter!.tp = 100;
    window.refreshBattleFixture();
  });
  await page.locator('#battleAct').click();
  await expect(page.locator('#battleProceedButton')).toHaveText('Heal Player · 50% TP');
  await page.locator('#battleProceedButton').click();
  await frames(page, 90);
  const result = await page.evaluate(() => ({
    hp: window.battleFixtureState.partyHP.Flowey,
    phase: window.battleFixtureState.bossEncounter!.phase,
    multiplier: window.battleFixtureState.bossEncounter!.projectileDamageMultiplier,
    attack: window.battleFixtureState.bossEncounter!.snowAttack,
    png: (document.querySelector('#game') as HTMLCanvasElement).toDataURL().split(',')[1],
  }));
  expect(result.hp).toBe(100);
  expect(result.phase).toBe('enemy');
  expect(result.multiplier).toBe(0.75);
  expect(result.attack).toBeNull();
  await writeFile(testInfo.outputPath('knight-party-turns.png'), Buffer.from(result.png, 'base64'));
});
