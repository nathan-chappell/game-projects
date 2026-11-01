import { present } from '../../game/invariants.ts';
import type { GameState } from '../../game/types.ts';
import type { Point, Room } from '../../world/types.ts';

interface Dependencies {
  readonly current: () => Room;
  readonly rect: (x: number, y: number, w: number, h: number, color: string) => void;
  readonly state: GameState;
  readonly ctx: CanvasRenderingContext2D;
  readonly divePose: (name: string) => (Point & { scale: number }) | null;
  readonly drawPlayer: (x: number, y: number, time: number) => void;
  readonly drawFlowey: (x: number, y: number, time: number, lookRight?: boolean) => void;
  readonly drawFountainFriend: (
    n: Point & {
      name: string;
      worried?: boolean | undefined;
      comforting?: boolean | undefined;
      lookRight?: boolean | undefined;
      hideName?: boolean | undefined;
    },
    time: number,
  ) => void;
  readonly pixelText: (text: string, x: number, y: number, color: string, size?: number) => void;
}

export function createFountainDrawing(dependencies: Dependencies) {
  const state = dependencies.state;
  const ctx = dependencies.ctx;

  function drawFountain(time: number) {
    if (dependencies.current().scene !== 'fountain') return;
    const pulse = (Math.sin(time * 2.5) + 1) / 2;
    // The pool tiles block walking; the rising darkness is scenery above them.
    dependencies.rect(276, 116, 88, 88, '#211e39');
    dependencies.rect(282, 118, 76, 79, '#302848');
    dependencies.rect(290, 175, 60, 18, '#101320');
    dependencies.rect(297, 178, 46, 11, '#080c17');
    dependencies.rect(286, 192, 68, 6, '#74649e');
    dependencies.rect(298, 195, 44, 3, '#b6a6e3');
    dependencies.rect(294, 76, 52, 105, 'rgba(104,76,159,' + (0.22 + pulse * 0.12) + ')');
    dependencies.rect(302, 65, 36, 117, '#272039');
    dependencies.rect(308, 54, 24, 130, '#12121f');
    dependencies.rect(314, 42, 12, 141, '#070b14');
    dependencies.rect(305, 84, 3, 73, '#8270b6');
    dependencies.rect(333, 97, 3, 62, '#554c83');
    for (let i = 0; i < 13; i++) {
      const x = 291 + ((i * 17) % 57),
        y = 186 - ((time * (18 + (i % 3) * 5) + i * 19) % 137);
      dependencies.rect(x, y, 2 + (i % 2), 5, i % 2 ? '#ab96d9' : '#6e91c2');
    }
    if (state.story.fountainWorse) {
      dependencies.rect(281, 38, 78, 145, '#54407655');
      dependencies.rect(292, 30, 56, 151, '#372542');
      dependencies.rect(300, 19, 40, 164, '#171223');
      dependencies.rect(311, 9, 18, 175, '#060912');
      dependencies.rect(286, 101, 4, 71, '#bd6dd1');
      dependencies.rect(348, 77, 3, 96, '#9174cc');
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
        dependencies.rect(282 + ((i * 23) % 77), y, 3, 8, i % 2 ? '#b780d7' : '#8194df');
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
    dependencies.rect(289, 213, 5, 5, '#c5f7dc');
    dependencies.rect(301, 184, 4, 4, '#8ddeb6');
    ctx.restore();
  }

  function drawDive(time: number) {
    const actors = ['Ralsey', 'Susie', 'Kris', 'Flowey']
      .map((name) => ({ name, pose: dependencies.divePose(name) }))
      .filter((n) => n.pose)
      .sort((a, b) => present(a.pose).y - present(b.pose).y);
    for (const { name, pose } of actors) {
      ctx.save();
      ctx.translate(present(pose).x, present(pose).y);
      ctx.scale(present(pose).scale, present(pose).scale);
      if (name === 'Kris') dependencies.drawPlayer(0, 0, time);
      else if (name === 'Flowey') dependencies.drawFlowey(0, 0, time);
      else dependencies.drawFountainFriend({ name, x: 0, y: 0 }, time);
      ctx.restore();
    }
    if (present(state.dive).phase !== 'hesitate') {
      ctx.save();
      ctx.strokeStyle = '#c9adeb';
      ctx.lineWidth = 2;
      ctx.beginPath();
      const radius = 14 + Math.sin(present(state.dive).age * 5) * 5;
      ctx.ellipse(320, 180, radius, 5, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }
  }

  function drawBuster() {
    if (!state.buster || state.mode !== 'play') return;
    const age = state.buster.age;
    dependencies.pixelText(
      age < 1.15 ? 'RUDE BUSTER!' : 'THE FOUNTAIN IS GROWING!',
      age < 1.15 ? 244 : 187,
      92,
      '#f5b8f2',
      16,
    );
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
      dependencies.rect(396, 214, 7, 9, '#eed1ff');
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
      dependencies.rect(-10, -3, 28, 6, '#f1d1ff');
      dependencies.rect(-25, -2, 14, 4, '#d48eec');
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
      dependencies.rect(0, 0, 640, 480, 'rgba(122,62,158,' + Math.max(0, 0.16 * (1 - progress)) + ')');
    }
  }

  return { drawFountain, drawDive, drawBuster };
}
