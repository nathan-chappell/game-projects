import { writeFile } from 'node:fs/promises';
import { installBattleFixture } from './battle-fixture.ts';
import { controlFrames, frames } from './frames.ts';
import { expect, test } from './test.ts';

test('Vessel fourth attack uses a blue jumping soul and one red wall-burst sword', async ({
  page,
}, testInfo) => {
  await controlFrames(page);
  await installBattleFixture(page);
  await page.goto('/');
  await frames(page, 1);
  await page.evaluate(async () => {
    const path = '/src/battle/vessel/entrance.ts',
      rules = '/src/battle/shared/rules.ts';
    const { createVesselEncounter } = await import(path),
      { startNextEnemyAttack } = await import(rules);
    const s = window.battleFixtureState;
    s.bossEncounter = createVesselEncounter();
    s.bossEncounter!.enemyAttackCount = 3;
    s.bossEncounter!.invincible = true;
    startNextEnemyAttack(s.bossEncounter, '');
    window.refreshBattleFixture();
  });
  await frames(page, 1);
  await page.locator('#game').focus();
  await page.keyboard.down(' ');
  await frames(page, 25);
  expect(await page.evaluate(() => window.battleFixtureState.bossEncounter!.soul!.y)).toBeLessThan(410);
  const blue = await page.evaluate(() => {
    const soul = window.battleFixtureState.bossEncounter!.soul!;
    return Array.from(
      (document.querySelector('#game') as HTMLCanvasElement)
        .getContext('2d')!
        .getImageData(Math.round(soul.x), Math.round(soul.y), 1, 1).data,
    );
  });
  expect(blue).toEqual([38, 117, 255, 255]);
  await frames(page, 100);
  expect(await page.evaluate(() => window.battleFixtureState.bossEncounter!.soul!.y)).toBe(469.5);
  await page.keyboard.up(' ');
  // Advance to the single red sword and take a native canvas image mid-jump.
  await frames(page, 300);
  await page.keyboard.down('ArrowUp');
  await frames(page, 20);
  await page.keyboard.up('ArrowUp');
  const png = await page.evaluate(
    () => (document.querySelector('#game') as HTMLCanvasElement).toDataURL().split(',')[1],
  );
  await writeFile(testInfo.outputPath('vessel-blue-soul.png'), Buffer.from(png, 'base64'));
  await frames(page, 800);
  await expect(page.locator('#battleTurnText')).toHaveText('Kris’s turn');
  expect(await page.evaluate(() => window.battleFixtureState.bossEncounter!.snowAttack)).toBeNull();
});
