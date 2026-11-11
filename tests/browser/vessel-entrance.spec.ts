import { writeFile } from 'node:fs/promises';
import { installBattleFixture } from './battle-fixture.ts';
import { controlFrames, frames } from './frames.ts';
import { seedProgress } from './progress.ts';
import { expect, test } from './test.ts';

test('Flowey and Ralsey speak before the left-facing grayscale Vessel appears and battle opens', async ({
  page,
}, testInfo) => {
  await controlFrames(page);
  await installBattleFixture(page);
  await seedProgress(page, 'mysteriousVoid', { teamJoined: true, joined: true, tennaFinaleComplete: true });
  await page.goto('/');
  await frames(page, 60);
  await expect(page.locator('#speakerName')).toHaveText('Flowey');
  await expect(page.locator('#dialogueText')).toContainText('Where are we?');
  expect(await page.evaluate(() => window.battleFixtureState.vesselArrival!.phase)).toBe('dialogue');
  const before = await page.evaluate(() => ({
    hp: window.battleFixtureState.partyHP,
    inventory: window.battleFixtureState.inventory,
  }));
  await page.locator('#game').focus();
  await page.keyboard.press('Enter');
  await frames(page, 40);
  await expect(page.locator('#speakerName')).toHaveText('Ralsey');
  await expect(page.locator('#dialogueText')).toContainText("I don't know...");
  expect(await page.evaluate(() => window.battleFixtureState.bossEncounter)).toBeNull();
  await page.keyboard.press('Enter');
  await frames(page, 50);
  expect(await page.evaluate(() => window.battleFixtureState.vesselArrival!.phase)).toBe('appear');
  await page.evaluate(async () => {
    const path = '/src/battle/vessel/drawing.ts';
    const { drawVessel } = await import(path);
    const ctx = document.createElement('canvas').getContext('2d')!;
    const end = Date.now() + 10000;
    while (!drawVessel(ctx, 100, 200, 135) && Date.now() < end) await new Promise((r) => setTimeout(r, 25));
  });
  await frames(page, 1);
  const capture = async (name: string) => {
    const png = await page.evaluate(
      () => (document.querySelector('#game') as HTMLCanvasElement).toDataURL().split(',')[1],
    );
    await writeFile(testInfo.outputPath(name), Buffer.from(png, 'base64'));
  };
  await capture('vessel-appears.png');
  await frames(page, 160);
  await expect(page.locator('#dialogue')).toBeHidden();
  expect(
    await page.evaluate(() => ({
      kind: window.battleFixtureState.bossEncounter!.kind,
      phase: window.battleFixtureState.bossEncounter!.phase,
    })),
  ).toEqual({ kind: 'vessel', phase: 'vesselFaceoff' });
  await expect(page.locator('#battleTurnText')).toHaveText('Vessel’s turn');
  await expect(page.locator('#inventoryButton')).toBeDisabled();
  await capture('vessel-battle.png');
  await frames(page, 70);
  await expect(page.locator('#battleTurnText')).toHaveText('Kris’s turn');
  await expect(page.locator('#battleAttack')).toBeEnabled();
  await frames(page, 230);
  expect(
    await page.evaluate(() => ({
      hp: window.battleFixtureState.partyHP,
      inventory: window.battleFixtureState.inventory,
    })),
  ).toEqual(before);
  expect(await page.evaluate(() => window.battleFixtureState.bossEncounter!.snowAttack)).toBeNull();
});
