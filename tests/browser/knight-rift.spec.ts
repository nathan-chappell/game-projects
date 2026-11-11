import { writeFile } from 'node:fs/promises';
import { installBattleFixture, startKnightBattleFixture } from './battle-fixture.ts';
import { controlFrames, frames } from './frames.ts';
import { expect, test } from './test.ts';

test('seven knight rounds lead through the protected Fountain cutscene into the reference room', async ({
  page,
}, testInfo) => {
  await controlFrames(page);
  await installBattleFixture(page);
  await page.goto('/');
  await frames(page, 1);
  await startKnightBattleFixture(page);
  await page.locator('#game').focus();
  await page.keyboard.press('Digit2');
  for (let round = 1; round <= 7; round++) {
    for (let i = 0; i < 4; i++) await page.locator('#battleDefend').click();
    await page.locator('#game').focus();
    await page.keyboard.press('Shift');
    expect(await page.evaluate(() => window.battleFixtureState.bossEncounter!.phase)).toBe(
      round === 7 ? 'knightRift' : 'kris',
    );
  }
  await expect(page.locator('#bossControls')).toBeHidden();
  await expect(page.locator('#inventoryButton')).toBeDisabled();
  const resources = await page.evaluate(() => ({
    hp: window.battleFixtureState.partyHP,
    inventory: window.battleFixtureState.inventory,
  }));
  await frames(page, 30);
  await page.evaluate(async () => {
    const modulePath = '/assets/knight-raised-blade-reference.png?inline';
    const { default: url } = await import(modulePath);
    const image = new Image();
    image.src = url;
    await image.decode();
    const spritePath = '/src/rooms/post-show/knight-sprites.ts';
    const sprites = await import(spritePath);
    const c = document.createElement('canvas').getContext('2d')!;
    const actor = { x: 195, jump: 95, facing: 1, swordAngle: 0, lean: 0 };
    const deadline = Date.now() + 10000;
    while (
      (!sprites.drawKnightActor(c, actor, false) || !sprites.drawKnightActor(c, actor, true)) &&
      Date.now() < deadline
    )
      await new Promise((resolve) => setTimeout(resolve, 25));
  });
  const capture = async (name: string) => {
    const png = await page.evaluate(
      () => (document.querySelector('#game') as HTMLCanvasElement).toDataURL().split(',')[1],
    );
    await writeFile(testInfo.outputPath(name), Buffer.from(png, 'base64'));
  };
  await frames(page, 1);
  await capture('raised-blades.png');
  await frames(page, 80);
  await page.evaluate(() => {
    window.battleFixtureState.bossEncounter!.animationAge = 1.85;
  });
  await frames(page, 1);
  await capture('knights-clash.png');
  await frames(page, 45);
  await capture('knights-counterattack.png');
  await page.keyboard.press('Shift');
  expect(await page.evaluate(() => window.battleFixtureState.bossEncounter!.phase)).toBe('knightRift');
  await frames(page, 290);
  await capture('dark-and-light-fountain.png');
  await frames(page, 245);
  expect(
    await page.evaluate(() => {
      const s = window.battleFixtureState;
      return {
        scene: s.project.rooms[s.roomIndex].scene,
        battle: s.bossEncounter,
        knightBattle: s.knightBattle,
      };
    }),
  ).toEqual({ scene: 'mysteriousVoid', battle: null, knightBattle: null });
  expect(
    await page.evaluate(() => ({
      hp: window.battleFixtureState.partyHP,
      inventory: window.battleFixtureState.inventory,
    })),
  ).toEqual(resources);
  await capture('mysterious-room.png');
  const x = await page.evaluate(() => window.battleFixtureState.player.x);
  await page.keyboard.down('ArrowRight');
  await frames(page, 20);
  await page.keyboard.up('ArrowRight');
  expect(await page.evaluate(() => window.battleFixtureState.player.x)).toBeGreaterThan(x);
});
