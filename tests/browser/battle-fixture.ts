import type { Page } from '@playwright/test';
import type { GameState } from '../../src/game/types.ts';

declare global {
  interface Window {
    battleFixtureState: GameState;
    refreshBattleFixture: () => void;
  }
}

/** Only intercepted test responses expose fixtures; the shipped game has no test hook. */
export async function installBattleFixture(page: Page) {
  await page.route('**/src/game/game.ts*', async (route) => {
    const response = await route.fetch();
    const source = await response.text();
    const anchor = 'const state = createGameState(project);';
    if (!source.includes(anchor)) throw new Error('Battle fixture could not find game state');
    await route.fulfill({
      response,
      body: source.replace(
        anchor,
        `${anchor}\nwindow.battleFixtureState = state;\nwindow.refreshBattleFixture = () => syncBossUI();`,
      ),
    });
  });
}
export async function prepareBattle(page: Page, values: { tp?: number; enemyHP?: number }) {
  await page.evaluate((values) => {
    const battle = window.battleFixtureState.bossEncounter;
    if (!battle) throw new Error('Battle fixture needs an encounter');
    if (values.tp !== undefined) battle.tp = values.tp;
    if (values.enemyHP !== undefined) battle.enemy.hp = values.enemyHP;
    window.refreshBattleFixture();
  }, values);
}
export async function finishAttackFixture(page: Page) {
  await page.evaluate(async () => {
    const path = '/src/battle/shared/rules.ts';
    const { startKrisTurn } = await import(path);
    const state = window.battleFixtureState;
    startKrisTurn(state.bossEncounter, state.partyHP);
    window.refreshBattleFixture();
  });
}

/** Enter combat directly only in tests that exercise combat, independently of exploration shortcuts. */
export async function startKnightBattleFixture(page: Page) {
  await page.evaluate(async () => {
    const modulePath = '/src/battle/knights/introduction.ts';
    const { createKnightBattleIntro, createKnightEncounter } = await import(modulePath);
    const state = window.battleFixtureState;
    state.keys.clear();
    state.knightBattle = createKnightBattleIntro();
    state.bossEncounter = createKnightEncounter();
    window.refreshBattleFixture();
  });
}

/** Explicit automation setup, independent of production keyboard bindings. */
export async function battleFixtureCommand(page: Page, command: 'invincible' | 'skip' | number) {
  await page.evaluate(async (command) => {
    const state = window.battleFixtureState,
      b = state.bossEncounter;
    if (!b) throw new Error('Fixture command needs a battle');
    const rulesPath = '/src/battle/shared/rules.ts';
    const rules = await import(rulesPath);
    if (command === 'invincible') b.invincible = !b.invincible;
    else if (command === 'skip') {
      if (!state.dialogue && b.phase === 'enemy') rules.startKrisTurn(b, state.partyHP);
      else if (!state.dialogue && b.phase === 'minigame') rules.finishTennaMinigame(b, state.partyHP);
      state.keys.clear();
    } else {
      const path = '/tests/fixtures/combat-tools.ts';
      const { addTennaTestingPoints } = await import(path);
      addTennaTestingPoints(b, command);
    }
    window.refreshBattleFixture();
  }, command);
}
