import { writeFile } from 'node:fs/promises';
import { installBattleFixture } from './battle-fixture.ts';
import { controlFrames, frames } from './frames.ts';
import { expect, test } from './test.ts';

test('third knight attack casts stars, splits each into six, and supports phone skipping', async ({
  page,
}, testInfo) => {
  await controlFrames(page);
  await installBattleFixture(page);
  await page.goto('/');
  await frames(page, 1);
  await page.locator('#knightTeleportButton').click();
  await page.locator('#game').focus();
  await page.keyboard.press('Digit2');
  for (let round = 0; round < 2; round++) {
    for (let i = 0; i < 4; i++) await page.locator('#battleDefend').click();
    await page.locator('#game').focus();
    await page.keyboard.press('Shift');
  }
  for (let i = 0; i < 4; i++) await page.locator('#battleDefend').click();
  expect(await page.evaluate(() => window.battleFixtureState.bossEncounter!.snowAttack!.direction)).toBe(
    'knightStars',
  );
  await frames(page, 57);
  const cast = await page.evaluate(() => ({
    count: window.battleFixtureState.bossEncounter!.snowAttack!.knightStars!.stars.length,
    image: (document.querySelector('#game') as HTMLCanvasElement).toDataURL().split(',')[1],
  }));
  expect(cast.count).toBe(2);
  await writeFile(testInfo.outputPath('knight-star-cast.png'), Buffer.from(cast.image, 'base64'));
  await frames(page, 60);
  await page.evaluate(async () => {
    const path = '/src/rooms/post-show/knight-sprites.ts';
    const sprites = await import(path);
    const c = document.createElement('canvas'),
      ctx = c.getContext('2d')!;
    const actor = { x: 120, jump: 112, facing: 1, swordAngle: 0, lean: 0 };
    const deadline = performance.now() + 10000;
    while (!sprites.drawKnightActor(ctx, actor, false) || !sprites.drawKnightActor(ctx, actor, true)) {
      if (performance.now() > deadline) throw new Error('Knight artwork did not load');
      await new Promise((resolve) => setTimeout(resolve, 25));
    }
  });
  await frames(page, 1);
  const charged = await page.evaluate(
    () => (document.querySelector('#game') as HTMLCanvasElement).toDataURL().split(',')[1],
  );
  await writeFile(testInfo.outputPath('knight-stars-charged.png'), Buffer.from(charged, 'base64'));
  await frames(page, 54);
  const burst = await page.evaluate(() => {
    const a = window.battleFixtureState.bossEncounter!.snowAttack!.knightStars!;
    return {
      explosions: a.explosions,
      black: a.fragments.filter((s) => s.owner === 'roaring').length,
      white: a.fragments.filter((s) => s.owner === 'kaizo').length,
      image: (document.querySelector('#game') as HTMLCanvasElement).toDataURL().split(',')[1],
    };
  });
  expect(burst.explosions).toBe(2);
  expect(burst.black).toBe(6);
  expect(burst.white).toBe(6);
  await writeFile(testInfo.outputPath('knight-star-explosions.png'), Buffer.from(burst.image, 'base64'));
  await page.setViewportSize({ width: 390, height: 844 });
  await frames(page, 1);
  await page.locator('#mobileSkip').click();
  await frames(page, 1);
  await expect(page.locator('#battleTurnText')).toHaveText('Kris’s turn');
  expect(await page.evaluate(() => window.battleFixtureState.bossEncounter!.snowAttack)).toBeNull();
});
