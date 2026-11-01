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
    sprite(`susie:down:${frame}`, x, y, scale * 1.35, (r, p) => {
      const ink = '#17101c',
        hair = '#9d157c',
        pink = '#e14bb8',
        gold = '#edc02d',
        lift = frame === 1 ? -6 : 0;
      r(-36, -1, 75, 3, '#292136');
      // Flat boots trail to the left; black clothing and gold trim frame the body.
      p(
        [
          [-36, -12],
          [-30, -16],
          [-17, -16],
          [-11, -12],
          [-11, -3],
          [-29, -3],
          [-36, -6],
        ],
        ink,
      );
      r(-32, -12, 13, 3, gold);
      r(-34, -9, 3, 7, gold);
      r(-26, -7, 12, 3, gold);
      r(-15, -5, 3, 5, gold);
      p(
        [
          [-23, -19 + lift],
          [-11, -22 + lift],
          [4, -20 + lift],
          [13, -13],
          [9, -2],
          [-17, -2],
          [-23, -7],
        ],
        ink,
      );
      r(-18, -18 + lift, 11, 6, '#ae1b82');
      r(-18, -13 + lift, 6, 4, hair);
      r(-10, -17 + lift, 3, 14, '#7f3292');
      r(-8, -21 + lift, 3, 4, pink);
      r(-3, -14 + lift, 4, 4, pink);
      r(-2, -21 + lift, 2, 3, gold);
      r(2, -21 + lift, 2, 3, gold);
      // One gloved arm folds under her head, with the other shoulder against the floor.
      r(2, -10, 12, 11, ink);
      r(5, -8, 7, 6, pink);
      r(12, -6, 4, 4, gold);
      r(-2, -18 + lift, 8, 6, pink);
      r(2, -15 + lift, 5, 3, '#bc2994');
      // Long jagged hair hides the face, matching the prone reference silhouette.
      p(
        [
          [7, -24 + lift],
          [16, -25 + lift],
          [17, -29 + lift],
          [23, -29 + lift],
          [23, -26 + lift],
          [30, -25 + lift],
          [33, -21 + lift],
          [35, -17 + lift],
          [40, -15 + lift],
          [37, -10],
          [39, -6],
          [37, -3],
          [43, -1],
          [29, 1],
          [23, -2],
          [16, 0],
          [10, -4],
          [5, -6],
          [9, -10],
          [5, -12],
          [8, -15],
          [4, -17 + lift],
          [9, -19 + lift],
        ],
        ink,
      );
      p(
        [
          [10, -22 + lift],
          [18, -23 + lift],
          [19, -27 + lift],
          [22, -25 + lift],
          [29, -23 + lift],
          [31, -19 + lift],
          [34, -16 + lift],
          [37, -14 + lift],
          [34, -11],
          [37, -6],
          [34, -3],
          [38, -1],
          [29, -1],
          [23, -4],
          [17, -2],
          [12, -6],
          [9, -7],
          [12, -10],
          [9, -12],
          [12, -15],
          [9, -17 + lift],
          [12, -19 + lift],
        ],
        hair,
      );
      r(19, -23 + lift, 3, 4, '#c51a9c');
    });
  }
  function ralseyDown(x: number, y: number, scale = 1, frame = 2) {
    sprite(`ralsey:down:${frame}`, x, y, scale * 1.35, (r, p) => {
      const ink = '#15211e',
        fur = '#f0f3ee',
        shade = '#f5a9bd',
        green = '#4bc28a',
        dark = '#277e63',
        pink = '#ed52ac',
        lift = frame === 1 ? -6 : 0;
      r(-34, -1, 77, 3, '#263d36');
      // Bare white paws stick out behind the face-down cloak.
      p(
        [
          [-27, -13],
          [-32, -13],
          [-36, -8],
          [-35, -1],
          [-30, 1],
          [-25, -2],
          [-21, -9],
        ],
        ink,
      );
      p(
        [
          [-28, -11],
          [-32, -10],
          [-34, -6],
          [-33, -1],
          [-30, -1],
          [-27, -4],
          [-24, -9],
        ],
        fur,
      );
      r(-32, -3, 4, 2, shade);
      p(
        [
          [-14, -8],
          [-20, -3],
          [-24, 2],
          [-22, 5],
          [-16, 5],
          [-9, -1],
        ],
        ink,
      );
      p(
        [
          [-14, -5],
          [-18, -2],
          [-21, 2],
          [-19, 3],
          [-16, 3],
          [-11, -1],
        ],
        fur,
      );
      // A loose green robe spreads over the back instead of the seated hat pose.
      p(
        [
          [-32, -21 + lift],
          [-18, -23 + lift],
          [-4, -28 + lift],
          [10, -23 + lift],
          [20, -13],
          [18, -5],
          [9, 1],
          [-1, 2],
          [-10, -1],
          [-21, -1],
          [-23, -7],
          [-29, -9],
        ],
        ink,
      );
      p(
        [
          [-29, -19 + lift],
          [-17, -20 + lift],
          [-4, -25 + lift],
          [9, -21 + lift],
          [17, -12],
          [15, -6],
          [8, -2],
          [-1, -1],
          [-10, -4],
          [-19, -3],
          [-20, -9],
          [-27, -11],
        ],
        green,
      );
      p(
        [
          [-29, -19 + lift],
          [-25, -12],
          [-19, -10],
          [-21, -7],
          [-27, -9],
        ],
        dark,
      );
      r(-4, -5, 3, 5, dark);
      // Pink scarf, black sleeves, and the white head with two long ears.
      p(
        [
          [5, -24 + lift],
          [15, -22 + lift],
          [24, -12],
          [19, -7],
          [13, -12],
          [7, -14],
        ],
        ink,
      );
      p(
        [
          [7, -23 + lift],
          [14, -20 + lift],
          [22, -12],
          [19, -10],
          [14, -14],
          [9, -16],
        ],
        pink,
      );
      p(
        [
          [15, -14],
          [21, -12],
          [29, -2],
          [26, 1],
          [22, 0],
          [16, -6],
        ],
        ink,
      );
      r(24, -1, 4, 2, fur);
      p(
        [
          [10, -25 + lift],
          [5, -28 + lift],
          [4, -33 + lift],
          [8, -36 + lift],
          [15, -33 + lift],
          [19, -30 + lift],
          [26, -32 + lift],
          [31, -30 + lift],
          [35, -24 + lift],
          [33, -19 + lift],
          [41, -11],
          [44, -4],
          [42, 0],
          [37, 1],
          [33, -2],
          [28, -10],
          [21, -15],
          [14, -17],
        ],
        ink,
      );
      p(
        [
          [11, -26 + lift],
          [7, -29 + lift],
          [6, -32 + lift],
          [9, -34 + lift],
          [15, -31 + lift],
          [19, -28 + lift],
          [26, -30 + lift],
          [30, -28 + lift],
          [33, -24 + lift],
          [30, -19 + lift],
          [39, -10],
          [42, -4],
          [40, -1],
          [37, -1],
          [35, -4],
          [29, -12],
          [22, -17],
          [15, -19],
        ],
        fur,
      );
      p(
        [
          [33, -13],
          [37, -10],
          [41, -4],
          [39, -2],
          [36, -4],
        ],
        shade,
      );
      r(7, -30 + lift, 2, 4, shade);
      r(28, -28 + lift, 2, 3, shade);
    });
  }
  return { susieDown, ralseyDown };
}
