// The battle appearance lives here. Attack patterns and action rules can be added separately.
import { maxHP, H, W, T } from './config.js';
import { battleSettings, canKrisAct } from './battle-rules.js';
import memoryURL from '../assets/proceed-memory.png?inline';

export function createBattleDrawing(ctx, state, helpers) {
  const {
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
  } = helpers;
  const memory = new Image();
  memory.src = memoryURL;
  const current = () => state.project.rooms[state.roomIndex];
  function drawBattleKris(x, y, scale = 1) {
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(scale, scale);
    rect(-12, -20, 9, 18, '#182545');
    rect(4, -20, 9, 16, '#182545');
    rect(-13, -8, 10, 8, '#e5f3ff');
    rect(4, -9, 11, 8, '#e5f3ff');
    rect(-10, -5, 6, 4, '#60759c');
    rect(-12, -43, 25, 25, '#17223f');
    rect(-15, -45, 10, 15, '#243755');
    rect(8, -43, 11, 13, '#243755');
    rect(-7, -27, 17, 5, '#93c5d9');
    rect(-10, -24, 9, 4, '#cce8ef');
    rect(10, -36, 9, 14, '#72d7ee');
    rect(15, -30, 10, 8, '#91e7ef');
    rect(-10, -62, 24, 19, '#62d5ef');
    rect(7, -59, 11, 13, '#75e1f4');
    rect(11, -57, 3, 4, '#17233f');
    rect(-17, -70, 30, 16, '#121b43');
    rect(-21, -64, 13, 18, '#151f49');
    rect(-18, -54, 14, 9, '#151f49');
    rect(-9, -76, 14, 9, '#151f49');
    rect(6, -68, 12, 10, '#151f49');
    rect(-23, -59, 8, 15, '#151f49');
    ctx.fillStyle = '#e33cb0';
    ctx.beginPath();
    ctx.moveTo(-9, -49);
    ctx.lineTo(12, -46);
    ctx.lineTo(7, -39);
    ctx.lineTo(-16, -42);
    ctx.lineTo(-29, -34);
    ctx.lineTo(-35, -38);
    ctx.closePath();
    ctx.fill();
    rect(-20, -42, 19, 4, '#f571ce');
    rect(8, -44, 10, 6, '#c72c99');
    ctx.beginPath();
    ctx.moveTo(22, -28);
    ctx.lineTo(44, -61);
    ctx.lineTo(51, -60);
    ctx.lineTo(52, -53);
    ctx.lineTo(27, -23);
    ctx.closePath();
    ctx.fillStyle = '#f4b6cb';
    ctx.fill();
    ctx.strokeStyle = '#452445';
    ctx.lineWidth = 2;
    ctx.stroke();
    rect(19, -27, 10, 4, '#ce6c9c');
    rect(18, -23, 4, 6, '#78395f');
    ctx.restore();
  }

  function drawBattleFlowey(x, y, time, scale = 1) {
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(scale, scale);
    drawFlowey(0, 0, time);
    // Worried eyes and a small frown match the face-off in the reference.
    rect(-8, -33, 16, 17, '#f5f1e6');
    for (const ex of [-7, 2]) {
      rect(ex, -32, 7, 10, '#29252d');
      rect(ex + 1, -31, 5, 8, '#ffffff');
      rect(ex + 3, -29, 2, 5, '#29252d');
    }
    rect(-3, -20, 6, 2, '#29252d');
    rect(-5, -18, 2, 2, '#29252d');
    rect(3, -18, 2, 2, '#29252d');
    ctx.restore();
  }

  function drawBattlePanel(x, y, width, height) {
    rect(x, y, width, height, '#050505');
    ctx.save();
    ctx.strokeStyle = '#f6f6f6';
    ctx.lineWidth = 2;
    ctx.strokeRect(x + 2, y + 2, width - 4, height - 4);
    for (const px of [x, x + width - 5])
      for (const py of [y, y + height - 5]) {
        rect(px, py, 5, 5, '#f6f6f6');
        rect(px + 1, py + 1, 3, 3, '#161616');
      }
    ctx.restore();
  }

  function drawBattleStatus(name, x, color, time) {
    const y = 300,
      width = 298;
    drawBattlePanel(x, y, width, 45);
    if (name === 'Kris') drawBattleKris(x + 25, y + 37, 0.35);
    else drawBattleFlowey(x + 25, y + 36, time, 0.58);
    pixelText(name.toUpperCase(), x + 51, y + 28, '#ffffff', 18);
    pixelText(state.partyHP[name] + ' / ' + maxHP, x + width - 104, y + 16, '#ffffff', 12);
    pixelText('HP', x + width - 128, y + 33, '#ffffff', 11);
    rect(x + width - 104, y + 24, 90, 9, '#333333');
    rect(x + width - 104, y + 24, 90 * Math.max(0, Math.min(1, state.partyHP[name] / maxHP)), 9, color);
  }

  function drawBattleMenu() {
    const encounter = state.bossEncounter,
      acting = canKrisAct(encounter);
    drawBattlePanel(18, 353, 350, 115);
    drawBattlePanel(378, 353, 244, 115);
    for (const [id, label, x, y] of [
      ['attack', 'ATTACK', 65, 386],
      ['act', 'ACT', 65, 418],
      ['item', 'ITEM', 65, 450],
      ['defend', 'DEFEND', 227, 418],
    ]) {
      const color = acting ? (encounter.selectedAction === id ? '#fff32a' : '#ffffff') : '#888888';
      pixelText(label, x, y, color, 19);
      if (acting && encounter.selectedAction === id) pixelText('>', x - 23, y, color, 19);
    }
    pixelText('SPARE', 227, 386, '#94d9ef', 19);
    // Ice bars make the locked action visible even in the canvas menu.
    rect(218, 373, 119, 3, '#bcefff');
    rect(224, 382, 106, 2, '#67a5c9');
    const title =
      encounter.phase === 'victory'
        ? '??? disappeared.'
        : `${encounter.turn || 'Proceed'}${encounter.turn ? '’s turn' : '...'}`;
    pixelText(title, 391, 377, '#ffffff', 16);
    if (encounter.screen === 'attack' || encounter.phase === 'flowey') {
      pixelText('???', 391, 402, '#ffffff', 18);
      pixelText(`HP ${encounter.enemy.hp} / ${encounter.enemy.maxHP}`, 391, 423, '#ffffff', 14);
      rect(392, 434, 208, 8, '#41232b');
      rect(392, 434, (208 * encounter.enemy.hp) / encounter.enemy.maxHP, 8, '#e7688b');
      if (acting) pixelText('Confirm attack', 391, 459, '#fff32a', 14);
    } else if (encounter.screen === 'act') {
      pixelText('PROCEED · 100% TP', 391, 404, encounter.tp >= 100 ? '#fff32a' : '#999999', 16);
      pixelText(`Proceed: ${encounter.proceedCount} / 3`, 391, 431, '#ffffff', 14);
      pixelText(encounter.tp >= 100 ? 'Confirm to proceed' : 'Not enough TP', 391, 455, '#cccccc', 13);
    } else if (encounter.phase !== 'victory') {
      pixelText('Choose an action.', 391, 410, '#ffffff', 15);
      pixelText('Z / Enter to select', 391, 439, '#cccccc', 13);
    }
  }

  function drawTP() {
    const tp = Math.max(0, Math.min(100, state.bossEncounter.tp));
    rect(6, 65, 48, 213, '#050505');
    rect(21, 105, 12, 124, '#4d3544');
    rect(21, 229 - (124 * tp) / 100, 12, (124 * tp) / 100, '#ffb634');
    pixelText('TP', 13, 86, '#ffffff', 15);
    pixelText(`${Math.floor(tp)}%`, 11, 265, '#ffca50', 14);
  }

  function drawBossEncounter(time) {
    const room = current(),
      t = reducedParticleMotion.matches ? 0 : time;
    ctx.imageSmoothingEnabled = false;
    rect(0, 0, 640, 480, roomBackground(room));
    // Compress the workshop's terrain into a horizontal stage, preserving its tile colors.
    const terrain = (backdrop) => {
      ctx.save();
      ctx.translate(0, 38);
      ctx.scale(1, 0.56);
      for (let y = 0; y < H; y++)
        for (let x = 0; x < W; x++)
          if ([1, 10].includes(room.map[y][x]) === backdrop) drawTile(room.map[y][x], x * T, y * T, room.theme);
      ctx.restore();
    };
    terrain(true);
    drawLayerObjects('ground', t);
    terrain(false);
    drawLayerObjects('back', t);
    drawPlacedParticles(t, false);
    drawGlitchParticles(t, false);
    drawPlacedParticles(t, true);
    drawGlitchParticles(t, true);
    drawBattleKris(88, 266, 1.25);
    drawBattleFlowey(178, 265, t, 1.22);
    const encounter = state.bossEncounter;
    if (encounter.enemy.visible) {
      ctx.save();
      if (encounter.phase === 'vanishing')
        ctx.globalAlpha = reducedParticleMotion.matches
          ? 0
          : Math.max(0, 1 - encounter.animationAge / battleSettings.disappearSeconds);
      drawNoelleBoss(528, 122, 140);
      ctx.restore();
    }
    if (encounter.hitAge !== null) pixelText('-75', 515, 110 - encounter.hitAge * 35, '#ffdc59', 24);
    drawTP();
    drawBattleStatus('Kris', 18, '#00e5ec', t);
    drawBattleStatus('Flowey', 324, '#eef51c', t);
    drawBattleMenu();
    if (state.fade > 0) rect(0, 0, 640, 480, 'rgba(17,20,29,' + Math.min(1, state.fade / 0.32) + ')');
    if (encounter.phase === 'proceedFlash' && memory.complete && memory.naturalWidth) {
      rect(0, 0, 640, 480, '#000000');
      ctx.drawImage(memory, 0, 0, 640, 480);
    }
    $('gameHint').textContent = state.dialogue
      ? 'C / Z / Enter to continue · L to skip'
      : encounter.phase === 'flowey'
        ? `${encounter.message} Flowey’s turn is next.`
        : encounter.message;
  }
  return { drawBossEncounter };
}
