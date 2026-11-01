import { H, T, tiles, W } from '../../game/config.ts';
import type { Room } from '../../world/types.ts';

interface Dependencies {
  readonly current: () => Room;
  readonly reducedParticleMotion: MediaQueryList;
  readonly rect: (x: number, y: number, w: number, h: number, color: string) => void;
  readonly pixelText: (text: string, x: number, y: number, color: string, size?: number) => void;
  readonly ctx: CanvasRenderingContext2D;
}

export function createCoreDrawing(dependencies: Dependencies) {
  const ctx = dependencies.ctx;

  function drawCoreEntrance(time: number) {
    if (!['coreEntrance', 'coreLower', 'coreDepths'].includes(dependencies.current().scene ?? '')) return;
    const lower = dependencies.current().scene !== 'coreEntrance';
    const t = dependencies.reducedParticleMotion.matches ? 0 : time;
    // Steel catwalks sit between red-lit generators and coolant pipes.
    for (const x of [136, 424]) {
      dependencies.rect(x - 8, 64, 96, 240, '#161b2c');
      dependencies.rect(x - 4, 68, 88, 232, '#2d334a');
      dependencies.rect(x, 72, 80, 224, '#42455d');
      dependencies.rect(x + 4, 76, 72, 4, '#757b92');
      for (let row = 0; row < 5; row++) {
        const y = 88 + row * 40;
        dependencies.rect(x + 8, y, 64, 32, '#202538');
        dependencies.rect(x + 12, y + 4, 56, 3, '#69718b');
        for (let i = 0; i < 4; i++) dependencies.rect(x + 14, y + 12 + i * 4, 52, 2, '#353e55');
        dependencies.rect(x + 59, y + 7, 5, 4, Math.sin(t * 4 + row) > 0 ? '#ff5e68' : '#913b58');
      }
      dependencies.rect(x - 16, 92, 8, 184, '#334856');
      dependencies.rect(x - 14, 92, 3, 184, '#92c5d0');
      dependencies.rect(x + 84, 92, 8, 184, '#334856');
      dependencies.rect(x + 85, 92, 3, 184, '#92c5d0');
      for (const y of [100, 260]) {
        dependencies.rect(x - 20, y, 16, 8, '#658494');
        dependencies.rect(x + 80, y, 16, 8, '#658494');
      }
    }
    dependencies.rect(252, 20, 136, 52, '#2b3045');
    dependencies.rect(256, 24, 128, 44, '#5a617e');
    dependencies.rect(260, 28, 120, 36, '#121c29');
    dependencies.pixelText(
      dependencies.current().scene === 'coreDepths' ? 'DEEP CORE' : lower ? 'LOWER CORE' : 'C O R E',
      lower ? 268 : 282,
      51,
      '#baf8ed',
      lower ? 12 : 16,
    );
    if (lower) {
      dependencies.rect(276, 78, 88, 8, '#1c2131');
      for (let i = 0; i < 7; i++) dependencies.rect(280 + i * 12, 80, 6, 4, '#696e81');
      ctx.strokeStyle = '#526677';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(306, 85);
      ctx.lineTo(312, 107);
      ctx.lineTo(305, 119);
      ctx.moveTo(336, 85);
      ctx.lineTo(330, 101);
      ctx.lineTo(338, 112);
      ctx.stroke();
    }
    for (const x of [252, 380]) {
      dependencies.rect(x, 76, 8, 3, '#ff5461');
      dependencies.rect(x, 79, 8, 2, '#9e2547');
    }
    ctx.save();
    ctx.shadowColor = '#6ff5ed';
    ctx.shadowBlur = 9;
    ctx.fillStyle = '#8fdfdf';
    const map = dependencies.current().map;
    for (let y = 0; y < H; y++)
      for (let x = 0; x < W; x++) {
        if (![0, 6].includes(map[y][x])) continue;
        for (const [dx, dy] of [
          [0, -1],
          [0, 1],
          [-1, 0],
          [1, 0],
        ]) {
          const neighbor = map[y + dy]?.[x + dx];
          if (neighbor !== 1) continue;
          ctx.fillRect(x * T + (dx > 0 ? 38 : 0), y * T + (dy > 0 ? 38 : 0), dx ? 2 : T, dy ? 2 : T);
        }
      }
    ctx.restore();
    for (let i = 0; i < 12; i++) {
      const x = 110 + ((i * 43) % 420),
        y = 310 - ((i * 29 + t * (5 + (i % 3))) % 250);
      ctx.globalAlpha = 0.25 + (i % 3) * 0.12;
      dependencies.rect(x, y, 2, 2, '#83d9e2');
    }
    ctx.globalAlpha = 1;
  }

  function drawFurnaceRoom(time: number) {
    if (dependencies.current().scene !== 'darkFurnace') return;
    const t = dependencies.reducedParticleMotion.matches ? 0 : time;
    // Basalt bricks beneath the orange walkway.
    dependencies.rect(120, 400, 400, 80, '#4b0812');
    for (let row = 0; row < 5; row++)
      for (let col = 0; col < 21; col++) {
        const x = 120 + col * 20 - (row % 2) * 10,
          y = 400 + row * 16;
        const left = Math.max(120, x),
          right = Math.min(520, x + 18);
        if (right <= left) continue;
        dependencies.rect(left, y, right - left, 14, '#801c16');
        dependencies.rect(left, y, right - left, 3, '#a84419');
        dependencies.rect(left + 2, y + 4, Math.max(1, right - left - 4), 2, '#bc571c');
        dependencies.rect(left, y + 12, right - left, 2, '#551019');
      }
    // Lava pool and its yellow-hot surface, safely above the walkway.
    ctx.save();
    ctx.shadowColor = '#ff2500';
    ctx.shadowBlur = 18;
    ctx.fillStyle = '#e9090d';
    ctx.beginPath();
    ctx.ellipse(320, 252, 126, 20, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    for (let i = 0; i < 16; i++) {
      const x = 214 + ((i * 37) % 210),
        y = 242 + ((i * 11) % 25);
      dependencies.rect(x + Math.sin(t * 1.3 + i) * 3, y, 12 + (i % 4) * 4, 3, '#ffcc20');
      dependencies.rect(x + 5, y + 3, 6, 2, '#ffed42');
    }
    // The towering machine: dark burgundy panels, pipes and red-lit vents.
    dependencies.rect(222, 0, 196, 225, '#1a1017');
    dependencies.rect(232, 0, 176, 218, '#3e2028');
    for (const x of [230, 390]) {
      dependencies.rect(x, 0, 18, 183, '#170e14');
      dependencies.rect(x + 3, 0, 12, 180, '#512a31');
      dependencies.rect(x + 6, 0, 3, 180, '#734048');
      dependencies.rect(x - 8, 143, 34, 54, '#180d14');
      dependencies.rect(x - 5, 148, 28, 42, '#49232c');
      for (let j = 0; j < 4; j++) dependencies.rect(x, 158 + j * 6, 19, 3, '#1b1016');
      dependencies.rect(x - 3, 183, 25, 4, '#dc0e24');
    }
    for (const x of [252, 354]) {
      dependencies.rect(x, 48, 34, 151, '#170d13');
      dependencies.rect(x + 3, 51, 28, 146, '#492630');
      for (let j = 0; j < 4; j++) {
        dependencies.rect(x + 5 + j * 6, 54, 2, 138, '#201118');
        dependencies.rect(x + 5, 62 + j * 34, 25, 3, '#6a343d');
      }
      dependencies.rect(x + 7, 157, 20, 7, '#180d13');
      dependencies.rect(x + 10, 159, 3, 2, '#e30e28');
    }
    for (const [x, y, w, h] of [
      [218, 0, 44, 55],
      [378, 0, 44, 55],
      [265, 0, 45, 32],
      [332, 0, 45, 32],
      [295, 36, 51, 48],
      [292, 92, 57, 29],
    ]) {
      dependencies.rect(x, y, w, h, '#140c12');
      dependencies.rect(x + 3, y + 3, w - 6, h - 6, '#512731');
      dependencies.rect(x + 7, y + 7, w - 14, h - 14, '#180e16');
      dependencies.rect(x + 4, y + h - 7, w - 8, 3, '#783742');
    }
    for (const x of [218, 374]) {
      dependencies.rect(x, 55, 48, 9, '#1b1015');
      dependencies.rect(x + 5, 64, 38, 6, '#49252d');
      dependencies.rect(x + 9, 70, 30, 4, '#ed0928');
      dependencies.rect(x + 15, 74, 22, 3, '#8a1023');
    }
    dependencies.rect(304, 84, 32, 10, '#6d1b2b');
    dependencies.rect(301, 94, 38, 5, '#f1152a');
    dependencies.rect(307, 100, 27, 4, '#8b0d22');
    dependencies.rect(284, 167, 72, 42, '#2b1920');
    dependencies.rect(286, 168, 68, 4, '#6a343b');
    for (let j = 0; j < 4; j++) dependencies.rect(286, 180 + j * 9, 68, 2, '#170d15');
    for (let i = 0; i < 3; i++) {
      dependencies.rect(218 - i * 5, 213 + i * 8, 204 + i * 10, 6, '#5e2330');
      dependencies.rect(218 - i * 5, 219 + i * 8, 204 + i * 10, 2, '#c10d24');
    }
    ctx.strokeStyle = '#130c12';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(299, 113);
    ctx.lineTo(299, 144);
    ctx.lineTo(281, 162);
    ctx.lineTo(281, 200);
    ctx.stroke();
    // Small embers replace the violet motes in this hot chamber.
    for (let i = 0; i < 22; i++) {
      const x = 210 + ((i * 43) % 224),
        y = 270 - ((t * (8 + (i % 4)) + i * 19) % 250);
      ctx.globalAlpha = 0.25 + (i % 3) * 0.16;
      dependencies.rect(x + Math.sin(t + i) * 5, y, 2, 2, '#ff6b24');
    }
    ctx.globalAlpha = 1;
  }

  function drawPassageGlow(time: number) {
    if (
      !['darkGlowPassage', 'darkJumpIslands', 'darkWindingPassage'].includes(
        dependencies.current().scene ?? '',
      )
    )
      return;
    if (dependencies.current().scene === 'darkJumpIslands') return;
    const alpha = dependencies.reducedParticleMotion.matches ? 0.32 : 0.32 + Math.sin(time * 1.4) * 0.05;
    ctx.save();
    // Trace all platform boundaries, including the lower landing.
    for (let y = 0; y < H; y++)
      for (let x = 0; x < W; x++) {
        if (tiles[dependencies.current().map[y][x]].solid) continue;
        for (const [dx, dy] of [
          [0, -1],
          [0, 1],
          [-1, 0],
          [1, 0],
        ]) {
          const neighbor = dependencies.current().map[y + dy]?.[x + dx];
          if (neighbor === undefined || !tiles[neighbor].solid) continue;
          const edgeX = x * T + (dx > 0 ? T : 0),
            edgeY = y * T + (dy > 0 ? T : 0);
          const glow = ctx.createLinearGradient(edgeX, edgeY, edgeX - dx * 14, edgeY - dy * 14);
          glow.addColorStop(0, 'rgba(194,112,239,' + alpha + ')');
          glow.addColorStop(1, 'rgba(163,73,164,0)');
          ctx.fillStyle = glow;
          ctx.fillRect(
            dx ? edgeX - (dx > 0 ? 14 : 0) : x * T,
            dy ? edgeY - (dy > 0 ? 14 : 0) : y * T,
            dx ? 14 : T,
            dy ? 14 : T,
          );
        }
      }
    ctx.restore();
  }

  return { drawCoreEntrance, drawFurnaceRoom, drawPassageGlow };
}
