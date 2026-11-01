import type { Point } from '../../world/types.ts';
import type { Arena, Sword, SwordAttack } from '../shared/types.ts';
export const swordSettings = {
  speed: 420,
  damage: 15,
  warmup: 0.8,
  waveInterval: 0.85,
  waves: 8,
  stagger: 0,
  padding: 54,
  hitCooldown: 0.75,
};
const patterns = [
  [0, 3, 4, 5, 6],
  [0, 1, 4, 5, 6],
  [0, 1, 2, 5, 6],
  [0, 1, 2, 3, 6],
  [0, 1, 4, 5, 6],
  [0, 3, 4, 5, 6],
  [0, 1, 2, 5, 6],
  [0, 1, 4, 5, 6],
];
export function createSwordAttack(arena: Arena, random = Math.random): SwordAttack {
  return { arena: { ...arena }, motion: random() < 0.5 ? -1 : 1, age: 0, waves: 0, swords: [], nextId: 0 };
}
export function swordLaneY(attack: SwordAttack, lane: number) {
  return attack.arena.y + 32 + (lane * (attack.arena.size - 64)) / 6;
}
export function swordWarning(attack: SwordAttack) {
  if (attack.waves >= swordSettings.waves) return [];
  const until = swordSettings.warmup + attack.waves * swordSettings.waveInterval - attack.age;
  return until >= 0 && until <= swordSettings.warmup
    ? patterns[attack.waves].map((lane) => swordLaneY(attack, lane))
    : [];
}
export function advanceSwords(attack: SwordAttack, dt: number) {
  attack.age += dt;
  while (
    attack.waves < swordSettings.waves &&
    attack.age >= swordSettings.warmup + attack.waves * swordSettings.waveInterval - 1e-9
  ) {
    const launch = swordSettings.warmup + attack.waves * swordSettings.waveInterval;
    patterns[attack.waves].forEach((lane, index) =>
      attack.swords.push({
        id: attack.nextId++,
        y: swordLaneY(attack, lane),
        launch: launch + index * swordSettings.stagger,
        x: 0,
        active: false,
      }),
    );
    attack.waves++;
  }
  const start =
    attack.motion > 0
      ? attack.arena.x - swordSettings.padding
      : attack.arena.x + attack.arena.size + swordSettings.padding;
  for (const sword of attack.swords) {
    sword.active = attack.age >= sword.launch;
    sword.x = start + attack.motion * swordSettings.speed * Math.max(0, attack.age - sword.launch);
  }
  attack.swords = attack.swords.filter((s) =>
    attack.motion > 0
      ? s.x < attack.arena.x + attack.arena.size + swordSettings.padding
      : s.x > attack.arena.x - swordSettings.padding,
  );
  return attack.waves === swordSettings.waves && !attack.swords.length;
}
export function swordPieces(sword: Pick<Sword, 'x' | 'y' | 'active'>, motion: number) {
  return [
    { x: sword.x + motion * 10, y: sword.y, hw: 25, hh: 5 },
    { x: sword.x - motion * 17.5, y: sword.y, hw: 3.5, hh: 16 },
    { x: sword.x - motion * 30, y: sword.y, hw: 9, hh: 3 },
  ];
}
export function swordTouchesSoul(
  sword: Pick<Sword, 'x' | 'y' | 'active'>,
  motion: number,
  soul: Point,
  width: number,
  height: number,
  margin = 0,
) {
  return (
    sword.active &&
    swordPieces(sword, motion).some(
      (p) =>
        Math.abs(p.x - soul.x) < p.hw + width / 2 + margin &&
        Math.abs(p.y - soul.y) < p.hh + height / 2 + margin,
    )
  );
}
export function drawSwords(ctx: CanvasRenderingContext2D, attack: SwordAttack | null | undefined) {
  if (!attack) return;
  const side = attack.motion > 0 ? attack.arena.x - 14 : attack.arena.x + attack.arena.size + 14;
  ctx.save();
  ctx.fillStyle = '#dbbb74';
  for (const y of swordWarning(attack)) {
    ctx.beginPath();
    ctx.moveTo(side + attack.motion * 5, y);
    ctx.lineTo(side - attack.motion * 4, y - 5);
    ctx.lineTo(side - attack.motion * 4, y + 5);
    ctx.closePath();
    ctx.fill();
  }
  for (const sword of attack.swords) {
    if (!sword.active) continue;
    ctx.save();
    ctx.translate(Math.round(sword.x), Math.round(sword.y));
    ctx.scale(-attack.motion, 1);
    ctx.save();
    ctx.shadowColor = 'rgba(175,205,225,.4)';
    ctx.shadowBlur = 6;
    ctx.fillStyle = 'rgba(175,205,225,.14)';
    ctx.fillRect(-39, -8, 80, 16);
    ctx.fillRect(12, -18, 10, 36);
    ctx.restore();
    ctx.fillStyle = '#18191e';
    ctx.fillRect(-31, -8, 47, 16);
    ctx.fillRect(12, -20, 10, 40);
    ctx.fillRect(20, -5, 20, 10);
    ctx.fillStyle = '#999d9e';
    ctx.beginPath();
    ctx.moveTo(-41, 0);
    ctx.lineTo(-31, -6);
    ctx.lineTo(14, -6);
    ctx.lineTo(14, 6);
    ctx.lineTo(-31, 6);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#d3d6d4';
    ctx.fillRect(-28, -5, 42, 2);
    ctx.fillStyle = '#676c71';
    ctx.fillRect(-28, 3, 42, 2);
    ctx.fillStyle = '#898d90';
    ctx.fillRect(14, -17, 6, 34);
    ctx.fillRect(20, -3, 16, 6);
    ctx.fillRect(36, -5, 5, 10);
    ctx.fillStyle = '#b6b9b7';
    ctx.fillRect(14, -17, 2, 34);
    ctx.restore();
  }
  ctx.restore();
}
