import { syncMobileControls } from '../game/mobile-controls.ts';
import { drawKnightTeleporter } from '../battle/knights/teleporter.ts';
import { createKnightPathDrawing } from '../rooms/post-show/knight-path-drawing.ts';
import { postShowScene } from '../rooms/post-show/post-show.ts';
import { drawPostShowRoom } from '../rooms/post-show/post-show-drawing.ts';
import { present } from '../game/invariants.ts';
import type { GameServices } from '../game/services.ts';
import { createTravelDrawing } from '../game/travel-drawing.ts';
import type { GameState } from '../game/types.ts';
import { createCoreDrawing } from '../rooms/core/drawing.ts';
import { createFountainDrawing } from '../rooms/fountain/drawing.ts';
import { createGlitchArrivalDrawing } from '../rooms/glitch-studio/arrival-drawing.ts';
import { createTerrainDrawing } from './terrain.ts';
// The renderer paints one frame. Game rules and saving stay in game.js.
import { createBattleDrawing } from '../battle/shared/battle.ts';
import { H, itemDefinitions, T, tiles, W } from '../game/config.ts';
import { nextTreeItem } from '../inventory/tree-items.ts';
import { createBackstageDrawing } from '../rooms/backstage/backstage-drawing.ts';
import { tennaArrivalSettings, tennaEntrancePose } from '../rooms/backstage/tenna-story.ts';
import { createTrafficDrawing } from '../rooms/crossing/traffic-drawing.ts';
import { jumpIslandPlatforms } from '../rooms/dark-world/world.ts';
import { createGlitchStudioDrawing } from '../rooms/glitch-studio/glitch-studio-drawing.ts';
import { createCollisionChamberDrawing } from '../rooms/monochrome-chamber/collision-chamber-drawing.ts';
import { createQueenRoomDrawing } from '../rooms/queen-terminal/queen-room-drawing.ts';
import { createRooftopDrawing } from '../rooms/rooftop/neon-rooftop-drawing.ts';
import { createStorageDrawing } from '../rooms/storage/storage-drawing.ts';
import { createHallwayDrawing } from '../rooms/storage/storage-travel-drawing.ts';
import { createHallway } from '../rooms/storage/storage-travel.ts';
import { objectLayer } from '../world/validation.ts';
import { createParticles } from './particles.ts';
import { createSprites } from './sprites.ts';
export function createRenderer(
  ctx: CanvasRenderingContext2D,
  state: GameState,
  helpers: Pick<
    GameServices,
    | 'roomBackground'
    | '$'
    | 'roomSavePoints'
    | 'glitchComfortPose'
    | 'roomNpcs'
    | 'roomTrees'
    | 'roomWaitingFriends'
    | 'roomSpikes'
    | 'roomObjectGroups'
    | 'divePose'
    | 'floweyPosition'
    | 'partyFriends'
    | 'facingFountain'
    | 'nearbyCandyTree'
    | 'nearbyNpc'
    | 'nearFountainFriend'
    | 'nearFlowey'
    | 'fountainFriends'
    | 'nearSavePoint'
    | 'importantKinds'
    | 'friendsWaiting'
  >,
) {
  const { drawPadJump, drawHoleFall, drawCoreCollapse } = createTravelDrawing({
    get state() {
      return state;
    },
    get reducedParticleMotion() {
      return reducedParticleMotion;
    },
    get ctx() {
      return ctx;
    },
    get drawPlayer() {
      return drawPlayer;
    },
    get drawFlowey() {
      return drawFlowey;
    },
    get drawFountainFriend() {
      return drawFountainFriend;
    },
  });
  const { drawGlitchComfort, drawComfortingArm, drawWaitingFriends, drawGlitchDescent } =
    createGlitchArrivalDrawing({
      get $() {
        return $;
      },
      get reducedParticleMotion() {
        return reducedParticleMotion;
      },
      get glitchComfortPose() {
        return glitchComfortPose;
      },
      get state() {
        return state;
      },
      get roomNpcs() {
        return roomNpcs;
      },
      get drawNpc() {
        return drawNpc;
      },
      get roomTrees() {
        return roomTrees;
      },
      get drawDarkTree() {
        return drawDarkTree;
      },
      get drawPlayer() {
        return drawPlayer;
      },
      get drawFlowey() {
        return drawFlowey;
      },
      get drawFountainFriend() {
        return drawFountainFriend;
      },
      get ctx() {
        return ctx;
      },
      get rect() {
        return rect;
      },
      get roomWaitingFriends() {
        return roomWaitingFriends;
      },
      get glitchStrands() {
        return glitchStrands;
      },
    });
  const { drawTile, drawSpikes, drawLayerObjects, drawObjectMarkers } = createTerrainDrawing({
    get rect() {
      return rect;
    },
    get roomBackground() {
      return roomBackground;
    },
    get current() {
      return current;
    },
    get pixelText() {
      return pixelText;
    },
    get roomSpikes() {
      return roomSpikes;
    },
    get ctx() {
      return ctx;
    },
    get state() {
      return state;
    },
    get drawPlacedParticles() {
      return drawPlacedParticles;
    },
    get drawGlitchParticles() {
      return drawGlitchParticles;
    },
    get drawJumpPads() {
      return drawJumpPads;
    },
    get drawSavePoint() {
      return drawSavePoint;
    },
    get roomTrees() {
      return roomTrees;
    },
    get drawDarkTree() {
      return drawDarkTree;
    },
    get roomNpcs() {
      return roomNpcs;
    },
    get drawNpc() {
      return drawNpc;
    },
    get roomObjectGroups() {
      return roomObjectGroups;
    },
  });
  const { drawCoreEntrance, drawFurnaceRoom, drawPassageGlow } = createCoreDrawing({
    get current() {
      return current;
    },
    get reducedParticleMotion() {
      return reducedParticleMotion;
    },
    get rect() {
      return rect;
    },
    get pixelText() {
      return pixelText;
    },
    get ctx() {
      return ctx;
    },
  });
  const { drawFountain, drawDive, drawBuster } = createFountainDrawing({
    get current() {
      return current;
    },
    get rect() {
      return rect;
    },
    get state() {
      return state;
    },
    get ctx() {
      return ctx;
    },
    get divePose() {
      return divePose;
    },
    get drawPlayer() {
      return drawPlayer;
    },
    get drawFlowey() {
      return drawFlowey;
    },
    get drawFountainFriend() {
      return drawFountainFriend;
    },
    get pixelText() {
      return pixelText;
    },
  });
  const {
    roomBackground,
    $,
    roomSavePoints,
    glitchComfortPose,
    roomNpcs,
    roomTrees,
    roomWaitingFriends,
    roomSpikes,
    roomObjectGroups,
    divePose,
    floweyPosition,
    partyFriends,
    facingFountain,
    nearbyCandyTree,
    nearbyNpc,
    nearFountainFriend,
    nearFlowey,
    fountainFriends,
    nearSavePoint,
    importantKinds,
    friendsWaiting,
  } = helpers;
  const current = () => state.project.rooms[state.roomIndex];
  const {
    rect,
    pixelText,
    drawGoldenDoor,
    drawNoelleBoss,
    drawTenna,
    drawDarkTree,
    drawFountainFriend,
    drawNpc,
    drawFlowey,
    drawPlayer,
  } = createSprites(ctx, state);
  const {
    reducedParticleMotion,
    glitchStrands,
    drawDarkWorldParticles,
    drawPlacedParticles,
    drawGlitchParticles,
  } = createParticles(ctx, state, { rect, pixelText });
  const glitchStudioDrawing = createGlitchStudioDrawing(ctx, { rect, reducedParticleMotion });
  const drawKnightPath = createKnightPathDrawing(
    ctx,
    { drawPlayer, drawFlowey, drawFountainFriend },
    reducedParticleMotion,
    pixelText,
  );
  const backstageDrawing = createBackstageDrawing(ctx, { rect });
  const storageDrawing = createStorageDrawing(ctx, { rect, reducedParticleMotion });
  const drawHallway = createHallwayDrawing(ctx, {
    rect,
    pixelText,
    drawPlayer,
    drawFlowey,
    drawFountainFriend,
    reducedParticleMotion,
  });
  const trafficDrawing = createTrafficDrawing(ctx, { rect, pixelText, reducedParticleMotion });
  const drawRooftop = createRooftopDrawing(ctx, { rect, pixelText, reducedParticleMotion });
  const drawCollisionChamber = createCollisionChamberDrawing(ctx);
  const drawQueenRoom = createQueenRoomDrawing(ctx, { rect, pixelText, reducedParticleMotion });
  const { drawBossEncounter } = createBattleDrawing(ctx, state, {
    rect,
    drawFlowey,
    pixelText,
    reducedParticleMotion,
    roomBackground,
    drawTile,
    drawLayerObjects,
    drawPlacedParticles,
    drawGlitchParticles,
    drawNoelleBoss,
    $,
    drawFountainFriend,
  });
  function drawSavePoint(time: number, layer = 'normal') {
    for (const tile of roomSavePoints().filter((point) => objectLayer(point) === layer)) {
      const point = { x: tile.x * T + 20, y: tile.y * T + 20 };
      const pulse = window.matchMedia('(prefers-reduced-motion: reduce)').matches
        ? 0
        : Math.sin(time * 3) * 2;
      ctx.save();
      ctx.translate(Math.round(point.x), Math.round(point.y - 18 + pulse));
      // A golden, four-point save star, with the dark outline from the reference.
      ctx.beginPath();
      ctx.moveTo(-14, -14);
      ctx.lineTo(0, -6);
      ctx.lineTo(14, -14);
      ctx.lineTo(6, 0);
      ctx.lineTo(14, 14);
      ctx.lineTo(0, 6);
      ctx.lineTo(-14, 14);
      ctx.lineTo(-6, 0);
      ctx.closePath();
      ctx.lineWidth = 5;
      ctx.strokeStyle = '#17100b';
      ctx.stroke();
      ctx.fillStyle = '#fff03b';
      ctx.fill();
      rect(-2, -2, 4, 4, '#fff9b0');
      ctx.restore();
      if (
        state.mode === 'play' &&
        Math.hypot(state.player.x - point.x, state.player.y - point.y) < 64 &&
        !state.dialogue
      )
        pixelText('C / Z · SAVE', point.x - 43, point.y - 43, '#fff1a0', 10);
    }
  }
  function drawJumpPads(layer = 'normal') {
    for (const pad of (current().jumpPads || []).filter((point) => objectLayer(point) === layer)) {
      const x = pad.x * T + 20,
        y = pad.y * T + 20;
      if (pad.targetRoom !== undefined && pad.targetRoom !== state.roomIndex) {
        ctx.save();
        ctx.shadowColor = '#ffb52e';
        ctx.shadowBlur = 12;
        rect(x - 18, y - 5, 36, 17, '#553227');
        rect(x - 17, y - 8, 34, 10, '#ffe377');
        rect(x - 13, y + 5, 26, 4, '#ab602a');
        ctx.restore();
        pixelText('CORE', x - 14, y + 25, '#ffe377', 10);
      }
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(Math.atan2((pad.launchY ?? pad.targetY) - pad.y, (pad.launchX ?? pad.targetX) - pad.x));
      ctx.shadowColor = '#ff174d';
      ctx.shadowBlur = 9;
      ctx.fillStyle = '#f21842';
      ctx.beginPath();
      ctx.moveTo(-12, -6);
      ctx.lineTo(0, -6);
      ctx.lineTo(0, -13);
      ctx.lineTo(15, 0);
      ctx.lineTo(0, 13);
      ctx.lineTo(0, 6);
      ctx.lineTo(-12, 6);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
      if (state.mode === 'build' && state.tool === 'jumpPad') {
        ctx.strokeStyle = '#ff839b';
        ctx.strokeRect(pad.x * T + 1, pad.y * T + 1, 38, 38);
      }
    }
    if (
      layer === 'normal' &&
      state.mode === 'build' &&
      state.tool === 'jumpPad' &&
      state.pendingPad?.roomIndex === state.roomIndex
    ) {
      ctx.strokeStyle = '#efcb84';
      ctx.lineWidth = 2;
      ctx.strokeRect(state.pendingPad.x * T + 1, state.pendingPad.y * T + 1, 38, 38);
    }
  }
  function drawIslands() {
    if (current().scene !== 'darkJumpIslands') return;
    ctx.save();
    ctx.beginPath();
    for (let y = 0; y < H; y++)
      for (let x = 0; x < W; x++) if (current().map[y][x] !== 10) ctx.rect(x * T, y * T, T, T);
    ctx.clip();
    ctx.fillStyle = '#000000';
    ctx.shadowColor = '#d09afa';
    ctx.shadowBlur = 13;
    for (const [x, y, r] of jumpIslandPlatforms) {
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.shadowBlur = 0;
    ctx.fillRect(0, 200, 110, 40);
    ctx.fillRect(540, 320, 100, 40);
    ctx.restore();
  }
  function drawPassageHole() {
    if (current().scene !== 'darkGlowPassage' || current().hideHole) return;
    ctx.save();
    ctx.translate(420, 140);
    ctx.beginPath();
    for (const [i, point] of [
      [-26, -26],
      [-14, -12],
      [9, -21],
      [18, -25],
      [18, -9],
      [39, -12],
      [17, -1],
      [22, 9],
      [23, 23],
      [18, 24],
      [15, 7],
      [8, 17],
      [2, 25],
      [-5, 8],
      [-15, 1],
      [-28, 7],
      [-20, -3],
    ].entries()) {
      if (i === 0) ctx.moveTo(point[0], point[1]);
      else ctx.lineTo(point[0], point[1]);
    }
    ctx.closePath();
    ctx.fillStyle = '#808080';
    ctx.fill();
    ctx.restore();
  }
  function drawDeath() {
    rect(0, 0, 640, 480, '#000000');
    const age = present(state.death).age,
      broken = age >= 0.85,
      scatter = age >= 1.45;
    const rows = ['01100110', '11111111', '11111111', '11111111', '01111110', '00111100', '00011000'];
    if (!scatter) {
      for (let y = 0; y < rows.length; y++)
        for (let x = 0; x < rows[y].length; x++) {
          if (rows[y][x] !== '1' || (broken && x === 3 + (y % 2))) continue;
          const split = broken ? (x < 4 ? -5 : 5) : 0;
          rect(300 + x * 5 + split, 195 + y * 5, 5, 5, '#ff153d');
        }
    } else {
      const t = Math.min(1, (age - 1.45) / 0.9);
      for (let i = 0; i < 10; i++) {
        const angle = (i * Math.PI * 2) / 10;
        const distance = reducedParticleMotion.matches ? 24 : 14 + t * (65 + (i % 3) * 18);
        ctx.globalAlpha = 1 - t;
        rect(
          320 + Math.cos(angle) * distance,
          213 + Math.sin(angle) * distance + (reducedParticleMotion.matches ? 0 : t * t * 36),
          4,
          6,
          '#ff153d',
        );
      }
      ctx.globalAlpha = 1;
    }
  }
  function drawWindow(time: number) {
    if (['garden', 'dark'].includes(current().theme)) return;
    for (const col of [4, 11]) {
      if (current().map[0][col] !== 1 || current().map[1][col] !== 1) continue;
      const x = col * T;
      rect(x - 2, 8, 44, 55, '#211e36');
      rect(x + 4, 12, 32, 45, '#657d9c');
      rect(x + 7, 15, 26, 39, '#273346');
      rect(x + 9, 17, 9, 20, '#445d7e');
      rect(x + 19, 12, 3, 44, '#92899c');
      rect(x + 5, 34, 30, 3, '#92899c');
      rect(x - 4, 58, 48, 5, '#a59aab');
      rect(x + 27, 22, 3, 3, '#a8bbcf');
    }
    if (current().theme !== 'castle') return;
    for (const col of [2, 13]) {
      if (current().map[1][col] !== 1) continue;
      const x = col * T + 20,
        flicker = Math.floor(time * 9 + col) % 3;
      rect(x - 19, 31, 38, 42, '#f4ba6120');
      rect(x - 3, 48, 6, 23, '#201e29');
      rect(x - 8, 46, 16, 5, '#9b8d80');
      rect(x - 5, 33 - flicker, 10, 14 + flicker, '#dc794d');
      rect(x - 3, 29 + flicker, 6, 17 - flicker, '#efb365');
      rect(x - 1, 36, 3, 10, '#ffe3a1');
    }
    if (current().map[1][7] === 1) {
      rect(292, 12, 36, 44, '#37253e');
      rect(296, 13, 28, 42, '#73465f');
      rect(309, 21, 3, 23, '#b99a78');
      rect(302, 28, 17, 3, '#b99a78');
      rect(296, 55, 9, 6, '#73465f');
      rect(316, 55, 8, 6, '#73465f');
    }
    ctx.strokeStyle = '#b2a9bb60';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(40, 80);
    ctx.lineTo(64, 80);
    ctx.lineTo(40, 56);
    ctx.lineTo(40, 80);
    ctx.lineTo(60, 60);
    ctx.moveTo(40, 68);
    ctx.lineTo(52, 80);
    ctx.stroke();
  }
  function drawEcho(time: number) {
    if (current().scene !== 'worlds') return;
    const pulse = 0.16 + Math.sin(time * 2) * 0.05;
    rect(278, 64, 84, 77, 'rgba(141,117,231,' + pulse + ')');
    for (const [x, y, w, hh] of [
      [316, 68, 5, 14],
      [310, 81, 6, 12],
      [314, 92, 5, 13],
      [307, 104, 8, 12],
      [313, 115, 5, 13],
    ]) {
      rect(x - 3, y, w + 6, hh, '#7562a4');
      rect(x, y, w, hh, '#c1b1f5');
      rect(x + 1, y, 2, hh, '#eae1ff');
    }
    rect(296, 142, 12, 3, '#edc969');
    rect(301, 137, 3, 13, '#edc969');
    rect(332, 140, 10, 3, '#9abced');
    rect(335, 135, 3, 13, '#9abced');
  }
  function drawCrackTrail(time: number) {
    const scene = current().scene;
    if (!['worlds', 'fountain'].includes(scene ?? '')) return;
    const points =
      scene === 'worlds'
        ? [
            [320, 164],
            [344, 182],
            [366, 180],
            [390, 205],
            [420, 220],
            [450, 214],
            [480, 223],
            [514, 217],
            [544, 225],
            [578, 218],
            [613, 220],
          ]
        : [
            [26, 220],
            [64, 214],
            [92, 225],
            [122, 218],
            [151, 229],
            [184, 222],
            [205, 235],
            [224, 219],
            [254, 214],
            [280, 202],
            [319, 194],
          ];
    ctx.save();
    ctx.beginPath();
    points.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
    ctx.lineWidth = 8;
    ctx.strokeStyle = 'rgba(145,106,220,' + (0.25 + Math.sin(time * 3) * 0.07) + ')';
    ctx.stroke();
    ctx.lineWidth = 2;
    ctx.strokeStyle = '#c6b2f7';
    ctx.stroke();
    ctx.restore();
    if (scene === 'worlds') pixelText('→', 574, 198, '#d6c7fa', 16);
  }
  function render(time: number) {
    syncMobileControls(state, $);
    if (state.mode === 'play' && state.collisionBlackout) {
      rect(0, 0, 640, 480, '#000000');
      $('gameHint').textContent = '';
      return;
    }
    if (state.death) {
      drawDeath();
      return;
    }
    if (state.mode === 'play' && state.bossEncounter) {
      drawBossEncounter(time);
      return;
    }
    if (state.mode === 'play' && state.holeFall?.kind === 'glitch' && state.holeFall.age >= 1.3) {
      drawGlitchDescent();
      return;
    }
    ctx.imageSmoothingEnabled = false;
    ctx.clearRect(0, 0, 640, 480);
    const r = current();
    if (state.mode === 'play' && r.scene === postShowScene) {
      drawKnightPath(state, time);
      $('gameHint').textContent = state.knightBattle
        ? 'Three teams face one another.'
        : state.knightPath && state.knightPath.duelAge >= 0
          ? 'The knights clash on the dark battlefield.'
          : 'Follow the path past the statues. Walk back to the brown entrance to return backstage.';
      return;
    }
    if (state.mode === 'play' && r.scene === 'storageHallway') {
      state.storageHallway ??= createHallway();
      drawHallway(state, time);
      if (state.fade > 0) rect(0, 0, 640, 480, `rgba(17,20,29,${Math.min(1, state.fade / 0.32)})`);
      $('gameHint').textContent =
        'Walk right through the corridor to reach the crossing, or left to return to storage.';
      return;
    }
    // Shake the scene briefly; keep the surrounding UI and fade overlay steady.
    rect(0, 0, 640, 480, roomBackground(r));
    ctx.save();
    if (state.mode === 'play' && state.cameraShakeTime > 0 && !reducedParticleMotion.matches) {
      const strength = (3 * state.cameraShakeTime) / 0.22;
      ctx.translate(Math.round(Math.sin(time * 95) * strength), Math.round(Math.cos(time * 113) * strength));
    }
    // Empty space and walls are the backdrop. Ground hides only objects assigned beneath it.
    for (let y = 0; y < H; y++)
      for (let x = 0; x < W; x++)
        if ([1, 10].includes(r.map[y][x])) drawTile(r.map[y][x], x * T, y * T, r.theme);
    drawLayerObjects('ground', time);
    drawIslands();
    for (let y = 0; y < H; y++)
      for (let x = 0; x < W; x++)
        if (![1, 10].includes(r.map[y][x])) drawTile(r.map[y][x], x * T, y * T, r.theme);
    if (state.mode === 'build' && r.scene === 'glitchBoss') drawNoelleBoss(528, 122, 140);
    if (r.scene === 'glitchStudio') glitchStudioDrawing.room(time, r);
    if (r.scene === postShowScene) drawPostShowRoom(ctx, r, time, reducedParticleMotion.matches);
    if (r.scene === 'glitchBackstage') {
      backstageDrawing.room(r);
      for (const [cell, target] of Object.entries(r.doorLinks || {})) {
        if (
          state.project.rooms[target]?.scene === postShowScene &&
          (state.story.tennaFinaleComplete || state.mode === 'build')
        ) {
          const [x, y] = cell.split(',').map(Number);
          rect(x * T - 5, y * T - 44, 50, 84, '#39291f');
          rect(x * T - 1, y * T - 40, 42, 80, '#b67b56');
          rect(x * T + 5, y * T - 34, 30, 74, '#030303');
          rect(x * T + 5, y * T + 34, 30, 6, '#e6b28b');
          pixelText('^', x * T + 13, y * T + 23, '#e5ded8', 17);
        }
        if (state.project.rooms[target]?.scene !== 'glitchStudio') continue;
        const [x, y] = cell.split(',').map(Number);
        rect(x * T + 5, y * T + 3, 30, 37, '#030403');
        rect(x * T + 5, y * T + 3, 2, 37, '#6c4a2a');
        pixelText('^', x * T + 13, y * T + 25, '#d8ae6b', 17);
      }
      pixelText('< STRANGE ROOM', 4, 329, '#d5cbb6', 10);
      if (state.story.tennaStorageInvited) pixelText('STORAGE >', 506, 329, '#d5af76', 11);
    }
    if (r.scene === 'tennaStorage') {
      storageDrawing.room(time, r);
      pixelText('HALLWAY >', 510, 329, '#a4c4cb', 11);
    }
    if (r.scene === 'trafficCrossing') {
      trafficDrawing.room(time, state.traffic ?? undefined);
      for (const [cell, target] of Object.entries(r.doorLinks || {})) {
        if (state.project.rooms[target]?.scene !== 'neonRooftop') continue;
        const [x, y] = cell.split(',').map(Number);
        if (r.map[y][x] !== 6) continue;
        rect(x * T + 4, y * T + 2, 36, 36, '#091b2c');
        rect(x * T + 4, y * T + 2, 2, 36, '#8be8cf');
        pixelText('>', x * T + 14, y * T + 27, '#d4fae9', 20);
      }
    }
    if (r.scene === 'neonRooftop') {
      drawRooftop(time);
      for (const [cell, target] of Object.entries(r.doorLinks || {})) {
        if (state.project.rooms[target]?.scene !== 'queenPasscode') continue;
        const [x, y] = cell.split(',').map(Number);
        if (r.map[y][x] === 6) {
          rect(x * T + 4, y * T + 1, 36, 38, '#0a3028');
          pixelText('>', x * T + 14, y * T + 27, '#baf4d8', 20);
        }
      }
    }
    if (r.scene === 'queenPasscode') drawQueenRoom(time, state);
    if (r.scene === 'collisionChamber') drawCollisionChamber(r, state);
    if (r.scene === 'glitchStudio' && state.story.tennaInvited)
      pixelText('BACKSTAGE >', 484, 329, '#684c47', 11);
    if (
      r.scene === 'glitchBoss' &&
      (state.story.noelleEscaped || state.story.noelleGone || state.mode === 'build')
    )
      for (const [cell, target] of Object.entries(r.doorLinks || {})) {
        if (state.project.rooms[target]?.scene !== 'glitchStudio') continue;
        const [x, y] = cell.split(',').map(Number);
        if (r.map[y][x] !== 6) continue;
        rect(x * T + 3, y * T + 1, 34, 38, '#080b17');
        rect(x * T + 4, y * T + 2, 3, 36, '#7be3dc');
        rect(x * T + 33, y * T + 2, 3, 36, '#d376c2');
        pixelText('>', x * T + 12, y * T + 26, '#b9f7ef', 20);
      }
    if (r.scene === 'glitchWorld')
      for (const [cell, target] of Object.entries(r.doorLinks || {})) {
        const [x, y] = cell.split(',').map(Number);
        if (r.map[y][x] === 6 && state.project.rooms[target]?.scene === 'glitchBoss')
          pixelText('>', x * T + 12, y * T + 27, '#6d6575', 22);
      }
    drawPassageGlow(time);
    drawPassageHole();
    drawGoldenDoor();
    drawFurnaceRoom(time);
    drawCoreEntrance(time);
    drawWindow(time);
    drawEcho(time);
    drawCrackTrail(time);
    drawFountain(time);
    drawLayerObjects('back', time);
    drawDarkWorldParticles(time, false);
    drawPlacedParticles(time, false);
    drawGlitchParticles(time, false);
    drawSpikes();
    drawCoreCollapse();
    drawJumpPads();
    drawSavePoint(time);
    if (state.mode === 'play') drawKnightTeleporter(ctx, state, reducedParticleMotion.matches ? 0 : time);
    const flower = floweyPosition();
    if (state.mode === 'play' && state.glitchComfort) {
      drawGlitchComfort(time);
    } else if (state.mode === 'play' && state.padJump) {
      for (const npc of roomNpcs().filter((object) => objectLayer(object) === 'normal')) drawNpc(npc);
      drawWaitingFriends(time);
      drawPadJump(time);
    } else if (state.mode === 'play' && state.holeFall) {
      drawHoleFall(time);
    } else if (state.mode === 'play' && state.dive) {
      for (const npc of roomNpcs().filter((object) => objectLayer(object) === 'normal')) drawNpc(npc);
      drawDive(time);
    } else if (state.mode === 'play') {
      const actors = [
        { y: state.player.y, draw: () => drawPlayer(state.player.x, state.player.y, time) },
        ...partyFriends().map((n) => ({
          y: n.y,
          draw: () =>
            drawFountainFriend(
              {
                ...n,
                lookRight:
                  state.dialogue?.kind === 'collisionIntro' &&
                  state.dialogue.index >= 2 &&
                  n.name === 'Ralsey',
              },
              time,
            ),
        })),
        ...roomNpcs()
          .filter((object) => objectLayer(object) === 'normal')
          .map((n) => ({ y: n.y * T + 24, draw: () => drawNpc(n) })),
      ];
      if (r.scene === 'glitchStudio' && state.tennaEntrance) {
        const scene = state.tennaEntrance,
          pose = tennaEntrancePose(scene, reducedParticleMotion.matches);
        actors.push({
          y: present(pose).y,
          draw: () => {
            ctx.save();
            ctx.translate(present(pose).x, present(pose).y);
            ctx.scale(present(pose).scaleX, present(pose).scaleY);
            drawTenna(0, 0);
            ctx.restore();
            if (
              !reducedParticleMotion.matches &&
              scene.stage === 'jump' &&
              scene.age > tennaArrivalSettings.jump
            ) {
              const p = (scene.age - tennaArrivalSettings.jump) / tennaArrivalSettings.land;
              ctx.save();
              ctx.globalAlpha = 1 - p;
              for (let i = 0; i < 6; i++)
                rect(
                  present(pose).x + (i - 2.5) * (8 + p * 12),
                  present(pose).y + 2 - (i % 2) * 3,
                  5,
                  2,
                  '#fff6c9',
                );
              ctx.restore();
            }
          },
        });
      }
      for (const tile of roomTrees().filter((object) => objectLayer(object) === 'normal')) {
        const tree = { ...tile, x: tile.x * T + 20, y: tile.y * T + 20 };
        actors.push({ y: tree.y, draw: () => drawDarkTree(tree) });
      }
      if (flower)
        actors.push({
          y: flower.y,
          draw: () =>
            drawFlowey(
              flower.x,
              flower.y,
              time,
              state.dialogue?.kind === 'collisionIntro' && state.dialogue.index >= 2,
            ),
        });
      actors.sort((a, b) => a.y - b.y).forEach((a) => a.draw());
      if (roomWaitingFriends().length)
        drawComfortingArm(present(state.glitchWaiting).Susie, present(state.glitchWaiting).Ralsey);
      if (state.story.teamJoined && facingFountain() && !state.dialogue && !state.buster)
        pixelText('C / Z · I. C.', 282, 212, '#ead8ff', 11);
      if (nearbyCandyTree() && !state.dialogue && !state.buster) {
        const item = nextTreeItem(present(nearbyCandyTree()), state.roomIndex, state.treeHarvests);
        pixelText(
          'C / Z · ' + (item ? itemDefinitions[item].name.toUpperCase() : 'EMPTY TREE'),
          state.player.x - 48,
          state.player.y - 68,
          '#ffd9ee',
          10,
        );
      }
      const npc = nearbyNpc();
      if (npc && !state.dialogue && !state.buster && state.story.emerging < 0 && state.story.discussion < 0)
        pixelText(
          'C / Z',
          npc.x * T + 3,
          npc.y * T -
            (npc.sprite === 'tenna'
              ? 149
              : npc.sprite === 'queen'
                ? 103
                : npc.sprite === 'jackenstein'
                  ? 128
                  : 34),
          '#fff0c7',
          10,
        );
      const friend = nearFountainFriend();
      if (friend && !state.dialogue && !state.buster && state.story.discussion < 0)
        pixelText('Z', friend.x - 4, friend.y - 75, '#fff0c7', 14);
      if (
        flower &&
        nearFlowey() &&
        !state.dialogue &&
        !state.buster &&
        state.story.emerging < 0 &&
        state.story.discussion < 0
      ) {
        rect(flower.x - 12, flower.y - 67, 24, 17, '#f2e5c7');
        rect(flower.x - 3, flower.y - 50, 6, 4, '#f2e5c7');
        pixelText('Z', flower.x - 4, flower.y - 54, '#34283d', 12);
      }
    } else {
      for (const tile of roomTrees().filter((object) => objectLayer(object) === 'normal')) {
        drawDarkTree({ ...tile, x: tile.x * T + 20, y: tile.y * T + 20 });
        if (state.tool === 'tree' || state.tool === 'edit') {
          ctx.strokeStyle = '#efcb84';
          ctx.lineWidth = 2;
          ctx.strokeRect(tile.x * T + 2, tile.y * T + 2, 36, 36);
        }
      }
      for (const friend of [...fountainFriends(), ...roomWaitingFriends()]) drawFountainFriend(friend, time);
      if (roomWaitingFriends().length)
        drawComfortingArm(present(state.glitchWaiting).Susie, present(state.glitchWaiting).Ralsey);
      for (const npc of roomNpcs().filter((object) => objectLayer(object) === 'normal')) drawNpc(npc);
      if (flower) drawFlowey(flower.x, flower.y, time);
      ctx.strokeStyle = '#e0d2ff24';
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (let x = 0; x <= W; x++) {
        ctx.moveTo(x * T + 0.5, 0);
        ctx.lineTo(x * T + 0.5, 480);
      }
      for (let y = 0; y <= H; y++) {
        ctx.moveTo(0, y * T + 0.5);
        ctx.lineTo(640, y * T + 0.5);
      }
      ctx.stroke();
      const sx = r.spawn.x * T,
        sy = r.spawn.y * T;
      rect(sx + 5, sy + 8, 30, 22, '#c4ddb8');
      pixelText('GO', sx + 12, sy + 24, '#243632', 12);
      if (state.hover && state.hover.x >= 0 && state.hover.y >= 0 && state.hover.x < W && state.hover.y < H) {
        rect(state.hover.x * T, state.hover.y * T, T, T, '#eedbff35');
        ctx.strokeStyle = '#f0d6ff';
        ctx.lineWidth = 2;
        ctx.strokeRect(state.hover.x * T + 1, state.hover.y * T + 1, 38, 38);
      }
    }
    if (state.mode === 'play') {
      drawDarkWorldParticles(time, true);
      drawPlacedParticles(time, true);
      drawGlitchParticles(time, true);
    }
    drawObjectMarkers();
    if (r.scene === 'glitchStudio') glitchStudioDrawing.overlay(time);
    if (r.scene === 'trafficCrossing') trafficDrawing.overlay(present(state.traffic), state.player);
    drawBuster();
    if (state.mode === 'play' && state.dive?.phase === 'flowey' && state.dive.age > 1.15)
      rect(0, 0, 640, 480, 'rgba(8,9,18,' + Math.min(1, (state.dive.age - 1.15) / 0.9) + ')');
    ctx.restore();
    if (state.fade > 0) rect(0, 0, 640, 480, `rgba(17,20,29,${Math.min(1, state.fade / 0.32)})`);
    if (state.mode === 'play' && r.scene === 'trafficCrossing') {
      $('gameHint').textContent =
        'C / Z at a STOP sign slows traffic for 5 seconds. A car hit returns you to your stop-sign checkpoint.';
      return;
    }
    $('gameHint').textContent =
      state.mode === 'build'
        ? state.tool === 'delete'
          ? 'Click or drag to delete objects and floor. Undo restores deletions.'
          : state.tool === 'jumpPad'
            ? state.pendingPad
              ? 'Click the landing spot for this jump pad.'
              : 'Click a clear tile to place a jump pad; click an existing pad to remove it.'
            : state.tool === 'spike'
              ? 'Click a clear tile to place a spike; click it again to remove it.'
              : state.tool === 'glitchPillar'
                ? 'Click to place a glitch pillar; use Edit on its base to adjust its size.'
                : state.tool === 'edit'
                  ? 'Click an object base or tile to edit its appearance and layer.'
                  : state.tool === 'tree'
                    ? 'Click a clear tile to plant a tree; click a marked trunk tile to remove it.'
                    : state.tool === 'glitchParticles'
                      ? 'Click a tile to place an animated glitch; click it again to remove it.'
                      : state.tool === 'particles'
                        ? 'Click a tile to add particles; click a marked tile to remove them.'
                        : state.tool === 'savePoint'
                          ? 'Click a clear tile to add a save point; click a star to remove it.'
                          : ['npc', 'npcMove', 'npcSelect'].includes(String(state.tool))
                            ? state.tool === 'npc'
                              ? 'Click a clear tile to place Froggit.'
                              : state.tool === 'npcMove'
                                ? 'Click a clear tile to move the selected NPC.'
                                : 'Click an NPC to edit its speech.'
                            : state.tool === 'flowey'
                              ? 'Click a clear tile to place Flowey.'
                              : state.tool === 'spawn'
                                ? 'Click a clear tile to set the starting spot.'
                                : 'Painting: ' + tiles[Number(state.tool)].label + ' · click or drag'
        : nearSavePoint() && !state.dialogue && !state.dive
          ? 'C / Z / Enter to save your game'
          : state.dive && state.dive.phase !== 'hesitate'
            ? 'I. C. · Into the fountain...'
            : state.buster
              ? 'I. C. · Rude Buster!'
              : state.dialogue
                ? importantKinds.has(state.dialogue.kind)
                  ? 'I. C. · C / Z / Enter to continue'
                  : 'C / Z / Enter to continue · L to skip'
                : state.story.discussion >= 0
                  ? current().scene === 'fountain'
                    ? 'I. C. · Your friends are struggling against the fountain...'
                    : 'A strange light pulses above the altar...'
                  : state.story.emerging >= 0
                    ? 'Something is growing between the stones...'
                    : state.story.teamJoined && facingFountain()
                      ? 'C / Z to enter the fountain · I. C.'
                      : nearbyCandyTree()
                        ? 'C / Z / Enter to take G. Candy from the tree'
                        : nearbyNpc()
                          ? 'C / Z to talk to ' + present(nearbyNpc()).name + '.'
                          : nearFountainFriend()
                            ? 'Press Z to talk to ' + present(nearFountainFriend()).name + '.'
                            : nearFlowey()
                              ? 'Press Z to talk to Flowey.'
                              : friendsWaiting()
                                ? 'Flowey is following · Susie and Ralsey are waiting in Glitch World'
                                : state.story.teamJoined
                                  ? 'Your party is following · Z talk · C inspect'
                                  : state.story.joined
                                    ? 'Flowey is following · Z talk · C inspect'
                                    : 'Arrow keys / W A S D to walk · C to inspect';
  }
  return { render, reducedParticleMotion };
}
