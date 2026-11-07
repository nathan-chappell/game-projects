const clamp = (value: number) => Math.max(0, Math.min(1, value));
const pulse = (age: number, start: number, end: number) =>
  Math.sin(clamp((age - start) / (end - start)) * Math.PI);

export function knightCameraShot(age: number, reduced = false) {
  if (reduced) return { zoom: 1, x: 320, y: 240, portrait: null, portraitProgress: 0, letterbox: 0 };
  const portrait = age >= 4.72 && age < 5.08 ? 'roaring' : age >= 7.18 && age < 7.54 ? 'kaizo' : null;
  const portraitProgress =
    portrait === 'roaring' ? (age - 4.72) / 0.36 : portrait === 'kaizo' ? (age - 7.18) / 0.36 : 0;
  const charge = pulse(age, 1.2, 2.8);
  const impact = Math.max(pulse(age, 3.025, 3.45), pulse(age, 6.12, 6.52), pulse(age, 8.52, 8.92));
  return {
    zoom: 1 + charge * 0.075 + impact * 0.055,
    x: 320 - charge * 18 + impact * 10,
    y: 240 - impact * 12,
    portrait,
    portraitProgress,
    letterbox: age < 10 ? 26 : 26 * (1 - clamp(age - 10)),
  };
}
