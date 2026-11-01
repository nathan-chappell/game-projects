import { rescueSettings } from './battle-aftermath.js';

export function createAftermathDrawing(ctx, { rect, pixelText, drawNoelleBoss, battleSprites, reducedParticleMotion }) {
  const motion = () => !reducedParticleMotion.matches;
  function proneNoelle(x, y) {
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(1.6, 1.6);
    rect(-43, -2, 82, 6, '#171629');
    // Boots and a white dress trail behind her; her hair and hands rest on the floor.
    rect(-43, -10, 16, 10, '#302b40');
    rect(-46, -5, 19, 5, '#5a4661');
    rect(-31, -18, 44, 19, '#b3dce6');
    rect(-28, -22, 37, 17, '#fffaff');
    rect(-29, -8, 32, 6, '#6dd9f3');
    rect(-12, -25, 32, 15, '#ebf8ff');
    rect(4, -32, 27, 9, '#edb1c2');
    rect(8, -38, 7, 11, '#d8869c');
    rect(3, -34, 10, 5, '#d8869c');
    rect(13, -34, 23, 30, '#f5f2a2');
    rect(6, -29, 32, 23, '#f5f2a2');
    rect(17, -30, 22, 14, '#edb1c2');
    rect(28, -20, 14, 10, '#edb1c2');
    rect(25, -22, 8, 2, '#4c3349');
    rect(37, -17, 5, 4, '#b3274a');
    rect(10, -32, 12, 18, '#f5f2a2');
    rect(8, -18, 14, 15, '#e2d46e');
    rect(24, -9, 23, 6, '#fffaff');
    rect(40, -8, 8, 5, '#edb1c2');
    ctx.restore();
  }

  function ralsey(x, y, t, angry = false, healing = false) {
    battleSprites.ralsey(x, y, t, 1.25, angry, healing);
  }

  function actors(encounter, t) {
    const scene = encounter.rescue;
    if (!scene || scene.stage === 'done') {
      if (encounter.noelleEscaped) ralsey(392, 263, t, true);
      return;
    }
    const stage = scene.stage, age = scene.age;
    if (['strike', 'arrival', 'question', 'heal'].includes(stage)) {
      if (stage === 'strike' && age < rescueSettings.slash) {
        drawNoelleBoss(528, 124, 140);
      } else if (stage === 'heal' && age > rescueSettings.heal * 0.65) {
        const p = (age / rescueSettings.heal - 0.65) / 0.35;
        ctx.save(); ctx.translate(528,264);
        ctx.scale(1, reducedParticleMotion.matches ? 1 : 0.4 + p * 0.6);
        battleSprites.scaredNoelle(0,0,t,1.5);
        ctx.restore();
      } else {
        const tremble = motion() ? Math.round(Math.sin(t * 40) * 2) : 0;
        proneNoelle(528 + tremble, 265);
      }
    } else if (stage === 'release' || stage === 'escape') {
      const p = stage === 'escape' ? age / rescueSettings.escape : 0,
        tremble = motion() && stage === 'release' ? Math.round(Math.sin(t * 30)) : 0;
      battleSprites.scaredNoelle(528 + p * 190 + tremble,
        264 + (motion() && stage === 'escape' ? Math.sin(p * 35) * 2 : 0), t, 1.5, stage === 'escape');
    }
    if (stage !== 'strike') {
      const p = stage === 'arrival' ? age / rescueSettings.arrival : 1,
        x = motion() ? 690 + (427 - 690) * p : 427,
        jump = motion() ? Math.sin(p * Math.PI) * 80 : 0;
      rect(x - 22, 265, 44, 5, '#12101f88');
      ralsey(x, 264 - jump, t, stage === 'question' || stage === 'talk', stage === 'heal');
    }
    if (stage === 'heal') {
      const progress = age / rescueSettings.heal, alpha = Math.sin(progress * Math.PI);
      ctx.save();
      ctx.globalAlpha = alpha;
      const halo = ctx.createRadialGradient(528, 235, 8, 528, 235, 75);
      halo.addColorStop(0, '#caffcbcc'); halo.addColorStop(1, '#50ef9200');
      ctx.fillStyle = halo; ctx.fillRect(450, 155, 156, 124);
      ctx.strokeStyle = '#a2ffd1'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.ellipse(528, 264, 63, 10, 0, 0, Math.PI * 2); ctx.stroke();
      for (let i = 0; i < 12; i++) {
        const a = i * Math.PI * 2 / 12 + (motion() ? age * 1.8 : 0),
          radius = 30 + i % 3 * 10,
          x = 528 + Math.cos(a) * radius,
          y = 230 + Math.sin(a) * 30 - (motion() ? (age * 24 + i * 7) % 35 : 12);
        rect(x - 2, y - 5, 4, 10, '#c8ffe3'); rect(x - 5, y - 2, 10, 4, '#c8ffe3');
      }
      pixelText('+150 HP', 488, 167 - progress * 14, '#b9ffdc', 16);
      ctx.restore();
    }
  }
  return { actors };
}
