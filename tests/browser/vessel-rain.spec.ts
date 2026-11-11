import { writeFile } from 'node:fs/promises';
import { installBattleFixture } from './battle-fixture.ts';
import { controlFrames, frames } from './frames.ts';
import { expect, test } from './test.ts';

for (const pattern of ['rain', 'edges'] as const) {
  test(`Vessel ${pattern} hides the stage, allows full-screen movement, bursts into minis and ends naturally`, async ({
    page,
  }, testInfo) => {
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await controlFrames(page);
    await installBattleFixture(page);
    await page.goto('/');
    await frames(page, 1);
    await page.evaluate(async (pattern) => {
      const path = '/src/battle/vessel/entrance.ts',
        rules = '/src/battle/shared/rules.ts';
      const { createVesselEncounter } = await import(path);
      const { advanceBattleTime } = await import(rules);
      const state = window.battleFixtureState;
      state.bossEncounter = createVesselEncounter();
      advanceBattleTime(state.bossEncounter, 1.1, state.partyHP);
      // Keep the player alive while exercising a whole enemy turn through ordinary frames.
      state.bossEncounter!.invincible = true;
      state.bossEncounter!.enemyAttackCount = pattern === 'edges' ? 1 : 0;
      window.refreshBattleFixture();
    }, pattern);
    for (let i = 0; i < 4; i++) await page.locator('#battleDefend').click();
    await frames(page, 1);
    expect(
      await page.evaluate(() => window.battleFixtureState.bossEncounter!.snowAttack!.vesselRain!.pattern),
    ).toBe(pattern);
    await expect(page.locator('#bossControls')).toBeHidden();
    await expect(page.locator('#inventoryButton')).toBeDisabled();
    const pixel = await page.evaluate(() =>
      Array.from(
        (document.querySelector('#game') as HTMLCanvasElement).getContext('2d')!.getImageData(455, 220, 1, 1)
          .data,
      ),
    );
    expect(pixel).toEqual([0, 0, 0, 255]);
    await page.locator('#game').focus();
    await page.keyboard.down('ArrowLeft');
    await page.keyboard.down('ArrowUp');
    await frames(page, 190);
    await page.keyboard.up('ArrowLeft');
    await page.keyboard.up('ArrowUp');
    expect(await page.evaluate(() => window.battleFixtureState.bossEncounter!.soul)).toEqual({
      x: 12,
      y: 10.5,
    });
    await page.keyboard.down('ArrowRight');
    await page.keyboard.down('ArrowDown');
    await frames(page, 95);
    await page.keyboard.up('ArrowRight');
    await page.keyboard.up('ArrowDown');
    expect(
      await page.evaluate(() =>
        window.battleFixtureState.bossEncounter!.snowAttack!.vesselRain!.swords.some(
          (s) => s.kind === 'mini',
        ),
      ),
    ).toBe(true);
    const png = await page.evaluate(
      () => (document.querySelector('#game') as HTMLCanvasElement).toDataURL().split(',')[1],
    );
    await writeFile(testInfo.outputPath(`vessel-sword-${pattern}.png`), Buffer.from(png, 'base64'));
    await frames(page, 700);
    await expect(page.locator('#bossControls')).toBeVisible();
    await expect(page.locator('#battleTurnText')).toHaveText('Kris’s turn');
    expect(await page.evaluate(() => window.battleFixtureState.bossEncounter!.snowAttack)).toBeNull();
  });
}
