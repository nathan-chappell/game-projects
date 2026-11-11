import { installBattleFixture } from './battle-fixture.ts';
import { controlFrames, frames } from './frames.ts';
import { expect, test } from './test.ts';

for (const kind of ['noelle', 'dark', 'tenna', 'knights', 'vessel']) {
  test(`${kind} has no player combat cheats or playtesting controls`, async ({ page }) => {
    await controlFrames(page);
    await installBattleFixture(page);
    await page.goto('/');
    await frames(page, 1);
    await page.evaluate(async (kind) => {
      const paths: Record<string, [string, string]> = {
        noelle: ['/src/battle/shared/rules.ts', 'createEncounter'],
        dark: ['/src/battle/dark/dark-battle.ts', 'createDarkEncounter'],
        tenna: ['/src/rooms/backstage/tenna-finale.ts', 'createTennaEncounter'],
        knights: ['/src/battle/knights/introduction.ts', 'createKnightEncounter'],
        vessel: ['/src/battle/vessel/entrance.ts', 'createVesselEncounter'],
      };
      const [path, factory] = paths[kind],
        module = await import(path);
      const b = module[factory]();
      b.phase = 'kris';
      b.turn = 'Kris';
      b.tp = 27;
      if (kind === 'tenna') b.score = 123;
      window.battleFixtureState.bossEncounter = b;
      window.refreshBattleFixture();
    }, kind);
    const snapshot = () =>
      page.evaluate(() => {
        const b = window.battleFixtureState.bossEncounter!;
        return {
          hp: b.enemy.hp,
          party: window.battleFixtureState.partyHP,
          tp: b.tp,
          score: b.score ?? 0,
          invincible: b.invincible,
          repeat: b.repeatAttack,
          fastKill: b.fastKill,
          phase: b.phase,
          attack: b.snowAttack?.direction,
          special: b.specialAttackQueued,
        };
      });
    const before = await snapshot();
    await page.locator('#game').focus();
    for (const key of [
      'Digit1',
      'Digit2',
      'Digit3',
      'Digit4',
      'Digit5',
      'Digit6',
      'Numpad1',
      'Numpad2',
      'Numpad3',
      'Numpad4',
      'Numpad5',
      'Numpad6',
      'i',
      'Shift',
    ])
      await page.keyboard.press(key);
    expect(await snapshot()).toEqual(before);
    for (const id of [
      'battleTestStatus',
      'battleKnightTestingControls',
      'mobileKnightTools',
      'mobileInvincible',
      'mobileSkip',
    ])
      await expect(page.locator('#' + id)).toHaveCount(0);
    if (kind !== 'vessel') {
      await page.evaluate(async (kind) => {
        const path = '/src/battle/shared/rules.ts';
        const { beginEnemyAttack } = await import(path);
        const patterns: Record<string, string> = {
          noelle: 'down',
          dark: 'dark',
          tenna: 'saxophones',
          knights: 'knightSwords',
        };
        beginEnemyAttack(window.battleFixtureState.bossEncounter!, patterns[kind], '');
        window.refreshBattleFixture();
      }, kind);
      const attack = await snapshot();
      await page.keyboard.press('Shift');
      await page.keyboard.press('Digit2');
      await page.keyboard.press('i');
      expect(await snapshot()).toEqual(attack);
    }
  });
}

test('Tenna minigame cannot be skipped and its score cannot be increased with cheat keys', async ({
  page,
}) => {
  await controlFrames(page);
  await installBattleFixture(page);
  await page.goto('/');
  await frames(page, 1);
  await page.evaluate(async () => {
    const path = '/src/rooms/backstage/tenna-finale.ts',
      rulesPath = '/src/battle/shared/rules.ts';
    const { createTennaEncounter } = await import(path),
      { requestTennaMinigame } = await import(rulesPath);
    const b = createTennaEncounter();
    b.phase = 'kris';
    b.turn = 'Kris';
    b.minigameIntroSeen = true;
    requestTennaMinigame(b);
    window.battleFixtureState.bossEncounter = b;
    window.refreshBattleFixture();
  });
  await page.locator('#game').focus();
  for (const key of ['Shift', 'i', 'Digit2', 'Digit3', 'Numpad2', 'Numpad3']) await page.keyboard.press(key);
  expect(
    await page.evaluate(() => {
      const b = window.battleFixtureState.bossEncounter!;
      return { phase: b.phase, score: b.score, invincible: b.invincible };
    }),
  ).toEqual({ phase: 'minigame', score: 0, invincible: false });
});
