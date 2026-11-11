import { drawVesselRain } from '../vessel/sword-rain-drawing.ts';
import { drawVessel, drawVesselXSlash } from '../vessel/drawing.ts';
import { vesselBattleLayout, xSlashBackgroundShake } from '../vessel/combat.ts';
import { drawMysteriousVoid } from '../../rooms/mysterious-void/drawing.ts';
import { drawKnightRift } from '../knights/rift-drawing.ts';
import { drawAimedSwords } from '../knights/aimed-swords-drawing.ts';
import { drawCrossingSwords } from '../knights/crossing-swords-drawing.ts';
import { partyDuelFrame } from '../knights/party-duel.ts';
import { drawPartyDuelEffects } from '../knights/party-duel-drawing.ts';
import { drawKnightSwords } from '../knights/swords-drawing.ts';
import { drawKnightBattlefield } from '../../rooms/post-show/knight-duel-drawing.ts';
import { drawKnightActor } from '../../rooms/post-show/knight-sprites.ts';
import { drawKnightHover, floatingKnight } from '../../rooms/post-show/knight-hover.ts';
import { tennaCollapseSeconds } from '../tenna/ending.ts';
import { drawUndyneAttack, undyneArenaBounds, undyneDropOffset } from '../tenna/undyne.ts';
import { drawUndyne } from '../tenna/undyne-drawing.ts';
import { drawUndyneMenuSpear, undynePresent } from '../tenna/undyne-actions.ts';
import { drawHammerMinigame } from '../tenna/hammers-drawing.ts';
import { drawSurferMinigame } from '../tenna/surfers-drawing.ts';
import { drawShootingMinigame } from '../tenna/minigame-drawing.ts';
import { drawTvBolts } from '../tenna/tv-bolts.ts';
import { createGlitchStudioDrawing } from '../../rooms/glitch-studio/glitch-studio-drawing.ts';
import type { Elements } from '../../game/dom.ts';
import { present } from '../../game/invariants.ts';
import type { GameState } from '../../game/types.ts';
import type { PartyName } from '../../inventory/types.ts';
import type { createSprites } from '../../rendering/sprites.ts';
import type { DrawingHelpers } from '../../rendering/types.ts';
import { createTennaSprite } from '../../rooms/backstage/tenna-sprite.ts';
import type { Room } from '../../world/types.ts';
import { darkActInfo, darkActLocked } from '../dark/dark-acts.ts';
import { drawMiniSwords } from '../dark/mini-swords.ts';
import { drawSwords } from '../dark/swords.ts';
import { drawWarningSwords } from '../dark/warning-swords.ts';
import type { createOrbitAttack } from '../noelle/orbit.ts';
import { drawSaxAttack, drawSaxHelper } from '../tenna/saxophones.ts';
import { battleArena } from './settings.ts';
import type { Encounter, Snowball } from './types.ts';
// The battle appearance lives here. Attack patterns and action rules can be added separately.
import { H, maxHP, T, W } from '../../game/config.ts';
import { drawDarkEyes } from '../dark/dark-battle.ts';
import { createAftermathDrawing } from '../noelle/aftermath-drawing.ts';
import { isBattleBlackout, isRalseyChoice, isSlashScreen } from '../noelle/aftermath.ts';
import { crossingHazards, crossingSettings } from '../noelle/crossing.ts';
import {
  goalArena,
  goalGroundY,
  goalPlatforms,
  goalSettings,
  goalSnowballs,
  goalSpeed,
  greenGoal,
} from '../noelle/goal.ts';
import { orbitArena, orbitHazards, orbitSettings } from '../noelle/orbit.ts';
import { createPelletsDrawing } from '../noelle/pellets-drawing.ts';
import { isPelletCast } from '../noelle/pellets.ts';
import { createProceedGlitchDrawing } from '../noelle/proceed-drawing.ts';
import { isProceedScene } from '../noelle/proceed.ts';
import { createRedSlashDrawing } from '../noelle/slash.ts';
import { createSnowgraveDrawing } from '../noelle/snowgrave-drawing.ts';
import { canControlSoul, canFloweyAct, canPartyAct, canUseBattleAction } from './availability.ts';
import { createBattleCharacterSprites } from './character-sprites.ts';
import { createPartyStatusDrawing } from './party-status-drawing.ts';
import { bossAttackDamage } from './resources.ts';
import { isSoulInSnow, snowAttackStatus, snowPathBounds, soulArena } from './rules.ts';
import { battleSettings } from './settings.ts';
export function createBattleDrawing(
  ctx: CanvasRenderingContext2D,
  state: GameState,
  helpers: DrawingHelpers &
    Pick<ReturnType<typeof createSprites>, 'drawNoelleBoss' | 'drawFlowey' | 'drawFountainFriend'> & {
      $: Elements;
      roomBackground: (room?: Room) => string;
      drawTile: (id: number, x: number, y: number, theme: string) => void;
      drawLayerObjects: (layer: string, time: number) => void;
      drawPlacedParticles: (time: number, foreground: boolean, layer?: string) => void;
      drawGlitchParticles: (time: number, foreground: boolean, layer?: string) => void;
    },
) {
  const {
    rect,
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
  const snowgraveDrawing = createSnowgraveDrawing(ctx, { rect, pixelText, reducedParticleMotion });
  const battleSprites = createBattleCharacterSprites(ctx, () => reducedParticleMotion.matches);
  const drawPartyMember = createPartyStatusDrawing(ctx, battleSprites, reducedParticleMotion);
  const drawRedSlash = createRedSlashDrawing(ctx);
  const aftermathDrawing = createAftermathDrawing(ctx, {
    rect,
    pixelText,
    drawNoelleBoss,
    battleSprites,
    reducedParticleMotion,
  });
  const drawProceedGlitch = createProceedGlitchDrawing(ctx, reducedParticleMotion);
  const drawPelletsCast = createPelletsDrawing(ctx, reducedParticleMotion);
  const battleArenaForDark = { x: 205, y: 48, size: 230 };
  const {
    draw: drawTenna,
    drawStatic: drawTennaStatic,
    drawCollapse: drawTennaCollapse,
  } = createTennaSprite(ctx);
  const studio = createGlitchStudioDrawing(ctx, { rect, reducedParticleMotion });
  const current = () => state.project.rooms[state.roomIndex];
  function drawBattleKris(x: number, y: number, scale = 1, hitAge: number | null = null) {
    drawPartyMember('Kris', x, y, scale, state.bossEncounter?.partyStatus?.Kris, () =>
      battleSprites.kris(x, y, scale, hitAge, state.bossEncounter?.rescue?.stage === 'strike'),
    );
  }
  function drawSwordSlash(hitAge: number) {
    if (hitAge === null || hitAge >= battleSettings.swordSwingSeconds) return;
    const progress = hitAge / battleSettings.swordSwingSeconds,
      reach = reducedParticleMotion.matches ? 1 : Math.min(1, 0.2 + progress * 4);
    ctx.save();
    ctx.translate(528, 192);
    ctx.rotate(-Math.PI / 4);
    ctx.globalAlpha = 1 - progress;
    // A tapered diagonal cut marks the hit, then quickly fades as the boss recoils.
    for (const [width, color] of [[11, '#f571ce'] as const, [4, '#fff7fc'] as const]) {
      ctx.beginPath();
      ctx.moveTo(0, -75);
      ctx.lineTo(width, -18);
      ctx.lineTo(0, -75 + 150 * reach);
      ctx.lineTo(-width, -18);
      ctx.closePath();
      ctx.fillStyle = color;
      ctx.fill();
    }
    ctx.restore();
  }
  function drawFloweyPellets(hitAge: number) {
    if (hitAge === null || hitAge >= battleSettings.swordSwingSeconds) return;
    const progress = hitAge / battleSettings.swordSwingSeconds;
    ctx.save();
    ctx.globalAlpha = 1 - progress;
    for (let i = 0; i < 5; i++) {
      const angle = (i * Math.PI * 2) / 5,
        spread = reducedParticleMotion.matches ? 30 : 15 + progress * 60;
      ctx.beginPath();
      ctx.ellipse(
        528 + Math.cos(angle) * spread,
        192 + Math.sin(angle) * spread,
        3,
        7,
        angle,
        0,
        Math.PI * 2,
      );
      ctx.fillStyle = '#ffffff';
      ctx.fill();
    }
    ctx.restore();
  }
  function drawBattleFlowey(x: number, y: number, time: number, scale = 1) {
    drawPartyMember('Flowey', x, y, scale, state.bossEncounter?.partyStatus?.Flowey, () =>
      battleSprites.flowey(x, y, time, scale),
    );
  }
  function drawBattlePanel(x: number, y: number, width: number, height: number) {
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
  function drawBattleStatus(name: PartyName, x: number, color: string, time: number) {
    const y = 300,
      width = 298;
    drawBattlePanel(x, y, width, 45);
    if (name === 'Kris') drawBattleKris(x + 25, y + 37, 0.35);
    else drawBattleFlowey(x + 25, y + 36, time, 0.58);
    const down = state.partyHP[name] <= 0;
    pixelText(name.toUpperCase(), x + 51, y + 28, down ? '#9b93ab' : '#ffffff', 18);
    if (down) pixelText('DOWN', x + 127, y + 28, '#f783aa', 11);
    pixelText(state.partyHP[name] + ' / ' + maxHP, x + width - 104, y + 16, '#ffffff', 12);
    pixelText('HP', x + width - 128, y + 33, '#ffffff', 11);
    rect(x + width - 104, y + 24, 90, 9, '#333333');
    rect(x + width - 104, y + 24, 90 * Math.max(0, Math.min(1, state.partyHP[name] / maxHP)), 9, color);
  }
  function drawDarkPartyStatus() {
    const party: PartyName[] = ['Kris', 'Flowey', 'Susie', 'Ralsey'],
      colors = ['#00e5ec', '#eef51c', '#cc78db', '#80e7aa'];
    party.forEach((name, index) => {
      const x = 18 + index * 153,
        hp = state.partyHP[name],
        active = present(state.bossEncounter).turn === name;
      drawBattlePanel(x, 300, 145, 45);
      if (active) rect(x + 3, 302, 139, 2, colors[index]);
      pixelText(name.toUpperCase(), x + 9, 318, hp <= 0 ? '#ee819e' : active ? '#fff32a' : '#ffffff', 14);
      pixelText(hp <= 0 ? 'DOWN' : `${hp} / 100`, x + 83, 317, hp <= 0 ? '#ee819e' : '#ffffff', 10);
      pixelText('HP', x + 9, 336, '#cccccc', 10);
      rect(x + 31, 328, 104, 8, '#333333');
      rect(x + 31, 328, (104 * Math.max(0, hp)) / 100, 8, colors[index]);
    });
  }
  function drawBattleMenu() {
    const encounter = present(state.bossEncounter),
      acting = canPartyAct(encounter),
      floweyTurn = canFloweyAct(encounter);
    drawBattlePanel(18, 353, 350, 115);
    drawBattlePanel(378, 353, 244, 115);
    if (canControlSoul(encounter)) {
      const inSnow = isSoulInSnow(encounter),
        title =
          encounter.kind === 'knights'
            ? encounter.snowAttack.direction === 'knightAimed'
              ? 'DODGE THE AIMED SWORDS'
              : 'DODGE THE SWORDS'
            : encounter.kind === 'tenna'
              ? encounter.snowAttack?.direction === 'tvBolts'
                ? 'DODGE THE BOLTS'
                : encounter.snowAttack?.direction === 'undyne'
                  ? 'BLOCK THE SPEARS'
                  : 'DODGE THE NOTES'
              : encounter.kind === 'dark'
                ? encounter.snowAttack?.darkPattern === 2
                  ? 'DODGE THE WARNINGS'
                  : encounter.snowAttack?.darkPattern === 1
                    ? 'WATCH THE EDGES'
                    : 'DODGE THE SWORDS'
                : encounter.snowAttack?.endingAge != null
                  ? 'ATTACK ENDED'
                  : inSnow
                    ? 'IN SNOW: SLOWED'
                    : encounter.snowAttack?.direction === 'snowgrave'
                      ? 'FINAL ATTACK: SNOWGRAVE'
                      : encounter.snowAttack?.direction === 'goal'
                        ? 'BLUE SOUL: JUMP & CLIMB'
                        : encounter.snowAttack?.direction === 'path'
                          ? 'FOLLOW THE PATH'
                          : encounter.snowAttack?.direction === 'orbit'
                            ? 'DODGE THE ICE'
                            : encounter.snowAttack?.direction === 'crossing'
                              ? 'DODGE THE SNOWBALLS'
                              : 'DODGE THE SNOW';
      pixelText(title, 38, 385, inSnow ? '#ffbd69' : '#ffffff', 19);
      pixelText(
        encounter.snowAttack?.direction === 'goal'
          ? 'Left/right · Hold Up / W / Space'
          : encounter.snowAttack?.direction === 'undyne'
            ? 'Arrows / WASD: Shield'
            : 'Arrow keys / WASD',
        38,
        418,
        '#fff32a',
        encounter.snowAttack?.direction === 'goal' ? 13 : 17,
      );
      const status =
        encounter.snowAttack?.direction === 'goal'
          ? `Speed ${goalSpeed(encounter.snowAttack.goal)} / ${goalSettings.maxSpeed} · + every 10s`
          : encounter.snowAttack?.direction === 'undyne'
            ? 'Yellow: block opposite side'
            : snowAttackStatus(encounter);
      pixelText(status, 38, 449, '#cccccc', 14);
    } else {
      for (const [id, label, x, y] of [
        ['attack', 'ATTACK', 65, 386] as const,
        ['act', 'ACT', 65, 418] as const,
        ['item', 'ITEM', 65, 450] as const,
        ['defend', 'DEFEND', 227, 418] as const,
      ]) {
        const enabled = acting && canUseBattleAction(encounter, id),
          color = enabled ? (encounter.selectedAction === id ? '#fff32a' : '#ffffff') : '#666677';
        pixelText(label, x, y, color, 19);
        if (acting && encounter.selectedAction === id) pixelText('>', x - 23, y, color, 19);
      }
      pixelText(
        encounter.kind === 'tenna' && !undynePresent(encounter) ? 'TV TIME!' : 'SPARE',
        227,
        386,
        ['dark', 'tenna', 'knights', 'vessel'].includes(encounter.kind ?? '')
          ? acting && encounter.selectedAction === 'spare'
            ? '#fff32a'
            : acting
              ? '#ffffff'
              : '#666677'
          : '#94d9ef',
        19,
      );
      if (acting && encounter.selectedAction === 'spare') pixelText('>', 204, 386, '#fff32a', 19);
      // Ice bars make the locked action visible even in the canvas menu.
      if (!['dark', 'tenna', 'knights', 'vessel'].includes(encounter.kind ?? '')) {
        rect(218, 373, 119, 3, '#bcefff');
        rect(224, 382, 106, 2, '#67a5c9');
      }
      if (acting && encounter.screen !== 'menu') {
        rect(198, 433, 160, 27, '#243044');
        pixelText('< BACK  X / Esc', 207, 451, '#fff32a', 14);
      }
    }
    const title =
      encounter.phase === 'victory'
        ? encounter.kind === 'vessel'
          ? 'Vessel defeated.'
          : encounter.kind === 'knights'
            ? 'The knights are down.'
            : encounter.kind === 'dark'
              ? '??? defeated.'
              : encounter.noelleEscaped
                ? 'Noelle escaped.'
                : '??? disappeared.'
        : encounter.turn === 'Knights'
          ? 'Knights’ turn'
          : `${encounter.turn || 'Proceed'}${encounter.turn ? '’s turn' : '...'}`;
    pixelText(title, 391, 377, '#ffffff', 16);
    if (isRalseyChoice(encounter)) {
      pixelText('RALSEY', 391, 406, '#99dfb5', 18);
      pixelText('Only ATTACK remains.', 391, 435, '#cccccc', 13);
    } else if (encounter.kind === 'tenna') {
      pixelText(
        encounter.screen === 'act'
          ? encounter.turn === 'Kris'
            ? 'MINIGAME'
            : 'CHECK TENNA'
          : `${encounter.enemy.name.toUpperCase()} HP ${encounter.enemy.hp}/${encounter.enemy.maxHP}`,
        391,
        407,
        '#ffffff',
        14,
      );
      pixelText('THE FINALE', 391, 435, '#ffca50', 14);
    } else if (encounter.kind === 'vessel') {
      pixelText(encounter.screen === 'act' ? darkActInfo(encounter).name : 'VESSEL', 391, 403, '#eeeeee', 16);
      pixelText(`HP ${encounter.enemy.hp}/${encounter.enemy.maxHP}`, 391, 426, '#ffffff', 13);
      pixelText(
        encounter.screen === 'act' ? `${darkActInfo(encounter).cost}% TP` : 'A silent challenger.',
        391,
        450,
        '#bbbbbb',
        12,
      );
    } else if (encounter.kind === 'knights') {
      const act = darkActInfo(encounter);
      pixelText(
        encounter.screen === 'act' ? act.name.toUpperCase() : encounter.enemy.name,
        391,
        403,
        '#ffffff',
        13,
      );
      pixelText(
        encounter.screen === 'act' ? `${act.cost}% TP` : `HP ${encounter.enemy.hp}/${encounter.enemy.maxHP}`,
        391,
        426,
        '#fff32a',
        13,
      );
      pixelText(encounter.holdBreath ? 'TEAM DAMAGE -25%' : 'THREE TEAMS', 391, 450, '#a8d7e3', 12);
    } else if (encounter.kind === 'dark') {
      if (encounter.screen === 'act') {
        const act = darkActInfo(encounter),
          locked = darkActLocked(encounter);
        pixelText(act.name.toUpperCase(), 391, 403, locked ? '#777788' : '#ffffff', 14);
        pixelText(
          `${act.cost}% TP${locked ? ' · LOCKED' : ''}`,
          391,
          426,
          locked ? '#777788' : '#fff32a',
          14,
        );
        pixelText(`Shine ${encounter.shineCount || 0}/5`, 391, 450, '#cccccc', 13);
      } else {
        pixelText(
          encounter.phase === 'victory'
            ? '??? defeated.'
            : `??? HP ${encounter.enemy.hp}/${encounter.enemy.maxHP}`,
          391,
          410,
          '#ffffff',
          14,
        );
        pixelText(
          encounter.darkUnlocked ? 'Attacks / ACTs unlocked' : 'Shine 3 times to unlock',
          391,
          435,
          encounter.darkUnlocked ? '#a6ffb6' : '#fff32a',
          13,
        );
      }
    } else if (encounter.screen === 'attack' || encounter.phase === 'enemy') {
      pixelText('???', 391, 402, '#ffffff', 18);
      pixelText(`HP ${encounter.enemy.hp} / ${encounter.enemy.maxHP}`, 391, 423, '#ffffff', 14);
      rect(392, 434, 208, 8, '#41232b');
      rect(392, 434, (208 * encounter.enemy.hp) / encounter.enemy.maxHP, 8, '#e7688b');
      if (acting) pixelText('Confirm attack', 391, 459, '#fff32a', 14);
    } else if (encounter.screen === 'act') {
      if (floweyTurn) {
        const color = encounter.tp >= battleSettings.pelletsCost ? '#fff32a' : '#999999';
        pixelText('FRIENDLYNESS', 391, 399, color, 15);
        pixelText('PELLETS · 90% TP', 391, 417, color, 15);
        pixelText('150 DMG · +35 HP', 391, 437, '#ffffff', 14);
        pixelText(
          encounter.tp >= battleSettings.pelletsCost ? 'Confirm to use' : 'Not enough TP',
          391,
          457,
          '#cccccc',
          13,
        );
      } else {
        pixelText(
          'PROCEED · 100% TP',
          391,
          404,
          encounter.tp >= battleSettings.proceedCost ? '#fff32a' : '#999999',
          16,
        );
        pixelText(`Proceed: ${encounter.proceedCount} / 3`, 391, 431, '#ffffff', 14);
        pixelText(
          encounter.tp >= battleSettings.proceedCost ? 'Confirm to proceed' : 'Not enough TP',
          391,
          455,
          '#cccccc',
          13,
        );
      }
    } else if (encounter.phase !== 'victory') {
      pixelText('Choose an action.', 391, 410, '#ffffff', 15);
      pixelText('Z / Enter to select', 391, 439, '#cccccc', 13);
    }
  }
  function drawTP() {
    const tp = Math.max(0, Math.min(100, present(state.bossEncounter).tp));
    rect(6, 65, 48, 213, '#050505');
    rect(21, 105, 12, 124, '#4d3544');
    rect(21, 229 - (124 * tp) / 100, 12, (124 * tp) / 100, '#ffb634');
    pixelText('TP', 13, 86, '#ffffff', 15);
    if (present(state.bossEncounter).tpGainAge !== null)
      pixelText(`+${present(state.bossEncounter).tpGainAmount}%`, 8, 101, '#fff478', 11);
    pixelText(`${Math.floor(tp)}%`, 11, 265, '#ffca50', 14);
  }
  function drawSnowEdge(x: number, y: number, length: number, vertical: boolean, bodyDirection: number = 1) {
    ctx.fillStyle = '#f8fcff';
    for (let mound = 0; mound < length; mound += 22) {
      ctx.beginPath();
      if (vertical) ctx.ellipse(x + bodyDirection * 3, y + mound + 11, 6, 15, 0, 0, Math.PI * 2);
      else ctx.ellipse(x + mound + 11, y + bodyDirection * 3, 15, 6, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  function drawSnowball(ball: Pick<Snowball, 'x' | 'y'>, radius = battleSettings.snowballRadius) {
    ctx.beginPath();
    ctx.arc(Math.round(ball.x), Math.round(ball.y), radius, 0, Math.PI * 2);
    ctx.fillStyle = '#f8fcff';
    ctx.fill();
    ctx.strokeStyle = '#b7cbdc';
    ctx.lineWidth = 2;
    ctx.stroke();
    rect(Math.round(ball.x - 4), Math.round(ball.y - 5), 5, 3, '#ffffff');
  }
  function drawOrbitField(orbit: ReturnType<typeof createOrbitAttack>) {
    const { cube, balls } = orbitHazards(orbit);
    ctx.save();
    ctx.beginPath();
    ctx.rect(
      orbitArena.x + orbitArena.border,
      orbitArena.y + orbitArena.border,
      orbitArena.width - orbitArena.border * 2,
      orbitArena.height - orbitArena.border * 2,
    );
    ctx.clip();
    for (const ball of balls) drawSnowball(ball, orbitSettings.ballRadius);
    ctx.translate(cube.x, cube.y);
    ctx.rotate(cube.angle);
    const half = cube.size / 2;
    ctx.beginPath();
    ctx.moveTo(-half + 7, -half);
    ctx.lineTo(half - 7, -half);
    ctx.lineTo(half, -half + 7);
    ctx.lineTo(half, half - 7);
    ctx.lineTo(half - 7, half);
    ctx.lineTo(-half + 7, half);
    ctx.lineTo(-half, half - 7);
    ctx.lineTo(-half, -half + 7);
    ctx.closePath();
    ctx.fillStyle = '#8fd8ec';
    ctx.fill();
    ctx.strokeStyle = '#d7f6ff';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(-half + 8, -half + 7);
    ctx.lineTo(half - 9, -half + 7);
    ctx.lineTo(-half + 8, half - 10);
    ctx.closePath();
    ctx.fillStyle = '#c0edf8';
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(-7, -5);
    ctx.lineTo(4, 3);
    ctx.lineTo(-2, 15);
    ctx.moveTo(4, 3);
    ctx.lineTo(16, 7);
    ctx.strokeStyle = '#e6fbff';
    ctx.stroke();
    ctx.restore();
  }
  function drawGrazeRing(encounter: Encounter) {
    if (!encounter.snowAttack?.grazeActive) return;
    const radius = 32,
      bevel = Math.round(radius * 0.36),
      cx = Math.round(present(encounter.soul).x) + 0.5,
      cy = Math.round(present(encounter.soul).y) + 0.5,
      r = Math.round(radius);
    // Keep the pixel-art halo visible for the entire close dodge, even at full TP.
    ctx.save();
    ctx.strokeStyle = '#fff5ff';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(cx - r + bevel, cy - r);
    ctx.lineTo(cx + r - bevel, cy - r);
    ctx.lineTo(cx + r, cy - r + bevel);
    ctx.lineTo(cx + r, cy + r - bevel);
    ctx.lineTo(cx + r - bevel, cy + r);
    ctx.lineTo(cx - r + bevel, cy + r);
    ctx.lineTo(cx - r, cy + r - bevel);
    ctx.lineTo(cx - r, cy - r + bevel);
    ctx.closePath();
    ctx.stroke();
    ctx.restore();
  }
  function drawSoulArena() {
    const encounter = state.bossEncounter;
    if (!canControlSoul(encounter)) return;
    const snow = encounter.snowAttack;
    if (['crossing', 'goal'].includes(snow?.direction)) rect(0, 24, 640, 266, '#050b12');
    if (snow?.direction === 'orbit') {
      rect(orbitArena.x, orbitArena.y, orbitArena.width, orbitArena.height, '#b4e925');
      rect(
        orbitArena.x + orbitArena.border,
        orbitArena.y + orbitArena.border,
        orbitArena.width - orbitArena.border * 2,
        orbitArena.height - orbitArena.border * 2,
        '#050b12',
      );
    }
    const { x, y, size, width = size, height = size, border } = soulArena(encounter);
    rect(x, y, present(width), present(height), snow?.direction === 'snowgrave' ? '#b9f5ff' : '#00ad00');
    rect(x + border, y + border, present(width) - border * 2, present(height) - border * 2, '#000000');
    const innerSize = present(width) - border * 2,
      horizontal = snow?.direction === 'right',
      snowSurface = (horizontal ? x + present(width) : y + present(height)) - border - (snow?.height || 0);
    if (snow) {
      ctx.save();
      ctx.beginPath();
      ctx.rect(x + border, y + border, innerSize, present(height) - border * 2);
      ctx.clip();
      if (['down', 'right', 'orbit'].includes(snow.direction)) {
        const rim = battleSettings.snowBorderDepth;
        // This rim stays fixed; only the bottom pile or right-hand bank accumulates.
        rect(x + border, y + border, innerSize, rim, '#e6edf3');
        rect(x + border, y + present(size) - border - rim, innerSize, rim, '#e6edf3');
        rect(x + border, y + border, rim, innerSize, '#e6edf3');
        rect(x + present(size) - border - rim, y + border, rim, innerSize, '#e6edf3');
        drawSnowEdge(x + border, y + border + rim, innerSize, false, -1);
        drawSnowEdge(x + border, y + present(size) - border - rim, innerSize, false);
        drawSnowEdge(x + border + rim, y + border, innerSize, true, -1);
        drawSnowEdge(x + present(size) - border - rim, y + border, innerSize, true);
      }
      if (snow.direction === 'path') {
        // Draw the same winding edges used for collision, down to the leading edge.
        const innerRight = x + present(size) - border;
        for (let row = y + border; row < y + present(size) - border; row++) {
          const bounds = snowPathBounds(encounter, row);
          if (!bounds) continue;
          rect(x + border, row, bounds.left - x - border, 1, '#e6edf3');
          rect(bounds.right, row, innerRight - bounds.right, 1, '#e6edf3');
          rect(bounds.left - 3, row, 3, 1, '#f8fcff');
          rect(bounds.right, row, 3, 1, '#f8fcff');
        }
        for (let flake = 0; flake < 28; flake++) {
          const px = x + border + ((flake * 53 + 17) % innerSize),
            py =
              y +
              border +
              ((flake * 37 + (reducedParticleMotion.matches ? 0 : snow.pathAge * 90)) % innerSize),
            bounds = snowPathBounds(encounter, py);
          if (bounds && (px < bounds.left - 4 || px > bounds.right + 4)) rect(px, py, 2, 4, '#ffffff');
        }
      } else if (snow.height > 0) {
        if (horizontal) rect(snowSurface, y + border, snow.height, innerSize, '#e6edf3');
        else rect(x + border, snowSurface, innerSize, snow.height, '#e6edf3');
        if (horizontal) drawSnowEdge(snowSurface, y + border, innerSize, true);
        else drawSnowEdge(x + border, snowSurface, innerSize, false);
      }
      if (!reducedParticleMotion.matches) {
        for (const impact of snow.impacts) {
          const progress = impact.age / 0.35;
          ctx.globalAlpha = 1 - progress;
          for (const side of [-1, 0, 1]) {
            ctx.beginPath();
            ctx.arc(
              horizontal ? snowSurface - progress * 15 : impact.x + side * progress * 24,
              horizontal ? impact.y + side * progress * 24 : snowSurface - progress * 15,
              3 * (1 - progress) + 1,
              0,
              Math.PI * 2,
            );
            ctx.fill();
          }
        }
      }
      ctx.restore();
      for (const ball of snow.balls) drawSnowball(ball);
      if (snow.direction === 'orbit') drawOrbitField(snow.orbit);
      if (snow.direction === 'snowgrave') snowgraveDrawing.field(snow.snowgrave);
      if (snow.direction === 'crossing') {
        const { large, small, spinning } = crossingHazards(snow.crossing, battleArena);
        ctx.save();
        ctx.beginPath();
        ctx.rect(0, 24, 640, 266);
        ctx.clip();
        for (const ball of large) drawSnowball(ball, crossingSettings.largeRadius);
        for (const ball of small) drawSnowball(ball, crossingSettings.smallRadius);
        for (const ball of spinning) drawSnowball(ball, crossingSettings.spinnerRadius);
        ctx.restore();
      }
      if (snow.direction === 'goal') {
        ctx.save();
        ctx.beginPath();
        ctx.rect(
          goalArena.x + goalArena.border,
          goalArena.y + goalArena.border,
          goalArena.width - goalArena.border * 2,
          goalArena.height - goalArena.border * 2,
        );
        ctx.clip();
        rect(
          goalArena.x + goalArena.border,
          goalGroundY - 3,
          goalArena.width - goalArena.border * 2,
          3,
          '#d7f6ff',
        );
        for (const platform of goalPlatforms) {
          rect(platform.x, platform.y, platform.width, platform.height, '#698a9e');
          rect(platform.x, platform.y, platform.width, 3, '#e7faff');
        }
        if (snow.endingAge === null) {
          for (const ball of goalSnowballs(snow.goal)) {
            if (!ball.active) continue;
            drawSnowball(ball, ball.radius);
            ctx.save();
            ctx.translate(ball.x, ball.y);
            ctx.rotate(reducedParticleMotion.matches ? 0 : ball.angle);
            ctx.strokeStyle = '#d7efff';
            ctx.lineWidth = 1;
            ctx.beginPath();
            for (let spoke = 0; spoke < 6; spoke++) {
              const angle = (spoke * Math.PI) / 3;
              ctx.moveTo(0, 0);
              ctx.lineTo(Math.cos(angle) * ball.radius * 0.6, Math.sin(angle) * ball.radius * 0.6);
            }
            ctx.stroke();
            ctx.restore();
          }
        }
        rect(greenGoal.x - 3, greenGoal.y - 3, greenGoal.width + 6, greenGoal.height + 6, '#20b747');
        rect(greenGoal.x, greenGoal.y, greenGoal.width, greenGoal.height, '#b4e925');
        rect(greenGoal.x + 11, greenGoal.y + 5, 6, greenGoal.height - 10, '#20b747');
        rect(greenGoal.x + 5, greenGoal.y + 14, greenGoal.width - 10, 6, '#20b747');
        pixelText('GOAL', greenGoal.x - 2, greenGoal.y - 10, '#b4e925', 11);
        ctx.restore();
      }
    }
    drawGrazeRing(encounter);
    drawBattleSoul(encounter);
  }
  function drawBattleSoul(encounter: Encounter) {
    const snow = encounter.snowAttack;
    const rows = ['01100110', '11111111', '11111111', '11111111', '01111110', '00111100', '00011000'],
      left = Math.round(present(encounter.soul).x - battleSettings.soulWidth / 2),
      top = Math.round(present(encounter.soul).y - battleSettings.soulHeight / 2);
    ctx.save();
    const damageFlash = encounter.invincible ? 0 : Math.max(snow?.hitCooldown || 0, snow?.contactFlash || 0);
    if (damageFlash > 0) ctx.globalAlpha = Math.floor(damageFlash * 12) % 2 ? 0.3 : 1;
    for (let row = 0; row < rows.length; row++)
      for (let col = 0; col < rows[row].length; col++)
        if (rows[row][col] === '1')
          rect(
            left + col * 3,
            top + row * 3,
            3,
            3,
            snow?.direction === 'undyne' ? '#23ed59' : snow?.direction === 'goal' ? '#2675ff' : '#ff0000',
          );
    ctx.restore();
  }
  function drawBossEncounter(time: number) {
    const room = current(),
      t = reducedParticleMotion.matches ? 0 : time;
    const encounter = state.bossEncounter;
    ctx.imageSmoothingEnabled = false;
    if (encounter?.phase === 'knightRift') {
      drawKnightRift(ctx, encounter.animationAge, reducedParticleMotion.matches);
      return;
    }
    if (encounter?.snowAttack?.direction === 'vesselRain' && encounter.soul) {
      drawVesselRain(ctx, encounter.snowAttack.vesselRain, reducedParticleMotion.matches);
      drawGrazeRing(encounter);
      drawBattleSoul(encounter);
      return;
    }
    if (encounter?.kind === 'vessel') {
      const l = vesselBattleLayout;
      drawMysteriousVoid(
        ctx,
        t,
        reducedParticleMotion.matches,
        xSlashBackgroundShake(encounter.vesselXSlashAge, reducedParticleMotion.matches),
      );
      const shake =
        encounter.hitAge !== null && !reducedParticleMotion.matches ? Math.sin(encounter.hitAge * 80) * 2 : 0;
      drawVessel(ctx, l.vessel.x + shake, l.vessel.y, l.vessel.height);
      drawBattleKris(
        l.kris.x,
        l.kris.y,
        l.kris.scale,
        encounter.hitActor === 'Kris' ? encounter.hitAge : null,
      );
      drawBattleFlowey(l.flowey.x, l.flowey.y, t, l.flowey.scale);
      for (const [name, p] of [
        ['Susie', l.susie],
        ['Ralsey', l.ralsey],
      ] as const) {
        drawPartyMember(name, p.x, p.y, p.scale, encounter.partyStatus[name], () => {
          ctx.save();
          ctx.translate(p.x, p.y);
          ctx.scale(p.scale, p.scale);
          helpers.drawFountainFriend({ name, x: 0, y: 0, hideName: true }, t);
          ctx.restore();
        });
      }
      if (isPelletCast(encounter))
        drawPelletsCast(encounter, {
          origin: { x: l.flowey.x, y: l.flowey.y - 20 },
          target: { x: l.vessel.x, y: l.vessel.y - 40 },
        });
      if (encounter.vesselXSlashAge !== undefined) drawVesselXSlash(ctx, encounter.vesselXSlashAge);
      else if (encounter.hitAge !== null) {
        ctx.save();
        ctx.translate(l.vessel.x - 528, l.vessel.y - 40 - 192);
        if (encounter.hitActor === 'Flowey') drawFloweyPellets(encounter.hitAge);
        else drawSwordSlash(encounter.hitAge);
        ctx.restore();
      }
      if (encounter.hitAge !== null || encounter.vesselXSlashAge !== undefined)
        pixelText(`-${encounter.hitDamage}`, l.vessel.x - 20, 145, '#ffffff', 18);
      if (encounter.darkHeal) {
        const p = { Kris: l.kris, Flowey: l.flowey, Susie: l.susie, Ralsey: l.ralsey }[
          encounter.darkHeal.target as PartyName
        ];
        if (p) pixelText(`+${encounter.darkHeal.restored}`, p.x - 12, p.y - 55, '#80e7aa', 14);
      }
      pixelText('VESSEL', l.vessel.x - 25, 110, '#dddddd', 14);
      pixelText(`TP ${Math.floor(encounter.tp)}%`, 12, 286, '#ffca50', 14);
      drawDarkPartyStatus();
      drawBattleMenu();
      $('gameHint').textContent = encounter.message;
      return;
    }
    if (encounter?.kind === 'knights') {
      drawKnightBattlefield(ctx, t);
      const dueling =
        !canControlSoul(encounter) &&
        encounter.phase !== 'victory' &&
        Object.values(encounter.knightEnemies ?? {}).every((enemy) => enemy.hp > 0);
      const duel = dueling
        ? partyDuelFrame(encounter.knightDuelAge ?? 0, reducedParticleMotion.matches)
        : null;
      const targetX = duel
        ? duel[encounter.knightTarget ?? 'roaring'].x
        : encounter.knightTarget === 'kaizo'
          ? 540
          : 365;
      for (const [target, x, kaizo] of [
        ['roaring', 365, false],
        ['kaizo', 540, true],
      ] as const) {
        const actor =
          duel?.[target] ??
          floatingKnight(
            {
              x: canControlSoul(encounter) ? (kaizo ? 550 : 90) : x,
              jump: 112,
              facing: kaizo ? -1 : 1,
              swordAngle: 0.12,
              lean: 0,
            },
            time,
            kaizo,
            reducedParticleMotion.matches,
          );
        drawKnightHover(ctx, actor, time, kaizo, reducedParticleMotion.matches);
        drawKnightActor(ctx, actor, kaizo);
        const impact = encounter.knightImpacts?.[target];
        if (impact && impact.age < 0.65) {
          pixelText(`-${impact.damage}`, actor.x - 20, 92 - impact.age * 18, '#ffb8c5', 18);
        }
        const enemy = encounter.knightEnemies?.[target];
        const labelX = canControlSoul(encounter) ? (kaizo ? 490 : 8) : x - 63;
        const labelY = canControlSoul(encounter) ? 22 : 42;
        pixelText(kaizo ? 'KAIZO KNIGHT' : 'ROARING KNIGHT', labelX, labelY, '#eee6f2', 11);
        pixelText(`${enemy?.hp} / ${enemy?.maxHP}`, labelX, labelY + 16, '#c7c0d8', 10);
        if (!canControlSoul(encounter) && encounter.knightTarget === target)
          pixelText('▼', actor.x - 4, 80, '#fff32a', 14);
      }
      if (duel) drawPartyDuelEffects(ctx, encounter.knightDuelAge ?? 0, reducedParticleMotion.matches);
      if (!canControlSoul(encounter)) {
        drawBattleKris(50, 200, 0.65, encounter.hitActor === 'Kris' ? encounter.hitAge : null);
        drawBattleFlowey(100, 235, t, 0.75);
        for (const [name, x, y] of [
          ['Susie', 155, 200],
          ['Ralsey', 205, 245],
        ] as const)
          drawPartyMember(name, x, y, 0.75, encounter.partyStatus[name], () => {
            ctx.save();
            ctx.translate(x, y);
            ctx.scale(0.75, 0.75);
            helpers.drawFountainFriend({ name, x: 0, y: 0, hideName: true }, t);
            ctx.restore();
          });
      }
      if (
        canControlSoul(encounter) &&
        (encounter.snowAttack.direction === 'knightSwords' ||
          encounter.snowAttack.direction === 'knightCrossing' ||
          encounter.snowAttack.direction === 'knightAimed')
      ) {
        const box =
          encounter.snowAttack.direction === 'knightSwords'
            ? encounter.snowAttack.knightSwords.arena
            : encounter.snowAttack.direction === 'knightAimed'
              ? encounter.snowAttack.knightAimed.arena
              : encounter.snowAttack.knightCrossing.arena;
        rect(box.x, box.y, box.size, box.size, '#07070c');
        ctx.strokeStyle = '#65e895';
        ctx.lineWidth = box.border;
        ctx.strokeRect(box.x, box.y, box.size, box.size);
        if (encounter.snowAttack.direction === 'knightAimed')
          drawAimedSwords(ctx, encounter.snowAttack.knightAimed, reducedParticleMotion.matches);
        else if (encounter.snowAttack.direction === 'knightCrossing')
          drawCrossingSwords(ctx, encounter.snowAttack.knightCrossing, reducedParticleMotion.matches);
        else drawKnightSwords(ctx, encounter.snowAttack.knightSwords, reducedParticleMotion.matches);
        drawGrazeRing(encounter);
        drawBattleSoul(encounter);
      }
      if (isPelletCast(encounter)) {
        ctx.save();
        ctx.translate(100, 235);
        ctx.scale((targetX - 100) / (528 - 178), (180 - 235) / (192 - 224));
        ctx.translate(-178, -224);
        drawPelletsCast(encounter);
        ctx.restore();
      }
      if (encounter.hitAge !== null) {
        ctx.save();
        ctx.translate(targetX - 528, -12);
        if (encounter.hitActor === 'Kris') drawSwordSlash(encounter.hitAge);
        else drawFloweyPellets(encounter.hitAge);
        ctx.restore();
        pixelText(`-${encounter.hitDamage}`, targetX - 25, 110, '#ffffff', 18);
      }
      if (encounter.darkHeal) {
        const positions = { Kris: [50, 200], Flowey: [100, 235], Susie: [155, 200], Ralsey: [205, 245] };
        const p = positions[encounter.darkHeal.target as PartyName];
        if (p) pixelText(`+${encounter.darkHeal.restored}`, p[0] - 12, p[1] - 40, '#80e7aa', 14);
      }
      pixelText(`TP ${Math.floor(encounter.tp)}%`, 280, 293, '#ffca50', 15);
      drawDarkPartyStatus();
      drawBattleMenu();
      $('gameHint').textContent = encounter.message;
      return;
    }
    if (encounter?.phase === 'minigame' && encounter.minigame?.kind === 'hammers') {
      drawHammerMinigame(ctx, encounter.minigame, encounter.score ?? 0, (x, y) => {
        ctx.save();
        ctx.translate(x, y);
        ctx.scale(0.9, 0.9);
        helpers.drawFountainFriend({ name: 'Susie', x: 0, y: 0, hideName: true }, t);
        ctx.restore();
      });
      $('gameHint').textContent = 'Hammer Time · Mouse / arrows aim · Click / Z throws · Tenna TVs +5';
      return;
    }
    if (encounter?.phase === 'minigame' && encounter.minigame?.kind === 'surf') {
      drawSurferMinigame(ctx, encounter.minigame, encounter.score ?? 0, (x, y) =>
        drawBattleKris(x, y, 0.65, null),
      );
      $('gameHint').textContent = 'Surfers · Space / Up / tap to jump · Gold +5 · Purple +10 · Rocks -10';
      return;
    }
    if (encounter?.phase === 'minigame' && encounter.minigame?.kind === 'shooting') {
      drawShootingMinigame(ctx, encounter.minigame, encounter.score ?? 0, () => {
        drawBattleKris(124, 367, 0.48);
        drawBattleFlowey(84, 367, t, 0.48);
        for (const friend of [
          { name: 'Susie', x: 104 },
          { name: 'Ralsey', x: 151 },
        ]) {
          ctx.save();
          ctx.translate(friend.x, 367);
          ctx.scale(0.5, 0.5);
          helpers.drawFountainFriend({ name: friend.name, x: 0, y: 0, hideName: true }, t);
          ctx.restore();
        }
      });
      $('gameHint').textContent =
        'Shoot enemies, avoid Flowey · Click / tap, or arrows to aim and Z / Space to shoot.';
      return;
    }
    if (
      encounter?.kind === 'tenna' &&
      canControlSoul(encounter) &&
      encounter.snowAttack.direction === 'undyne'
    ) {
      rect(0, 0, 640, 480, '#101118');
      const box = undyneArenaBounds(encounter.snowAttack.undyne);
      ctx.strokeStyle = '#63eb8b';
      ctx.lineWidth = 4;
      ctx.strokeRect(box.x, box.y, box.size, box.size);
      drawUndyneAttack(ctx, encounter.snowAttack.undyne);
      drawBattleSoul(encounter);
      $('gameHint').textContent =
        'Spear of Justice · Arrows / WASD turn the shield · Yellow spears swing around';
      return;
    }
    if (present(encounter).kind === 'tenna') {
      rect(0, 0, 640, 480, '#100d24');
      studio.battlefield(room, present(encounter).score ?? 0);
      drawBattleKris(105, 97, 1.1, present(encounter).hitActor === 'Kris' ? present(encounter).hitAge : null);
      drawPartyMember('Susie', 110, 159, 1, present(encounter).partyStatus.Susie, () =>
        helpers.drawFountainFriend({ name: 'Susie', x: 110, y: 159, hideName: true }, t),
      );
      drawBattleFlowey(110, 213, t, 1.1);
      drawPartyMember('Ralsey', 110, 270, 1, present(encounter).partyStatus.Ralsey, () =>
        helpers.drawFountainFriend({ name: 'Ralsey', x: 110, y: 270, hideName: true }, t),
      );
      const drawHost = (x: number, y: number, scale: number) => {
        if (present(encounter).phase === 'tennaFinaleGlitch') {
          drawTennaCollapse(
            x,
            y,
            scale,
            t,
            (present(encounter).tennaEndingAge ?? 0) / tennaCollapseSeconds,
            reducedParticleMotion.matches,
          );
          return;
        }
        drawTenna(x, y, scale);
        if (present(encounter).tennaHeadGlitch || (present(encounter).score ?? 0) >= 1200) {
          drawTennaStatic(x, y, scale, t);
        }
      };
      const drawGuest = () => {
        const age = present(encounter).undyneEntranceAge ?? 1.2;
        const offset = reducedParticleMotion.matches ? 0 : undyneDropOffset(age);
        drawUndyne(
          ctx,
          425,
          268 - offset,
          t,
          1.08,
          !!present(encounter).undyneGlitched,
          present(encounter).undyneHealAge ?? 2,
        );
        if (!reducedParticleMotion.matches && age >= 0.7 && age < 1.15) {
          const p = (age - 0.7) / 0.45;
          ctx.save();
          ctx.globalAlpha = 1 - p;
          for (const side of [-1, 1])
            for (let i = 0; i < 4; i++)
              rect(
                425 + side * (15 + p * 55 + i * 8),
                272 - Math.sin(p * Math.PI) * (5 + i * 4),
                5,
                3,
                '#b4cee5',
              );
          ctx.restore();
        }
      };
      if (canControlSoul(encounter)) {
        drawHost(565, 147, 0.8);
        rect(205, 48, 230, 230, '#101118');
        ctx.strokeStyle = '#63eb8b';
        ctx.lineWidth = 4;
        ctx.strokeRect(205, 48, 230, 230);
        if (encounter.snowAttack.direction === 'saxophones') {
          const a = encounter.snowAttack.saxophones;
          for (let helper = 0; helper < 2; helper++) {
            ctx.save();
            drawSaxHelper(ctx, 490, helper === 0 ? 155 : 260, -1, present(a).age);
            ctx.restore();
          }
          drawSaxAttack(ctx, present(a));
        } else if (encounter.snowAttack.direction === 'tvBolts')
          drawTvBolts(ctx, encounter.snowAttack.tvBolts);
        drawGrazeRing(encounter);
        drawBattleSoul(encounter);
      } else if (present(encounter).enemy.visible) {
        drawHost(undynePresent(present(encounter)) ? 550 : 495, 269, 1.77);
        if (undynePresent(present(encounter))) drawGuest();
      }
      pixelText(present(encounter).enemy.name.toUpperCase(), 450, 31, '#ffda6b', 21);

      pixelText(`TP ${Math.floor(present(encounter).tp)}%`, 280, 293, '#ffca50', 15);
      drawDarkPartyStatus();
      drawBattleMenu();
      drawUndyneMenuSpear(ctx, present(encounter));
      $('gameHint').textContent = 'The Finale · Tenna takes the stage.';
      return;
    }
    if (present(encounter).kind === 'dark') {
      rect(0, 0, 640, 480, '#000000');
      drawDarkEyes(ctx, present(encounter).enemy.visible);
      if (canControlSoul(encounter)) {
        const { x, y, size } = battleArenaForDark;
        rect(x, y, size, size, '#444444');
        ctx.strokeStyle = '#6de990';
        ctx.lineWidth = 4;
        ctx.strokeRect(x, y, size, size);
        const soul = encounter.soul;
        ctx.save();
        ctx.beginPath();
        ctx.rect(x + 2, y + 2, size - 4, size - 4);
        ctx.clip();
        const shade = ctx.createRadialGradient(soul.x, soul.y, 4, soul.x, soul.y, 42);
        shade.addColorStop(0, 'rgba(0,0,0,0)');
        shade.addColorStop(0.4, 'rgba(0,0,0,.28)');
        shade.addColorStop(1, 'rgba(0,0,0,.90)');
        ctx.fillStyle = shade;
        ctx.fillRect(x, y, size, size);
        const glow = ctx.createRadialGradient(soul.x, soul.y, 1, soul.x, soul.y, 14);
        glow.addColorStop(0, 'rgba(255,25,55,.32)');
        glow.addColorStop(0.45, 'rgba(255,20,45,.14)');
        glow.addColorStop(1, 'rgba(255,20,45,0)');
        ctx.fillStyle = glow;
        ctx.fillRect(soul.x - 15, soul.y - 15, 30, 30);
        ctx.restore();
        drawMiniSwords(ctx, encounter.snowAttack?.miniSwords);
        if (encounter.snowAttack?.darkPattern === 0) drawSwords(ctx, encounter.snowAttack?.swords);
        if (encounter.snowAttack?.darkPattern === 2)
          drawWarningSwords(ctx, present(encounter.snowAttack.warningSwords));
        drawGrazeRing(encounter);
        drawBattleSoul(encounter);
      }
      drawPelletsCast(present(encounter));
      if (present(encounter).phase === 'shine') {
        const alpha = reducedParticleMotion.matches
          ? 0.12
          : Math.max(0, 1 - present(encounter).animationAge / 0.45) * 0.75;
        if (alpha > 0) rect(0, 0, 640, 285, `rgba(255,250,210,${alpha})`);
      }
      if (present(encounter).hitActor === 'Susie' && present(encounter).hitAge !== null) {
        ctx.save();
        ctx.globalAlpha = Math.max(0, 1 - present(present(encounter).hitAge) / 0.5);
        ctx.strokeStyle = '#e657ed';
        ctx.lineWidth = 5;
        ctx.beginPath();
        ctx.moveTo(475, 55);
        ctx.lineTo(530, 100);
        ctx.lineTo(497, 78);
        ctx.lineTo(548, 68);
        ctx.stroke();
        ctx.restore();
      }
      if (present(encounter).darkHeal)
        pixelText(
          `+${present(present(encounter).darkHeal).restored} HP · ${present(present(encounter).darkHeal).target}`,
          215,
          275,
          '#9dffb2',
          14,
        );
      if (present(encounter).enemy.visible)
        pixelText(
          `??? ${present(encounter).enemy.hp}/${present(encounter).enemy.maxHP}`,
          455,
          118,
          '#d3d3d8',
          11,
        );
      pixelText(`TP ${Math.floor(present(encounter).tp)}%`, 280, 293, '#ffca50', 15);
      drawDarkPartyStatus();
      drawBattleMenu();
      $('gameHint').textContent =
        (present(encounter).phase === 'victory'
          ? '??? defeated'
          : present(encounter).darkUnlocked
            ? 'Attacks and ACTs unlocked'
            : `Shine ${present(encounter).shineCount || 0}/5 · Attacks and other ACTs locked`) +
        ' · Grazing: 1% TP · TP Elixir: +5% TP';
      return;
    }
    if (isBattleBlackout(encounter)) {
      rect(0, 0, 640, 480, '#000000');
      if (isSlashScreen(encounter))
        drawRedSlash(present(present(encounter).rescue).age, reducedParticleMotion.matches);
      $('gameHint').textContent = '';
      return;
    }
    rect(0, 0, 640, 480, roomBackground(room));
    // Compress the workshop's terrain into a horizontal stage, preserving its tile colors.
    const terrain = (backdrop: boolean) => {
      ctx.save();
      ctx.translate(0, 38);
      ctx.scale(1, 0.56);
      for (let y = 0; y < H; y++)
        for (let x = 0; x < W; x++)
          if ([1, 10].includes(room.map[y][x]) === backdrop)
            drawTile(room.map[y][x], x * T, y * T, room.theme);
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
    if (present(encounter).snowAttack?.direction === 'snowgrave')
      snowgraveDrawing.backdrop(present(present(present(encounter).snowAttack).snowgrave));
    const fieldAttack = ['orbit', 'crossing', 'goal'].includes(
      present(encounter).snowAttack?.direction ?? '',
    );
    if (!fieldAttack) {
      drawBattleKris(
        88,
        266,
        1.25,
        present(encounter).hitActor === 'Kris' ? present(encounter).hitAge : null,
      );
      drawBattleFlowey(178, 265, t, 1.22);
    }
    if (present(encounter).enemy.visible && !fieldAttack && !present(encounter).rescue) {
      ctx.save();
      if (present(encounter).hitAge !== null && !reducedParticleMotion.matches) {
        const recoil = 1 - present(present(encounter).hitAge) / battleSettings.enemyHitSeconds;
        ctx.translate(Math.round(Math.cos(present(present(encounter).hitAge) * 90) * 8 * recoil), 0);
      }
      if (present(encounter).snowAttack?.direction === 'snowgrave')
        battleSprites.snowgraveNoelle(528, 262, 2.25);
      else drawNoelleBoss(528, 122, 140);
      ctx.restore();
      if (present(encounter).hitActor === 'Kris') drawSwordSlash(present(present(encounter).hitAge));
      else if (present(encounter).hitActor === 'Flowey')
        drawFloweyPellets(present(present(encounter).hitAge));
    }
    if (present(encounter).rescue) {
      aftermathDrawing.actors(present(encounter), t);
    }
    drawPelletsCast(present(encounter));
    if (present(encounter).hitAge !== null)
      pixelText(
        `-${present(encounter).hitDamage}`,
        515,
        110 - present(present(encounter).hitAge) * 35,
        '#ffdc59',
        24,
      );
    drawSoulArena();
    drawTP();
    drawBattleStatus('Kris', 18, '#00e5ec', t);
    drawBattleStatus('Flowey', 324, '#eef51c', t);
    if (isPelletCast(encounter)) {
      rect(18, 353, 604, 115, '#101118');
      pixelText('FRIENDLYNESS PELLETS', 38, 391, '#fff32a', 22);
      pixelText('Flowey sends a ring of pellets toward Noelle.', 38, 429, '#ffffff', 16);
    } else if (present(encounter).phase === 'rescue' || isProceedScene(encounter))
      rect(18, 353, 604, 115, '#101118');
    else drawBattleMenu();
    const statusFlags = present(encounter).rescue
      ? []
      : [
          present(encounter).snowAttack?.direction === 'snowgrave'
            ? 'FINAL ATTACK'
            : present(encounter).finalAttackComplete
              ? 'ONLY ATTACK REMAINS'
              : present(encounter).strongerAttacks && 'PHASE 2',
          present(encounter).nextAttackGrazeTP && 'NEXT ATTACK: 4% TP',
          (present(encounter).snowAttack?.grazeTP ?? 0) > battleSettings.grazeTP && 'GRAZE: 4% TP',
        ].filter(Boolean);
    if (statusFlags.length) {
      const label = statusFlags.join(' · ');
      rect(64, 0, 12 + label.length * 7, 18, '#050505');
      pixelText(label, 70, 13, '#fff32a', 11);
    }
    if (state.fade > 0) rect(0, 0, 640, 480, 'rgba(17,20,29,' + Math.min(1, state.fade / 0.32) + ')');
    if (present(encounter).phase === 'proceedGlitch') drawProceedGlitch(present(encounter).animationAge);
    $('gameHint').textContent = state.dialogue
      ? 'C / Z / Enter to continue · L to skip'
      : canControlSoul(encounter)
        ? isSoulInSnow(encounter)
          ? encounter.snowAttack?.direction === 'path'
            ? `Deep snow: quarter speed · ${bossAttackDamage(encounter, battleSettings.snowPathDamage)} damage on entry + each second`
            : `In snow: half speed · ${bossAttackDamage(encounter, battleSettings.snowContactDamage)} damage on entry + each second`
          : `${
              encounter.snowAttack?.direction === 'snowgrave'
                ? 'Snowgrave: move into the lit slit before the ice erupts · Survive the final attack'
                : encounter.snowAttack?.direction === 'path'
                  ? 'Follow the winding gap'
                  : encounter.snowAttack?.direction === 'orbit'
                    ? `Ice cube: ${bossAttackDamage(encounter, encounter.snowAttack.orbit.cubeDamage)} damage · Snowballs: ${bossAttackDamage(encounter, orbitSettings.ballDamage)}`
                    : encounter.snowAttack?.direction === 'goal'
                      ? `Blue soul: left/right to move · Tap Up / W / Space for a short hop, hold to jump higher · Climb the right step, then go left to the green goal · Snowballs: ${goalSettings.damage} damage`
                      : encounter.snowAttack?.direction === 'crossing'
                        ? `Dodge crossing and spinning snowballs · ${bossAttackDamage(encounter, crossingSettings.damage)} damage · The small corner balls stay still`
                        : 'Dodge the snowballs'
            } · Arrow keys / WASD · ${snowAttackStatus(encounter)}`
        : canPartyAct(encounter) && present(encounter).screen !== 'menu'
          ? `${present(encounter).message} · Click BACK or press X / Esc to return.`
          : present(encounter).message;
  }
  return { drawBossEncounter };
}
