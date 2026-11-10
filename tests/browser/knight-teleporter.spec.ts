import { writeFile } from 'node:fs/promises';
import { installBattleFixture } from './battle-fixture.ts';
import { controlFrames, frames } from './frames.ts';
import { expect, test } from './test.ts';

for (const method of ['button', 'walking'] as const) {
  test(`knight teleporter enters the long statue path from a new adventure by ${method}`, async ({
    page,
  }, testInfo) => {
    await controlFrames(page);
    await installBattleFixture(page);
    await page.goto('/');
    await frames(page, 1);
    const before = await page.evaluate(() => {
      const s = window.battleFixtureState;
      return {
        hp: structuredClone(s.partyHP),
        inventory: structuredClone(s.inventory),
      };
    });
    if (method === 'button') {
      const png = await page.evaluate(
        () => (document.querySelector('#game') as HTMLCanvasElement).toDataURL().split(',')[1],
      );
      await writeFile(testInfo.outputPath('knight-teleporter.png'), Buffer.from(png, 'base64'));
      await page.locator('#knightTeleportButton').click();
    } else {
      await page.locator('#game').focus();
      await page.keyboard.down('ArrowRight');
      await frames(page, 55);
      await page.keyboard.up('ArrowRight');
    }
    await frames(page, 1);
    await expect(page.locator('#dialogue')).toBeHidden();
    const after = await page.evaluate(() => {
      const s = window.battleFixtureState;
      return { hp: s.partyHP, inventory: s.inventory };
    });
    expect(after).toEqual(before);
    const arrived = await page.evaluate(() => {
      const s = window.battleFixtureState;
      return {
        scene: s.project.rooms[s.roomIndex].scene,
        battle: s.bossEncounter,
        path: s.knightPath,
        finaleComplete: s.story.tennaFinaleComplete,
      };
    });
    expect(arrived.scene).toBe('postShowPassage');
    expect(arrived.battle).toBeNull();
    expect(arrived.path!.duelAge).toBe(-1);
    expect(arrived.finaleComplete).toBe(false);
    await page.locator('#game').focus();
    await page.keyboard.down('ArrowDown');
    await frames(page, 15);
    await page.keyboard.up('ArrowDown');
    expect(await page.evaluate(() => window.battleFixtureState.knightPath!.y)).toBeGreaterThan(
      arrived.path!.y,
    );
  });
}
