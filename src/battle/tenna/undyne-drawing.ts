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
  // Narrow, forward-leaning fish profile, swept rear fin and the Undying eye.
  shape(
    '#195d87',
    [-19, -132, -7, -141, 8, -139, 16, -128, 10, -112, -3, -99, -17, -101, -27, -112, -25, -122],
  );
  shape('#299cb9', [-20, -132, -5, -137, 9, -133, 7, -120, -2, -110, -18, -110, -29, -116, -25, -122]);
  shape('#299cb9', [8, -131, 28, -140, 20, -129, 28, -130, 15, -116, 8, -119]);
  r(14, -129, 8, 2, '#5cd5df');
  // A short pointed snout and sloping jaw replace the broad rounded muzzle.
  shape(
    '#4bc5cf',
    [-25, -122, -31, -119, -28, -115, -18, -114, -8, -108, -4, -102, -17, -104, -27, -111, -31, -116],
  );
  shape('#08131e', [-22, -129, -9, -127, -14, -119, -24, -122]);
  shape('#ffeb6a', [-20, -127, -12, -126, -16, -121, -21, -123]);
  shape('#08131e', [-7, -131, 4, -133, 9, -129, 7, -121, -3, -119]);
  shape('#ebffff', [-5, -129, 3, -130, 6, -126, 1, -121, -4, -122]);
  r(-1, -128, 2, 6, '#22c5fb');
  shape('#43dcff', [2, -130, 6, -138, 5, -146, 11, -139, 9, -130, 7, -126]);
  shape('#e5ffff', [4, -131, 7, -138, 7, -142, 9, -138, 7, -130]);
  // Diagonal, interlocking fangs create the game's fierce grin.
  shape('#08131e', [-26, -114, -16, -112, -6, -115, -3, -110, -10, -104, -20, -108]);
  shape('#f6fbf8', [-24, -113, -19, -111, -20, -108]);
  shape('#f6fbf8', [-17, -112, -12, -112, -14, -107]);
  shape('#f6fbf8', [-10, -113, -5, -114, -7, -109]);
  shape('#f6fbf8', [-15, -106, -10, -109, -8, -106]);
  shape('#252d4c', [-23, -97, 5, -100, 18, -81, 11, -51, -21, -51, -31, -78]);
  shape('#333c5c', [-22, -92, 3, -94, 13, -80, 6, -58, -17, -56, -25, -78]);
  shape('#18213a', [-17, -86, 4, -88, 6, -63, -10, -59, -20, -72]);
  // White broken-heart insignia and silver ribs distinguish the Undying armor.
  shape('#d7e6ee', [-12, -82, -7, -85, -3, -80, 2, -84, 5, -79, 2, -72, -4, -65, -11, -72]);
  r(-4, -82, 3, 7, '#ba294d');
  r(-7, -74, 3, 7, '#ba294d');
  r(-22, -67, 8, 3, '#d0dae9');
  r(-20, -61, 28, 2, '#8495af');
  r(-18, -57, 24, 2, '#b4c5da');
  r(7, -72, 6, 3, '#9aaac4');
  shape('#424e70', [-28, -97, -39, -89, -39, -76, -25, -72, -18, -85]);
  shape('#333e5e', [9, -96, 25, -91, 31, -77, 16, -72, 8, -81]);
  shape('#edf5fb', [-35, -91, -46, -113, -29, -97]);
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
  if (Math.sin(time * 5) > 0) r(0, -128, 2, 5, '#ffffff');
  ctx.restore();
}
