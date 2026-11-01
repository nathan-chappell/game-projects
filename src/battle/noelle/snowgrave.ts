import type { Point } from '../../world/types.ts';
// The final spell is fast, but every eruption has a visible, reachable escape slit.
export const snowgraveSettings = {
  intro: 1.2,
  warning: 0.42,
  eruption: 0.18,
  recovery: 0.1,
  riseSeconds: 0.05,
  gapWidth: 48,
  damage: 25,
  hitCooldown: 0.55,
};

export const snowgraveArena = { x: 224, y: 110, width: 192, height: 156, border: 4 };
export const snowgraveOffsets = [
  0, 36, 0, -36, 0, 36, 60, 24, -12, -48, -12, 24, 60, 24, -12, -48, -12, 24, 0, 36,
];
export const snowgraveCycle =
  snowgraveSettings.warning + snowgraveSettings.eruption + snowgraveSettings.recovery;
export const snowgraveDuration = snowgraveSettings.intro + snowgraveOffsets.length * snowgraveCycle;

export function createSnowgraveAttack() {
  return { age: 0 };
}

export function snowgraveFrame(attack: ReturnType<typeof createSnowgraveAttack>) {
  const elapsed = Math.max(0, attack.age - snowgraveSettings.intro),
    index = Math.min(snowgraveOffsets.length - 1, Math.floor((elapsed + 1e-9) / snowgraveCycle)),
    time = elapsed - index * snowgraveCycle,
    center = snowgraveArena.x + snowgraveArena.width / 2 + snowgraveOffsets[index],
    gap = { left: center - snowgraveSettings.gapWidth / 2, right: center + snowgraveSettings.gapWidth / 2 };
  let stage, progress;
  if (attack.age < snowgraveSettings.intro) {
    stage = 'gather';
    progress = attack.age / snowgraveSettings.intro;
  } else if (attack.age >= snowgraveDuration - 1e-9) {
    stage = 'finished';
    progress = 1;
  } else if (time < snowgraveSettings.warning - 1e-9) {
    stage = 'warning';
    progress = time / snowgraveSettings.warning;
  } else if (time < snowgraveSettings.warning + snowgraveSettings.eruption - 1e-9) {
    stage = 'eruption';
    progress = (time - snowgraveSettings.warning) / snowgraveSettings.eruption;
  } else {
    stage = 'fade';
    progress = (time - snowgraveSettings.warning - snowgraveSettings.eruption) / snowgraveSettings.recovery;
  }
  return {
    stage,
    progress: Math.max(0, Math.min(1, progress)),
    index,
    gap,
    height:
      snowgraveArena.height *
      Math.min(1, Math.max(0, time - snowgraveSettings.warning) / snowgraveSettings.riseSeconds),
  };
}

export function snowgraveTouchesSoul(
  attack: ReturnType<typeof createSnowgraveAttack>,
  soul: Point,
  width: number,
  height: number,
) {
  const frame = snowgraveFrame(attack);
  if (frame.stage !== 'eruption') return false;
  const iceTop = snowgraveArena.y + snowgraveArena.height - snowgraveArena.border - frame.height;
  return (
    soul.y + height / 2 > iceTop &&
    (soul.x - width / 2 < frame.gap.left || soul.x + width / 2 > frame.gap.right)
  );
}
