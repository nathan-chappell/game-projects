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

test('Noelle entry, party actions, soul controls, skip, and exit', async ({ page }) => {
  await seedProgress(page, 'glitchBoss', { noelleGone: false, noelleEscaped: false });
  await page.goto('/');
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
  await expect(page.locator('#battleAttack')).toBeEnabled();
  await page.locator('#leaveBossButton').click();
  await expect(page.locator('#bossControls')).not.toBeVisible();
});
