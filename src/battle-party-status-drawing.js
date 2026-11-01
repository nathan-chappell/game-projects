import { partyStatusSettings } from './battle-party-status.js';

export function createPartyStatusDrawing(ctx, sprites, reducedMotion) {
  return function drawPartyMember(name, x, y, scale, status, standing) {
    if (!status || status.mode === 'up') { standing(); return; }
    const age = status.age, down = status.mode === 'down', motion = !reducedMotion.matches,
      unit = scale * (name === 'Kris' ? 1.75 : 1.5),
      drawDown = name === 'Kris' ? sprites.krisDown : sprites.floweyDown,
      recoil = down && age < 0.18 && motion ? Math.round(Math.sin(age * 65) * 4 * (1 - age / 0.18)) * unit : 0;
    ctx.save();
    if (down && age < 0.12 && motion) ctx.filter = 'brightness(2)';
    ctx.translate(recoil, 0);
    if (down) {
      if (age < 0.12 && motion) standing();
      else drawDown(x,y,scale,age < 0.38 && motion ? 1 : 2);
    } else {
      if (age < 0.16 && motion) drawDown(x,y,scale,1); else standing();
    }
    ctx.restore();
    if (!motion) return;
    ctx.save(); ctx.translate(x,y); ctx.scale(unit,unit);
    if (down && age < 0.28) {
      const p = age / 0.28, cy = name === 'Kris' ? -26 : -17;
      ctx.globalAlpha = 1 - p;
      ctx.fillStyle = '#fff1fc';
      for (let i = 0; i < 8; i++) {
        const angle = i * Math.PI / 4, distance = 12 + p * 20;
        ctx.fillRect(Math.round(Math.cos(angle) * distance), Math.round(cy + Math.sin(angle) * distance), i % 2 ? 2 : 3, 2);
      }
    } else if (down && age > 0.38 && age < partyStatusSettings.collapseSeconds) {
      const p = (age - 0.38) / (partyStatusSettings.collapseSeconds - 0.38);
      ctx.globalAlpha = 1 - p; ctx.fillStyle = name === 'Kris' ? '#b7b3ca' : '#ffe19b';
      for (let i = 0; i < 6; i++) {
        const side = i % 2 ? 1 : -1, distance = 5 + (i + 3) * p * 2;
        ctx.fillRect(Math.round(side * distance), Math.round(-2 - Math.sin(p * Math.PI) * (i % 3 + 2)), 3, 2);
      }
    } else if (!down) {
      const p = age / partyStatusSettings.reviveSeconds;
      ctx.globalAlpha = Math.sin(p * Math.PI); ctx.fillStyle = '#a7ffd0';
      for (let i = 0; i < 5; i++) {
        const px = (i - 2) * 9, py = -7 - p * 35 - i % 2 * 7;
        ctx.fillRect(px - 1,Math.round(py - 3),2,6);
        ctx.fillRect(px - 3,Math.round(py - 1),6,2);
      }
    }
    ctx.restore();
  };
}
