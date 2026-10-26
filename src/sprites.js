// Drawing is like placing colored blocks on graph paper. It changes the picture, not HP or story.
import goldenDoorUrl from '../assets/golden-door.png?inline';
import noelleBossUrl from '../assets/noelle-boss.png?inline';
import { T } from './config.js';

export function createSprites(ctx, state) {
  const current = () => state.project.rooms[state.roomIndex];
  function rect(x, y, w, h, color) {
    ctx.fillStyle = color;
    ctx.fillRect(Math.round(x), Math.round(y), w, h);
  }

  function pixelText(text, x, y, color, size = 10) {
    ctx.fillStyle = color;
    ctx.font = `${size}px monospace`;
    ctx.fillText(text, x, y);
  }

  const goldenDoorImage = new Image();
  goldenDoorImage.src = goldenDoorUrl;

  const noelleBossImage = new Image();
  noelleBossImage.src = noelleBossUrl;

  function drawGoldenDoor() {
    if (
      current().scene !== 'darkGoldenHall' ||
      current().hideGoldenDoor ||
      !goldenDoorImage.complete ||
      !goldenDoorImage.naturalWidth
    )
      return;
    ctx.save();
    ctx.strokeStyle = '#443b72';
    ctx.lineWidth = 2;
    ctx.strokeRect(0, 360, 600, 80);
    ctx.shadowBlur = 0;
    ctx.drawImage(
      goldenDoorImage,
      0,
      0,
      Math.min(540, goldenDoorImage.naturalWidth),
      goldenDoorImage.naturalHeight,
      326,
      18,
      284,
      340,
    );
    ctx.restore();
  }

  function drawNoelleBoss(cx, top, height) {
    if (!noelleBossImage.complete || !noelleBossImage.naturalWidth) return;
    const width = (height * noelleBossImage.naturalWidth) / noelleBossImage.naturalHeight;
    ctx.drawImage(noelleBossImage, Math.round(cx - width / 2), top, Math.round(width), height);
  }

  function drawDarkTree(tree) {
    const canopy = tree.canopyColor || '#160d39',
      accent = tree.accentColor || '#ef004b',
      trunk = tree.trunkColor || '#140d38';
    ctx.save();
    ctx.translate(tree.x, tree.y);
    const polygon = (points, fill, outline = accent) => {
      ctx.beginPath();
      points.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
      ctx.closePath();
      ctx.fillStyle = fill;
      ctx.fill();
      ctx.lineWidth = 2;
      ctx.strokeStyle = outline;
      ctx.stroke();
    };
    // Jagged roots and a dark trunk under a scalloped, magenta canopy.
    polygon(
      [
        [-11, -46],
        [10, -46],
        [8, -20],
        [13, -7],
        [25, 4],
        [8, 2],
        [1, 8],
        [-12, 2],
        [-26, 4],
        [-15, -8],
        [-9, -23],
      ],
      trunk,
    );
    polygon(
      [
        [-3, -43],
        [2, -42],
        [1, -22],
        [8, -7],
        [15, -1],
        [5, -4],
        [-3, -18],
      ],
      tree.accentColor || '#9c005a',
      tree.accentColor || '#9c005a',
    );
    const lobe = (cx, cy, rx, ry, color, outline) => {
      const rows = Math.ceil(ry / 3);
      for (let row = -rows; row <= rows; row++) {
        const y = row * 3,
          half = Math.floor((rx * Math.sqrt(Math.max(0, 1 - (y / (ry + 1)) ** 2))) / 2) * 2;
        if (half) rect(cx - half, cy + y, half * 2, 3, outline);
      }
      for (let row = -rows + 1; row < rows; row++) {
        const y = row * 3,
          half = Math.max(0, Math.floor(((rx - 2) * Math.sqrt(Math.max(0, 1 - (y / (ry - 1)) ** 2))) / 2) * 2);
        if (half) rect(cx - half, cy + y, half * 2, 3, color);
      }
    };
    for (const [x, y, rx, ry] of [
      [-31, -57, 21, 17],
      [-9, -52, 26, 18],
      [18, -53, 25, 19],
      [36, -67, 19, 20],
    ])
      lobe(x, y, rx, ry, tree.accentColor || '#ae007d', accent);
    for (const [x, y, rx, ry] of [
      [-31, -91, 25, 25],
      [-9, -108, 28, 24],
      [17, -109, 27, 24],
      [36, -93, 23, 22],
      [-41, -74, 21, 21],
      [-16, -79, 27, 26],
      [12, -80, 29, 25],
      [34, -76, 22, 23],
    ])
      lobe(x, y, rx, ry, canopy, accent);
    // Small red leaves, hot-pink stars, and purple flecks echo the reference.
    for (const [x, y, size] of [
      [-33, -109, 3],
      [-11, -115, 3],
      [30, -111, 3],
      [-43, -83, 2],
      [41, -80, 2],
      [-21, -65, 3],
      [9, -61, 2],
      [-10, -16, 2],
      [6, -5, 2],
    ]) {
      rect(x - size, y, size * 2 + 1, 2, accent);
      rect(x, y - size, 2, size * 2 + 1, accent);
    }
    for (const [x, y, size] of [
      [12, -119, 8],
      [38, -101, 5],
      [-34, -112, 4],
    ]) {
      polygon(
        [
          [x, y - size],
          [x + 3, y - 3],
          [x + size, y],
          [x + 3, y + 3],
          [x, y + size],
          [x - 3, y + 3],
          [x - size, y],
          [x - 3, y - 3],
        ],
        accent,
        accent,
      );
    }
    polygon(
      [
        [-27, -99],
        [-19, -102],
        [-14, -96],
        [-9, -96],
        [-13, -90],
        [-20, -90],
        [-23, -85],
        [-28, -90],
      ],
      canopy,
      accent,
    );
    ctx.restore();
  }

  function drawFountainFriend(n, time) {
    const x = n.x,
      y = n.y,
      bob = Math.round(Math.sin(time * 2));
    rect(x - 15, y - 2, 30, 7, '#14121e77');
    if (n.name === 'Ralsey') {
      rect(x - 8, y - 8, 6, 10, '#293a39');
      rect(x + 3, y - 8, 6, 10, '#293a39');
      rect(x - 12, y - 26, 24, 21, '#4da97c');
      rect(x - 15, y - 11, 30, 7, '#67c18b');
      rect(x - 8, y - 24, 16, 15, '#69c992');
      rect(x - 4, y - 19, 8, 6, '#263f42');
      rect(x - 12, y - 29, 7, 13, '#5bab80');
      rect(x + 9, y - 28, 8, 9, '#5bab80');
      rect(x + 15, y - 30 + bob, 6, 7, '#eee9df');
      rect(x - 10, y - 44, 20, 17, '#f1eade');
      rect(x - 14, y - 39, 5, 11, '#e4e3d9');
      rect(x + 9, y - 39, 5, 11, '#e4e3d9');
      rect(x - 8, y - 38, 7, 6, '#274c44');
      rect(x + 2, y - 38, 7, 6, '#274c44');
      rect(x - 1, y - 36, 3, 2, '#274c44');
      rect(x - 6, y - 36, 3, 2, '#d7e9d4');
      rect(x + 4, y - 36, 3, 2, '#d7e9d4');
      rect(x - 2, y - 29, 5, 2, '#6d696d');
      if (n.worried) {
        rect(x - 3, y - 31, 6, 2, '#6d696d');
        rect(x - 5, y - 29, 2, 2, '#6d696d');
        rect(x + 3, y - 29, 2, 2, '#6d696d');
        rect(x - 7, y - 41, 5, 1, '#6d696d');
        rect(x + 3, y - 41, 5, 1, '#6d696d');
      }
      rect(x - 12, y - 28, 23, 4, '#e486b5');
      rect(x - 8, y - 25, 5, 14, '#d571a7');
      rect(x - 16, y - 47, 32, 5, '#6bce99');
      rect(x - 10, y - 53, 21, 7, '#59b583');
      rect(x - 5, y - 60, 12, 8, '#59b583');
      rect(x - 1, y - 65, 6, 6, '#77d1a0');
    } else {
      rect(x - 11, y - 13, 9, 15, '#272239');
      rect(x + 3, y - 13, 9, 15, '#272239');
      rect(x - 14, y - 2, 13, 5, '#43364f');
      rect(x + 3, y - 2, 14, 5, '#43364f');
      rect(x - 14, y - 36, 29, 25, '#282335');
      rect(x - 14, y - 35, 7, 23, '#8c438d');
      rect(x + 8, y - 35, 7, 23, '#8c438d');
      rect(x - 9, y - 16, 21, 4, '#dabd6d');
      rect(x - 20, y - 34, 8, 18, '#b37fc0');
      if (!n.comforting) rect(x + 14, y - 34, 8, 18, '#b37fc0');
      rect(x - 20, y - 20, 8, 5, '#e1bf62');
      if (!n.comforting) rect(x + 14, y - 20, 8, 5, '#e1bf62');
      rect(x - 11, y - 53, 24, 21, '#b882c5');
      rect(x + 8, y - 42, 10, 8, '#c995cc');
      rect(x + 9, y - 37, 7, 2, '#eee2d6');
      rect(x - 15, y - 58, 32, 12, '#67377b');
      rect(x - 18, y - 50, 10, 21, '#67377b');
      rect(x + 10, y - 51, 9, 18, '#67377b');
      rect(x - 9, y - 48, 19, 7, '#67377b');
      rect(x - 12, y - 58, 21, 3, '#8b4c94');
      // Susie braces her axe beside the unstable pool.
      rect(x - 29, y - 44, 4, 44, '#9d7d65');
      rect(x - 39, y - 44, 13, 14, '#b9b9ce');
      rect(x - 35, y - 48, 12, 6, '#d9cde0');
      rect(x - 25, y - 43, 9, 9, '#8e85a8');
    }
    pixelText(n.name, x - n.name.length * 3, y + 17, n.name === 'Ralsey' ? '#addfc1' : '#d7a8e5', 10);
  }

  const frogPixels = [
    '    ####      ####    ',
    '   #WWWW#    #WWWW#   ',
    '  #WWWWWW####WWWWWW#  ',
    '  #WW##WWWWWWWW##WW#  ',
    '  #W#WW#WWWWWW#WW#W#  ',
    '  #W#WW#WWWWWW#WW#W#  ',
    '  #WWWWWWWWWWWWWWWW#  ',
    ' #WWWWWWWWWWWWWWWWWW# ',
    '#WWWWWWWWWWWWWWWWWWWW#',
    '#WWWW#WWWWWWWWWW#WWWW#',
    ' #WWWW##########WWWW# ',
    '  #WWWWWWWWWWWWWWWW#  ',
    '   ################   ',
    '       #WWWWWW#       ',
    '      #WWWWWWWW#      ',
    '      #WW#WW#WW#      ',
    '     #WWWWWWWWWW#     ',
    '    #WWW#WWWW#WWW#    ',
    '   #WWWWWWWWWWWWWW#   ',
    '  #WWWWWWW##WWWWWWW#  ',
    ' #WWWWWWW#  #WWWWWWW# ',
    ' #WWWWWW#    #WWWWWW# ',
    ' ########    ######## ',
  ];

  function drawNpc(npc) {
    const x = npc.x * T + 20,
      y = npc.y * T + 24,
      scale = 2,
      width = 22;
    rect(x - 19, y - 2, 38, 6, '#17132066');
    frogPixels.forEach((row, dy) => {
      for (let dx = 0; dx < row.length; dx++) {
        const pixel = row[dx];
        if (pixel !== ' ')
          rect(
            x - width + dx * scale,
            y - frogPixels.length * scale + dy * scale,
            scale,
            scale,
            pixel === '#' ? '#18131e' : '#f4f0e7',
          );
      }
    });
    if (npc.id === 'core-warning-froggit') {
      // Raised inner brows, a downturned mouth and a bead of sweat.
      rect(x - 16, y - 44, 4, 2, '#18131e');
      rect(x - 12, y - 46, 4, 2, '#18131e');
      rect(x + 8, y - 46, 4, 2, '#18131e');
      rect(x + 12, y - 44, 4, 2, '#18131e');
      rect(x - 12, y - 29, 24, 8, '#f4f0e7');
      rect(x - 6, y - 28, 12, 2, '#18131e');
      rect(x - 10, y - 26, 4, 2, '#18131e');
      rect(x + 6, y - 26, 4, 2, '#18131e');
      rect(x - 12, y - 24, 2, 2, '#18131e');
      rect(x + 10, y - 24, 2, 2, '#18131e');
      rect(x + 24, y - 42, 2, 4, '#99ddff');
      rect(x + 22, y - 38, 6, 6, '#68b9ec');
      rect(x + 22, y - 38, 2, 3, '#d8f4ff');
    }
    if (state.mode === 'build' && npc.id === state.selectedNpcId) {
      ctx.strokeStyle = '#efcb84';
      ctx.lineWidth = 2;
      ctx.strokeRect(npc.x * T + 1, npc.y * T + 1, 38, 38);
      pixelText('SELECTED', x - 24, y - 52, '#efcb84', 9);
    }
  }

  function drawFlowey(x, y, time) {
    const growth = state.mode === 'build' || state.story.joined || state.story.met ? 1 : state.story.reveal;
    if (growth <= 0) return;
    const sway = state.mode === 'play' ? Math.round(Math.sin(time * 3)) : 0;
    ctx.save();
    ctx.translate(Math.round(x), Math.round(y));
    ctx.scale(1, growth);
    x = sway;
    y = 0;
    rect(-15, 0, 30, 5, '#1d1c2960');
    rect(x - 2, -20, 4, 23, '#4e9953');
    rect(x - 10, -9, 8, 4, '#7ab65e');
    rect(x + 2, -13, 9, 4, '#6ba851');
    rect(x - 8, -6, 6, 3, '#4e9953');
    for (const [px, py, pw, ph] of [
      [-5, -43, 10, 12],
      [-17, -35, 12, 10],
      [5, -35, 12, 10],
      [-14, -22, 10, 10],
      [4, -22, 10, 10],
      [-5, -19, 10, 9],
    ]) {
      rect(x + px - 1, py - 1, pw + 2, ph + 2, '#9b6e29');
      rect(x + px, py, pw, ph, '#f7ce4b');
      rect(x + px + 2, py + 1, pw - 4, 2, '#ffe994');
    }
    rect(x - 10, -34, 20, 17, '#eae5d9');
    rect(x - 7, -37, 14, 23, '#f5f1e6');
    rect(x - 6, -31, 3, 5, '#29252d');
    rect(x + 3, -31, 3, 5, '#29252d');
    rect(x - 6, -23, 2, 3, '#29252d');
    rect(x + 4, -23, 2, 3, '#29252d');
    rect(x - 4, -21, 8, 2, '#29252d');
    ctx.restore();
  }

  function drawPlayer(x, y, time) {
    const step = state.player.moving ? Math.floor(state.player.step) % 2 : 0,
      bob = state.player.moving ? step : 0;
    y += bob;
    rect(x - 12, y - 2, 24, 7, '#1a18275f');
    rect(x - 8, y - 12, 7, 13 - step * 2, '#292c59');
    rect(x + 2, y - 12, 7, 11 + step * 2, '#292c59');
    rect(x - 10, y - 2 - step * 2, 9, 4, '#1b1d3d');
    rect(x + 2, y - 4 + step * 2, 10, 4, '#1b1d3d');
    rect(x - 10, y - 25, 20, 16, '#bdc7dc');
    rect(x - 8, y - 23, 14, 9, '#e4e8ed');
    rect(x + 5, y - 22, 5, 13, '#7a8daf');
    rect(x - 13, y - 24, 6, 10, '#cad2df');
    rect(x + 8, y - 24, 6, 10, '#8ea1be');
    rect(x - 13, y - 14, 5, 5, '#70a5d0');
    rect(x + 9, y - 14, 5, 5, '#70a5d0');
    rect(x - 10, y - 29, 21, 6, '#e76fbe');
    rect(x - 6, y - 26, 15, 3, '#bd4c96');
    rect(x + 8, y - 27, 7, 12, '#db60b1');
    rect(x + 12, y - 19, 5, 6, '#ed85cc');
    rect(x - 9, y - 42, 19, 15, '#71a7ce');
    rect(x - 12, y - 44, 24, 12, '#20234e');
    rect(x - 9, y - 47, 18, 5, '#292c61');
    rect(x - 14, y - 40, 6, 12, '#20234e');
    rect(x + 8, y - 41, 6, 13, '#20234e');
    rect(x - 8, y - 34, 5, 4, '#20234e');
    rect(x + 1, y - 34, 7, 4, '#20234e');
    if (state.player.facing === 'up') {
      rect(x - 9, y - 40, 19, 13, '#262958');
      rect(x - 6, y - 30, 12, 4, '#20234e');
    } else if (state.player.facing === 'left') {
      rect(x - 12, y - 31, 4, 4, '#71a7ce');
    } else if (state.player.facing === 'right') {
      rect(x + 9, y - 31, 4, 4, '#71a7ce');
    }
  }
  return {
    rect,
    pixelText,
    drawGoldenDoor,
    drawNoelleBoss,
    drawDarkTree,
    drawFountainFriend,
    drawNpc,
    drawFlowey,
    drawPlayer,
  };
}
