// Particle drawings use time to move a pattern. Reduced-motion mode holds it still.
import { T } from './config.js';
import { objectLayer } from './world.js';

export function createParticles(ctx, state, helpers) {
  const { rect, pixelText } = helpers;
  const current = () => state.project.rooms[state.roomIndex];
  const reducedParticleMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

  const darkWorldParticles = Array.from({ length: 56 }, (_, i) => ({
    x: (i * 173 + 29) % 640,
    y: (i * 97 + 41) % 480,
    speed: 7 + (i % 7) * 2,
    phase: i * 2.399,
    size: i % 5 === 0 ? 3 : 2,
    front: i % 4 === 0,
  }));

  const glitchStrands = [
    {
      color: '#ff3649',
      points: [
        [-97, -3],
        [-81, -22],
        [-49, -34],
        [-40, -34],
        [9, -3],
        [28, 35],
        [15, -25],
        [-23, -82],
        [-40, -85],
        [-28, -40],
        [-13, -15],
        [-17, 10],
      ],
    },
    {
      color: '#ff3046',
      points: [
        [-9, 2],
        [25, -38],
        [53, -51],
        [59, -53],
      ],
    },
    {
      color: '#ffe433',
      points: [
        [-86, 76],
        [-94, 33],
        [12, -3],
        [101, -15],
      ],
    },
    {
      color: '#fff042',
      points: [
        [-58, 56],
        [2, 9],
        [48, -37],
        [54, -14],
        [61, 36],
      ],
    },
    {
      color: '#5967ff',
      points: [
        [14, 72],
        [34, 70],
        [72, 58],
        [104, 45],
        [127, 26],
      ],
    },
    {
      color: '#747fff',
      points: [
        [10, -17],
        [20, 22],
        [15, 72],
      ],
    },
    {
      color: '#c5c6ce',
      points: [
        [-3, 49],
        [-7, -8],
        [22, -88],
        [39, -88],
        [59, -61],
      ],
    },
  ];

  function drawDarkWorldParticles(time, foreground) {
    if (
      current().theme !== 'dark' ||
      ['darkFurnace', 'coreEntrance', 'coreLower', 'coreDepths', 'glitchWorld', 'glitchBoss'].includes(current().scene)
    )
      return;
    const t = reducedParticleMotion.matches ? 0 : time;
    ctx.save();
    for (const particle of darkWorldParticles) {
      if (particle.front !== foreground) continue;
      const x = Math.floor((particle.x + Math.sin(t * 0.35 + particle.phase) * 16 + 640) % 640);
      const y = Math.floor((((particle.y - t * particle.speed) % 480) + 480) % 480);
      // Fade at the edges so motes appear and disappear softly as they rise.
      const edge = Math.min(1, y / 40, (480 - y) / 40);
      ctx.globalAlpha = edge * (0.28 + 0.18 * Math.sin(t * 0.8 + particle.phase));
      rect(x - 2, y - 2, particle.size + 4, particle.size + 4, '#ab64db');
      ctx.globalAlpha = edge * (0.55 + 0.2 * Math.sin(t * 0.8 + particle.phase));
      rect(x, y, particle.size, particle.size, foreground ? '#e7c7ff' : '#bb8add');
    }
    ctx.restore();
  }

  function drawPlacedParticles(time, foreground, layer = 'normal') {
    const t = reducedParticleMotion.matches ? 0 : time;
    ctx.save();
    for (const point of (current().particlePoints || []).filter((point) => objectLayer(point) === layer)) {
      const cx = point.x * T + 20,
        cy = point.y * T + 20;
      for (let i = 0; i < 12; i++) {
        if ((i % 4 === 0) !== foreground) continue;
        const phase = i * 2.399 + point.x * 0.7 + point.y;
        const life = ((t * (7 + (i % 5)) + i * 13) % 110) / 110;
        const x = Math.floor(cx + Math.sin(t * 0.5 + phase) * 24);
        const y = Math.floor(cy + 14 - life * 110);
        const opacity = Math.sin(life * Math.PI);
        ctx.globalAlpha = opacity * 0.18;
        rect(x - 2, y - 2, 6, 6, '#ab64db');
        ctx.globalAlpha = opacity * 0.8;
        rect(x, y, 2, 2, foreground ? '#e7c7ff' : '#c59ae9');
      }
      if (state.mode === 'build' && state.tool === 'particles' && !foreground) {
        ctx.globalAlpha = 0.85;
        ctx.strokeStyle = '#d3bcff';
        ctx.lineWidth = 1;
        ctx.setLineDash([3, 3]);
        ctx.strokeRect(cx - 18, cy - 18, 36, 36);
        ctx.setLineDash([]);
        pixelText('✦', cx - 5, cy + 5, '#ead8ff', 14);
      }
    }
    ctx.restore();
  }

  function drawGlitchPillar(point, t, foreground) {
    const width = (point.width ?? 1) * T,
      height = (point.height ?? 8) * T;
    const left = point.x * T + 20 - width / 2,
      bottom = point.y * T + T,
      top = bottom - height;
    const seed = point.x * 1.73 + point.y * 2.41,
      tick = Math.floor(t * 7 + seed);
    ctx.save();
    ctx.beginPath();
    ctx.rect(left, top, width, height);
    ctx.clip();
    // Repeated angular strands form one continuous column; each band jitters independently.
    for (let band = 0; band < Math.ceil(height / 52) + 1; band++) {
      for (const [i, strand] of glitchStrands.entries()) {
        if (state.mode !== 'build' && (i % 3 === 0) !== foreground) continue;
        const shift = reducedParticleMotion.matches ? 0 : Math.sin(tick * 2.7 + band * 3.4 + i) * 4;
        const rise = (t * 14 + band * 52) % (height + 52);
        ctx.strokeStyle = strand.color;
        ctx.globalAlpha = 0.8;
        ctx.beginPath();
        for (const [j, [px, py]] of strand.points.entries()) {
          const x = Math.round(left + width / 2 + (px * width) / 230 + shift) + 0.5;
          const y = Math.round(bottom - rise + py * 0.45) + 0.5;
          if (!j) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.stroke();
        ctx.globalAlpha = 0.6;
        rect(
          left + ((band * 17 + i * 11 + tick * 2) % Math.max(1, width)),
          bottom - rise + i * 3,
          2 + (i % 3),
          2,
          strand.color,
        );
      }
    }
    ctx.restore();
  }

  function drawGlitchParticles(time, foreground, layer = 'normal') {
    if (state.mode === 'build' && foreground) return;
    const t = reducedParticleMotion.matches ? 0 : time;
    ctx.save();
    ctx.lineWidth = 1;
    ctx.lineJoin = 'miter';
    for (const point of (current().glitchPoints || []).filter((point) => objectLayer(point) === layer)) {
      if (point.shape === 'pillar') {
        drawGlitchPillar(point, t, foreground);
        continue;
      }
      const cx = point.x * T + 20,
        cy = point.y * T + 20,
        seed = point.x * 1.73 + point.y * 2.41;
      const tick = Math.floor(t * 5 + seed),
        pulse = 1 + Math.sin(t * 1.8 + seed) * 0.08;
      for (const [i, strand] of glitchStrands.entries()) {
        if (state.mode !== 'build' && (i % 3 === 0) !== foreground) continue;
        const shift = reducedParticleMotion.matches ? 0 : Math.sin(tick * 2.7 + i * 4.1);
        ctx.globalAlpha = 0.8;
        ctx.strokeStyle = strand.color;
        ctx.beginPath();
        for (const [j, [px, py]] of strand.points.entries()) {
          const wobble = Math.sin(t * 2.2 + j * 1.9 + i + seed) * (j % 2 ? 1 : 2);
          const x = Math.round(cx + px * 0.25 * pulse + shift + wobble) + 0.5;
          const y = Math.round(cy + py * 0.25 * pulse + Math.cos(t * 1.6 + j + seed)) + 0.5;
          if (!j) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.stroke();
        // A short detached sliver jitters beside each colored strand.
        const [px, py] = strand.points[1];
        ctx.globalAlpha = 0.55;
        rect(cx + px * 0.25 + shift * 2, cy + py * 0.25 + 3, 2 + (i % 2), 1, strand.color);
      }
      if (!foreground) {
        ctx.globalAlpha = 0.8;
        rect(cx - 1, cy - 1, 2, 2, '#ecedff');
        if (state.mode === 'build' && state.tool === 'glitchParticles') {
          ctx.strokeStyle = '#ffe433';
          ctx.setLineDash([3, 3]);
          ctx.strokeRect(cx - 18, cy - 18, 36, 36);
          ctx.setLineDash([]);
          pixelText('GLITCH', cx - 18, cy + 31, '#ffe877', 9);
        }
      }
    }
    ctx.restore();
  }
  return {
    reducedParticleMotion,
    glitchStrands,
    drawDarkWorldParticles,
    drawPlacedParticles,
    drawGlitchPillar,
    drawGlitchParticles,
  };
}
