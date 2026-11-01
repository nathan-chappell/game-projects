// Crossing snowballs are shared by drawing and hit detection; the corner balls stay fixed.
export const crossingSettings = {
  duration: 14,
  warmup: 0.8,
  damage: 10,
  largeRadius: 18,
  smallRadius: 8,
  cornerInset: 16,
  bobDistance: 22,
  spinnerCount: 4,
  spinnerRadius: 12,
  spinnerOrbitRadius: 62,
  spinnerSpeed: 1.2,
};

export function createCrossingAttack(buffed = false) {
  return { age: 0, buffed };
}

export function crossingHazards(attack, arena) {
  const age = Math.max(0, attack.age - crossingSettings.warmup),
    period = 640 + crossingSettings.largeRadius * 2,
    large = [], small = [], spinning = [],
    speeds = [86, -108, 98],
    columns = attack.buffed ? 6 : 4,
    spinnerCount = attack.buffed ? 6 : crossingSettings.spinnerCount;
  for (let row = 0; row < 3; row++) {
    for (let column = 0; column < columns; column++) {
      const travel = column * period / columns + row * 47 + age * speeds[row];
      large.push({
        pass: Math.floor(travel / period),
        x: ((travel % period) + period) % period - crossingSettings.largeRadius,
        y: arena.y + 34 + row * (arena.size - 68) / 2 +
          Math.sin(age * 0.9 + column * 1.7 + row * 2.2) * crossingSettings.bobDistance,
      });
    }
  }
  const inset = arena.border + crossingSettings.cornerInset;
  for (const x of [arena.x + inset, arena.x + arena.size - inset])
    for (const y of [arena.y + inset, arena.y + arena.size - inset]) small.push({ x, y });
  for (let i = 0; i < spinnerCount; i++) {
    const angle = Math.PI / 4 + age * crossingSettings.spinnerSpeed + i * Math.PI * 2 / spinnerCount;
    spinning.push({
      x: arena.x + arena.size / 2 + Math.cos(angle) * crossingSettings.spinnerOrbitRadius,
      y: arena.y + arena.size / 2 + Math.sin(angle) * crossingSettings.spinnerOrbitRadius,
    });
  }
  return { large, small, spinning };
}
