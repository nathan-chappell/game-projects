import { installBattleFixture, finishAttackFixture } from './battle-fixture.ts';
import { controlFrames, frames } from './frames.ts';
import { expect, test } from './test.ts';

for (const kind of ['noelle', 'dark', 'tenna', 'knights']) {
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

test('Vessel supports invincibility and Shift skips each attack without changing their order', async ({
  page,
}) => {
  await controlFrames(page);
  await installBattleFixture(page);
  await page.goto('/');
  await frames(page, 1);
  await page.evaluate(async () => {
    const path = '/src/battle/vessel/entrance.ts',
      rules = '/src/battle/shared/rules.ts';
    const { createVesselEncounter } = await import(path),
      { advanceBattleTime } = await import(rules);
    const s = window.battleFixtureState;
    s.bossEncounter = createVesselEncounter();
    advanceBattleTime(s.bossEncounter, 1.1, s.partyHP);
    window.refreshBattleFixture();
  });
  await page.locator('#game').focus();
  await page.keyboard.press('CapsLock');
  expect(await page.evaluate(() => window.battleFixtureState.bossEncounter!.invincible)).toBe(true);
  // Auto-repeat must not toggle back off.
  await page.keyboard.down('CapsLock');
  await page.keyboard.down('CapsLock');
  await page.keyboard.up('CapsLock');
  expect(await page.evaluate(() => window.battleFixtureState.bossEncounter!.invincible)).toBe(false);
  await page.keyboard.press('CapsLock');
  for (const pattern of ['rain', 'edges', 'bombs', 'jump']) {
    for (let i = 0; i < 4; i++) await page.locator('#battleDefend').click();
    expect(
      await page.evaluate(() => window.battleFixtureState.bossEncounter!.snowAttack!.vesselRain!.pattern),
    ).toBe(pattern);
    const hp = await page.evaluate(() => structuredClone(window.battleFixtureState.partyHP));
    await page.evaluate(() => {
      const b = window.battleFixtureState.bossEncounter!;
      b.snowAttack!.vesselRain!.swords.push({
        kind: 'mini',
        ...b.soul!,
        vx: 0,
        vy: 0,
        angle: 0,
        scale: 0.4,
        age: 0,
        active: true,
        hitOpponent: false,
        red: true,
      });
    });
    await frames(page, 2);
    expect(await page.evaluate(() => window.battleFixtureState.partyHP)).toEqual(hp);
    await page.locator('#game').focus();
    await page.keyboard.press('Shift');
    if (pattern !== 'jump') await expect(page.locator('#battleTurnText')).toHaveText('Kris’s turn');
    else
      expect(await page.evaluate(() => window.battleFixtureState.bossEncounter!.phase)).toBe(
        'vesselTransfer',
      );
    expect(await page.evaluate(() => window.battleFixtureState.bossEncounter!.snowAttack)).toBeNull();
    expect(await page.evaluate(() => window.battleFixtureState.bossEncounter!.invincible)).toBe(true);
  }
  expect(await page.evaluate(() => window.battleFixtureState.bossEncounter!.vesselClearedAttacks)).toEqual([
    1, 2, 3, 4,
  ]);
});

test('Vessel number keys queue and switch attacks while Caps Lock controls invincibility', async ({
  page,
}) => {
  await controlFrames(page);
  await installBattleFixture(page);
  await page.goto('/');
  await frames(page, 1);
  await page.evaluate(async () => {
    const path = '/src/battle/vessel/entrance.ts',
      rules = '/src/battle/shared/rules.ts';
    const { createVesselEncounter } = await import(path),
      { advanceBattleTime } = await import(rules);
    const s = window.battleFixtureState;
    s.bossEncounter = createVesselEncounter();
    advanceBattleTime(s.bossEncounter, 1.1, s.partyHP);
    window.refreshBattleFixture();
  });
  await page.locator('#game').focus();
  await page.keyboard.press('Digit2');
  expect(await page.evaluate(() => window.battleFixtureState.bossEncounter!.invincible)).toBe(false);
  await page.keyboard.press('CapsLock');
  for (let number = 1; number <= 4; number++) {
    await page.locator('#game').focus();
    await page.keyboard.press(`Digit${number}`);
    expect(await page.evaluate(() => window.battleFixtureState.bossEncounter!.phase)).toBe('kris');
    for (let i = 0; i < 4; i++) await page.locator('#battleDefend').click();
    const expected = ['rain', 'edges', 'bombs', 'jump'][number - 1];
    expect(
      await page.evaluate(() => window.battleFixtureState.bossEncounter!.snowAttack!.vesselRain!.pattern),
    ).toBe(expected);
    await page.evaluate(() => {
      window.battleFixtureState.bossEncounter!.snowAttack!.grazeTP = 4;
    });
    const next = (number % 4) + 1;
    await page.locator('#game').focus();
    await page.keyboard.press(`Numpad${next}`);
    expect(
      await page.evaluate(() => {
        const b = window.battleFixtureState.bossEncounter!;
        return {
          pattern: b.snowAttack!.vesselRain!.pattern,
          age: b.snowAttack!.vesselRain!.age,
          invincible: b.invincible,
          grazeTP: b.snowAttack!.grazeTP,
          y: b.soul!.y,
        };
      }),
    ).toEqual({
      pattern: ['rain', 'edges', 'bombs', 'jump'][next - 1],
      age: 0,
      invincible: true,
      grazeTP: 4,
      y: next === 4 ? 469.5 : 240,
    });
    await finishAttackFixture(page);
  }
  await page.keyboard.press('CapsLock');
  expect(await page.evaluate(() => window.battleFixtureState.bossEncounter!.invincible)).toBe(false);
});

test('Vessel permanently locks cleared number keys and starts the soul transfer after all four attacks', async ({
  page,
}) => {
  await controlFrames(page);
  await installBattleFixture(page);
  await page.goto('/');
  await frames(page, 1);
  await page.evaluate(async () => {
    const path = '/src/battle/vessel/entrance.ts',
      rules = '/src/battle/shared/rules.ts';
    const { createVesselEncounter } = await import(path),
      { advanceBattleTime } = await import(rules);
    const s = window.battleFixtureState;
    s.bossEncounter = createVesselEncounter();
    advanceBattleTime(s.bossEncounter, 1.1, s.partyHP);
    window.refreshBattleFixture();
  });
  await page.locator('#game').focus();
  await page.keyboard.press('CapsLock');
  for (let i = 0; i < 4; i++) await page.locator('#battleDefend').click();
  await frames(page, 1000);
  expect(await page.evaluate(() => window.battleFixtureState.bossEncounter!.vesselClearedAttacks)).toEqual([
    1,
  ]);
  const counter = await page.evaluate(() => window.battleFixtureState.bossEncounter!.enemyAttackCount);
  await page.keyboard.press('Digit1');
  expect(await page.evaluate(() => window.battleFixtureState.bossEncounter!.enemyAttackCount)).toBe(counter);
  await page.keyboard.press('Digit3');
  for (let i = 0; i < 4; i++) await page.locator('#battleDefend').click();
  expect(
    await page.evaluate(() => window.battleFixtureState.bossEncounter!.snowAttack!.vesselRain!.pattern),
  ).toBe('bombs');
  await frames(page, 10);
  const age = await page.evaluate(() => window.battleFixtureState.bossEncounter!.snowAttack!.vesselRain!.age);
  await page.locator('#game').focus();
  await page.keyboard.press('Numpad1');
  expect(
    await page.evaluate(() => window.battleFixtureState.bossEncounter!.snowAttack!.vesselRain!.age),
  ).toBe(age);
  await page.keyboard.press('Shift');
  for (const expected of ['jump', 'edges']) {
    for (let i = 0; i < 4; i++) await page.locator('#battleDefend').click();
    expect(
      await page.evaluate(() => window.battleFixtureState.bossEncounter!.snowAttack!.vesselRain!.pattern),
    ).toBe(expected);
    await page.locator('#game').focus();
    await page.keyboard.press('Shift');
  }
  await frames(page, 120);
  expect(
    await page.evaluate(() => {
      const b = window.battleFixtureState.bossEncounter!;
      return { phase: b.phase, cleared: b.vesselClearedAttacks, hp: b.enemy.hp, attack: b.snowAttack };
    }),
  ).toEqual({ phase: 'vesselTransfer', cleared: [1, 3, 4, 2], hp: 10000, attack: null });
  for (const key of ['Digit1', 'Digit2', 'Digit3', 'Digit4', 'Numpad2', 'Shift'])
    await page.keyboard.press(key);
  expect(await page.evaluate(() => window.battleFixtureState.bossEncounter!.phase)).toBe('vesselTransfer');
  await expect(page.locator('#battleAttack')).toBeDisabled();
});
