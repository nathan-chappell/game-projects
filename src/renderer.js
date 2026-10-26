// The renderer paints one frame. Game rules and saving stay in game.js.
import { createSprites } from './sprites.js';
import { createParticles } from './particles.js';
import { createBattleDrawing } from './battle.js';
import { T, W, H, tiles } from './config.js';
import { objectLayer, jumpIslandPlatforms } from './world.js';

export function createRenderer(ctx, state, helpers) {
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
    drawGlitchPillar,
    drawGlitchParticles,
  } = createParticles(ctx, state, { rect, pixelText });

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
  });
  function drawSavePoint(time, layer = 'normal') {
    for (const tile of roomSavePoints().filter((point) => objectLayer(point) === layer)) {
      const point = { x: tile.x * T + 20, y: tile.y * T + 20 };
      const pulse = window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : Math.sin(time * 3) * 2;
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

  function drawPadJump(time) {
    const target = { x: state.padJump.launchX * T + 20, y: state.padJump.launchY * T + 20 };
    for (const [i, actor] of state.padJump.actors.entries()) {
      const t = Math.max(0, Math.min(1, (state.padJump.age - i * 0.12) / 0.9));
      const arc = reducedParticleMotion.matches
        ? 0
        : Math.sin(Math.PI * t) * (state.padJump.targetRoom !== state.roomIndex ? 105 : 70);
      ctx.save();
      ctx.translate(actor.x + (target.x - actor.x) * t, actor.y + (target.y - actor.y) * t - arc);
      if (state.padJump.targetRoom !== state.roomIndex) ctx.globalAlpha = Math.min(1, (1 - t) * 5);
      if (actor.name === 'Kris') drawPlayer(0, 0, time);
      else if (actor.name === 'Flowey') drawFlowey(0, 0, time);
      else drawFountainFriend({ name: actor.name, x: 0, y: 0 }, time);
      ctx.restore();
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

  function drawGlitchComfort(time) {
    const t = reducedParticleMotion.matches ? 0 : time,
      ralsey = glitchComfortPose('Ralsey'),
      susie = glitchComfortPose('Susie');
    const reach = reducedParticleMotion.matches && state.glitchComfort.reach > 0 ? 1 : state.glitchComfort.reach;
    const actors = roomNpcs()
      .filter((object) => objectLayer(object) === 'normal')
      .map((npc) => ({ y: npc.y * T + 24, draw: () => drawNpc(npc) }));
    for (const tree of roomTrees().filter((object) => objectLayer(object) === 'normal'))
      actors.push({
        y: tree.y * T + 20,
        draw: () => drawDarkTree({ ...tree, x: tree.x * T + 20, y: tree.y * T + 20 }),
      });
    for (const name of ['Kris', 'Flowey', 'Ralsey', 'Susie']) {
      const pose = glitchComfortPose(name);
      actors.push({
        y: pose.y,
        draw: () =>
          name === 'Kris'
            ? drawPlayer(pose.x, pose.y, t)
            : name === 'Flowey'
              ? drawFlowey(pose.x, pose.y, t)
              : drawFountainFriend(
                  { name, ...pose, worried: name === 'Ralsey', comforting: name === 'Susie' && reach > 0 },
                  t,
                ),
      });
    }
    actors.sort((a, b) => a.y - b.y).forEach((actor) => actor.draw());
    drawComfortingArm(susie, ralsey, reach);
  }

  function drawComfortingArm(susie, ralsey, reach = 1) {
    if (reach <= 0) return;
    const sx = susie.x + 16,
      sy = susie.y - 31;
    const hx = sx + (ralsey.x - 11 - sx) * reach,
      hy = susie.y - 18 + (ralsey.y - 27 - (susie.y - 18)) * reach;
    ctx.save();
    ctx.strokeStyle = '#b37fc0';
    ctx.lineWidth = 7;
    ctx.lineJoin = 'miter';
    ctx.beginPath();
    ctx.moveTo(sx, sy);
    ctx.lineTo(Math.round((sx + hx) / 2), Math.round(hy + 4));
    ctx.lineTo(hx, hy);
    ctx.stroke();
    rect(hx - 6, hy - 2, 4, 6, '#e1bf62');
    rect(hx - 2, hy - 3, 7, 7, '#c995cc');
    ctx.restore();
  }

  function drawWaitingFriends(time) {
    for (const friend of roomWaitingFriends()) drawFountainFriend(friend, time);
    if (roomWaitingFriends().length) drawComfortingArm(state.glitchWaiting.Susie, state.glitchWaiting.Ralsey);
  }

  function drawHoleFall(time) {
    state.holeFall.actors.forEach((actor, index) => {
      const t = Math.max(0, Math.min(1, (state.holeFall.age - index * 0.16) / 0.9));
      if (t >= 1) return;
      if (state.holeFall.kind === 'core' || state.holeFall.kind === 'glitch') {
        const converge = Math.min(1, t * 3),
          sink = reducedParticleMotion.matches ? 0 : t * t * 100;
        ctx.save();
        if (t > 0.35) {
          ctx.beginPath();
          ctx.rect(0, 0, 640, state.holeFall.y + 18);
          ctx.clip();
        }
        ctx.translate(
          actor.x + (state.holeFall.x - actor.x) * converge,
          actor.y + (state.holeFall.y - actor.y) * converge + sink,
        );
        ctx.globalAlpha = 1 - Math.max(0, (t - 0.5) * 2);
        if (actor.name === 'Kris') drawPlayer(0, 0, time);
        else if (actor.name === 'Flowey') drawFlowey(0, 0, time);
        else drawFountainFriend({ name: actor.name, x: 0, y: 0 }, time);
        ctx.restore();
        return;
      }
      const scale = 1 - Math.max(0, (t - 0.6) / 0.4) * 0.98;
      const arc = reducedParticleMotion.matches ? 0 : Math.sin(t * Math.PI) * 58;
      const x = actor.x + (420 - actor.x) * t;
      const y = actor.y + (140 - actor.y) * t - arc;
      ctx.save();
      ctx.translate(x, y);
      ctx.scale(scale, scale);
      if (actor.name === 'Kris') drawPlayer(0, 0, time);
      else if (actor.name === 'Flowey') drawFlowey(0, 0, time);
      else drawFountainFriend({ name: actor.name, x: 0, y: 0 }, time);
      ctx.restore();
    });
  }

  function drawCoreCollapse() {
    if (!['core', 'glitch'].includes(state.holeFall?.kind)) return;
    const { x, y, age } = state.holeFall,
      radius = reducedParticleMotion.matches ? 38 : 14 + Math.min(1, age / 0.35) * 24;
    ctx.save();
    ctx.strokeStyle = '#91b4c4';
    ctx.lineWidth = 2;
    ctx.fillStyle = '#05060c';
    ctx.beginPath();
    for (let i = 0; i < 12; i++) {
      const angle = (i * Math.PI) / 6,
        r = radius + (i % 2 ? 4 : -3);
      const px = x + Math.cos(angle) * r,
        py = y + Math.sin(angle) * r * 0.55;
      if (!i) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.strokeStyle = '#202638';
    ctx.beginPath();
    for (const direction of [-1, 1]) {
      ctx.moveTo(x + direction * radius, y);
      ctx.lineTo(x + direction * (radius + 14), y - 8);
      ctx.lineTo(x + direction * (radius + 27), y - 3);
    }
    ctx.stroke();
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
      if (i === 0) ctx.moveTo(...point);
      else ctx.lineTo(...point);
    }
    ctx.closePath();
    ctx.fillStyle = '#808080';
    ctx.fill();
    ctx.restore();
  }

  function drawDeath() {
    rect(0, 0, 640, 480, '#000000');
    const age = state.death.age,
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

  function drawTile(id, x, y, theme) {
    if (id === 10) {
      rect(x, y, T, T, roomBackground());
      return;
    }
    const color = current().tileColors?.[x / T + ',' + y / T];
    if (color) {
      rect(x, y, T, T, color);
      return;
    }
    if (['glitchWorld', 'glitchBoss'].includes(current().scene) && [0, 1, 6].includes(id)) {
      rect(x, y, T, T, id === 1 ? roomBackground() : '#c3c3c3');
      return;
    }
    if (['coreEntrance', 'coreLower', 'coreDepths'].includes(current().scene) && [0, 1, 6].includes(id)) {
      if (id === 1) {
        rect(x, y, T, T, roomBackground());
        return;
      }
      rect(x, y, T, T, '#323549');
      rect(x + 2, y + 2, 36, 36, '#5a607a');
      rect(x + 3, y + 3, 34, 2, '#8991a8');
      rect(x + 3, y + 36, 34, 2, '#252939');
      for (const ox of [5, 33]) for (const oy of [6, 32]) rect(x + ox, y + oy, 2, 2, '#b4c5d5');
      if (id === 6) {
        rect(x + 5, y, 30, T, '#141b2a');
        rect(x + 5, y, 3, T, '#8bdddc');
        rect(x + 32, y, 3, T, '#8bdddc');
        pixelText('EXIT', x + 9, y + 23, '#d0fcf1', 9);
      }
      return;
    }
    if (current().scene === 'darkFurnace' && (id === 0 || id === 1 || id === 6)) {
      if (id === 1) rect(x, y, T, T, roomBackground());
      else {
        rect(x, y, T, T, '#b45716');
        for (let i = 0; i < 5; i++) rect(x + ((i * 11 + y) % 38), y + ((i * 17 + x) % 37), 2, 2, '#bb601b');
        if (y === 280) {
          rect(x, y, T, 4, '#55131c');
          for (let i = 0; i < 5; i++) {
            rect(x + i * 8, y + 3, 6, 4, '#872d17');
            rect(x + i * 8 + 2, y + 7, 3, 2, '#6b2016');
          }
        }
        if (y === 360) for (let i = 0; i < 5; i++) rect(x + i * 8, y + 35, 5, 5, '#762016');
      }
      return;
    }
    if (current().scene === 'darkGoldenHall' && (id === 0 || id === 1 || id === 6)) {
      rect(x, y, T, T, id === 1 ? roomBackground() : '#000000');
      return;
    }
    if (id === 1 && current().backgroundColor && current().scene !== 'darkJumpIslands') {
      rect(x, y, T, T, roomBackground());
      return;
    }
    if (current().scene === 'darkJumpIslands' && (id === 0 || id === 1 || id === 6)) return;
    if (theme === 'dark' && (id === 0 || id === 1 || id === 6)) {
      rect(x, y, T, T, id === 1 ? roomBackground() : '#000000');
      return;
    }
    const garden = theme === 'garden',
      castle = theme === 'castle';
    rect(x, y, T, T, garden ? '#53604b' : '#65516e');
    if (id !== 1 && id !== 4) {
      rect(
        x + 2,
        y + 2,
        36,
        36,
        garden ? ((x + y) % 80 ? '#596950' : '#5c6c53') : (x + y) % 80 ? '#705b79' : '#745e7d',
      );
      if (!garden) {
        rect(x + 3, y + 3, 34, 2, '#806a89');
        rect(x + 3, y + 35, 34, 2, '#5d4868');
      } else {
        rect(x + 8, y + 12, 3, 5, '#71815f');
        rect(x + 30, y + 27, 3, 4, '#46563f');
      }
    }
    if (castle) {
      rect(x, y, 40, 40, '#34323f');
      rect(x + 1, y + 1, 38, 37, (x + y) % 80 ? '#555160' : '#5b5666');
      rect(x + 2, y + 2, 36, 2, '#676272');
      rect(x + 2, y + 36, 36, 2, '#45414f');
      if ((x / T + (y / T) * 3) % 7 === 0) {
        rect(x + 14, y + 10, 2, 9, '#3e3b48');
        rect(x + 16, y + 18, 7, 2, '#3e3b48');
        rect(x + 21, y + 20, 2, 6, '#3e3b48');
      }
    }
    if (id === 1) {
      if (castle) {
        rect(x, y, 40, 40, '#24232e');
        rect(x + 1, y + 1, 38, 17, '#44414f');
        rect(x + 2, y + 2, 36, 2, '#5e586b');
        rect(x + 1, y + 20, 18, 17, '#3a3746');
        rect(x + 21, y + 20, 18, 17, '#403c4c');
        if (y === 40) {
          rect(x, y + 30, 40, 5, '#797081');
          rect(x, y + 36, 40, 4, '#211f2c');
        }
      } else if (garden) {
        rect(x, y, 40, 40, '#253c35');
        rect(x + 3, y + 4, 34, 30, '#345244');
        rect(x + 7, y + 3, 12, 10, '#42614b');
        rect(x + 25, y + 21, 10, 10, '#2d493d');
        rect(x + 5, y + 33, 30, 5, '#1d302d');
      } else {
        rect(x, y, 40, 40, '#30223d');
        rect(x + 2, y + 2, 36, 31, '#45314f');
        rect(x + 3, y + 4, 34, 3, '#59405f');
        rect(x, y + 34, 40, 6, '#211b30');
        rect(x + 17, y + 6, 2, 25, '#382641');
        if (y === 40) {
          rect(x, y + 29, 40, 6, '#9b779a');
          rect(x, y + 35, 40, 5, '#3c2b47');
        }
      }
    }
    if (id === 2) {
      rect(x, y, 40, 40, castle ? '#5e344d' : '#95516f');
      rect(x + 2, y + 2, 36, 36, castle ? '#78435b' : '#a65d7c');
      rect(x + 18, y + 17, 4, 6, castle ? '#99657b' : '#bb7d8c');
      if (castle && (x / T + y / T) % 4 === 0) {
        rect(x + 7, y + 26, 11, 2, '#60394d');
        rect(x + 9, y + 28, 6, 2, '#60394d');
      }
      const cx = x / T,
        cy = y / T,
        m = current().map;
      for (const [dx, dy, rx, ry, rw, rh] of [
        [-1, 0, 0, 0, 3, 40],
        [1, 0, 37, 0, 3, 40],
        [0, -1, 0, 0, 40, 3],
        [0, 1, 0, 37, 40, 3],
      ])
        if (!m[cy + dy] || m[cy + dy][cx + dx] !== 2) rect(x + rx, y + ry, rw, rh, '#d5b58e');
    }
    if (id === 3) {
      for (const [ox, oy, c] of [
        [12, 12, '#e1b8cb'],
        [27, 23, '#eaca8c'],
        [10, 30, '#c3b9dd'],
      ]) {
        rect(x + ox, y + oy, 2, 8, '#304939');
        rect(x + ox - 3, y + oy - 3, 8, 6, c);
        rect(x + ox - 1, y + oy - 5, 4, 10, c);
        rect(x + ox, y + oy - 1, 2, 2, '#f9e8b3');
      }
    }
    if (id === 4) {
      rect(x, y, 40, 40, '#355c70');
      rect(x + 2, y + 2, 36, 36, '#426f85');
      rect(x + 7, y + 10, 13, 2, '#739bad');
      rect(x + 24, y + 25, 10, 2, '#83a5af');
      rect(x + 7, y + 30, 8, 2, '#30596e');
    }
    if (id === 5) {
      rect(x, y + 2, 40, 36, '#ad9c7a');
      rect(x + 2, y + 4, 36, 31, '#c2af8b');
      rect(x + 7, y + 12, 5, 2, '#d9c8a3');
      rect(x + 25, y + 27, 7, 2, '#a18d6f');
    }
    if (id === 6) {
      rect(x, y, 40, 40, '#292031');
      rect(x + 3, y + 2, 34, 38, '#ba976a');
      rect(x + 7, y + 3, 26, 37, '#302637');
      rect(x + 10, y + 8, 20, 32, '#3f3647');
      rect(x + 8, y + 35, 24, 5, '#dec590');
      rect(x + 13, y + 36, 14, 2, '#f2dfb7');
    }
    if (id === 8) {
      rect(x + 3, y + 31, 34, 7, '#2e2c39');
      rect(x + 5, y + 27, 30, 8, '#888093');
      rect(x + 10, y + 5, 20, 23, '#6e687c');
      rect(x + 11, y + 6, 4, 20, '#a39aaf');
      rect(x + 23, y + 6, 5, 21, '#4c485d');
      rect(x + 5, y + 1, 30, 6, '#9990a5');
      rect(x + 3, y, 34, 3, '#b2a6b8');
    }
    if (id === 9) {
      rect(x + 8, y + 23, 10, 6, '#34303e');
      rect(x + 7, y + 20, 10, 5, '#8b8295');
      rect(x + 21, y + 11, 12, 8, '#3e394a');
      rect(x + 20, y + 8, 12, 7, '#9890a2');
      rect(x + 17, y + 30, 6, 4, '#746c7f');
    }
    if (id === 7) {
      rect(x + 4, y + 29, 5, 10, '#3f2b32');
      rect(x + 31, y + 29, 5, 10, '#3f2b32');
      rect(x + 2, y + 6, 36, 26, '#674655');
      rect(x, y + 3, 40, 24, '#ba8d68');
      rect(x + 2, y + 4, 36, 3, '#dfb78a');
      rect(x + 3, y + 24, 34, 4, '#835c53');
      rect(x + 10, y + 9, 18, 12, '#537c83');
      rect(x + 13, y + 10, 12, 8, '#c6d0ba');
      rect(x + 11, y + 9, 3, 12, '#355662');
    }
  }

  function drawSpikes(layer = 'normal') {
    for (const point of roomSpikes().filter((point) => objectLayer(point) === layer)) {
      const x = point.x * T,
        y = point.y * T;
      rect(x + 3, y + 29, 34, 6, '#553648');
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
        rect(sx + 4, y + 11, 2, 6, '#f05b86');
      }
      if (state.mode === 'build' && state.tool === 'spike') {
        ctx.strokeStyle = '#f05b86';
        ctx.lineWidth = 1;
        ctx.strokeRect(x + 1, y + 1, 38, 38);
      }
    }
  }

  function drawLayerObjects(layer, time) {
    drawPlacedParticles(time, false, layer);
    drawPlacedParticles(time, true, layer);
    drawGlitchParticles(time, false, layer);
    drawGlitchParticles(time, true, layer);
    drawSpikes(layer);
    drawJumpPads(layer);
    drawSavePoint(time, layer);
    const actors = roomTrees()
      .filter((object) => objectLayer(object) === layer)
      .map((tree) => ({ y: tree.y, draw: () => drawDarkTree({ ...tree, x: tree.x * T + 20, y: tree.y * T + 20 }) }));
    for (const npc of roomNpcs().filter((object) => objectLayer(object) === layer))
      actors.push({ y: npc.y, draw: () => drawNpc(npc) });
    actors.sort((a, b) => a.y - b.y).forEach((actor) => actor.draw());
  }

  function drawObjectMarkers() {
    if (
      state.mode !== 'build' ||
      (!state.layerApplyMode &&
        state.placementLayer === 'normal' &&
        !['edit', 'delete', 'glitchPillar'].includes(state.tool))
    )
      return;
    ctx.save();
    ctx.lineWidth = 1;
    ctx.setLineDash([3, 3]);
    for (const [, objects] of roomObjectGroups())
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
          pixelText(
            layer === 'ground' ? 'GROUND' : layer === 'back' ? 'BEHIND' : 'NORMAL',
            x + 2,
            y + 12,
            ctx.strokeStyle,
            8,
          );
      }
    ctx.restore();
  }

  function drawCoreEntrance(time) {
    if (!['coreEntrance', 'coreLower', 'coreDepths'].includes(current().scene)) return;
    const lower = current().scene !== 'coreEntrance';
    const t = reducedParticleMotion.matches ? 0 : time;
    // Steel catwalks sit between red-lit generators and coolant pipes.
    for (const x of [136, 424]) {
      rect(x - 8, 64, 96, 240, '#161b2c');
      rect(x - 4, 68, 88, 232, '#2d334a');
      rect(x, 72, 80, 224, '#42455d');
      rect(x + 4, 76, 72, 4, '#757b92');
      for (let row = 0; row < 5; row++) {
        const y = 88 + row * 40;
        rect(x + 8, y, 64, 32, '#202538');
        rect(x + 12, y + 4, 56, 3, '#69718b');
        for (let i = 0; i < 4; i++) rect(x + 14, y + 12 + i * 4, 52, 2, '#353e55');
        rect(x + 59, y + 7, 5, 4, Math.sin(t * 4 + row) > 0 ? '#ff5e68' : '#913b58');
      }
      rect(x - 16, 92, 8, 184, '#334856');
      rect(x - 14, 92, 3, 184, '#92c5d0');
      rect(x + 84, 92, 8, 184, '#334856');
      rect(x + 85, 92, 3, 184, '#92c5d0');
      for (const y of [100, 260]) {
        rect(x - 20, y, 16, 8, '#658494');
        rect(x + 80, y, 16, 8, '#658494');
      }
    }
    rect(252, 20, 136, 52, '#2b3045');
    rect(256, 24, 128, 44, '#5a617e');
    rect(260, 28, 120, 36, '#121c29');
    pixelText(
      current().scene === 'coreDepths' ? 'DEEP CORE' : lower ? 'LOWER CORE' : 'C O R E',
      lower ? 268 : 282,
      51,
      '#baf8ed',
      lower ? 12 : 16,
    );
    if (lower) {
      rect(276, 78, 88, 8, '#1c2131');
      for (let i = 0; i < 7; i++) rect(280 + i * 12, 80, 6, 4, '#696e81');
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
      rect(x, 76, 8, 3, '#ff5461');
      rect(x, 79, 8, 2, '#9e2547');
    }
    ctx.save();
    ctx.shadowColor = '#6ff5ed';
    ctx.shadowBlur = 9;
    ctx.fillStyle = '#8fdfdf';
    const map = current().map;
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
      rect(x, y, 2, 2, '#83d9e2');
    }
    ctx.globalAlpha = 1;
  }

  function drawFurnaceRoom(time) {
    if (current().scene !== 'darkFurnace') return;
    const t = reducedParticleMotion.matches ? 0 : time;
    // Basalt bricks beneath the orange walkway.
    rect(120, 400, 400, 80, '#4b0812');
    for (let row = 0; row < 5; row++)
      for (let col = 0; col < 21; col++) {
        const x = 120 + col * 20 - (row % 2) * 10,
          y = 400 + row * 16;
        const left = Math.max(120, x),
          right = Math.min(520, x + 18);
        if (right <= left) continue;
        rect(left, y, right - left, 14, '#801c16');
        rect(left, y, right - left, 3, '#a84419');
        rect(left + 2, y + 4, Math.max(1, right - left - 4), 2, '#bc571c');
        rect(left, y + 12, right - left, 2, '#551019');
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
      rect(x + Math.sin(t * 1.3 + i) * 3, y, 12 + (i % 4) * 4, 3, '#ffcc20');
      rect(x + 5, y + 3, 6, 2, '#ffed42');
    }
    // The towering machine: dark burgundy panels, pipes and red-lit vents.
    rect(222, 0, 196, 225, '#1a1017');
    rect(232, 0, 176, 218, '#3e2028');
    for (const x of [230, 390]) {
      rect(x, 0, 18, 183, '#170e14');
      rect(x + 3, 0, 12, 180, '#512a31');
      rect(x + 6, 0, 3, 180, '#734048');
      rect(x - 8, 143, 34, 54, '#180d14');
      rect(x - 5, 148, 28, 42, '#49232c');
      for (let j = 0; j < 4; j++) rect(x, 158 + j * 6, 19, 3, '#1b1016');
      rect(x - 3, 183, 25, 4, '#dc0e24');
    }
    for (const x of [252, 354]) {
      rect(x, 48, 34, 151, '#170d13');
      rect(x + 3, 51, 28, 146, '#492630');
      for (let j = 0; j < 4; j++) {
        rect(x + 5 + j * 6, 54, 2, 138, '#201118');
        rect(x + 5, 62 + j * 34, 25, 3, '#6a343d');
      }
      rect(x + 7, 157, 20, 7, '#180d13');
      rect(x + 10, 159, 3, 2, '#e30e28');
    }
    for (const [x, y, w, h] of [
      [218, 0, 44, 55],
      [378, 0, 44, 55],
      [265, 0, 45, 32],
      [332, 0, 45, 32],
      [295, 36, 51, 48],
      [292, 92, 57, 29],
    ]) {
      rect(x, y, w, h, '#140c12');
      rect(x + 3, y + 3, w - 6, h - 6, '#512731');
      rect(x + 7, y + 7, w - 14, h - 14, '#180e16');
      rect(x + 4, y + h - 7, w - 8, 3, '#783742');
    }
    for (const x of [218, 374]) {
      rect(x, 55, 48, 9, '#1b1015');
      rect(x + 5, 64, 38, 6, '#49252d');
      rect(x + 9, 70, 30, 4, '#ed0928');
      rect(x + 15, 74, 22, 3, '#8a1023');
    }
    rect(304, 84, 32, 10, '#6d1b2b');
    rect(301, 94, 38, 5, '#f1152a');
    rect(307, 100, 27, 4, '#8b0d22');
    rect(284, 167, 72, 42, '#2b1920');
    rect(286, 168, 68, 4, '#6a343b');
    for (let j = 0; j < 4; j++) rect(286, 180 + j * 9, 68, 2, '#170d15');
    for (let i = 0; i < 3; i++) {
      rect(218 - i * 5, 213 + i * 8, 204 + i * 10, 6, '#5e2330');
      rect(218 - i * 5, 219 + i * 8, 204 + i * 10, 2, '#c10d24');
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
      rect(x + Math.sin(t + i) * 5, y, 2, 2, '#ff6b24');
    }
    ctx.globalAlpha = 1;
  }

  function drawPassageGlow(time) {
    if (!['darkGlowPassage', 'darkJumpIslands', 'darkWindingPassage'].includes(current().scene)) return;
    if (current().scene === 'darkJumpIslands') return;
    const alpha = reducedParticleMotion.matches ? 0.32 : 0.32 + Math.sin(time * 1.4) * 0.05;
    ctx.save();
    // Trace all platform boundaries, including the lower landing.
    for (let y = 0; y < H; y++)
      for (let x = 0; x < W; x++) {
        if (tiles[current().map[y][x]].solid) continue;
        for (const [dx, dy] of [
          [0, -1],
          [0, 1],
          [-1, 0],
          [1, 0],
        ]) {
          const neighbor = current().map[y + dy]?.[x + dx];
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

  function drawWindow(time) {
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

  function drawEcho(time) {
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

  function drawCrackTrail(time) {
    const scene = current().scene;
    if (!['worlds', 'fountain'].includes(scene)) return;
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

  function drawFountain(time) {
    if (current().scene !== 'fountain') return;
    const pulse = (Math.sin(time * 2.5) + 1) / 2;
    // The pool tiles block walking; the rising darkness is scenery above them.
    rect(276, 116, 88, 88, '#211e39');
    rect(282, 118, 76, 79, '#302848');
    rect(290, 175, 60, 18, '#101320');
    rect(297, 178, 46, 11, '#080c17');
    rect(286, 192, 68, 6, '#74649e');
    rect(298, 195, 44, 3, '#b6a6e3');
    rect(294, 76, 52, 105, 'rgba(104,76,159,' + (0.22 + pulse * 0.12) + ')');
    rect(302, 65, 36, 117, '#272039');
    rect(308, 54, 24, 130, '#12121f');
    rect(314, 42, 12, 141, '#070b14');
    rect(305, 84, 3, 73, '#8270b6');
    rect(333, 97, 3, 62, '#554c83');
    for (let i = 0; i < 13; i++) {
      const x = 291 + ((i * 17) % 57),
        y = 186 - ((time * (18 + (i % 3) * 5) + i * 19) % 137);
      rect(x, y, 2 + (i % 2), 5, i % 2 ? '#ab96d9' : '#6e91c2');
    }
    if (state.story.fountainWorse) {
      rect(281, 38, 78, 145, '#54407655');
      rect(292, 30, 56, 151, '#372542');
      rect(300, 19, 40, 164, '#171223');
      rect(311, 9, 18, 175, '#060912');
      rect(286, 101, 4, 71, '#bd6dd1');
      rect(348, 77, 3, 96, '#9174cc');
      ctx.save();
      ctx.strokeStyle = '#b17bdf';
      ctx.lineWidth = 3;
      ctx.beginPath();
      for (const side of [-1, 1]) {
        ctx.moveTo(320 + side * 18, 187);
        ctx.lineTo(320 + side * 37, 207);
        ctx.lineTo(320 + side * 48, 204);
        ctx.lineTo(320 + side * 67, 235);
        ctx.lineTo(320 + side * 85, 246);
      }
      ctx.stroke();
      ctx.restore();
      for (let i = 0; i < 12; i++) {
        const y = 185 - ((time * 45 + i * 17) % 171);
        rect(282 + ((i * 23) % 77), y, 3, 8, i % 2 ? '#b780d7' : '#8194df');
      }
    }
    // Ralsey stops casting here once he joins the moving party.
    if (state.story.teamJoined && state.mode === 'play') return;
    ctx.save();
    ctx.strokeStyle = 'rgba(139,228,191,' + (0.45 + pulse * 0.25) + ')';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(275, 232);
    ctx.lineTo(293, 215);
    ctx.lineTo(303, 185);
    ctx.lineTo(319, 174);
    ctx.stroke();
    rect(289, 213, 5, 5, '#c5f7dc');
    rect(301, 184, 4, 4, '#8ddeb6');
    ctx.restore();
  }

  function drawDive(time) {
    const actors = ['Ralsey', 'Susie', 'Kris', 'Flowey']
      .map((name) => ({ name, pose: divePose(name) }))
      .filter((n) => n.pose)
      .sort((a, b) => a.pose.y - b.pose.y);
    for (const { name, pose } of actors) {
      ctx.save();
      ctx.translate(pose.x, pose.y);
      ctx.scale(pose.scale, pose.scale);
      if (name === 'Kris') drawPlayer(0, 0, time);
      else if (name === 'Flowey') drawFlowey(0, 0, time);
      else drawFountainFriend({ name, x: 0, y: 0 }, time);
      ctx.restore();
    }
    if (state.dive.phase !== 'hesitate') {
      ctx.save();
      ctx.strokeStyle = '#c9adeb';
      ctx.lineWidth = 2;
      ctx.beginPath();
      const radius = 14 + Math.sin(state.dive.age * 5) * 5;
      ctx.ellipse(320, 180, radius, 5, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }
  }

  function drawBuster() {
    if (!state.buster || state.mode !== 'play') return;
    const age = state.buster.age;
    pixelText(age < 1.15 ? 'RUDE BUSTER!' : 'THE FOUNTAIN IS GROWING!', age < 1.15 ? 244 : 187, 92, '#f5b8f2', 16);
    if (age < 0.65) {
      const radius = 8 + age * 23;
      ctx.save();
      ctx.strokeStyle = '#e1a0ef';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(399, 218 - radius);
      ctx.lineTo(399 + radius, 218);
      ctx.lineTo(399, 218 + radius);
      ctx.lineTo(399 - radius, 218);
      ctx.closePath();
      ctx.stroke();
      ctx.restore();
      rect(396, 214, 7, 9, '#eed1ff');
    } else if (age < 1.15) {
      const progress = (age - 0.65) / 0.5,
        x = 399 + (320 - 399) * progress,
        y = 218 + (151 - 218) * progress;
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(-0.7);
      ctx.fillStyle = '#9e48c0';
      ctx.beginPath();
      ctx.moveTo(-30, -14);
      ctx.lineTo(19, 0);
      ctx.lineTo(-30, 14);
      ctx.lineTo(-14, 0);
      ctx.closePath();
      ctx.fill();
      rect(-10, -3, 28, 6, '#f1d1ff');
      rect(-25, -2, 14, 4, '#d48eec');
      ctx.restore();
    } else {
      const progress = (age - 1.15) / 1.65,
        radius = 20 + progress * 155;
      ctx.save();
      ctx.strokeStyle = 'rgba(219,148,236,' + (1 - progress) * 0.8 + ')';
      ctx.lineWidth = 5 - 3 * progress;
      ctx.beginPath();
      ctx.arc(320, 160, radius, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
      rect(0, 0, 640, 480, 'rgba(122,62,158,' + Math.max(0, 0.16 * (1 - progress)) + ')');
    }
  }

  function drawGlitchDescent() {
    const age = state.holeFall.age,
      phase = age - 1.3,
      still = reducedParticleMotion.matches;
    const t = still ? 0 : phase,
      intensity = Math.min(1, phase / 5);
    ctx.save();
    ctx.imageSmoothingEnabled = false;
    rect(0, 0, 640, 480, '#080910');
    // The real room tears into scrolling strips before dissolving into the void.
    const worldAlpha = Math.max(0, 1 - phase / 4) * 0.6;
    if (state.holeFall.worldFrame && worldAlpha > 0) {
      ctx.globalAlpha = worldAlpha;
      for (let i = 0; i < 12; i++) {
        const shift = still ? 0 : Math.round(Math.sin(Math.floor(t * 6) + i * 3.1) * (12 + intensity * 90));
        const y = (((i * 40 - t * 150) % 480) + 480) % 480;
        ctx.drawImage(state.holeFall.worldFrame, 0, i * 40, 640, 40, shift, y, 640, 40);
      }
    }
    const colors = ['#ff3c59', '#ffe433', '#637bff', '#b6c0d6'];
    for (let i = 0; i < 38; i++) {
      const x = (i * 83 + 17) % 640,
        y = ((((i * 61 - t * (220 + (i % 3) * 45)) % 540) + 540) % 540) - 40;
      ctx.globalAlpha = 0.12 + (i % 4) * 0.05;
      rect(x, y, (i % 3) + 1, 20 + (i % 6) * 9, colors[i % 4]);
      if (i % 6 === 0) rect(x - 10, y + 12, 25 + (i % 4) * 12, 2, colors[(i + 1) % 4]);
    }
    // Tangled color strands drift upward around the falling party.
    for (let side = 0; side < 2; side++) {
      const cx = 100 + side * 430,
        cy = ((((side * 240 + 390 - t * 80) % 580) + 580) % 580) - 50;
      for (const [i, strand] of glitchStrands.entries()) {
        ctx.globalAlpha = 0.45;
        ctx.strokeStyle = strand.color;
        ctx.lineWidth = 1;
        ctx.beginPath();
        for (const [j, [px, py]] of strand.points.entries()) {
          const x = cx + px * 0.4 + (still ? 0 : Math.sin(Math.floor(t * 5) + i + j) * 4);
          const y = cy + py * 0.4;
          if (!j) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.stroke();
      }
    }
    state.holeFall.actors.forEach((actor, i) => {
      const jitter = still ? 0 : Math.sin(Math.floor(t * 7) + i * 4) * intensity * 5;
      const x = 235 + i * 58 + Math.sin(t * 0.8 + i) * 10 + jitter,
        y = 190 + i * 35 + Math.sin(t * 1.7 + i * 2) * 18;
      ctx.save();
      ctx.globalAlpha = 1;
      ctx.translate(Math.round(x), Math.round(y));
      ctx.rotate(still ? 0 : Math.sin(t * 1.4 + i) * 0.1);
      if (actor.name === 'Kris') drawPlayer(0, 0, t);
      else if (actor.name === 'Flowey') drawFlowey(0, 0, t);
      else drawFountainFriend({ name: actor.name, x: 0, y: 0 }, t);
      ctx.restore();
    });
    ctx.globalAlpha = 1;
    // Fade into the white destination without a flash back to the CORE.
    if (age > 9) rect(0, 0, 640, 480, 'rgba(255,255,255,' + Math.min(1, age - 9) + ')');
    ctx.restore();
    $('gameHint').textContent = 'The party keeps falling...';
  }

  function render(time) {
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
    // Shake the scene briefly; keep the surrounding UI and fade overlay steady.
    rect(0, 0, 640, 480, roomBackground(r));
    ctx.save();
    if (state.mode === 'play' && state.cameraShakeTime > 0 && !reducedParticleMotion.matches) {
      const strength = (3 * state.cameraShakeTime) / 0.22;
      ctx.translate(Math.round(Math.sin(time * 95) * strength), Math.round(Math.cos(time * 113) * strength));
    }
    // Empty space and walls are the backdrop. Ground hides only objects assigned beneath it.
    for (let y = 0; y < H; y++)
      for (let x = 0; x < W; x++) if ([1, 10].includes(r.map[y][x])) drawTile(r.map[y][x], x * T, y * T, r.theme);
    drawLayerObjects('ground', time);
    drawIslands();
    for (let y = 0; y < H; y++)
      for (let x = 0; x < W; x++) if (![1, 10].includes(r.map[y][x])) drawTile(r.map[y][x], x * T, y * T, r.theme);
    if (state.mode === 'build' && r.scene === 'glitchBoss') drawNoelleBoss(528, 122, 140);
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
        ...partyFriends().map((n) => ({ y: n.y, draw: () => drawFountainFriend(n, time) })),
        ...roomNpcs()
          .filter((object) => objectLayer(object) === 'normal')
          .map((n) => ({ y: n.y * T + 24, draw: () => drawNpc(n) })),
      ];
      for (const tile of roomTrees().filter((object) => objectLayer(object) === 'normal')) {
        const tree = { ...tile, x: tile.x * T + 20, y: tile.y * T + 20 };
        actors.push({ y: tree.y, draw: () => drawDarkTree(tree) });
      }
      if (flower) actors.push({ y: flower.y, draw: () => drawFlowey(flower.x, flower.y, time) });
      actors.sort((a, b) => a.y - b.y).forEach((a) => a.draw());
      if (roomWaitingFriends().length) drawComfortingArm(state.glitchWaiting.Susie, state.glitchWaiting.Ralsey);
      if (state.story.teamJoined && facingFountain() && !state.dialogue && !state.buster)
        pixelText('C / Z · I. C.', 282, 212, '#ead8ff', 11);
      if (nearbyCandyTree() && !state.dialogue && !state.buster)
        pixelText('C / Z · G. CANDY', state.player.x - 48, state.player.y - 68, '#ffd9ee', 10);
      const npc = nearbyNpc();
      if (npc && !state.dialogue && !state.buster && state.story.emerging < 0 && state.story.discussion < 0)
        pixelText('C / Z', npc.x * T + 3, npc.y * T - 34, '#fff0c7', 10);
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
      if (roomWaitingFriends().length) drawComfortingArm(state.glitchWaiting.Susie, state.glitchWaiting.Ralsey);
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
    drawBuster();
    if (state.mode === 'play' && state.dive?.phase === 'flowey' && state.dive.age > 1.15)
      rect(0, 0, 640, 480, 'rgba(8,9,18,' + Math.min(1, (state.dive.age - 1.15) / 0.9) + ')');
    ctx.restore();
    if (state.fade > 0) rect(0, 0, 640, 480, `rgba(17,20,29,${Math.min(1, state.fade / 0.32)})`);
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
                          : ['npc', 'npcMove', 'npcSelect'].includes(state.tool)
                            ? state.tool === 'npc'
                              ? 'Click a clear tile to place Froggit.'
                              : state.tool === 'npcMove'
                                ? 'Click a clear tile to move the selected NPC.'
                                : 'Click an NPC to edit its speech.'
                            : state.tool === 'flowey'
                              ? 'Click a clear tile to place Flowey.'
                              : state.tool === 'spawn'
                                ? 'Click a clear tile to set the starting spot.'
                                : 'Painting: ' + tiles[state.tool].label + ' · click or drag'
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
                          ? 'C / Z to talk to ' + nearbyNpc().name + '.'
                          : nearFountainFriend()
                            ? 'Press Z to talk to ' + nearFountainFriend().name + '.'
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
