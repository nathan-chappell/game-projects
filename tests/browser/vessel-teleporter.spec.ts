import { writeFile } from 'node:fs/promises';
import { installBattleFixture } from './battle-fixture.ts';
import { controlFrames, frames } from './frames.ts';
import { expect, test } from './test.ts';

for (const method of ['button', 'walking'] as const) {
  test(`Vessel teleporter enters its fight from a new adventure by ${method}`, async ({ page }, testInfo) => {
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
      await page.locator('#vesselTeleportButton').click();
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
        kind: s.bossEncounter?.kind,
        hp: s.bossEncounter?.enemy.hp,
        finaleComplete: s.story.tennaFinaleComplete,
      };
    });
    expect(arrived.scene).toBe('mysteriousVoid');
    expect(arrived.kind).toBe('vessel');
    expect(arrived.hp).toBe(10000);
    expect(arrived.finaleComplete).toBe(false);
    await frames(page, 75);
    await expect(page.locator('#battleTurnText')).toHaveText('Kris’s turn');
    await expect(page.locator('#battleAttack')).toBeEnabled();
  });
}
