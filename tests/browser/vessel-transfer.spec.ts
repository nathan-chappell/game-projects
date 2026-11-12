import { writeFile } from 'node:fs/promises';
import { installBattleFixture } from './battle-fixture.ts';
import { controlFrames, frames } from './frames.ts';
import { expect, test } from './test.ts';

for (const reducedMotion of ['no-preference', 'reduce'] as const) {
  test(`clearing the Vessel attacks transfers the soul and holds centered narration (${reducedMotion})`, async ({
    page,
  }, testInfo) => {
    await page.emulateMedia({ reducedMotion });
    await controlFrames(page);
    await installBattleFixture(page);
    await page.goto('/');
    await frames(page, 1);
    await page.evaluate(async () => {
      const path = '/src/battle/vessel/entrance.ts',
        rules = '/src/battle/shared/rules.ts';
      const { createVesselEncounter } = await import(path),
        { advanceBattleTime } = await import(rules);
      const state = window.battleFixtureState;
      state.bossEncounter = createVesselEncounter();
      const b = state.bossEncounter!;
      advanceBattleTime(b, 1.1, state.partyHP);
      b.vesselClearedAttacks = [1, 2, 3];
      b.enemyAttackCount = 3;
      window.refreshBattleFixture();
      const drawingPath = '/src/battle/vessel/drawing.ts';
      const { drawVessel } = await import(drawingPath);
      const c = document.createElement('canvas').getContext('2d')!;
      while (!drawVessel(c, 100, 200, 120)) await new Promise((r) => setTimeout(r, 25));
    });
    for (let i = 0; i < 4; i++) await page.locator('#battleDefend').click();
    await page.locator('#game').focus();
    await page.keyboard.press('Shift');
    await frames(page, 130);
    expect(await page.evaluate(() => window.battleFixtureState.bossEncounter!.phase)).toBe('vesselTransfer');
    await expect(page.locator('#bossControls')).toBeHidden();
    await expect(page.locator('#mobileGameControls')).toBeHidden();
    await expect(page.locator('#inventoryButton')).toBeDisabled();
    async function capture(name: string) {
      const png = await page.evaluate(
        () => (document.querySelector('#game') as HTMLCanvasElement).toDataURL().split(',')[1],
      );
      await writeFile(testInfo.outputPath(name), Buffer.from(png, 'base64'));
    }
    await capture('soul-entering-vessel.png');
    await frames(page, 170);
    const partial = await page.evaluate(() => window.battleFixtureState.bossEncounter!.message);
    expect(partial).toContain('You entered');
    expect(partial.length).toBeLessThan(40);
    for (const key of ['Enter', 'z', 'Shift', 'Digit1', 'Digit4', 'CapsLock']) await page.keyboard.press(key);
    expect(await page.evaluate(() => window.battleFixtureState.bossEncounter!.message)).toBe(partial);
    await frames(page, 600);
    const full = await page.evaluate(() => window.battleFixtureState.bossEncounter!.message);
    expect(full.replaceAll('\n', ' ')).toBe(
      'You entered the Vessel. Its the thing you where looking for. You nearly destroyed the World, didnt you? Looking for your discarded Vessel... now, you face the concicuences.',
    );
    await capture('centered-vessel-narration.png');
    const bounds = await page.evaluate(() => {
      const c = (document.querySelector('#game') as HTMLCanvasElement).getContext('2d')!;
      const data = c.getImageData(0, 0, 640, 480).data;
      let minX = 640,
        minY = 480,
        maxX = 0,
        maxY = 0;
      for (let y = 0; y < 480; y++)
        for (let x = 0; x < 640; x++) {
          const i = (y * 640 + x) * 4;
          if (data[i] > 200 && data[i + 1] > 200 && data[i + 2] > 200) {
            minX = Math.min(minX, x);
            maxX = Math.max(maxX, x);
            minY = Math.min(minY, y);
            maxY = Math.max(maxY, y);
          }
        }
      return { minX, minY, maxX, maxY, corner: Array.from(c.getImageData(10, 10, 1, 1).data) };
    });
    expect(Math.abs((bounds.minX + bounds.maxX) / 2 - 320)).toBeLessThan(3);
    expect(Math.abs((bounds.minY + bounds.maxY) / 2 - 240)).toBeLessThan(8);
    expect(bounds.corner).toEqual([0, 0, 0, 255]);
    await frames(page, 600);
    expect(await page.evaluate(() => window.battleFixtureState.bossEncounter!.phase)).toBe('vesselEntered');
    expect(await page.evaluate(() => window.battleFixtureState.bossEncounter!.message)).toBe(full);
  });
}
