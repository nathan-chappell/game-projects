import { knightDuelPose } from './knight-path.ts';

function polygon(ctx: CanvasRenderingContext2D, points: number[][], color: string) {
  ctx.fillStyle = color;
  ctx.beginPath();
  points.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
  ctx.closePath();
  ctx.fill();
}
function knight(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  facing: number,
  kaizo: boolean,
  age: number,
  attacking: boolean,
) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(facing * 1.6, 1.6);
  const rim = kaizo ? '#b75467' : '#aeb0ca',
    steel = kaizo ? '#53506d' : '#545266';
  // Long split cloak, a horned silhouette, plated limbs and a narrow unlit visor.
  polygon(
    ctx,
    [
      [-12, -62],
      [-26, -32],
      [-30, 7],
      [-12, -2],
      [-3, 9],
      [3, -19],
      [16, 7],
      [23, -2],
      [18, -36],
      [8, -62],
    ],
    '#181620',
  );
  polygon(
    ctx,
    [
      [-12, -59],
      [-22, -29],
      [-28, 1],
      [-18, -6],
      [-11, -36],
      [0, -51],
    ],
    '#30303e',
  );
  polygon(
    ctx,
    [
      [-13, -63],
      [-16, -87],
      [-27, -105],
      [-16, -102],
      [-6, -86],
      [0, -95],
      [7, -85],
      [22, -103],
      [31, -108],
      [24, -87],
      [14, -64],
    ],
    rim,
  );
  polygon(
    ctx,
    [
      [-12, -80],
      [-8, -88],
      [12, -84],
      [16, -69],
      [5, -59],
      [-10, -66],
    ],
    steel,
  );
  polygon(
    ctx,
    [
      [-11, -76],
      [14, -76],
      [9, -65],
      [-7, -67],
    ],
    '#090911',
  );
  ctx.fillStyle = kaizo ? '#ff6b85' : '#d8dcff';
  ctx.fillRect(3, -73, 7, 2);
  polygon(
    ctx,
    [
      [-15, -59],
      [0, -65],
      [15, -56],
      [11, -28],
      [-9, -26],
    ],
    steel,
  );
  polygon(
    ctx,
    [
      [-14, -57],
      [-21, -49],
      [-16, -35],
      [-9, -43],
      [-4, -54],
    ],
    rim,
  );
  polygon(
    ctx,
    [
      [5, -58],
      [20, -53],
      [23, -41],
      [16, -37],
      [9, -49],
    ],
    rim,
  );
  polygon(
    ctx,
    [
      [-8, -30],
      [-10, -9],
      [-17, 1],
      [-3, 1],
      [2, -27],
    ],
    '#696777',
  );
  polygon(
    ctx,
    [
      [5, -29],
      [8, -6],
      [3, 3],
      [20, 3],
      [16, -29],
    ],
    '#464455',
  );
  ctx.fillStyle = rim;
  ctx.fillRect(-14, -4, 12, 3);
  ctx.fillRect(9, -3, 11, 3);
  ctx.save();
  ctx.translate(18, -44);
  ctx.rotate(attacking ? -1.1 + Math.sin(age * 8) * 0.4 : -0.28);
  polygon(
    ctx,
    [
      [0, 12],
      [-3, -52],
      [1, -70],
      [5, -52],
      [4, 12],
    ],
    kaizo ? '#c57d9c' : '#c9cde3',
  );
  ctx.fillStyle = '#f0e8ef';
  ctx.fillRect(0, -49, 2, 49);
  ctx.fillStyle = '#78718d';
  ctx.fillRect(-9, 4, 19, 4);
  ctx.fillStyle = '#322b42';
  ctx.fillRect(0, 8, 4, 12);
  ctx.restore();
  ctx.restore();
}
export function drawRoaringStatue(ctx: CanvasRenderingContext2D, x: number, y: number) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(0.8, 0.8);
  ctx.filter = 'grayscale(1) brightness(0.65)';
  knight(ctx, 0, 0, 1, false, 0, false);
  ctx.filter = 'none';
  ctx.strokeStyle = '#878393';
  ctx.lineWidth = 1;
  for (const [x, y] of [
    [-10, -110],
    [8, -80],
    [-25, -45],
  ]) {
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + 4, y + 6);
    ctx.lineTo(x + 1, y + 11);
    ctx.stroke();
  }
  ctx.restore();
}
export function drawKnightDuel(ctx: CanvasRenderingContext2D, age: number, reducedMotion: boolean) {
  const pose = knightDuelPose(age),
    t = reducedMotion ? 0 : age;
  ctx.save();
  ctx.fillStyle = '#292731';
  ctx.beginPath();
  ctx.ellipse(3600, 375, 240, 38, 0, 0, Math.PI * 2);
  ctx.fill();
  // Dark fissures radiate from the repeated sword impacts.
  ctx.strokeStyle = '#0c0b13';
  ctx.lineWidth = 3;
  for (let i = 0; i < 8; i++) {
    const a = i * 0.79;
    ctx.beginPath();
    ctx.moveTo(3600, 370);
    ctx.lineTo(3600 + Math.cos(a) * 50, 370 + Math.sin(a) * 10);
    ctx.lineTo(3600 + Math.cos(a + 0.1) * 150, 370 + Math.sin(a) * 28);
    ctx.stroke();
  }
  if (!reducedMotion) {
    for (let i = 3; i >= 1; i--) {
      const previous = knightDuelPose(Math.max(0, age - i * 0.045));
      ctx.globalAlpha = 0.08 * (4 - i);
      knight(ctx, previous.roaringX, 350, 1, false, age, !!pose.slash);
      knight(ctx, previous.kaizoX, 350 - previous.kaizoJump, -1, true, age, !!pose.slash);
    }
  }
  ctx.globalAlpha = 1;
  knight(ctx, pose.roaringX, 350, 1, false, t, pose.slash === 'roaring' || pose.slash === 'both');
  knight(
    ctx,
    pose.kaizoX,
    350 - pose.kaizoJump,
    -1,
    true,
    t,
    pose.slash === 'kaizo' || pose.slash === 'both',
  );
  if (pose.slash) {
    for (const [x, color, facing] of [
      [pose.roaringX + 40, '#d6dcff', 1],
      [pose.kaizoX - 40, '#e18ca9', -1],
    ] as const) {
      ctx.save();
      ctx.translate(x, 270);
      ctx.scale(facing, 1);
      ctx.strokeStyle = color;
      ctx.lineWidth = 5;
      ctx.globalAlpha = reducedMotion ? 0.35 : 0.65;
      ctx.beginPath();
      ctx.ellipse(0, 0, 75, 100, -0.6, -1.5, 1.2);
      ctx.stroke();
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.ellipse(8, 0, 88, 111, -0.6, -1.5, 1.2);
      ctx.stroke();
      ctx.restore();
    }
  }
  if (pose.clash > 0.05) {
    const force = pose.clash;
    ctx.globalAlpha = force * (reducedMotion ? 0.25 : 0.8);
    ctx.strokeStyle = '#a298c4';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.ellipse(3600, 360, 40 + (1 - force) * 150, 9 + (1 - force) * 30, 0, 0, Math.PI * 2);
    ctx.stroke();
    const sparks = reducedMotion ? 5 : 22;
    for (let i = 0; i < sparks; i++) {
      const a = i * 2.4 + t * 0.3,
        radius = 15 + (1 - force) * (35 + i * 3);
      ctx.strokeStyle = i % 2 ? '#dce8ff' : '#dc93b1';
      ctx.lineWidth = i % 3 ? 2 : 3;
      ctx.beginPath();
      ctx.moveTo(3600 + Math.cos(a) * radius, 270 + Math.sin(a) * radius);
      ctx.lineTo(3600 + Math.cos(a) * (radius + 13), 270 + Math.sin(a) * (radius + 13));
      ctx.stroke();
    }
    ctx.globalAlpha = force * 0.85;
    ctx.fillStyle = '#f0e5ff';
    ctx.fillRect(3597, 244, 6, 54);
    ctx.fillRect(3575, 268, 50, 4);
  }
  ctx.restore();
}
