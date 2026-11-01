import { T } from '../game/config.ts';
import type { ObjectGroup } from '../game/services.ts';
import type { GameState } from '../game/types.ts';
import type { Npc, PlacedObject, Room, Tree } from '../world/types.ts';
import { objectLayer } from '../world/validation.ts';

interface Dependencies {
  readonly rect: (x: number, y: number, w: number, h: number, color: string) => void;
  readonly roomBackground: (room?: Room | undefined) => string;
  readonly current: () => Room;
  readonly pixelText: (text: string, x: number, y: number, color: string, size?: number) => void;
  readonly roomSpikes: (room?: Room | undefined) => PlacedObject[];
  readonly ctx: CanvasRenderingContext2D;
  readonly state: GameState;
  readonly drawPlacedParticles: (time: number, foreground: boolean, layer?: string) => void;
  readonly drawGlitchParticles: (time: number, foreground: boolean, layer?: string) => void;
  readonly drawJumpPads: (layer?: string) => void;
  readonly drawSavePoint: (time: number, layer?: string) => void;
  readonly roomTrees: (room?: Room | undefined) => Tree[];
  readonly drawDarkTree: (tree: Tree) => void;
  readonly roomNpcs: () => Npc[];
  readonly drawNpc: (npc: Npc) => void;
  readonly roomObjectGroups: () => ObjectGroup[];
}

