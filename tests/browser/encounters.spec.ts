import { installBattleFixture } from './battle-fixture.ts';
import { confirmRoomDialogue, controlFrames, frames } from './frames.ts';
import { seedProgress } from './progress.ts';
import { expect, test } from './test.ts';

test('adventure restores, room transitions, and inventory controls stay connected', async ({ page }) => {
  const slot = await seedProgress(page, 'neonRooftop', {}, undefined, {
    gCandy: 2,
    tpElixir: 1,
    jackCandy: 1,
  });
  await page.goto('/');
  await expect(page.locator('#roomName')).toHaveText(slot.project.rooms[slot.roomIndex].name);
  await expect(page.locator('#inventorySummary')).toHaveText(
    'Items: G. Candy × 2, TP Elixir × 1, Jack.Candy × 1',
  );
  await page.locator('#inventoryButton').click();
  await expect(page.locator('#inventoryDialog')).toBeVisible();
  await page.locator('#closeInventoryButton').click();
  await page.locator('#loadGameButton').click();
  await page.getByRole('button', { name: 'Load this save' }).first().click();
  await expect(page.locator('#saveDialog')).not.toBeVisible();
  await expect(page.locator('#roomName')).toHaveText(slot.project.rooms[slot.roomIndex].name);
  // Build's room selector exercises the same transition controller without
  // walking through intervening story gates in a smoke test.
  await page.locator('#buildMode').click();
  await page.locator('#roomSelect').selectOption('0');
  await expect(page.locator('#roomName')).toHaveText('The Waking Chamber');
});

test('Noelle entry, party actions, soul controls, no testing shortcuts, and exit', async ({ page }) => {
  await controlFrames(page);
  await seedProgress(page, 'glitchBoss', { noelleGone: false, noelleEscaped: false });
  await page.goto('/');
  await frames(page, 2);
  await expect(page.locator('#bossChoiceDialog')).toBeVisible();
  await page.locator('#proceedBossButton').click();
  for (let i = 0; i < 4; i++) {
    if (await page.locator('#dialogue').isVisible()) await page.keyboard.press('Enter');
  }
  await expect(page.locator('#bossControls')).toBeVisible();
  await page.locator('#battleAttack').click();
  await page.locator('#battleTargetButton').click();
  await page.locator('#battleDefend').click();
  await expect(page.locator('#battleSoulControls')).toBeVisible();
  await page.locator('#game').focus();
  await page.keyboard.press('Shift');
  await expect(page.locator('#battleSoulControls')).toBeVisible();
  await expect(page.locator('#battleTestStatus')).toBeHidden();
  await frames(page, 1);
  await page.locator('#leaveBossButton').click();
  await expect(page.locator('#bossControls')).not.toBeVisible();
});

for (const scene of ['glitchBoss', 'collisionChamber']) {
  test(`${scene} ignores all playtesting keys during menus and enemy attacks`, async ({ page }) => {
    await controlFrames(page);
    await installBattleFixture(page);
    await seedProgress(page, scene, {
      noelleGone: false,
      noelleEscaped: false,
      darkBattleSeen: false,
      jackRevealed: false,
      jackCandyReceived: false,
    });
    await page.goto('/');
    await frames(page, 60);
    if (scene === 'glitchBoss') {
      await page.locator('#proceedBossButton').click();
      await confirmRoomDialogue(page);
      await confirmRoomDialogue(page);
    } else await confirmRoomDialogue(page);
    await frames(page, 2);
    const snapshot = () =>
      page.evaluate(() => {
        const b = window.battleFixtureState.bossEncounter!;
        return {
          phase: b.phase,
          tp: b.tp,
          hp: b.enemy.hp,
          repeat: b.repeatAttack,
          invincible: b.invincible,
          fastKill: b.fastKill,
          special: b.specialAttackQueued,
          attack: b.snowAttack?.direction ?? null,
        };
      });
    for (const phase of ['menu', 'attack']) {
      await expect(page.locator('#battleTestStatus')).toBeHidden();
      const before = await snapshot();
      await page.locator('#game').focus();
      for (const key of [
        '1',
        '2',
        '3',
        '4',
        '5',
        '6',
        'Numpad1',
        'Numpad2',
        'Numpad3',
        'Numpad4',
        'Numpad5',
        'Numpad6',
        'Shift',
      ])
        await page.keyboard.press(key);
      expect(await snapshot()).toEqual(before);
      if (phase === 'menu') {
        for (let i = 0; i < (scene === 'glitchBoss' ? 2 : 4); i++)
          await page.locator('#battleDefend').click();
      }
    }
    const x = await page.evaluate(() => window.battleFixtureState.bossEncounter!.soul!.x);
    await page.keyboard.down('ArrowRight');
    await frames(page, 10);
    await page.keyboard.up('ArrowRight');
    expect(await page.evaluate(() => window.battleFixtureState.bossEncounter!.soul!.x)).toBeGreaterThan(x);
  });
}
