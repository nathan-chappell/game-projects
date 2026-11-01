import { queenKeyPath } from '../../src/rooms/queen-terminal/queen-puzzle.ts';
import { confirmRoomDialogue, controlFrames, frames } from './frames.ts';
import { seedProgress } from './progress.ts';
import { expect, test } from './test.ts';

test('Queen accepts the adjacent keyboard route and begins the success conversation', async ({ page }) => {
  await controlFrames(page);
  await seedProgress(page, 'queenPasscode', { queenSolved: false }, { x: 194, y: 294 });
  await page.goto('/');
  await frames(page, 1);
  for (let i = 1; i < queenKeyPath.length; i++) {
    const [x, y] = queenKeyPath[i],
      [beforeX, beforeY] = queenKeyPath[i - 1];
    const key =
      x > beforeX ? 'ArrowRight' : x < beforeX ? 'ArrowLeft' : y > beforeY ? 'ArrowDown' : 'ArrowUp';
    await page.locator('#game').focus();
    await page.keyboard.down(key);
    await frames(page, 16);
    await page.keyboard.up(key);
  }
  await frames(page, 90);
  await expect(page.locator('#dialogue')).toBeVisible();
  await expect(page.locator('#speakerName')).toHaveText('Tenna');
});

test('dark encounter retains Shine progression and returns to the lit chamber', async ({ page }) => {
  await controlFrames(page);
  await seedProgress(page, 'collisionChamber', {
    darkBattleSeen: false,
    jackRevealed: false,
    jackCandyReceived: false,
  });
  await page.goto('/');
  await frames(page, 60);
  await confirmRoomDialogue(page);
  await frames(page, 2);
  await expect(page.locator('#bossControls')).toBeVisible();
  await expect(page.locator('#battleAttack')).toBeDisabled();
  for (let shine = 1; shine <= 5; shine++) {
    await page.locator('#game').focus();
    await page.keyboard.press('1');
    await page.locator('#battleAct').click();
    await page.locator('#battleProceedButton').click();
    await frames(page, 2);
    if (shine === 5) break;
    await confirmRoomDialogue(page);
    if (shine === 3) await expect(page.locator('#battleAttack')).toBeEnabled();
    for (let member = 0; member < 3; member++) await page.locator('#battleDefend').click();
    await page.locator('#game').focus();
    await page.keyboard.press('Shift');
  }
  await expect(page.locator('#bossControls')).not.toBeVisible();
  await expect(page.locator('#dialogue')).toBeVisible();
});

test('Tenna starts the Helpers attack and returns to party controls after skipping it', async ({ page }) => {
  await controlFrames(page);
  await seedProgress(page, 'glitchBackstage', {}, { x: 340, y: 340, facing: 'up' });
  await page.goto('/');
  await frames(page, 1);
  await page.locator('#talkButton').click();
  for (let line = 0; line < 4; line++) await confirmRoomDialogue(page);
  await frames(page, 2);
  await expect(page.locator('#bossControls')).toBeVisible();
  for (let member = 0; member < 4; member++) await page.locator('#battleDefend').click();
  await frames(page, 2);
  await confirmRoomDialogue(page);
  await frames(page, 90);
  await expect(page.locator('#battleSoulControls')).toBeVisible();
  await expect(page.locator('#battleSnowText')).toContainText('saxophone');
  await page.locator('#game').focus();
  await page.keyboard.press('Shift');
  await expect(page.locator('#battleAttack')).toBeEnabled();
});

test('Noelle Snowgrave, rescue, and the three protected responses complete through the UI', async ({
  page,
}) => {
  test.setTimeout(60000);
  await controlFrames(page);
  await seedProgress(page, 'glitchBoss', { noelleGone: false, noelleEscaped: false });
  await page.goto('/');
  await frames(page, 2);
  await page.locator('#proceedBossButton').click();
  await confirmRoomDialogue(page);
  await confirmRoomDialogue(page);
  await page.locator('#game').focus();
  await page.keyboard.press('4');
  await page.keyboard.press('2');
  const attack = async () => {
    await page.locator('#battleAttack').click();
    await page.locator('#battleTargetButton').click();
  };
  await attack();
  await attack();
  await page.locator('#game').focus();
  await page.keyboard.press('Shift');
  await attack();
  await frames(page, 30);
  await expect(page.locator('#battleSnowText')).toContainText('Snowgrave');
  await page.locator('#game').focus();
  await page.keyboard.press('Shift');
  await attack();
  await frames(page, 240);
  await page.locator('#battleStoryNext').click();
  await frames(page, 120);
  await page.locator('#battleStoryNext').click();
  await frames(page, 120);
  for (let line = 0; line < 7; line++) await page.locator('#battleStoryNext').click();
  for (const duration of [120, 300, 120]) {
    await page.locator('#battleAttack').click();
    await expect(page.locator('#battleStoryNext')).toBeDisabled();
    await frames(page, duration);
    await page.locator('#battleStoryNext').click();
  }
  await frames(page, 90);
  await expect(page.locator('#bossControls')).not.toBeVisible();
  await expect(page.locator('#speakerName')).toHaveText('Ralsey');
});
