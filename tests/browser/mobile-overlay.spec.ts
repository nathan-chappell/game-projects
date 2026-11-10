import { installBattleFixture, startKnightBattleFixture } from './battle-fixture.ts';
import { controlFrames, frames } from './frames.ts';
import { expect, test } from './test.ts';

test.use({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });

test('in-game touch pad supports held movement and releases cleanly; A and B share battle actions', async ({
  page,
}, testInfo) => {
  await controlFrames(page);
  await installBattleFixture(page);
  await page.goto('/');
  await frames(page, 1);
  await expect(page.locator('#mobileGameControls')).toBeVisible();
  await page.locator('#mobileDpad').scrollIntoViewIfNeeded();
  const right = await page.locator('#mobileDpad [data-dir="right"]').boundingBox();
  const down = await page.locator('#mobileDpad [data-dir="down"]').boundingBox();
  const stage = await page.locator('#game').boundingBox();
  expect(right!.x).toBeGreaterThanOrEqual(stage!.x);
  expect(right!.y + right!.height).toBeLessThanOrEqual(stage!.y + stage!.height);
  expect(right!.height).toBeGreaterThanOrEqual(44);
  const start = await page.evaluate(() => ({ ...window.battleFixtureState.player }));
  const touch = await page.context().newCDPSession(page);
  const r = { x: right!.x + 22, y: right!.y + 22, id: 1 };
  const d = { x: down!.x + 22, y: down!.y + 22, id: 2 };
  await touch.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [r] });
  await frames(page, 8);
  await touch.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [r, d] });
  await frames(page, 8);
  await touch.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  const moved = await page.evaluate(() => ({
    x: window.battleFixtureState.player.x,
    y: window.battleFixtureState.player.y,
    keys: window.battleFixtureState.keys.size,
  }));
  expect(moved.x).toBeGreaterThan(start.x + 20);
  expect(moved.y).toBeGreaterThan(start.y);
  expect(moved.keys).toBe(0);
  await page.locator('#buildMode').tap();
  await frames(page, 1);
  await expect(page.locator('#mobileGameControls')).toBeHidden();
  await page.locator('#playMode').tap();
  await frames(page, 1);
  await startKnightBattleFixture(page);
  await frames(page, 1);
  await expect(page.locator('#mobileDpad')).toBeHidden();
  await page.locator('#mobileConfirm').tap();
  await frames(page, 1);
  await expect(page.locator('#battleProceedButton')).toHaveText('Hold Breath · 0% TP');
  await page.locator('#mobileBack').tap();
  await frames(page, 1);
  expect(await page.evaluate(() => window.battleFixtureState.bossEncounter!.screen)).toBe('menu');
  await page.locator('#mobileConfirm').tap();
  await frames(page, 1);
  await page.locator('#mobileConfirm').tap();
  await frames(page, 1);
  await expect(page.locator('#battleTurnText')).toHaveText('Flowey’s turn');
  await page.locator('#mobileInvincible').tap();
  await frames(page, 1);
  for (let i = 0; i < 3; i++) await page.locator('#battleDefend').tap();
  await frames(page, 70);
  await expect(page.locator('#mobileDpad')).toBeVisible();
  await expect(page.locator('#mobileRun')).toBeHidden();
  await page.locator('#game').scrollIntoViewIfNeeded();
  await page.screenshot({ path: testInfo.outputPath('mobile-in-game-controls.png'), fullPage: true });
  await page.setViewportSize({ width: 844, height: 390 });
  await expect(page.locator('#mobileDpad')).toBeVisible();
  await page.locator('#mobileSkip').tap();
  await frames(page, 1);
  await expect(page.locator('#battleTurnText')).toHaveText('Kris’s turn');
});
