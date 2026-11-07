import { writeFile } from 'node:fs/promises';
import { controlFrames, frames } from './frames.ts';
import { installBattleFixture } from './battle-fixture.ts';
import { expect, test } from './test.ts';

test('second knight attack shows diagonal warnings, mixed sword waves, and mobile skip', async ({
  page,
}, testInfo) => {
  await controlFrames(page);
  await installBattleFixture(page);
  await page.goto('/');
  await frames(page, 1);
  await page.locator('#knightTeleportButton').click();
  await page.locator('#game').focus();
  await page.keyboard.press('Digit2');
  for (let i = 0; i < 4; i++) await page.locator('#battleDefend').click();
  await page.locator('#game').focus();
  await page.keyboard.press('Shift');
  for (let i = 0; i < 4; i++) await page.locator('#battleDefend').click();
  expect(await page.evaluate(() => window.battleFixtureState.bossEncounter!.snowAttack!.direction)).toBe(
    'knightCrossing',
  );
  await frames(page, 36);
  expect(
    await page.evaluate(
      () => window.battleFixtureState.bossEncounter!.snowAttack!.knightCrossing!.miniWarnings.length,
    ),
  ).toBe(3);
  const warning = await page.evaluate(
    () => (document.querySelector('#game') as HTMLCanvasElement).toDataURL().split(',')[1],
  );
  await writeFile(testInfo.outputPath('knight-crossing-warnings.png'), Buffer.from(warning, 'base64'));
  await frames(page, 54);
  const shot = await page.evaluate(() => ({
    owners: window.battleFixtureState.bossEncounter!.snowAttack!.knightCrossing!.swords.map((s) => s.owner),
    minis: window.battleFixtureState.bossEncounter!.snowAttack!.knightCrossing!.swords.filter(
      (s) => s.scale === 0.4,
    ).length,
    image: (document.querySelector('#game') as HTMLCanvasElement).toDataURL().split(',')[1],
  }));
  expect(shot.owners).toContain('roaring');
  expect(shot.owners).toContain('kaizo');
  expect(shot.minis).toBeGreaterThan(0);
  await writeFile(testInfo.outputPath('knight-crossing-swords.png'), Buffer.from(shot.image, 'base64'));
  await frames(page, 240);
  expect(
    await page.evaluate(() => window.battleFixtureState.bossEncounter!.snowAttack!.knightCrossing!.waves),
  ).toBe(4);
  await page.setViewportSize({ width: 390, height: 844 });
  await frames(page, 1);
  await page.locator('#mobileSkip').click();
  await frames(page, 1);
  await expect(page.locator('#battleTurnText')).toHaveText('Kris’s turn');
  await expect(page.locator('#battleSoulControls')).toBeHidden();
});
