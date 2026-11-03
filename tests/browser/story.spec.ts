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

test('Tenna’s second attack moves a TV above the box and fires glitch bursts', async ({ page }, testInfo) => {
  await controlFrames(page);
  await seedProgress(page, 'glitchBackstage', {}, { x: 340, y: 340, facing: 'up' });
  await page.goto('/');
  await frames(page, 1);
  await page.locator('#talkButton').click();
  for (let line = 0; line < 5; line++) await confirmRoomDialogue(page);
  for (let member = 0; member < 4; member++) await page.locator('#battleDefend').click();
  await frames(page, 2);
  await confirmRoomDialogue(page);
  await page.locator('#game').focus();
  await page.keyboard.press('Shift');
  for (let member = 0; member < 4; member++) await page.locator('#battleDefend').click();
  await frames(page, 2);
  await expect(page.locator('#battleSnowText')).toContainText('TV bolts');
  await page.locator('#game').focus();
  await page.keyboard.press('2');
  await frames(page, 158);
  await page.locator('#game').screenshot({ path: testInfo.outputPath('tv-glitch-warning.png') });
  await frames(page, 26);
  await page.locator('#game').screenshot({ path: testInfo.outputPath('tv-five-bolt-burst.png') });
  await frames(page, 12 * 60);
  await expect(page.locator('#battleAttack')).toBeEnabled();
  await expect(page.locator('#battleTurnText')).toHaveText('Kris’s turn');
});

test('Susie and Ralsey show their own downed poses and revive through the inventory', async ({
  page,
}, testInfo) => {
  await controlFrames(page);
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await seedProgress(page, 'glitchBackstage', {}, { x: 340, y: 340, facing: 'up' }, { gCandy: 2 });
  await page.addInitScript(async () => {
    const key = 'little-lantern-save-slots-v1';
    const slots = JSON.parse(localStorage.getItem(key) ?? '[]');
    slots[0].partyHP.Susie = 0;
    slots[0].partyHP.Ralsey = 0;
    localStorage.setItem(key, JSON.stringify(slots));
  });
  await page.goto('/');
  await frames(page, 1);
  await page.locator('#talkButton').click();
  for (let line = 0; line < 5; line++) await confirmRoomDialogue(page);
  await frames(page, 12);
  await page.locator('#game').screenshot({ path: testInfo.outputPath('susie-ralsey-collapsing.png') });
  await frames(page, 48);
  await page.locator('.stage').screenshot({ path: testInfo.outputPath('susie-ralsey-downed.png') });
  await expect(page.locator('#battleAttack')).toBeEnabled();
  await page.locator('#battleItem').click();
  await page.getByRole('button', { name: 'G. Candy × 2', exact: true }).click();
  await page.locator('#candyTarget').selectOption('Susie');
  await page.locator('#useCandyButton').click();
  await frames(page, 45);
  await page.locator('#battleItem').click();
  await page.getByRole('button', { name: 'G. Candy × 1', exact: true }).click();
  await page.locator('#candyTarget').selectOption('Ralsey');
  await page.locator('#useCandyButton').click();
  await frames(page, 45);
  await page.locator('#game').screenshot({ path: testInfo.outputPath('susie-ralsey-revived.png') });
});

