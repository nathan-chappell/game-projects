import { installBattleFixture, prepareBattle, finishAttackFixture } from './battle-fixture.ts';
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
  await installBattleFixture(page);
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
    await prepareBattle(page, { tp: 100 });
    await page.locator('#battleAct').click();
    await page.locator('#battleProceedButton').click();
    await frames(page, 2);
    if (shine === 5) break;
    await confirmRoomDialogue(page);
    if (shine === 3) await expect(page.locator('#battleAttack')).toBeEnabled();
    for (let member = 0; member < 3; member++) await page.locator('#battleDefend').click();
    await page.locator('#game').focus();
    await finishAttackFixture(page);
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
  await installBattleFixture(page);
  await seedProgress(page, 'glitchBoss', { noelleGone: false, noelleEscaped: false });
  await page.goto('/');
  await frames(page, 2);
  await page.locator('#proceedBossButton').click();
  await confirmRoomDialogue(page);
  await confirmRoomDialogue(page);
  await page.locator('#game').focus();
  await prepareBattle(page, { enemyHP: 75 });
  const attack = async () => {
    await page.locator('#battleAttack').click();
    await page.locator('#battleTargetButton').click();
  };
  await attack();
  await frames(page, 30);
  await expect(page.locator('#battleSnowText')).toContainText('Snowgrave');
  await page.locator('#game').focus();
  await finishAttackFixture(page);
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
  await installBattleFixture(page);
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
    await prepareBattle(page, { tp: 100 });
    await page.locator('#battleAct').click();
    await page.locator('#battleProceedButton').click();
    await frames(page, 2);
    await confirmRoomDialogue(page);
    for (let member = 0; member < 3; member++) await page.locator('#battleDefend').click();
    await page.locator('#game').focus();
    await finishAttackFixture(page);
  }
  await prepareBattle(page, { enemyHP: 75 });
  await page.locator('#battleAttack').click();
  await page.locator('#battleTargetButton').click();
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
  await page.keyboard.press('i');
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
  await page.keyboard.press('i');
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

