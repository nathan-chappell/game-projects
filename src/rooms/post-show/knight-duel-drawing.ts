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
  ctx.scale(facing * 1.35, 1.35);
  const body = kaizo ? '#ffffff' : '#030305';
  const outline = kaizo ? '#d7efff' : '#f1f1f5';
  const crown = [
    [-37, -79],
    [-56, -89],
    [-38, -91],
    [-54, -105],
    [-31, -97],
    [-43, -116],
    [-22, -104],
    [-29, -127],
    [-13, -111],
    [-9, -132],
    [1, -112],
    [14, -127],
    [12, -107],
    [27, -119],
    [23, -100],
    [37, -98],
    [43, -87],
    [31, -76],
    [17, -70],
    [25, -65],
    [8, -61],
    [-10, -65],
    [-22, -73],
  ];
  const shoulders = [
    [-7, -66],
    [-28, -69],
    [-44, -64],
    [-20, -58],
    [-51, -55],
    [-23, -48],
    [-4, -46],
    [14, -51],
    [36, -49],
    [56, -62],
    [33, -60],
    [46, -71],
    [19, -65],
    [8, -68],
  ];
  const torso = [
    [-8, -49],
    [10, -48],
    [8, -36],
    [14, -22],
    [3, -16],
    [-6, -25],
    [-4, -35],
    [-16, -37],
  ];
  const shape = (points: number[][], fill = body) => {
    polygon(ctx, points, fill);
    ctx.strokeStyle = outline;
    ctx.lineWidth = 1.2;
    ctx.lineJoin = 'miter';
    ctx.stroke();
  };
  // Jagged crown and wide blade-like shoulders follow the reference silhouette.
  if (kaizo) {
    for (const [dx, dy, color] of [
      [-12, -4, '#9b7924'],
      [-6, -2, '#5ba34f'],
    ] as const) {
      ctx.save();
      ctx.translate(dx, dy);
      ctx.globalAlpha *= 0.35;
      polygon(ctx, crown, color);
      polygon(ctx, shoulders, color);
      ctx.restore();
    }
  }
  shape(crown);
  shape(shoulders);
  shape(torso);
  // Thin, dangling limbs and pointed joints keep the body much narrower than the head.
  shape([
    [-11, -46],
    [-22, -39],
    [-26, -22],
    [-23, -16],
    [-22, -28],
    [-18, -29],
    [-20, -14],
    [-16, -18],
    [-14, -35],
    [-5, -39],
  ]);
  shape([
    [12, -47],
    [23, -36],
    [30, -30],
    [30, -20],
    [26, -17],
    [26, -26],
    [22, -28],
    [24, -16],
    [20, -20],
    [17, -33],
    [8, -37],
  ]);
  shape([
    [-3, -23],
    [-10, -11],
    [-7, -2],
    [-16, 3],
    [-10, 5],
    [-3, 0],
    [-3, -9],
    [3, -17],
  ]);
  shape([
    [5, -21],
    [12, -12],
    [11, -3],
    [17, 1],
    [12, 5],
    [7, 1],
    [7, -9],
    [1, -15],
  ]);
  // Small broken white contours sit inside the black face rather than a colored visor.
  ctx.strokeStyle = kaizo ? '#bbd7e7' : '#d3d3df';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(-29, -96);
  ctx.lineTo(-16, -94);
  ctx.lineTo(-23, -86);
  ctx.lineTo(-9, -84);
  ctx.moveTo(22, -93);
  ctx.lineTo(29, -87);
  ctx.lineTo(18, -81);
  ctx.moveTo(-8, -58);
  ctx.lineTo(-3, -53);
  ctx.lineTo(9, -56);
  ctx.stroke();
  ctx.save();
  ctx.translate(4, -42);
  ctx.rotate(attacking ? -1.25 + Math.sin(age * 8) * 0.24 : 0.03);
  shape(
    [
      [-2, 42],
      [-3, -48],
      [0, -64],
      [3, -48],
      [2, 42],
    ],
    kaizo ? '#fffef5' : '#111117',
  );
  ctx.strokeStyle = outline;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(0, -56);
  ctx.lineTo(0, 37);
  ctx.stroke();
  ctx.fillStyle = outline;
  ctx.fillRect(-8, -5, 16, 2);
  ctx.fillRect(-1, -3, 2, 12);
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
      [pose.kaizoX - 40, '#e7eaa6', -1],
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
      ctx.strokeStyle = i % 2 ? '#dce8ff' : '#e4d78b';
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
