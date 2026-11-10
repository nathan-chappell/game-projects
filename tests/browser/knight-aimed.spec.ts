import { writeFile } from 'node:fs/promises';
import { controlFrames, frames } from './frames.ts';
import { installBattleFixture } from './battle-fixture.ts';
import { expect, test } from './test.ts';

test('third knight attack has eight faster swords approaching from outside the box', async ({
  page,
}, testInfo) => {
  await controlFrames(page);
  await installBattleFixture(page);
  await page.goto('/');
  await frames(page, 1);
  await page.locator('#knightTeleportButton').click();
  await page.locator('#game').focus();
  await page.keyboard.press('Digit2');
  for (let turn = 0; turn < 3; turn++) {
    for (let i = 0; i < 4; i++) await page.locator('#battleDefend').click();
    if (turn < 2) {
      await page.locator('#game').focus();
      await page.keyboard.press('Shift');
    }
  }
  await frames(page, 25);
  const warning = await page.evaluate(() => {
    const a = window.battleFixtureState.bossEncounter!.snowAttack!.knightAimed!;
    return {
      big: a.warnings.length,
      mini: a.swords.filter((s) => s.scale).length,
      speed: a.warnings[0].speed,
      image: (document.querySelector('#game') as HTMLCanvasElement).toDataURL().split(',')[1],
    };
  });
  expect(warning.big).toBe(8);
  expect(warning.mini).toBe(0);
  expect(warning.speed).toBe(700);
  await writeFile(testInfo.outputPath('eight-aimed-swords.png'), Buffer.from(warning.image, 'base64'));
  await frames(page, 37);
  expect(
    await page.evaluate(
      () =>
        window.battleFixtureState.bossEncounter!.snowAttack!.knightAimed!.swords.filter((s) => !s.scale)
          .length,
    ),
  ).toBe(8);
  await page.locator('#game').focus();
  await page.keyboard.press('Shift');
  await expect(page.locator('#battleTurnText')).toHaveText('Kris’s turn');
});
