import { battleFixtureCommand, installBattleFixture, startKnightBattleFixture } from './battle-fixture.ts';
import { controlFrames, frames } from './frames.ts';
import { expect, test } from './test.ts';
test.use({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
test('phone knight battles keep movement controls without playtesting buttons', async ({ page }) => {
  await controlFrames(page);
  await installBattleFixture(page);
  await page.goto('/');
  await frames(page, 1);
  await startKnightBattleFixture(page);
  await battleFixtureCommand(page, 'invincible');
  for (let i = 0; i < 4; i++) await page.locator('#battleDefend').tap();
  await frames(page, 70);
  for (const id of ['mobileInvincible', 'mobileSkip', 'battleKnightTestingControls'])
    await expect(page.locator('#' + id)).toHaveCount(0);
  await expect(page.locator('#mobileDpad')).toBeVisible();
  const y = await page.evaluate(() => window.battleFixtureState.bossEncounter!.soul!.y);
  const up = await page.locator('#mobileDpad [data-dir="up"]').boundingBox();
  await page.touchscreen.tap(up!.x + up!.width / 2, up!.y + up!.height / 2);
  await frames(page, 1);
  expect(await page.evaluate(() => window.battleFixtureState.bossEncounter!.soul!.y)).toBeLessThanOrEqual(y);
  await frames(page, 700);
  await expect(page.locator('#battleTurnText')).toHaveText('Kris’s turn');
});
