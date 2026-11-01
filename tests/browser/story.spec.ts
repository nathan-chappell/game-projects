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
  for (let line = 0; line < 5; line++) await confirmRoomDialogue(page);
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

test('Jackenstein at 1 HP reveals the lever, then reuses the Shine conversation and gift', async ({
  page,
}) => {
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
  for (let shine = 0; shine < 3; shine++) {
    await page.locator('#game').focus();
    await page.keyboard.press('1');
    await page.locator('#battleAct').click();
    await page.locator('#battleProceedButton').click();
    await frames(page, 2);
    await confirmRoomDialogue(page);
    for (let member = 0; member < 3; member++) await page.locator('#battleDefend').click();
    await page.locator('#game').focus();
    await page.keyboard.press('Shift');
  }
  await page.keyboard.press('4');
  for (let member = 0; member < 4; member++) {
    await page.locator('#battleAttack').click();
    await page.locator('#battleTargetButton').click();
  }
  await frames(page, 2);
  await expect(page.locator('#speakerName')).toHaveText('Susie');
  await page.keyboard.press('Enter');
  await expect(page.locator('#dialogueText')).toContainText("There's a lever!");
  await page.keyboard.press('l');
  await expect(page.locator('#speakerName')).toHaveText('Susie');
  await page.keyboard.press('Enter');
  await frames(page, 2);
  await expect(page.locator('#bossControls')).not.toBeVisible();
  await expect(page.locator('#speakerName')).toHaveText('Jackenstein');
  await page.keyboard.press('Enter');
  await expect(page.locator('#dialogueText')).toContainText('NOT THE LAAAIght... Oh! You guys!');
  for (let press = 0; press < 16 && (await page.locator('#dialogue').isVisible()); press++) {
    await page.keyboard.press('Enter');
  }
  await frames(page, 2);
  await expect(page.locator('#dialogue')).not.toBeVisible();
  await expect(page.locator('#inventorySummary')).toContainText('Jack.Candy × 1');
});

test('Tenna’s paired saxophone paths replace each other and finish after five waves', async ({
  page,
}, testInfo) => {
  await controlFrames(page);
  await seedProgress(page, 'glitchBackstage', {}, { x: 340, y: 340, facing: 'up' });
  await page.goto('/');
  await frames(page, 1);
  await page.locator('#talkButton').click();
  for (let line = 0; line < 5; line++) await confirmRoomDialogue(page);
  await frames(page, 2);
  for (let member = 0; member < 4; member++) await page.locator('#battleDefend').click();
  await frames(page, 2);
  await confirmRoomDialogue(page);
  await page.locator('#game').focus();
  await page.keyboard.press('2');
  await frames(page, 90);
  await expect(page.locator('#battleSoulControls')).toBeVisible();
  await page.locator('#game').screenshot({ path: testInfo.outputPath('paired-paths-wave-one.png') });
  await frames(page, 90);
  await page.locator('#game').screenshot({ path: testInfo.outputPath('paired-paths-wave-two-preview.png') });
  await frames(page, 66);
  await page.locator('#game').screenshot({ path: testInfo.outputPath('paired-paths-wave-two-notes.png') });
  await frames(page, 10 * 60);
  await expect(page.locator('#battleSoulControls')).not.toBeVisible();
  await expect(page.locator('#battleAttack')).toBeEnabled();
  await expect(page.locator('#battleTurnText')).toHaveText('Kris’s turn');
});

test('Tenna stops the glitching on the studio battlefield before the first turn', async ({
  page,
}, testInfo) => {
  await controlFrames(page);
  await seedProgress(page, 'glitchBackstage', {}, { x: 340, y: 340, facing: 'up' });
  await page.goto('/');
  await frames(page, 1);
  await page.locator('#talkButton').click();
  for (let line = 0; line < 4; line++) await confirmRoomDialogue(page);
  await frames(page, 2);
  await expect(page.locator('#battleAttack')).toBeDisabled();
  await expect(page.locator('#speakerName')).toHaveText('Tenna');
  await page.keyboard.press('Enter');
  await expect(page.locator('#dialogueText')).toHaveText('* Mike! Stop the glitching!!');
  await page.keyboard.press('l');
  await expect(page.locator('#dialogue')).toBeVisible();
  await page.keyboard.press('Enter');
  await frames(page, 2);
  await expect(page.locator('#battleAttack')).toBeEnabled();
  await expect(page.locator('#battleTurnText')).toHaveText('Kris’s turn');
  await page.locator('#game').screenshot({ path: testInfo.outputPath('studio-battlefield.png') });
  const bounds = await page.locator('#game').boundingBox();
  if (!bounds) throw new Error('Missing game canvas');
  const clip = {
    x: bounds.x + (bounds.width * 240) / 640,
    y: bounds.y + (bounds.height * 15) / 480,
    width: (bounds.width * 160) / 640,
    height: (bounds.height * 90) / 480,
  };
  const scoreboard = await page.screenshot({ clip });
  await frames(page, 120);
  const later = await page.screenshot({ clip });
  expect(later).toEqual(scoreboard);
});
