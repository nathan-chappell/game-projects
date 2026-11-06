export function drawUndyne(ctx: CanvasRenderingContext2D, x: number, y: number, time: number, scale = 1) {
  ctx.save();
  ctx.translate(Math.round(x), Math.round(y));
  ctx.scale(scale, scale);
  const r = (x: number, y: number, w: number, h: number, color: string) => {
    ctx.fillStyle = color;
    ctx.fillRect(x, y, w, h);
  };
  // Native pixel silhouette: red ponytail, eyepatch, fins and heavy spiked armor.
  r(-10, -117, 25, 27, '#9d1639');
  r(6, -112, 20, 14, '#e2374c');
  r(20, -105, 12, 30, '#b82645');
  r(25, -83, 8, 19, '#e2374c');
  r(-20, -100, 30, 30, '#208caa');
  r(-28, -93, 10, 13, '#43c6d2');
  r(-19, -87, 28, 13, '#5bd0d3');
  r(-21, -96, 17, 9, '#101323');
  r(-3, -95, 9, 7, '#fff1ab');
  r(-2, -94, 3, 5, '#eb463f');
  r(-17, -77, 21, 4, '#101323');
  r(-14, -77, 4, 3, '#fff');
  r(-6, -77, 4, 3, '#fff');
  r(-21, -69, 30, 39, '#181d31');
  r(-18, -65, 24, 30, '#4a5480');
  r(-15, -62, 18, 20, '#2b3456');
  r(-11, -59, 10, 15, '#f0e8e0');
  r(-7, -58, 3, 12, '#ef415e');
  r(-31, -68, 13, 18, '#7982a8');
  r(7, -68, 16, 18, '#7982a8');
  for (const side of [-1, 1]) {
    r(side < 0 ? -30 : 13, -77, 5, 10, '#e4e5f0');
    r(side < 0 ? -34 : 21, -72, 5, 8, '#e4e5f0');
  }
  r(-31, -49, 9, 25, '#26324e');
  r(15, -49, 9, 24, '#26324e');
  r(-32, -29, 10, 10, '#41bacb');
  r(14, -28, 12, 9, '#41bacb');
  r(-18, -30, 27, 11, '#6d7597');
  r(-19, -19, 11, 21, '#232a44');
  r(-1, -19, 11, 21, '#232a44');
  r(-23, -3, 15, 9, '#a2aac4');
  r(-1, -3, 17, 9, '#a2aac4');
  r(-35, -110, 3, 110, '#37d9e0');
  ctx.fillStyle = '#8dfbff';
  ctx.beginPath();
  ctx.moveTo(-42, -100);
  ctx.lineTo(-33, -124);
  ctx.lineTo(-26, -100);
  ctx.closePath();
  ctx.fill();
  if (Math.sin(time * 4) > 0) r(-2, -94, 3, 4, '#fffaac');
  ctx.restore();
}
