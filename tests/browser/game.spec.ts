import { pathToFileURL } from 'node:url';
import { expect, test } from './test.ts';

// Each test gets an isolated browser store; never clear a player's actual saves.
test('startup, keyboard and touch movement, and Build undo', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('/');
  await expect(page.locator('#roomName')).toHaveText('The Waking Chamber');
  await expect(page.locator('#game')).toBeVisible();
  const beforeMovement = await page.locator('#game').screenshot();
  await page.locator('#game').focus();
  await page.keyboard.down('ArrowRight');
  await page.waitForTimeout(150);
  await page.keyboard.up('ArrowRight');
  const down = page.getByRole('button', { name: 'Walk down', exact: true });
  await down.scrollIntoViewIfNeeded();
  const bounds = await down.boundingBox();
  if (!bounds) throw new Error('Direction button is unavailable');
  const touch = await page.context().newCDPSession(page);
  await touch.send('Input.dispatchTouchEvent', {
    type: 'touchStart',
    touchPoints: [{ x: bounds.x + bounds.width / 2, y: bounds.y + bounds.height / 2 }],
  });
  await page.waitForTimeout(150);
  await touch.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  expect((await page.locator('#game').screenshot()).equals(beforeMovement)).toBe(false);
  await page.locator('#buildMode').click();
  await page.locator('#roomTitle').fill('Undo characterization');
  await page.locator('#roomTitle').press('Tab');
  await expect(page.locator('#roomName')).toHaveText('Undo characterization');
  await page.locator('#undoButton').click();
  await expect(page.locator('#roomName')).toHaveText('The Waking Chamber');
  await page.locator('#saveBuildButton').click();
  const build = await page.evaluate(() => JSON.parse(localStorage.getItem('little-lantern-build-save-v1')!));
  expect(build.project.rooms[0].name).toBe('The Waking Chamber');
  await page.reload();
  await expect(page.locator('#roomName')).toHaveText('The Waking Chamber');
  expect(errors).toEqual([]);
});

test('Build backups round-trip and the edited download plays directly offline', async ({
  page,
  browser,
}, testInfo) => {
  await page.goto('/');
  await page.locator('#buildMode').click();
  await page.locator('#roomTitle').fill('Backup characterization');
  await page.locator('#roomTitle').press('Tab');
  await page.locator('#saveBuildButton').click();
  const backup = await page.evaluate(() => localStorage.getItem('little-lantern-build-save-v1')!);
  await page.locator('#roomTitle').fill('Temporary edit');
  await page.locator('#roomTitle').press('Tab');
  await page
    .locator('#buildFileInput')
    .setInputFiles({ name: 'backup.json', mimeType: 'application/json', buffer: Buffer.from(backup) });
  await expect(page.locator('#roomName')).toHaveText('Backup characterization');
  const download = page.waitForEvent('download');
  await page.locator('#downloadButton').click();
  const file = await download;
  expect(file.suggestedFilename()).toBe('Two-Worlds-My-Game.html');
  const filename = testInfo.outputPath('LittleLantern-Offline.html');
  await file.saveAs(filename);
  const context = await browser.newContext();
  try {
    const offline = await context.newPage();
    const offlineErrors: string[] = [];
    offline.on('pageerror', (error) => offlineErrors.push(error.message));
    await offline.goto(pathToFileURL(filename).href);
    await expect(offline.locator('#roomName')).toHaveText('Backup characterization');
    await expect(offline.locator('#playMode')).toHaveAttribute('aria-pressed', 'true');
    await offline.locator('#buildMode').click();
    await expect(offline.locator('#roomTitle')).toHaveValue('Backup characterization');
    expect(offlineErrors).toEqual([]);
  } finally {
    await context.close();
  }
});

test('painting a tile saves it and Undo restores the original tile', async ({ page }) => {
  await page.goto('/');
  await page.locator('#buildMode').click();
  await page.locator('.tile-button[data-tile="1"]').click();
  const canvas = page.locator('#game'),
    bounds = await canvas.boundingBox();
  if (!bounds) throw new Error('Canvas is unavailable');
  await canvas.click({ position: { x: (bounds.width * 5.5) / 16, y: (bounds.height * 3.5) / 12 } });
  const tile = () =>
    page.evaluate(
      () => JSON.parse(localStorage.getItem('little-lantern-build-save-v1')!).project.rooms[0].map[3][5],
    );
  expect(await tile()).toBe(1);
  await page.locator('#undoButton').click();
  expect(await tile()).toBe(0);
});
