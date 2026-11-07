import { writeFile } from 'node:fs/promises';
import { installBattleFixture } from './battle-fixture.ts';
import { controlFrames, frames } from './frames.ts';
import { expect, test } from './test.ts';

for (const method of ['button', 'walking'] as const) {
  test(`knight teleporter starts a battle from a new adventure by ${method}`, async ({ page }, testInfo) => {
    await controlFrames(page);
    await installBattleFixture(page);
    await page.goto('/');
    await frames(page, 1);
    const before = await page.evaluate(() => {
      const s = window.battleFixtureState;
      return {
        story: structuredClone(s.story),
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
    await expect(page.locator('#battleTurnText')).toHaveText('Kris’s turn');
    await expect(page.locator('#battleAct')).toBeEnabled();
    await expect(page.locator('#dialogue')).toBeHidden();
    const after = await page.evaluate(() => {
      const s = window.battleFixtureState;
      return { story: s.story, hp: s.partyHP, inventory: s.inventory };
    });
    expect(after).toEqual(before);
    await page.locator('#battleItem').click();
    await expect(page.locator('#inventoryDialog')).toBeVisible();
    for (const name of ['Kris', 'Flowey', 'Susie', 'Ralsey']) {
      await expect(page.locator(`#candyTarget option[value="${name}"]`)).toBeEnabled();
    }
  });
}
