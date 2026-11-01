import { createEncounter, startKrisTurn } from '../shared/rules.ts';
export function createDarkEncounter() {
  const encounter = createEncounter();
  encounter.kind = 'dark';
  encounter.enemy.name = '???';
  encounter.enemy.hp = encounter.enemy.maxHP = 4000;
  encounter.shineCount = 0;
  encounter.darkUnlocked = false;
  startKrisTurn(encounter);
  encounter.selectedAction = 'act';
  encounter.message = 'You cannot see what is in front of you. ATTACK is disabled.';
  return encounter;
}
export function drawDarkEyes(ctx: CanvasRenderingContext2D, enemyVisible = true) {
  const r = (x: number, y: number, w: number, h: number, c: string) => {
    ctx.fillStyle = c;
    ctx.fillRect(x, y, w, h);
  };
  function pair(x: number, y: number, color: string, style = false) {
    for (const dx of [-8, 8]) {
      r(x + dx - 4, y, 7, 3, color);
      r(x + dx - 3, y - 2, 5, 7, color);
      r(x + dx - 1 + (style ? 1 : 0), y, 2, 4, '#050505');
    }
  }
  pair(56, 77, '#7199e8');
  pair(74, 137, '#c27bc4', true);
  pair(83, 202, '#fff0a3');
  pair(55, 242, '#b6ffe2');
  if (!enemyVisible) return;
  ctx.save();
  ctx.translate(512, 80);
  ctx.rotate(-0.35);
  for (const x of [-16, 16]) {
    r(x - 6, -9, 11, 18, '#a83200');
    r(x - 4, -11, 7, 22, '#b53b00');
    r(x - 3, -5, 5, 9, '#cf4900');
  }
  ctx.restore();
}
