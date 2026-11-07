import { writeFile } from 'node:fs/promises';
import { installBattleFixture } from './battle-fixture.ts';
import { controlFrames, frames } from './frames.ts';
import { seedProgress } from './progress.ts';
import { expect, test } from './test.ts';

test('both knights launch swords across the soul arena, damage each other and return to party turns', async ({
  page,
}, testInfo) => {
  await controlFrames(page);
  await installBattleFixture(page);
  await seedProgress(
    page,
    'postShowPassage',
    { tennaFinaleComplete: true, knightStatuesExplained: true },
    { x: 140, y: 360 },
  );
  await page.goto('/');
  await frames(page, 1);
  await page.evaluate(() => {
    window.battleFixtureState.knightPath!.duelAge = 11;
  });
  await frames(page, 2);
  await page.evaluate(() => {
    window.battleFixtureState.bossEncounter!.invincible = true;
  });
  for (let i = 0; i < 4; i++) await page.locator('#battleDefend').click();
  await expect(page.locator('#battleSoulControls')).toBeVisible();
  await expect(page.locator('#battleAttack')).toBeDisabled();
  await page.locator('#game').focus();
  await page.keyboard.down('ArrowDown');
  await frames(page, 10);
  await page.keyboard.up('ArrowDown');
  const moved = await page.evaluate(() => window.battleFixtureState.bossEncounter!.soul!.y);
  expect(moved).toBeGreaterThan(163);
  await frames(page, 60);
  const scene = await page.evaluate(() => {
    const b = window.battleFixtureState.bossEncounter!;
    return {
      owners: b.snowAttack!.knightSwords!.swords.map((s) => s.owner),
      png: (document.querySelector('#game') as HTMLCanvasElement).toDataURL().split(',')[1],
    };
  });
  expect(scene.owners).toContain('roaring');
  expect(scene.owners).toContain('kaizo');
  await writeFile(testInfo.outputPath('knight-first-swords.png'), Buffer.from(scene.png, 'base64'));
  await frames(page, 100);
  const hp = await page.evaluate(() => window.battleFixtureState.bossEncounter!.knightEnemies!);
  expect(hp.roaring.hp).toBeLessThan(20000);
  expect(hp.kaizo.hp).toBeLessThan(30000);
  await frames(page, 650);
  await expect(page.locator('#battleSoulControls')).toBeHidden();
  await expect(page.locator('#battleTurnText')).toHaveText('Kris’s turn');
  await expect(page.locator('#battleAct')).toBeEnabled();
  expect(await page.evaluate(() => window.battleFixtureState.bossEncounter!.projectileDamageMultiplier)).toBe(
    1,
  );
});
