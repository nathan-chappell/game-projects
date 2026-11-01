import { snowgraveArena, snowgraveFrame, snowgraveSettings } from './battle-snowgrave.js';

export function createSnowgraveDrawing(ctx, { rect, pixelText, reducedParticleMotion }) {
  function backdrop(attack, opacity = 1) {
    const frame = snowgraveFrame(attack), motion = reducedParticleMotion.matches ? 0 : attack.age;
    ctx.save();
    ctx.globalAlpha = opacity;
    const night = ctx.createLinearGradient(0, 24, 0, 290);
    night.addColorStop(0, '#030716'); night.addColorStop(0.6, '#101830'); night.addColorStop(1, '#183e54');
    ctx.fillStyle = night; ctx.fillRect(0, 24, 640, 266);
    const halo = ctx.createRadialGradient(528, 190, 8, 528, 190, 90);
    halo.addColorStop(0, '#74ebff88'); halo.addColorStop(0.5, '#2e91c530'); halo.addColorStop(1, '#00102500');
    ctx.fillStyle = halo; ctx.fillRect(430, 80, 200, 210);
    for (let i = 0; i < 70; i++) {
      const x = ((i * 97 - motion * (55 + i % 5 * 14)) % 680 + 680) % 680 - 20,
        y = 30 + ((i * 53 + motion * (22 + i % 3 * 7)) % 250),
        length = 4 + i % 4 * 3;
      ctx.strokeStyle = i % 4 ? '#b4ebff55' : '#ffffffaa';
      ctx.lineWidth = i % 7 === 0 ? 2 : 1;
      ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x - length, y + 3); ctx.stroke();
    }
    ctx.save(); ctx.translate(528, 187); ctx.rotate(motion * 0.65);
    ctx.strokeStyle = '#94f0ff'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.arc(0, 0, 70, 0, Math.PI * 2); ctx.stroke();
    ctx.beginPath(); ctx.arc(0, 0, 61, 0, Math.PI * 2); ctx.stroke();
    for (let arm = 0; arm < 6; arm++) {
      ctx.rotate(Math.PI / 3);
      ctx.beginPath(); ctx.moveTo(0, -47); ctx.lineTo(0, -77);
      ctx.moveTo(-7, -64); ctx.lineTo(0, -71); ctx.lineTo(7, -64);
      ctx.stroke();
    }
    ctx.restore();
    pixelText('S N O W G R A V E', 207, 55, '#e2fbff', 20);
    pixelText('FINAL ATTACK  /  1 HP', 239, 78, '#9bcadd', 12);
    if (frame.stage === 'gather') pixelText('THE AIR TURNS COLD.', 245, 97, '#c3f6ff', 11);
    else pixelText('FOLLOW THE NARROW LIGHT', 241, 97, '#9fe8ff', 11);
    ctx.restore();
  }

  function field(attack) {
    const frame = snowgraveFrame(attack), a = snowgraveArena,
      left = a.x + a.border, right = a.x + a.width - a.border,
      top = a.y + a.border, bottom = a.y + a.height - a.border,
      warning = frame.stage === 'warning' || frame.stage === 'gather',
      erupting = frame.stage === 'eruption', fading = frame.stage === 'fade';
    ctx.save();
    ctx.beginPath(); ctx.rect(left, top, right - left, bottom - top); ctx.clip();
    rect(left, top, right - left, bottom - top, '#040c1a');
    rect(frame.gap.left, top, snowgraveSettings.gapWidth, bottom - top, '#103142');
    for (const [start, end] of [[left, frame.gap.left], [frame.gap.right, right]]) {
      if (end <= start) continue;
      if (warning) {
        rect(start, top, end - start, bottom - top, '#14344b');
        ctx.strokeStyle = '#6ce5ff66'; ctx.lineWidth = 1;
        for (let y = top - (end - start); y < bottom; y += 13) {
          ctx.beginPath(); ctx.moveTo(start, y); ctx.lineTo(end, y + end - start); ctx.stroke();
        }
        rect(start, bottom - 3 - frame.progress * 7, end - start, 3, '#c0f5ff');
      }
      if (erupting || fading) {
        const height = erupting ? Math.min(bottom - top, frame.height) : bottom - top,
          iceTop = bottom - height, opacity = fading ? 1 - frame.progress : 1;
        ctx.save(); ctx.globalAlpha = opacity;
        const ice = ctx.createLinearGradient(0, iceTop, 0, bottom);
        ice.addColorStop(0, '#ffffff'); ice.addColorStop(0.2, '#b6f4ff');
        ice.addColorStop(0.6, '#47bbdf'); ice.addColorStop(1, '#184568');
        ctx.fillStyle = ice; ctx.fillRect(start, iceTop, end - start, height);
        for (let x = start; x < end; x += 16) {
          const width = Math.min(19, end - x), inset = (Math.floor((x - start) / 16) % 3) * 8;
          ctx.beginPath(); ctx.moveTo(x, bottom); ctx.lineTo(x + width / 2, iceTop);
          ctx.lineTo(x + width, bottom - inset); ctx.closePath();
          ctx.fillStyle = '#e7fdffb0'; ctx.fill();
          ctx.beginPath(); ctx.moveTo(x + width / 2, iceTop + 8); ctx.lineTo(x + width / 2 + 3, bottom);
          ctx.strokeStyle = '#2e8ebc'; ctx.lineWidth = 2; ctx.stroke();
        }
        ctx.restore();
      }
    }
    // The drawn slit and damage boundaries use exactly the same edges.
    for (const edge of [frame.gap.left, frame.gap.right]) {
      rect(edge - 1, top, 2, bottom - top, erupting ? '#ffffff' : '#83edff');
      if (warning) {
        for (let y = top + 5; y < bottom; y += 18) rect(edge - 3, y, 6, 2, '#c5faff');
      }
    }
    if (warning) {
      ctx.strokeStyle = '#b3f5ff'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.arc((frame.gap.left + frame.gap.right) / 2, bottom - 11,
        4 + (1 - frame.progress) * 7, 0, Math.PI * 2); ctx.stroke();
    }
    ctx.restore();
    if (erupting && !reducedParticleMotion.matches) {
      ctx.save(); ctx.globalAlpha = (1 - frame.progress) * 0.65;
      ctx.strokeStyle = '#9deeff'; ctx.lineWidth = 2;
      ctx.strokeRect(a.x - 4, a.y - 4, a.width + 8, a.height + 8);
      ctx.restore();
    }
  }
  return { backdrop, field };
}