export function createTerrainDrawing(dependencies: Dependencies) {
  const state = dependencies.state;
  const ctx = dependencies.ctx;

  function drawTile(id: number, x: number, y: number, theme: string) {
    if (id === 10) {
      dependencies.rect(x, y, T, T, dependencies.roomBackground());
      return;
    }
    const color = dependencies.current().tileColors?.[x / T + ',' + y / T];
    if (color) {
      dependencies.rect(x, y, T, T, color);
      return;
    }
    if (
      ['glitchWorld', 'glitchBoss'].includes(dependencies.current().scene ?? '') &&
      [0, 1, 6].includes(id)
    ) {
      dependencies.rect(x, y, T, T, id === 1 ? dependencies.roomBackground() : '#c3c3c3');
      return;
    }
    if (dependencies.current().scene === 'glitchStudio' && [0, 1, 6].includes(id)) {
      if (id === 1) {
        dependencies.rect(x, y, T, T, dependencies.roomBackground());
        return;
      }
      dependencies.rect(x, y, T, T, '#fff0c8');
      if (id === 6) {
        dependencies.rect(x + 3, y + 1, 34, 38, '#080b17');
        dependencies.rect(x + 4, y + 2, 3, 36, '#7be3dc');
        dependencies.rect(x + 33, y + 2, 3, 36, '#d376c2');
        dependencies.pixelText(x === 0 ? '<' : '>', x + 12, y + 26, '#b9f7ef', 20);
      }
      return;
    }
    if (dependencies.current().scene === 'glitchBackstage' && [0, 1, 6].includes(id)) {
      dependencies.rect(
        x,
        y,
        T,
        T,
        id === 1 ? dependencies.roomBackground() : (x / T) % 2 ? '#513019' : '#56341c',
      );
      if (id === 6) {
        dependencies.rect(x + 3, y + 1, 34, 38, '#130f0c');
        dependencies.rect(x + 4, y + 2, 3, 36, '#d19752');
        dependencies.rect(x + 33, y + 2, 3, 36, '#af743b');
        dependencies.pixelText(y < 200 ? '^' : x === 0 ? '<' : '>', x + 12, y + 26, '#f5d498', 20);
      }
      return;
    }
    if (dependencies.current().scene === 'tennaStorage' && [0, 1, 6, 7].includes(id)) {
      dependencies.rect(x, y, T, T, id === 1 ? dependencies.roomBackground() : '#141c26');
      if (id === 7) {
        dependencies.rect(x + 1, y + 1, 38, 38, '#070c12');
        dependencies.rect(x + 3, y + 4, 34, 31, '#2c3640');
        dependencies.rect(x + 3, y + 4, 34, 3, '#64717c');
        dependencies.rect(x + 6, y + 11, 28, 2, '#111a24');
        dependencies.rect(x + 6, y + 25, 28, 2, '#111a24');
        dependencies.rect(x + 8, y + 15, 9, 6, '#4b5965');
        dependencies.rect(x + 10, y + 17, 5, 2, '#111a24');
        dependencies.rect(x + 31, y + 7, 2, 27, '#4c5961');
      }
      if (id === 6) {
        dependencies.rect(x + 3, y + 1, 34, 38, '#060a10');
        dependencies.rect(x + 4, y + 2, 3, 36, '#658c98');
        dependencies.rect(x + 33, y + 2, 3, 36, '#435d71');
        dependencies.pixelText(x === 0 ? '<' : '>', x + 12, y + 26, '#cce2e6', 20);
      }
      return;
    }
    if (
      ['coreEntrance', 'coreLower', 'coreDepths'].includes(dependencies.current().scene ?? '') &&
      [0, 1, 6].includes(id)
    ) {
      if (id === 1) {
        dependencies.rect(x, y, T, T, dependencies.roomBackground());
        return;
      }
      dependencies.rect(x, y, T, T, '#323549');
      dependencies.rect(x + 2, y + 2, 36, 36, '#5a607a');
      dependencies.rect(x + 3, y + 3, 34, 2, '#8991a8');
      dependencies.rect(x + 3, y + 36, 34, 2, '#252939');
      for (const ox of [5, 33]) for (const oy of [6, 32]) dependencies.rect(x + ox, y + oy, 2, 2, '#b4c5d5');
      if (id === 6) {
        dependencies.rect(x + 5, y, 30, T, '#141b2a');
        dependencies.rect(x + 5, y, 3, T, '#8bdddc');
        dependencies.rect(x + 32, y, 3, T, '#8bdddc');
        dependencies.pixelText('EXIT', x + 9, y + 23, '#d0fcf1', 9);
      }
      return;
    }
    if (dependencies.current().scene === 'darkFurnace' && (id === 0 || id === 1 || id === 6)) {
      if (id === 1) dependencies.rect(x, y, T, T, dependencies.roomBackground());
      else {
        dependencies.rect(x, y, T, T, '#b45716');
        for (let i = 0; i < 5; i++)
          dependencies.rect(x + ((i * 11 + y) % 38), y + ((i * 17 + x) % 37), 2, 2, '#bb601b');
        if (y === 280) {
          dependencies.rect(x, y, T, 4, '#55131c');
          for (let i = 0; i < 5; i++) {
            dependencies.rect(x + i * 8, y + 3, 6, 4, '#872d17');
            dependencies.rect(x + i * 8 + 2, y + 7, 3, 2, '#6b2016');
          }
        }
        if (y === 360) for (let i = 0; i < 5; i++) dependencies.rect(x + i * 8, y + 35, 5, 5, '#762016');
      }
      return;
    }
    if (dependencies.current().scene === 'darkGoldenHall' && (id === 0 || id === 1 || id === 6)) {
      dependencies.rect(x, y, T, T, id === 1 ? dependencies.roomBackground() : '#000000');
      return;
    }
    if (
      id === 1 &&
      dependencies.current().backgroundColor &&
      dependencies.current().scene !== 'darkJumpIslands'
    ) {
      dependencies.rect(x, y, T, T, dependencies.roomBackground());
      return;
    }
    if (dependencies.current().scene === 'darkJumpIslands' && (id === 0 || id === 1 || id === 6)) return;
    if (theme === 'dark' && (id === 0 || id === 1 || id === 6)) {
      dependencies.rect(x, y, T, T, id === 1 ? dependencies.roomBackground() : '#000000');
      return;
    }
    const garden = theme === 'garden',
      castle = theme === 'castle';
    dependencies.rect(x, y, T, T, garden ? '#53604b' : '#65516e');
    if (id !== 1 && id !== 4) {
      dependencies.rect(
        x + 2,
        y + 2,
        36,
        36,
        garden ? ((x + y) % 80 ? '#596950' : '#5c6c53') : (x + y) % 80 ? '#705b79' : '#745e7d',
      );
      if (!garden) {
        dependencies.rect(x + 3, y + 3, 34, 2, '#806a89');
        dependencies.rect(x + 3, y + 35, 34, 2, '#5d4868');
      } else {
        dependencies.rect(x + 8, y + 12, 3, 5, '#71815f');
        dependencies.rect(x + 30, y + 27, 3, 4, '#46563f');
      }
    }
    if (castle) {
      dependencies.rect(x, y, 40, 40, '#34323f');
      dependencies.rect(x + 1, y + 1, 38, 37, (x + y) % 80 ? '#555160' : '#5b5666');
      dependencies.rect(x + 2, y + 2, 36, 2, '#676272');
      dependencies.rect(x + 2, y + 36, 36, 2, '#45414f');
      if ((x / T + (y / T) * 3) % 7 === 0) {
        dependencies.rect(x + 14, y + 10, 2, 9, '#3e3b48');
        dependencies.rect(x + 16, y + 18, 7, 2, '#3e3b48');
        dependencies.rect(x + 21, y + 20, 2, 6, '#3e3b48');
      }
    }
    if (id === 1) {
      if (castle) {
        dependencies.rect(x, y, 40, 40, '#24232e');
        dependencies.rect(x + 1, y + 1, 38, 17, '#44414f');
        dependencies.rect(x + 2, y + 2, 36, 2, '#5e586b');
        dependencies.rect(x + 1, y + 20, 18, 17, '#3a3746');
        dependencies.rect(x + 21, y + 20, 18, 17, '#403c4c');
        if (y === 40) {
          dependencies.rect(x, y + 30, 40, 5, '#797081');
          dependencies.rect(x, y + 36, 40, 4, '#211f2c');
        }
      } else if (garden) {
        dependencies.rect(x, y, 40, 40, '#253c35');
        dependencies.rect(x + 3, y + 4, 34, 30, '#345244');
        dependencies.rect(x + 7, y + 3, 12, 10, '#42614b');
        dependencies.rect(x + 25, y + 21, 10, 10, '#2d493d');
        dependencies.rect(x + 5, y + 33, 30, 5, '#1d302d');
      } else {
        dependencies.rect(x, y, 40, 40, '#30223d');
        dependencies.rect(x + 2, y + 2, 36, 31, '#45314f');
        dependencies.rect(x + 3, y + 4, 34, 3, '#59405f');
        dependencies.rect(x, y + 34, 40, 6, '#211b30');
        dependencies.rect(x + 17, y + 6, 2, 25, '#382641');
        if (y === 40) {
          dependencies.rect(x, y + 29, 40, 6, '#9b779a');
          dependencies.rect(x, y + 35, 40, 5, '#3c2b47');
        }
      }
    }
    if (id === 2) {
      dependencies.rect(x, y, 40, 40, castle ? '#5e344d' : '#95516f');
      dependencies.rect(x + 2, y + 2, 36, 36, castle ? '#78435b' : '#a65d7c');
      dependencies.rect(x + 18, y + 17, 4, 6, castle ? '#99657b' : '#bb7d8c');
      if (castle && (x / T + y / T) % 4 === 0) {
        dependencies.rect(x + 7, y + 26, 11, 2, '#60394d');
        dependencies.rect(x + 9, y + 28, 6, 2, '#60394d');
      }
      const cx = x / T,
        cy = y / T,
        m = dependencies.current().map;
      for (const [dx, dy, rx, ry, rw, rh] of [
        [-1, 0, 0, 0, 3, 40],
        [1, 0, 37, 0, 3, 40],
        [0, -1, 0, 0, 40, 3],
        [0, 1, 0, 37, 40, 3],
      ])
        if (!m[cy + dy] || m[cy + dy][cx + dx] !== 2) dependencies.rect(x + rx, y + ry, rw, rh, '#d5b58e');
    }
    if (id === 3) {
      for (const [ox, oy, c] of [
        [12, 12, '#e1b8cb'] as const,
        [27, 23, '#eaca8c'] as const,
        [10, 30, '#c3b9dd'] as const,
      ]) {
        dependencies.rect(x + ox, y + oy, 2, 8, '#304939');
        dependencies.rect(x + ox - 3, y + oy - 3, 8, 6, c);
        dependencies.rect(x + ox - 1, y + oy - 5, 4, 10, c);
        dependencies.rect(x + ox, y + oy - 1, 2, 2, '#f9e8b3');
      }
    }
    if (id === 4) {
      dependencies.rect(x, y, 40, 40, '#355c70');
      dependencies.rect(x + 2, y + 2, 36, 36, '#426f85');
      dependencies.rect(x + 7, y + 10, 13, 2, '#739bad');
      dependencies.rect(x + 24, y + 25, 10, 2, '#83a5af');
      dependencies.rect(x + 7, y + 30, 8, 2, '#30596e');
    }
    if (id === 5) {
      dependencies.rect(x, y + 2, 40, 36, '#ad9c7a');
      dependencies.rect(x + 2, y + 4, 36, 31, '#c2af8b');
      dependencies.rect(x + 7, y + 12, 5, 2, '#d9c8a3');
      dependencies.rect(x + 25, y + 27, 7, 2, '#a18d6f');
    }
    if (id === 6) {
      dependencies.rect(x, y, 40, 40, '#292031');
      dependencies.rect(x + 3, y + 2, 34, 38, '#ba976a');
      dependencies.rect(x + 7, y + 3, 26, 37, '#302637');
      dependencies.rect(x + 10, y + 8, 20, 32, '#3f3647');
      dependencies.rect(x + 8, y + 35, 24, 5, '#dec590');
      dependencies.rect(x + 13, y + 36, 14, 2, '#f2dfb7');
    }
    if (id === 8) {
      dependencies.rect(x + 3, y + 31, 34, 7, '#2e2c39');
      dependencies.rect(x + 5, y + 27, 30, 8, '#888093');
      dependencies.rect(x + 10, y + 5, 20, 23, '#6e687c');
      dependencies.rect(x + 11, y + 6, 4, 20, '#a39aaf');
      dependencies.rect(x + 23, y + 6, 5, 21, '#4c485d');
      dependencies.rect(x + 5, y + 1, 30, 6, '#9990a5');
      dependencies.rect(x + 3, y, 34, 3, '#b2a6b8');
    }
    if (id === 9) {
      dependencies.rect(x + 8, y + 23, 10, 6, '#34303e');
      dependencies.rect(x + 7, y + 20, 10, 5, '#8b8295');
      dependencies.rect(x + 21, y + 11, 12, 8, '#3e394a');
      dependencies.rect(x + 20, y + 8, 12, 7, '#9890a2');
      dependencies.rect(x + 17, y + 30, 6, 4, '#746c7f');
    }
    if (id === 7) {
      dependencies.rect(x + 4, y + 29, 5, 10, '#3f2b32');
      dependencies.rect(x + 31, y + 29, 5, 10, '#3f2b32');
      dependencies.rect(x + 2, y + 6, 36, 26, '#674655');
      dependencies.rect(x, y + 3, 40, 24, '#ba8d68');
      dependencies.rect(x + 2, y + 4, 36, 3, '#dfb78a');
      dependencies.rect(x + 3, y + 24, 34, 4, '#835c53');
      dependencies.rect(x + 10, y + 9, 18, 12, '#537c83');
      dependencies.rect(x + 13, y + 10, 12, 8, '#c6d0ba');
      dependencies.rect(x + 11, y + 9, 3, 12, '#355662');
    }
  }

  function drawSpikes(layer = 'normal') {
    for (const point of dependencies.roomSpikes().filter((point) => objectLayer(point) === layer)) {
      const x = point.x * T,
        y = point.y * T;
      dependencies.rect(x + 3, y + 29, 34, 6, '#553648');
      for (let i = 0; i < 3; i++) {
        const sx = x + 4 + i * 11;
        ctx.beginPath();
        ctx.moveTo(sx, y + 30);
        ctx.lineTo(sx + 5, y + 9);
        ctx.lineTo(sx + 10, y + 30);
        ctx.closePath();
        ctx.fillStyle = '#d0c3d8';
        ctx.fill();
        ctx.strokeStyle = '#332238';
        ctx.lineWidth = 2;
        ctx.stroke();
        dependencies.rect(sx + 4, y + 11, 2, 6, '#f05b86');
      }
      if (state.mode === 'build' && state.tool === 'spike') {
        ctx.strokeStyle = '#f05b86';
        ctx.lineWidth = 1;
        ctx.strokeRect(x + 1, y + 1, 38, 38);
      }
    }
  }

  function drawLayerObjects(layer: string, time: number) {
    dependencies.drawPlacedParticles(time, false, layer);
    dependencies.drawPlacedParticles(time, true, layer);
    dependencies.drawGlitchParticles(time, false, layer);
    dependencies.drawGlitchParticles(time, true, layer);
    drawSpikes(layer);
    dependencies.drawJumpPads(layer);
    dependencies.drawSavePoint(time, layer);
    const actors = dependencies
      .roomTrees()
      .filter((object) => objectLayer(object) === layer)
      .map((tree) => ({
        y: tree.y,
        draw: () => dependencies.drawDarkTree({ ...tree, x: tree.x * T + 20, y: tree.y * T + 20 }),
      }));
    for (const npc of dependencies.roomNpcs().filter((object) => objectLayer(object) === layer))
      actors.push({ y: npc.y, draw: () => dependencies.drawNpc(npc) });
    actors.sort((a, b) => a.y - b.y).forEach((actor) => actor.draw());
  }

  function drawObjectMarkers() {
    if (
      state.mode !== 'build' ||
      (!state.layerApplyMode &&
        state.placementLayer === 'normal' &&
        !['edit', 'delete', 'glitchPillar'].includes(String(state.tool)))
    )
      return;
    ctx.save();
    ctx.lineWidth = 1;
    ctx.setLineDash([3, 3]);
    for (const [, objects] of dependencies.roomObjectGroups())
      for (const object of objects) {
        const layer = objectLayer(object),
          x = object.x * T,
          y = object.y * T;
        ctx.strokeStyle = layer === 'ground' ? '#25c9df' : layer === 'back' ? '#ffae42' : '#b45cdb';
        ctx.strokeRect(x + 2, y + 2, 36, 36);
        if (object.shape === 'pillar') {
          const w = (object.width ?? 1) * T,
            h = (object.height ?? 8) * T;
          ctx.strokeRect(x + 20 - w / 2, y + T - h, w, h);
        }
        if (state.layerApplyMode || state.placementLayer !== 'normal')
          dependencies.pixelText(
            layer === 'ground' ? 'GROUND' : layer === 'back' ? 'BEHIND' : 'NORMAL',
            x + 2,
            y + 12,
            ctx.strokeStyle,
            8,
          );
      }
    ctx.restore();
  }

  return { drawTile, drawSpikes, drawLayerObjects, drawObjectMarkers };
}
