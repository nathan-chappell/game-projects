import { controlFrames, frames } from './frames.ts';
import { expect, test } from './test.ts';

test.use({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });

test('phone buttons toggle knight invincibility and skip the enemy attack', async ({ page }, testInfo) => {
  await controlFrames(page);
  await page.goto('/');
  await frames(page, 1);
  await expect(page.locator('#battleKnightTestingControls')).toBeHidden();
  await page.locator('#knightTeleportButton').tap();
  const toggle = page.locator('#battleKnightInvincible');
  const skip = page.locator('#battleKnightSkip');
  await expect(toggle).toBeVisible();
  await expect(skip).toBeDisabled();
  const bounds = await toggle.boundingBox();
  expect(bounds!.height).toBeGreaterThanOrEqual(44);
  await toggle.tap();
  await expect(toggle).toHaveText('Invincibility: ON');
  await expect(toggle).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('#battleTestStatus')).toContainText('Invincible ON');
  for (let i = 0; i < 4; i++) await page.locator('#battleDefend').tap();
  await frames(page, 70);
  await expect(skip).toBeEnabled();
  await skip.scrollIntoViewIfNeeded();
  await page.screenshot({ path: testInfo.outputPath('knight-phone-controls.png'), fullPage: true });
  await skip.tap();
  await expect(page.locator('#battleTurnText')).toHaveText('Kris’s turn');
  await expect(page.locator('#battleSoulControls')).toBeHidden();
  await expect(skip).toBeDisabled();
  await expect(toggle).toHaveText('Invincibility: ON');
  await toggle.tap();
  await expect(toggle).toHaveText('Invincibility: OFF');
  await expect(toggle).toHaveAttribute('aria-pressed', 'false');
});
