export function undyneDropOffset(age: number) {
  if (age < 0.7) return 460 * (1 - (Math.max(0, age) / 0.7) ** 2);
  if (age < 1) return -Math.sin(((age - 0.7) / 0.3) * Math.PI) * 11;
  return 0;
}
export function drawUndyne(ctx: CanvasRenderingContext2D, x: number, y: number, time: number, scale = 1) {
  ctx.save();
  ctx.translate(Math.round(x), Math.round(y));
  ctx.scale(scale, scale);
  ctx.lineJoin = 'miter';
  ctx.lineWidth = 3;
  ctx.strokeStyle = '#080d19';
  const shape = (color: string, points: number[]) => {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(points[0], points[1]);
    for (let i = 2; i < points.length; i += 2) ctx.lineTo(points[i], points[i + 1]);
    ctx.closePath();
    ctx.stroke();
    ctx.fill();
  };
  const r = (x: number, y: number, w: number, h: number, c: string) => {
    ctx.fillStyle = c;
    ctx.fillRect(x, y, w, h);
  };
  // A swept ponytail, angular fish profile and layered armor retain a crisp pixel silhouette.
  shape(
    '#9e1537',
    [
      0, -135, 17, -149, 35, -141, 32, -128, 44, -118, 37, -102, 48, -85, 40, -74, 43, -58, 31, -68, 24, -91,
      28, -112, 13, -125,
    ],
  );
  shape('#e13a4c', [12, -136, 27, -143, 30, -134, 23, -127, 34, -112, 28, -103, 24, -121]);
  shape('#278eae', [-25, -131, -10, -139, 7, -133, 14, -119, 7, -101, -11, -97, -24, -108, -29, -119]);
  shape('#43c3d2', [-24, -125, -36, -132, -31, -112, -25, -110]);
  shape('#4bbfca', [-24, -116, -8, -112, 5, -115, 1, -103, -14, -101, -28, -109]);
  r(-27, -128, 19, 10, '#101426');
  r(-22, -131, 18, 4, '#101426');
  r(-6, -129, 11, 9, '#fff6b8');
  r(-4, -128, 4, 7, '#f25a43');
  r(-24, -110, 22, 4, '#0b1622');
  for (let i = 0; i < 4; i++) r(-21 + i * 5, -110, 3, 3, '#e7fbf9');
  r(-8, -130, 4, 2, '#5fdbe0');
  shape('#252d4c', [-23, -97, 5, -100, 18, -81, 11, -51, -21, -51, -31, -78]);
  shape('#4f5b86', [-22, -92, 3, -94, 13, -80, 6, -58, -17, -56, -25, -78]);
  shape('#18213a', [-17, -86, 4, -88, 6, -63, -10, -59, -20, -72]);
  // White broken-heart insignia and silver ribs distinguish the Undying armor.
  shape('#d7e6ee', [-12, -82, -7, -85, -3, -80, 2, -84, 5, -79, 2, -72, -4, -65, -11, -72]);
  r(-4, -82, 3, 7, '#ba294d');
  r(-7, -74, 3, 7, '#ba294d');
  r(-22, -67, 8, 3, '#9aaac4');
  r(7, -72, 6, 3, '#9aaac4');
  shape('#737c9e', [-28, -97, -39, -89, -39, -76, -25, -72, -18, -85]);
  shape('#596783', [9, -96, 25, -91, 31, -77, 16, -72, 8, -81]);
  shape('#edf5fb', [-35, -91, -41, -108, -29, -97]);
  shape('#c6dce8', [-24, -94, -25, -108, -17, -97]);
  shape('#edf5fb', [19, -93, 25, -107, 27, -89]);
  shape('#b0c6dc', [28, -82, 38, -91, 33, -76]);
  shape('#26334f', [-37, -75, -28, -72, -30, -50, -42, -43, -46, -50]);
  shape('#3fadc2', [-43, -51, -31, -53, -28, -44, -36, -38, -45, -41]);
  shape('#26334f', [20, -72, 29, -74, 35, -52, 28, -44, 20, -52]);
  shape('#4fc0cb', [28, -48, 37, -50, 39, -40, 32, -36, 25, -41]);
  shape('#182039', [-21, -53, 11, -53, 15, -41, -22, -39]);
  r(-18, -49, 26, 4, '#a3b0cc');
  shape('#354365', [-20, -39, -6, -38, -10, -20, -18, -6, -29, -8, -25, -25]);
  shape('#354365', [0, -39, 12, -39, 17, -24, 24, -7, 11, -6, 4, -19]);
  shape('#a0b6cd', [-28, -13, -16, -10, -15, -2, -38, 2, -39, -3]);
  shape('#a0b6cd', [12, -12, 24, -12, 34, -2, 31, 3, 11, 1]);
  r(-26, -33, 7, 13, '#6d83a5');
  r(9, -32, 6, 12, '#6d83a5');
  r(-40, -123, 4, 123, '#1b697d');
  r(-39, -122, 2, 121, '#73eef2');
  shape('#36d5e4', [-48, -116, -39, -144, -30, -116, -37, -121, -37, -109, -41, -109, -41, -121]);
  r(-40, -134, 2, 15, '#e5ffff');
  if (Math.sin(time * 5) > 0) r(-4, -128, 2, 5, '#fff9c9');
  ctx.restore();
}