test('Kris Minigame ACT plays the gallery, pays points and applies X penalties only after the round', async ({
  page,
}, testInfo) => {
  await controlFrames(page);
  await seedProgress(page, 'glitchBackstage', {}, { x: 340, y: 340, facing: 'up' });
  await page.goto('/');
  await frames(page, 1);
  await page.locator('#talkButton').click();
  for (let line = 0; line < 5; line++) await confirmRoomDialogue(page);
  await page.locator('#battleAct').click();
  await expect(page.locator('#battleProceedButton')).toHaveText('Minigame');
  await page.locator('#battleProceedButton').click();
  await frames(page, 2);
  await expect(page.locator('#speakerName')).toHaveText('Tenna');
  await page.keyboard.press('Enter');
  await expect(page.locator('#dialogueText')).toContainText(
    '1500 Points and i give up! Or else you work for ME!',
  );
  await page.keyboard.press('l');
  await expect(page.locator('#dialogue')).toBeVisible();
  await page.keyboard.press('Enter');
  await expect(page.locator('#battleMinigameControls')).toBeVisible();
  await expect(page.locator('#inventoryButton')).toBeDisabled();
  await page.keyboard.press('o');
  await expect(page.locator('#inventoryDialog')).not.toBeVisible();
  let stepped = 0;
  for (let target = 0; target < 12; target++) {
    const frame = Math.round((0.95 + target * 1.1) * 60);
    await frames(page, frame - stepped);
    stepped = frame;
    if (target === 0) {
      await page.locator('#game').focus();
      await page.keyboard.press('ArrowUp');
      await page.keyboard.press('ArrowRight');
      await page.keyboard.press('Space');
    } else if (target === 1)
      continue; // Let this enemy shoot: one X.
    else if (target === 2 || target % 4 !== 2) {
      // Shoot Flowey once; leave the later Floweys alone.
      if (target === 2) {
        await page
          .locator('#game')
          .screenshot({ path: testInfo.outputPath('shooting-gallery-flowey-target.png') });
        const box = await page.locator('#game').boundingBox();
        if (!box) throw new Error('Missing canvas');
        await page.screenshot({
          path: testInfo.outputPath('cowboy-flowey.png'),
          clip: {
            x: box.x + (480 * box.width) / 640,
            y: box.y + (60 * box.height) / 480,
            width: (100 * box.width) / 640,
            height: (105 * box.height) / 480,
          },
        });
      }
      const p = target % 2 === 0 ? { x: 530, y: 112 } : { x: 318, y: 207 };
      const bounds = await page.locator('#game').boundingBox();
      if (!bounds) throw new Error('Missing canvas');
      await page.mouse.click(bounds.x + (p.x * bounds.width) / 640, bounds.y + (p.y * bounds.height) / 480);
    }
    if (target === 3) {
      await expect(page.locator('#battleMinigameStatus')).toContainText('Misses: 2');
      await expect(page.locator('#battleMinigameStatus')).toContainText('Round points: 80');
      await frames(page, 1);
      stepped++;
      await page.locator('#game').screenshot({ path: testInfo.outputPath('shooting-gallery-two-xs.png') });
    }
  }
  await frames(page, 100);
  await expect(page.locator('#battleMinigameControls')).not.toBeVisible();
  await expect(page.locator('#battleTurnText')).toHaveText('Flowey’s turn');
  await expect(page.locator('#battleFeedback')).toContainText('+80 points');
  await expect(page.locator('#battleFeedback')).toContainText('Flowey lost 20 HP');
  await expect(page.locator('#battleFeedback')).toContainText('Susie lost 20 HP');
  await page.locator('#inventoryButton').click();
  await expect(page.getByText('Susie · HP: 80 / 100', { exact: true })).toBeVisible();
  await page.locator('#closeInventoryButton').click();
  for (let member = 0; member < 3; member++) await page.locator('#battleDefend').click();
  await frames(page, 2);
  await confirmRoomDialogue(page);
  await page.locator('#game').focus();
  await page.keyboard.press('Shift');
  await page.locator('#battleAct').click();
  await page.locator('#battleProceedButton').click();
  await frames(page, 2);
  await expect(page.locator('#dialogue')).not.toBeVisible();
  await expect(page.locator('#battleMinigameControls')).toBeVisible();
  await expect(page.locator('#battleMinigameStatus')).toContainText('Surfers');
  await expect(page.locator('#battleMinigameStatus')).toContainText('Round points: 0');
  await frames(page, 1);
  await page.locator('#game').screenshot({ path: testInfo.outputPath('shooting-gallery-fresh-round.png') });
});

test('Tenna cuts every party attack and heals to full before the next turn', async ({ page }, testInfo) => {
  await controlFrames(page);
  await seedProgress(page, 'glitchBackstage', {}, { x: 340, y: 340, facing: 'up' });
  await page.goto('/');
  await frames(page, 1);
  await page.locator('#talkButton').click();
  for (let line = 0; line < 5; line++) await confirmRoomDialogue(page);
  for (const name of ['Kris', 'Flowey', 'Susie', 'Ralsey']) {
    await expect(page.locator('#battleTurnText')).toHaveText(`${name}’s turn`);
    await page.locator('#battleAttack').click();
    await page.locator('#battleTargetButton').click();
    await frames(page, 2);
    await expect(page.locator('#speakerName')).toHaveText('Tenna');
    await expect(page.locator('#battleAttack')).toBeDisabled();
    await page.keyboard.press('Enter');
    await expect(page.locator('#dialogueText')).toHaveText('* We cant have That Violence in TV, Mike, cut!');
    await page.keyboard.press('l');
    await expect(page.locator('#dialogue')).toBeVisible();
    await page.keyboard.press('Enter');
    await expect(page.locator('#battleFeedback')).toContainText('Tenna restores all his HP!');
    if (name !== 'Ralsey') {
      await page.locator('#battleAttack').click();
      await expect(page.locator('#battleTargetButton')).toHaveText('Tenna · HP 4000 / 4000');
      await page.locator('#battleMenuBack').click();
    }
  }
  await frames(page, 2);
  await expect(page.locator('#speakerName')).toHaveText('Tenna');
  await page.keyboard.press('Enter');
  await expect(page.locator('#dialogueText')).toContainText('Hey Minions- i mean Helpers, attack!');
  await page.locator('#game').screenshot({ path: testInfo.outputPath('tenna-restored-after-attacks.png') });
});