test('third minigame keeps Susie stationary while mouse and arrows aim hammers', async ({
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
  const bounds = (await page.locator('#game').boundingBox())!;
  await page.mouse.click(bounds.x + (262 / 640) * bounds.width, bounds.y + (260 / 480) * bounds.height);
  await frames(page, 12);
  await expect(page.locator('#battleMinigameStatus')).toContainText('Round points: 10');
  await page.locator('#game').focus();
  await page.keyboard.down('ArrowUp');
  await page.keyboard.down('ArrowRight');
  await frames(page, 24);
  await page.keyboard.up('ArrowUp');
  await page.keyboard.up('ArrowRight');
  await page.keyboard.press('z');
  await frames(page, 2);
  await page.locator('#game').screenshot({ path: testInfo.outputPath('hammer-keyboard-aim.png') });
  await page.keyboard.press('i');
  const crosshairX = () =>
    page.locator('#game').evaluate((canvas) => {
      const pixels = (canvas as HTMLCanvasElement).getContext('2d')!.getImageData(0, 0, 640, 480).data;
      let total = 0,
        count = 0;
      for (let y = 120; y < 400; y++)
        for (let x = 0; x < 640; x++) {
          const i = (y * 640 + x) * 4;
          if (pixels[i] === 255 && pixels[i + 1] === 70 && pixels[i + 2] === 92) {
            total += x;
            count++;
          }
        }
      if (!count) throw new Error('Red crosshair missing');
      return total / count;
    });
  for (const [left, right] of [
    ['ArrowLeft', 'ArrowRight'],
    ['a', 'd'],
  ]) {
    const before = await crosshairX();
    await page.keyboard.down(left);
    await frames(page, 12);
    await page.keyboard.up(left);
    const afterLeft = await crosshairX();
    expect(afterLeft).toBeLessThan(before - 50);
    await page.keyboard.down(right);
    await frames(page, 12);
    await page.keyboard.up(right);
    expect(await crosshairX()).toBeGreaterThan(afterLeft + 50);
  }
  const aimBounds = (await page.locator('#game').boundingBox())!;
  await page.mouse.move(
    aimBounds.x + (500 / 640) * aimBounds.width,
    aimBounds.y + (120 / 480) * aimBounds.height,
  );
  const hammerPixels = () =>
    page.locator('#game').evaluate((canvas) => {
      const pixels = (canvas as HTMLCanvasElement).getContext('2d')!.getImageData(0, 0, 640, 408).data;
      let count = 0;
      for (let i = 0; i < pixels.length; i += 4)
        if (pixels[i] === 225 && pixels[i + 1] === 219 && pixels[i + 2] === 238) count++;
      return count;
    });
  for (const key of ['z', ' ']) {
    await page.keyboard.down(key);
    await frames(page, 30);
    expect(await hammerPixels()).toBeGreaterThan(250);
    await page.keyboard.up(key);
    await frames(page, 60);
    expect(await hammerPixels()).toBe(0);
  }
  await frames(page, 750);
  await expect(page.locator('#battleMinigameControls')).not.toBeVisible();
  await expect(page.locator('#battleTurnText')).toHaveText('Flowey’s turn');
});

test('Tenna score milestones introduce Undyne, restore normal attacks, and glitch only the TV head', async ({
  page,
}, testInfo) => {
  await controlFrames(page);
  await installBattleFixture(page);
  await seedProgress(page, 'glitchBackstage', {}, { x: 340, y: 340, facing: 'up' });
  await page.goto('/');
  await frames(page, 1);
  await page.locator('#talkButton').click();
  for (let line = 0; line < 5; line++) await confirmRoomDialogue(page);
  await page.locator('#game').focus();
  await page.keyboard.press('3');
  expect(await page.evaluate(() => window.battleFixtureState.bossEncounter!.score)).toBe(200);
  await page.keyboard.press('2');
  await frames(page, 2);
  await expect(page.locator('#speakerName')).toHaveText('Tenna');
  await page.keyboard.press('Enter');
  await expect(page.locator('#dialogueText')).toContainText('Lets bring a New Contestant!');
  await page.keyboard.press('Enter');
  await confirmRoomDialogue(page);
  await frames(page, 2);
  expect(
    await page.evaluate(() => ({
      score: window.battleFixtureState.bossEncounter!.score,
      joined: window.battleFixtureState.bossEncounter!.undyneJoined,
      tp: window.battleFixtureState.bossEncounter!.tp,
      invincible: window.battleFixtureState.bossEncounter!.invincible,
    })),
  ).toEqual({ score: 700, joined: true, tp: 0, invincible: false });
  await frames(page, 30);
  await page.locator('#game').screenshot({ path: testInfo.outputPath('undyne-dropping-in.png') });
  await frames(page, 48);
  await page.locator('#game').screenshot({ path: testInfo.outputPath('undyne-and-full-size-tenna.png') });
  for (let member = 0; member < 4; member++) await page.locator('#battleDefend').click();
  await expect(page.locator('#battleSnowText')).toContainText('Spear of Justice');
  await page.locator('#game').focus();
  await page.keyboard.press('i');
  const soul = await page.evaluate(() => ({ ...window.battleFixtureState.bossEncounter!.soul }));
  await page.keyboard.down('ArrowRight');
  await frames(page, 113);
  await page.keyboard.up('ArrowRight');
  expect(await page.evaluate(() => window.battleFixtureState.bossEncounter!.soul)).toEqual(soul);
  await page.locator('#game').screenshot({ path: testInfo.outputPath('undyne-spear-of-justice.png') });
  expect(
    await page.locator('#game').evaluate((canvas) => {
      const ctx = (canvas as HTMLCanvasElement).getContext('2d')!;
      return [
        [100, 100],
        [550, 100],
        [100, 400],
        [550, 400],
      ].map(([x, y]) => Array.from(ctx.getImageData(x, y, 1, 1).data));
    }),
  ).toEqual(Array.from({ length: 4 }, () => [16, 17, 24, 255]));

  await expect(page.locator('#battleMovementHint')).toContainText('Yellow spears swing around');
  const bounds = await page.evaluate(() => {
    const b = window.battleFixtureState.bossEncounter!;
    return { age: b.snowAttack!.undyne!.age, joined: b.undyneEntranceAge };
  });
  expect(bounds.age).toBeGreaterThan(0.95);
  expect(bounds.joined).toBe(1.2);
  await frames(page, 76);
  expect(
    await page.locator('#game').evaluate((canvas) => {
      const data = (canvas as HTMLCanvasElement).getContext('2d')!.getImageData(0, 0, 640, 300).data;
      let yellow = 0;
      for (let i = 0; i < data.length; i += 4)
        if (data[i] === 255 && data[i + 1] === 224 && data[i + 2] === 69) yellow++;
      return yellow;
    }),
  ).toBeGreaterThan(0);
  await page.locator('#game').screenshot({ path: testInfo.outputPath('undyne-yellow-spear.png') });

  await page.keyboard.press('3');
  await expect(page.locator('#battleSoulControls')).toBeVisible();
  await page.keyboard.press('Shift');
  await frames(page, 2);
  await expect(page.locator('#dialogue')).toBeVisible();
  await confirmRoomDialogue(page);
  await frames(page, 2);
  expect(await page.evaluate(() => window.battleFixtureState.bossEncounter!.undyneLeft)).toBe(true);
  for (let member = 0; member < 4; member++) await page.locator('#battleDefend').click();
  await frames(page, 2);
  await confirmRoomDialogue(page);
  await expect(page.locator('#battleSnowText')).toContainText('saxophone');
  await page.keyboard.press('Shift');
  await page.keyboard.press('2');
  await frames(page, 2);
  expect(await page.evaluate(() => window.battleFixtureState.bossEncounter!.tennaHeadGlitch)).toBe(true);
  await expect(page.locator('#battleAct')).toBeEnabled();
  await page.locator('#game').screenshot({ path: testInfo.outputPath('tenna-glitching-head.png') });
  const staticPixels = await page.locator('#game').evaluate((canvas) => {
    const data = (canvas as HTMLCanvasElement).getContext('2d')!.getImageData(490, 78, 22, 16).data;
    let grey = 0;
    const shades = new Set<number>();
    for (let i = 0; i < data.length; i += 4)
      if (data[i] === data[i + 1] && data[i + 1] === data[i + 2]) {
        grey++;
        shades.add(data[i]);
      }
    return { grey, shades: shades.size };
  });
  expect(staticPixels.grey).toBeGreaterThan(22 * 16 * 0.95);
  expect(staticPixels.shades).toBeGreaterThan(30);
  const staticHash = () =>
    page.locator('#game').evaluate((canvas) => {
      const data = (canvas as HTMLCanvasElement).getContext('2d')!.getImageData(490, 78, 22, 16).data;
      return data.reduce((hash, value) => (hash * 33 + value) >>> 0, 5381);
    });
  const still = await staticHash();
  await frames(page, 12);
  expect(await staticHash()).toBe(still);
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await frames(page, 12);
  expect(await staticHash()).not.toBe(still);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await frames(page, 1);
  await page.keyboard.press('3');
  await frames(page, 2);
  await expect(page.locator('#battleAct')).toBeDisabled();
  expect(await page.evaluate(() => window.battleFixtureState.bossEncounter!.phase)).toBe(
    'tennaFinaleOutburst',
  );
});

test('Tenna score keys work during dialogue and attack introductions with number-row and numpad layouts', async ({
  page,
}) => {
  await controlFrames(page);
  await installBattleFixture(page);
  await seedProgress(page, 'glitchBackstage', {}, { x: 340, y: 340, facing: 'up' });
  await page.goto('/');
  await frames(page, 1);
  await page.locator('#talkButton').click();
  for (let line = 0; line < 5; line++) await confirmRoomDialogue(page);
  await page.locator('#game').focus();
  await page.keyboard.press('3');
  expect(await page.evaluate(() => window.battleFixtureState.bossEncounter!.score)).toBe(200);
  for (let member = 0; member < 4; member++) await page.locator('#battleDefend').click();
  // Physical Digit2 must work even when the keyboard layout supplies a symbol.
  await page.evaluate(() =>
    document.dispatchEvent(new KeyboardEvent('keydown', { key: '"', code: 'Digit2', bubbles: true })),
  );
  expect(await page.evaluate(() => window.battleFixtureState.bossEncounter!.score)).toBe(700);
  await frames(page, 2);
  await expect(page.locator('#dialogue')).toBeVisible();
  await page.keyboard.press('Numpad2');
  expect(await page.evaluate(() => window.battleFixtureState.bossEncounter!.score)).toBe(1200);
  await page.keyboard.press('Numpad3');
  expect(await page.evaluate(() => window.battleFixtureState.bossEncounter!.score)).toBe(1400);
  await page.evaluate(() =>
    document.dispatchEvent(
      new KeyboardEvent('keydown', { key: '2', code: 'Digit2', repeat: true, bubbles: true }),
    ),
  );
  expect(
    await page.evaluate(() => ({
      score: window.battleFixtureState.bossEncounter!.score,
      invincible: window.battleFixtureState.bossEncounter!.invincible,
      tp: window.battleFixtureState.bossEncounter!.tp,
    })),
  ).toEqual({ score: 1400, invincible: false, tp: 40 });
  await expect(page.locator('#dialogue')).toBeVisible();
});

test('Undyne uses the reference sprite, blocks menu options, awards attack points, and receives G. Candy', async ({
  page,
}, testInfo) => {
  await controlFrames(page);
  await installBattleFixture(page);
  await seedProgress(page, 'glitchBackstage', {}, { x: 340, y: 340, facing: 'up' });
  await page.goto('/');
  await frames(page, 1);
  await page.locator('#talkButton').click();
  for (let line = 0; line < 5; line++) await confirmRoomDialogue(page);
  await page.locator('#game').focus();
  await page.keyboard.press('2');
  await frames(page, 2);
  await confirmRoomDialogue(page);
  await confirmRoomDialogue(page);
  await frames(page, 80);
  await expect(page.locator('#battleSpare')).toHaveText('Spare');
  await page.locator('#battleAttack').click();
  await expect(page.locator('#battleTargetButton')).toContainText('Undyne · HP 3500 / 3500');
  await page.locator('#battleMenuBack').click();
  await page.locator('#battleSpare').click();
  await frames(page, 24);
  expect(await page.evaluate(() => window.battleFixtureState.bossEncounter!.undyneMenuSpear?.target)).toBe(
    'spare',
  );
  await page.locator('#game').screenshot({ path: testInfo.outputPath('undyne-spears-spare.png') });
  await page.locator('#battleAct').click();
  await frames(page, 24);
  expect(
    await page.evaluate(() => ({
      phase: window.battleFixtureState.bossEncounter!.phase,
      shot: window.battleFixtureState.bossEncounter!.undyneMenuSpear?.target,
      score: window.battleFixtureState.bossEncounter!.score,
    })),
  ).toEqual({ phase: 'kris', shot: 'act', score: 500 });
  await expect(page.locator('#battleMinigameControls')).toBeHidden();
  await page.locator('#game').screenshot({ path: testInfo.outputPath('undyne-spears-act.png') });
  await page.locator('#battleAttack').click();
  await page.locator('#battleTargetButton').click();
  expect(
    await page.evaluate(() => ({
      hp: window.battleFixtureState.bossEncounter!.enemy.hp,
      score: window.battleFixtureState.bossEncounter!.score,
    })),
  ).toEqual({ hp: 3425, score: 510 });
  const candy = await page.evaluate(() => window.battleFixtureState.inventory.items.gCandy);
  await prepareBattle(page, { enemyHP: 1 });
  await page.locator('#battleAttack').click();
  await page.locator('#battleTargetButton').click();
  await frames(page, 2);
  await expect(page.locator('#speakerName')).toHaveText('Tenna');
  await page.keyboard.press('Enter');
  await expect(page.locator('#dialogueText')).toContainText('G. Candy');
  await page.keyboard.press('Enter');
  await frames(page, 2);
  expect(
    await page.evaluate(() => ({
      hp: window.battleFixtureState.bossEncounter!.enemy.hp,
      phase: window.battleFixtureState.bossEncounter!.phase,
      score: window.battleFixtureState.bossEncounter!.score,
      candy: window.battleFixtureState.inventory.items.gCandy,
    })),
  ).toEqual({ hp: 3500, phase: 'susie', score: 520, candy });
  await page.evaluate(() => {
    window.battleFixtureState.bossEncounter!.score = 650;
    window.refreshBattleFixture();
  });
  await page.locator('#battleAttack').click();
  await page.locator('#battleTargetButton').click();
  await frames(page, 10);
  expect(await page.evaluate(() => window.battleFixtureState.bossEncounter!.undyneGlitched)).toBe(true);
  await page.locator('#game').screenshot({ path: testInfo.outputPath('undyne-glitch-and-hp.png') });
  await page.evaluate(() => {
    window.battleFixtureState.bossEncounter!.score = 740;
    window.refreshBattleFixture();
  });
  await page.locator('#battleAttack').click();
  await page.locator('#battleTargetButton').click();
  await frames(page, 2);
  await confirmRoomDialogue(page);
  await frames(page, 2);
  expect(await page.evaluate(() => window.battleFixtureState.bossEncounter!.enemy)).toEqual({
    name: 'Tenna',
    hp: 4000,
    maxHP: 4000,
    visible: true,
  });
  await expect(page.locator('#battleSpare')).toHaveText('TV TIME!');
});

test('1500 earned points end Tenna’s show and return the party backstage for Undyne dialogue', async ({
  page,
}, testInfo) => {
  await controlFrames(page);
  await installBattleFixture(page);
  await seedProgress(page, 'glitchBackstage', {}, { x: 340, y: 340, facing: 'up' });
  await page.goto('/');
  await frames(page, 1);
  await page.locator('#talkButton').click();
  for (let line = 0; line < 5; line++) await confirmRoomDialogue(page);
  const before = await page.evaluate(() => ({
    hp: { ...window.battleFixtureState.partyHP },
    inventory: structuredClone(window.battleFixtureState.inventory),
  }));
  await page.evaluate(() => {
    const b = window.battleFixtureState.bossEncounter!;
    b.score = 1400;
    b.undyneJoined = b.undyneLeft = true;
    b.minigameIntroSeen = true;
    window.refreshBattleFixture();
  });
  await page.locator('#battleAct').click();
  await page.locator('#battleProceedButton').click();
  await expect(page.locator('#battleMinigameControls')).toBeVisible();
  await page.locator('#game').focus();
  await page.keyboard.press('Shift');
  await frames(page, 2);
  expect(await page.evaluate(() => window.battleFixtureState.bossEncounter!.score)).toBe(1500);
  await page.keyboard.press('Enter');
  await expect(page.locator('#dialogueText')).toContainText('No-No!! THis Is not the Part of the SHOW!! NO!');
  await page.keyboard.press('l');
  await expect(page.locator('#dialogue')).toBeVisible();
  await page.keyboard.press('Enter');
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await frames(page, 55);
  expect(await page.evaluate(() => window.battleFixtureState.bossEncounter!.phase)).toBe('tennaFinaleGlitch');
  await page.locator('#game').screenshot({ path: testInfo.outputPath('tenna-glitching-away.png') });
  await expect(page.locator('#battleAct')).toBeDisabled();
  await expect(page.locator('#leaveBossButton')).toBeDisabled();
  await page.keyboard.press('o');
  await expect(page.locator('#inventoryDialog')).toBeHidden();
  await page.keyboard.press('Shift');
  await page.keyboard.press('3');
  expect(await page.evaluate(() => window.battleFixtureState.bossEncounter!.score)).toBe(1500);
  await frames(page, 90);
  expect(await page.evaluate(() => window.battleFixtureState.bossEncounter!.enemy.visible)).toBe(false);
  await page.keyboard.press('Enter');
  await expect(page.locator('#dialogueText')).toContainText('Mike! Shut the show down!!');
  await page.locator('#game').screenshot({ path: testInfo.outputPath('tenna-vanished.png') });
  await page.keyboard.press('Enter');
  await frames(page, 2);
  await expect(page.locator('#bossControls')).toBeHidden();
  await expect(page.locator('#roomName')).toContainText('Backstage');
  await expect(page.locator('#speakerName')).toHaveText('Ralsey');
  expect(await page.evaluate(() => window.battleFixtureState.story.tennaFinaleComplete)).toBe(true);
  await confirmRoomDialogue(page);
  await page.keyboard.press('Enter');
  await expect(page.locator('#dialogueText')).toContainText('mysterious knight');
  await page.keyboard.press('Enter');
  await page.keyboard.press('Enter');
  await expect(page.locator('#speakerName')).toHaveText('Flowey');
  await expect(page.locator('#dialogueText')).toContainText('That was Undyne');
  for (let line = 0; line < 8 && (await page.locator('#dialogue').isVisible()); line++)
    await confirmRoomDialogue(page);
  await expect(page.locator('#dialogue')).toBeHidden();
  expect(
    await page.evaluate(() => ({
      hp: window.battleFixtureState.partyHP,
      inventory: window.battleFixtureState.inventory,
    })),
  ).toEqual(before);
  const x = await page.evaluate(() => window.battleFixtureState.player.x);
  await page.keyboard.down('ArrowRight');
  await frames(page, 10);
  await page.keyboard.up('ArrowRight');
  expect(await page.evaluate(() => window.battleFixtureState.player.x)).toBeGreaterThan(x);
  await frames(page, 120);
  await expect(page.locator('#bossControls')).toBeHidden();
});

test('completed Tenna saves restore backstage without restarting his Finale', async ({ page }) => {
  await controlFrames(page);
  await seedProgress(
    page,
    'glitchBackstage',
    { tennaFinaleComplete: true, tennaFinaleExplained: false },
    { x: 340, y: 340, facing: 'up' },
  );
  await page.goto('/');
  await frames(page, 120);
  await expect(page.locator('#bossControls')).toBeHidden();
  await expect(page.locator('#dialogue')).toBeHidden();
  await page.locator('#game').focus();
  await page.keyboard.press('Enter');
  await frames(page, 30);
  await expect(page.locator('#bossControls')).toBeHidden();
  await expect(page.locator('#speakerName')).not.toHaveText('Tenna');
});

test('the post-Finale backstage door unlocks a black passage and allows returning', async ({
  page,
}, testInfo) => {
  await controlFrames(page);
  await installBattleFixture(page);
  await seedProgress(page, 'glitchBackstage', { tennaFinaleComplete: false }, { x: 460, y: 260 });
  await page.goto('/');
  await frames(page, 60);
  await page.locator('#game').focus();
  await page.keyboard.down('ArrowUp');
  await frames(page, 40);
  await page.keyboard.up('ArrowUp');
  await expect(page.locator('#roomName')).toContainText('Backstage');
  expect(await page.evaluate(() => window.battleFixtureState.player.y)).toBeGreaterThanOrEqual(247);
  await page.evaluate(() => {
    window.battleFixtureState.story.tennaFinaleComplete = true;
  });
  await frames(page, 1);
  await page.locator('#game').screenshot({ path: testInfo.outputPath('backstage-new-door.png') });
  await page.keyboard.down('ArrowUp');
  await frames(page, 25);
  await page.keyboard.up('ArrowUp');
  await expect(page.locator('#roomName')).toHaveText('Beyond the Show');
  await frames(page, 60);
  await page.keyboard.down('ArrowDown');
  await frames(page, 200);
  await page.keyboard.up('ArrowDown');
  await page.keyboard.down('ArrowRight');
  await frames(page, 140);
  await page.keyboard.up('ArrowRight');
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await frames(page, 5);
  await page.locator('#game').screenshot({ path: testInfo.outputPath('beyond-the-show.png') });
  await page.keyboard.down('ArrowRight');
  await frames(page, 120);
  await page.keyboard.up('ArrowRight');
  expect(await page.evaluate(() => window.battleFixtureState.player.x)).toBeGreaterThan(550);
  await page.keyboard.down('ArrowLeft');
  await frames(page, 300);
  await page.keyboard.up('ArrowLeft');
  await page.keyboard.down('ArrowUp');
  await frames(page, 240);
  await page.keyboard.up('ArrowUp');
  await expect(page.locator('#roomName')).toContainText('Backstage');
  await frames(page, 120);
  await expect(page.locator('#bossControls')).toBeHidden();
  await expect(page.locator('#dialogue')).toBeHidden();
});

test('the third statue leads to the charge, two blocked Swoons and three-team introduction', async ({
  page,
}, testInfo) => {
  await controlFrames(page);
  await installBattleFixture(page);
  await seedProgress(
    page,
    'postShowPassage',
    { tennaFinaleComplete: true },
    { x: 60, y: 180, facing: 'down' },
  );
  await page.goto('/');
  await frames(page, 1);
  await page.locator('#game').focus();
  await page.keyboard.down('ArrowDown');
  await frames(page, 110);
  await page.keyboard.up('ArrowDown');
  await page.keyboard.down('ArrowRight');
  await frames(page, 430);
  await page.keyboard.up('ArrowRight');
  await expect(page.locator('#dialogue')).toBeHidden();
  expect(await page.evaluate(() => window.battleFixtureState.knightPath!.x)).toBeLessThan(1260);
  await page.keyboard.down('ArrowRight');
  await frames(page, 140);
  await page.keyboard.up('ArrowRight');
  await expect(page.locator('#dialogue')).toBeHidden();
  expect(await page.evaluate(() => window.battleFixtureState.knightPath!.x)).toBeGreaterThan(1260);
  expect(await page.evaluate(() => window.battleFixtureState.knightPath!.x)).toBeLessThan(1660);
  await page.keyboard.down('ArrowRight');
  await frames(page, 180);
  await page.keyboard.up('ArrowRight');
  await expect(page.locator('#speakerName')).toHaveText('Flowey');
  await page.keyboard.press('Enter');
  await expect(page.locator('#dialogueText')).toContainText('What are those statues?');
  await confirmRoomDialogue(page);
  await expect(page.locator('#speakerName')).toHaveText('Ralsey');
  await expect(page.locator('#dialogueText')).toContainText('Roaring Knight');
  await page.locator('#game').screenshot({ path: testInfo.outputPath('roaring-knight-statues.png') });
  for (let i = 0; i < 6 && (await page.locator('#dialogue').isVisible()); i++)
    await confirmRoomDialogue(page);
  expect(await page.evaluate(() => window.battleFixtureState.story.knightStatuesExplained)).toBe(true);
  const before = await page.evaluate(() => ({
    hp: structuredClone(window.battleFixtureState.partyHP),
    items: structuredClone(window.battleFixtureState.inventory),
  }));
  await page.keyboard.down('ArrowRight');
  await frames(page, 1200);
  await page.keyboard.up('ArrowRight');
  expect(await page.evaluate(() => window.battleFixtureState.knightPath!.x)).toBeGreaterThanOrEqual(3200);
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  for (const [age, name] of [
    [1.8, 'roaring-charge-pose'],
    [3.1, 'kaizo-blocks-charge'],
    [5.8, 'roaring-swoon'],
    [6.3, 'kaizo-blocks-swoon'],
    [8.7, 'roaring-blocks-swoon'],
  ] as const) {
    await page.evaluate((age) => {
      window.battleFixtureState.knightPath!.duelAge = age;
    }, age);
    await frames(page, 1);
    await page.locator('#game').screenshot({ path: testInfo.outputPath(`${name}.png`) });
  }
  const encounterX = await page.evaluate(() => window.battleFixtureState.knightPath!.x);
  await page.keyboard.down('ArrowLeft');
  await page.keyboard.press('Shift');
  await page.keyboard.press('l');
  await frames(page, 180);
  await page.keyboard.up('ArrowLeft');
  await page.keyboard.press('o');
  await page.keyboard.press('Enter');
  await expect(page.locator('#inventoryDialog')).toBeHidden();
  await expect(page.locator('#dialogue')).toBeHidden();
  expect(await page.evaluate(() => window.battleFixtureState.knightPath!.x)).toBe(encounterX);
  expect(
    await page.evaluate(() => window.battleFixtureState.knightBattle?.teams.map((team) => team.id)),
  ).toEqual(['party', 'roaring', 'kaizo']);
  await frames(page, 60);
  await page.locator('#game').screenshot({ path: testInfo.outputPath('three-team-introduction.png') });
  await expect(page.locator('#taskTitle')).toHaveText('Three Teams');
  await expect(page.locator('#bossControls')).toBeHidden();
  await expect(page.locator('#gameHint')).not.toContainText('%');
  expect(
    await page.evaluate(() => ({
      hp: window.battleFixtureState.partyHP,
      items: window.battleFixtureState.inventory,
    })),
  ).toEqual(before);
  await frames(page, 900);
  expect(await page.evaluate(() => window.battleFixtureState.knightPath!.duelAge)).toBe(11);
  expect(await page.evaluate(() => window.battleFixtureState.knightBattle?.phase)).toBe('introduction');
});

test('older progress beyond the third statue can finish its conversation before the knight scene', async ({
  page,
}) => {
  await controlFrames(page);
  await installBattleFixture(page);
  await seedProgress(
    page,
    'postShowPassage',
    { tennaFinaleComplete: true, knightStatuesExplained: false },
    { x: 140, y: 360 },
  );
  await page.goto('/');
  await frames(page, 1);
  await page.evaluate(() => {
    window.battleFixtureState.knightPath!.x = 3250;
  });
  await frames(page, 1);
  await expect(page.locator('#speakerName')).toHaveText('Flowey');
  expect(await page.evaluate(() => window.battleFixtureState.knightPath!.duelAge)).toBe(-1);
  for (let i = 0; i < 6 && (await page.locator('#dialogue').isVisible()); i++)
    await confirmRoomDialogue(page);
  await frames(page, 2);
  await expect(page.locator('#dialogue')).toBeHidden();
  expect(await page.evaluate(() => window.battleFixtureState.story.knightStatuesExplained)).toBe(true);
  expect(await page.evaluate(() => window.battleFixtureState.knightPath!.duelAge)).toBeGreaterThan(0);
});
