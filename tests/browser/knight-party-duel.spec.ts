import { writeFile } from 'node:fs/promises';
import { installBattleFixture } from './battle-fixture.ts';
import { controlFrames, frames } from './frames.ts';
import { expect, test } from './test.ts';

test('knights keep dueling behind usable party menus without dealing waiting damage', async ({
  page,
}, testInfo) => {
  await controlFrames(page);
  await installBattleFixture(page);
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.goto('/');
  await frames(page, 1);
  await page.locator('#knightTeleportButton').click();
  await page.evaluate(async () => {
    const path = '/src/rooms/post-show/knight-sprites.ts';
    const sprites = await import(path);
    const c = document.createElement('canvas'),
      ctx = c.getContext('2d')!;
    const actor = { x: 120, jump: 112, facing: 1, swordAngle: 0, lean: 0 };
    const deadline = performance.now() + 10000;
    while (
      !sprites.drawKnightActor(ctx, actor, false) ||
      !sprites.drawKnightActor(ctx, actor, true) ||
      !sprites.drawKnightCharge(ctx, actor)
    ) {
      if (performance.now() > deadline) throw new Error('Knight artwork did not load');
      await new Promise((resolve) => setTimeout(resolve, 25));
    }
  });
  const initialHP = await page.evaluate(() => ({
    enemies: structuredClone(window.battleFixtureState.bossEncounter!.knightEnemies),
    party: structuredClone(window.battleFixtureState.partyHP),
  }));
  await page.locator('#battleAct').click();
  await frames(page, 100);
  const first = await page.evaluate(
    () => (document.querySelector('#game') as HTMLCanvasElement).toDataURL().split(',')[1],
  );
  await frames(page, 16);
  const second = await page.evaluate(
    () => (document.querySelector('#game') as HTMLCanvasElement).toDataURL().split(',')[1],
  );
  expect(second).not.toBe(first);
  await writeFile(testInfo.outputPath('knights-party-swing.png'), Buffer.from(first, 'base64'));
  await writeFile(testInfo.outputPath('knights-party-block.png'), Buffer.from(second, 'base64'));
  await frames(page, 720);
  await expect(page.locator('#battleTurnText')).toHaveText('Kris’s turn');
  await expect(page.locator('#battleProceedButton')).toBeEnabled();
  expect(
    await page.evaluate(() => ({
      enemies: window.battleFixtureState.bossEncounter!.knightEnemies,
      party: window.battleFixtureState.partyHP,
    })),
  ).toEqual(initialHP);
  await page.locator('#battleMenuBack').click();
  await page.locator('#battleAttack').click();
  const age = await page.evaluate(() => window.battleFixtureState.bossEncounter!.knightDuelAge);
  await page.locator('#battleTargetButton').click();
  await frames(page, 20);
  await expect(page.locator('#battleTurnText')).toHaveText('Flowey’s turn');
  expect(await page.evaluate(() => window.battleFixtureState.bossEncounter!.knightDuelAge)).toBe(age);
  expect(await page.evaluate(() => window.battleFixtureState.bossEncounter!.knightEnemies!.roaring.hp)).toBe(
    19980,
  );
});