test('second minigame is fifteen-second Surfers with jumps, coins and one Flowey reward', async ({
  page,
}, testInfo) => {
  await controlFrames(page);
  await seedProgress(page, 'glitchBackstage', {}, { x: 340, y: 340, facing: 'up' });
  await page.goto('/');
  await frames(page, 1);
  await page.locator('#talkButton').click();
  for (let i = 0; i < 5; i++) await confirmRoomDialogue(page);
  await page.locator('#battleAct').click();
  await page.locator('#battleProceedButton').click();
  await frames(page, 2);
  await confirmRoomDialogue(page);
  await page.locator('#game').focus();
  await page.keyboard.press('Shift');
  for (let i = 0; i < 3; i++) await page.locator('#battleDefend').click();
  await frames(page, 2);
  await confirmRoomDialogue(page);
  await page.locator('#game').focus();
  await page.keyboard.press('Shift');
  await page.locator('#battleAct').click();
  await expect(page.locator('#battleProceedCount')).toContainText('Surfers');
  await page.locator('#battleProceedButton').click();
  await expect(page.locator('#dialogue')).not.toBeVisible();
  await expect(page.locator('#battleTurnText')).toHaveText('Surfers');
  await expect(page.locator('#battleMinigameShoot')).toHaveText('Jump · Space / ↑');
  let stepped = 0;
  const events = [
    ...Array.from({ length: 13 }, (_, i) => i)
      .filter((i) => i < 5 || i > 8)
      .map((i) => ({ time: 1.17 + i * 1.05, platform: false })),
    { time: 6.3, platform: false },
    { time: 7.15, platform: false },
    { time: 8.05, platform: true },
  ].sort((a, b) => a.time - b.time);
  for (const [index, event] of events.entries()) {
    const jumpFrame = Math.ceil(event.time * 60);
    await frames(page, jumpFrame - stepped);
    stepped = jumpFrame;
    if (index === 0) await page.locator('#battleMinigameShoot').click();
    else {
      await page.locator('#game').focus();
      await page.keyboard.press(index % 2 ? 'ArrowUp' : 'Space');
    }
    if (event.time === 7.15) {
      await frames(page, 15);
      stepped += 15;
      await page.locator('#game').screenshot({ path: testInfo.outputPath('surfers-stepped-route.png') });
    }
    if (event.platform) {
      await frames(page, 48);
      stepped += 48;
      await expect(page.locator('#battleMinigameStatus')).toContainText('Purple coin: collected');
      await page.locator('#game').screenshot({ path: testInfo.outputPath('surfers-flowey-purple-coin.png') });
    }
  }
  await frames(page, 894 - stepped);
  await expect(page.locator('#battleMinigameControls')).toBeVisible();
  await expect(page.locator('#battleMinigameStatus')).toContainText('Crashes: 0');
  await frames(page, 10);
  await expect(page.locator('#battleMinigameControls')).not.toBeVisible();
  await expect(page.locator('#battleTurnText')).toHaveText('Flowey’s turn');
  await expect(page.locator('#battleFeedback')).toContainText('points.');
  await page.locator('#inventoryButton').click();
  await expect(page.getByText('Kris · HP: 100 / 100', { exact: true })).toBeVisible();
});

test('third minigame lets Susie throw hammers at incoming TVs and dodge lanes', async ({
  page,
}, testInfo) => {
  await controlFrames(page);
  await seedProgress(page, 'glitchBackstage', {}, { x: 340, y: 340, facing: 'up' });
  await page.goto('/');
  await frames(page, 1);
  await page.locator('#talkButton').click();
  for (let i = 0; i < 5; i++) await confirmRoomDialogue(page);
  for (let round = 0; round < 2; round++) {
    await page.locator('#battleAct').click();
    await page.locator('#battleProceedButton').click();
    if (round === 0) {
      await frames(page, 2);
      await confirmRoomDialogue(page);
    }
    await page.locator('#game').focus();
    await page.keyboard.press('Shift');
    for (let i = 0; i < 3; i++) await page.locator('#battleDefend').click();
    await frames(page, 2);
    if (round === 0) await confirmRoomDialogue(page);
    await page.locator('#game').focus();
    await page.keyboard.press('Shift');
  }
  await page.locator('#battleAct').click();
  await expect(page.locator('#battleProceedCount')).toContainText('Hammer Time');
  await page.locator('#battleProceedButton').click();
  await expect(page.locator('#battleTurnText')).toHaveText('Hammer Time');
  await frames(page, 90);
  await page.locator('#battleMinigameShoot').click();
  await frames(page, 60);
  await expect(page.locator('#battleMinigameStatus')).toContainText('Round points: 5');
  await page.locator('#game').screenshot({ path: testInfo.outputPath('hammer-time.png') });
  await page.locator('#game').focus();
  await page.keyboard.press('ArrowUp');
  await frames(page, 750);
  await expect(page.locator('#battleMinigameControls')).not.toBeVisible();
  await expect(page.locator('#battleTurnText')).toHaveText('Flowey’s turn');
});
