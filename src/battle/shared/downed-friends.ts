import type { Polygon, Rect } from '../../rendering/types.ts';
type Sprite = (
  key: string,
  x: number,
  y: number,
  scale: number,
  paint: (r: Rect, p: Polygon) => void,
) => void;

export function createDownedFriendSprites(sprite: Sprite) {
  function susieDown(x: number, y: number, scale = 1, frame = 2) {
    sprite(`susie:down:${frame}`, x, y, scale * 1.6, (r, p) => {
      const edge = '#201528',
        hair = '#633577',
        skin = '#b076bc',
        armor = '#302c43',
        gold = '#d6bc70',
        lift = frame === 1 ? -2 : 10;
      // Boots and the discarded axe stay grounded while Susie drops to one knee.
      r(-23, -2, 51, 3, '#292136');
      r(-15, -8, 13, 8, edge);
      r(-13, -6, 9, 4, '#675779');
      r(9, -6, 14, 6, edge);
      r(11, -5, 10, 3, '#675779');
      r(-29, -2, 24, 2, '#a3a0b4');
      p(
        [
          [-29, -9],
          [-35, -5],
          [-30, 1],
          [-24, -1],
          [-23, -7],
        ],
        '#b4adbf',
      );
      r(-29, -7, 3, 6, '#e2dce6');
      p(
        [
          [-13, -26 + lift],
          [5, -29 + lift],
          [15, -16],
          [9, -7],
          [-5, -7],
          [-16, -15],
        ],
        edge,
      );
      r(-11, -24 + lift, 21, 13, armor);
      r(-9, -22 + lift, 4, 9, '#61516e');
      r(-10, -13, 20, 4, gold);
      r(-14, -24 + lift, 5, 7, gold);
      r(-15, -26 + lift, 3, 3, '#eae0ba');
      r(-8, -27 + lift, 3, 4, '#eae0ba');
      p(
        [
          [7, -20 + lift],
          [14, -19 + lift],
          [21, -6],
          [25, -5],
          [25, -1],
          [17, -1],
          [11, -13],
        ],
        skin,
      );
      r(18, -3, 8, 3, edge);
      // The heavy fringe falls over her face; a closed eye peeks out at the snout.
      r(-12, -40 + lift, 22, 5, edge);
      r(-16, -36 + lift, 31, 13, edge);
      r(-15, -35 + lift, 28, 13, hair);
      r(-13, -33 + lift, 8, 16, hair);
      r(-7, -37 + lift, 17, 5, '#81518e');
      r(3, -29 + lift, 14, 8, skin);
      r(12, -27 + lift, 9, 6, skin);
      r(6, -28 + lift, 6, 2, edge);
      r(14, -22 + lift, 6, 1, '#633e73');
      r(-7, -31 + lift, 12, 7, hair);
    });
  }
  function ralseyDown(x: number, y: number, scale = 1, frame = 2) {
    sprite(`ralsey:down:${frame}`, x, y, scale * 1.5, (r, p) => {
      const edge = '#193b32',
        green = '#50b981',
        dark = '#277d60',
        fur = '#e2eee5',
        pink = '#ee8fb5',
        lift = frame === 1 ? 1 : 12;
      r(-22, -1, 46, 3, '#263d36');
      r(-14, -5, 12, 6, edge);
      r(8, -5, 13, 6, edge);
      p(
        [
          [-10, -24 + lift],
          [7, -24 + lift],
          [17, -12],
          [23, -3],
          [15, 0],
          [-20, 0],
          [-24, -4],
          [-15, -12],
        ],
        edge,
      );
      p(
        [
          [-9, -22 + lift],
          [6, -22 + lift],
          [14, -10],
          [19, -3],
          [-19, -3],
          [-13, -12],
        ],
        green,
      );
      r(-13, -10, 5, 6, dark);
      r(12, -8, 5, 5, dark);
      r(-5, -19 + lift, 9, 5, edge);
      r(-17, -28 + lift, 31, 13, edge);
      r(-20, -25 + lift, 7, 10, fur);
      r(11, -25 + lift, 8, 9, fur);
      r(-16, -27 + lift, 29, 14, fur);
      r(-20, -23 + lift, 3, 6, '#a4bfb5');
      r(15, -22 + lift, 3, 5, '#a4bfb5');
      r(-13, -24 + lift, 10, 7, '#477063');
      r(1, -24 + lift, 10, 7, '#477063');
      r(-3, -21 + lift, 5, 2, edge);
      r(-11, -22 + lift, 6, 3, fur);
      r(3, -22 + lift, 6, 3, fur);
      r(-10, -21 + lift, 4, 1, edge);
      r(4, -21 + lift, 4, 1, edge);
      r(-2, -16 + lift, 3, 2, '#88a495');
      // A soft folded hat and loose pink scarf distinguish Ralsey from the others.
      p(
        [
          [-18, -29 + lift],
          [-12, -43 + lift],
          [-17, -44 + lift],
          [-22, -39 + lift],
          [-18, -47 + lift],
          [-7, -46 + lift],
          [1, -34 + lift],
          [14, -30 + lift],
        ],
        edge,
      );
      p(
        [
          [-15, -30 + lift],
          [-10, -41 + lift],
          [-18, -41 + lift],
          [-15, -44 + lift],
          [-8, -43 + lift],
          [0, -32 + lift],
          [11, -30 + lift],
        ],
        green,
      );
      r(-18, -31 + lift, 34, 4, dark);
      r(-11, -13 + lift, 21, 4, pink);
      r(4, -10, 6, 7, pink);
      r(9, -5, 17, 3, pink);
      r(23, -5, 4, 2, '#ffd0df');
    });
  }
  return { susieDown, ralseyDown };
}
