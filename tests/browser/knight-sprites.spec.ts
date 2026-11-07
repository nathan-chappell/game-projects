import { writeFile } from 'node:fs/promises';
import { expect, test } from './test.ts';

test('Roaring Knight keeps both legs while the independent sword swings', async ({ page }, testInfo) => {
  await page.route('**/knight-sprite-probe', (route) =>
    route.fulfill({ contentType: 'text/html', body: '<!doctype html><html><body></body></html>' }),
  );
  await page.goto('/knight-sprite-probe');
  const results = await page.evaluate(async () => {
    const path = '/src/rooms/post-show/knight-sprites.ts';
    const sprites = await import(path);
    const c = document.createElement('canvas');
    c.width = 640;
    c.height = 480;
    const ctx = c.getContext('2d')!;
    const actor = { x: 220, jump: 0, facing: 1, swordAngle: 0, lean: 0 };
    const deadline = performance.now() + 10000;
    while (!sprites.drawKnightCharge(ctx, actor) || !sprites.drawKnightActor(ctx, actor, false)) {
      if (performance.now() > deadline) throw new Error('Knight sprite assets did not load');
      await new Promise((resolve) => setTimeout(resolve, 25));
    }

    const count = (x: number, y: number, w: number, h: number) => {
      const pixels = ctx.getImageData(x, y, w, h).data;
      let n = 0;
      for (let i = 3; i < pixels.length; i += 4) if (pixels[i] > 100) n++;
      return n;
    };
    const poses = [];
    for (const angle of [-2.4, -1.2, Math.PI]) {
      ctx.clearRect(0, 0, 640, 480);
      sprites.drawKnightActor(ctx, { x: 220, jump: 0, facing: 1, swordAngle: angle, lean: 0 }, false);
      poses.push({ angle, left: count(214, 342, 20, 30), right: count(240, 342, 25, 34) });
    }
    for (const lean of [-0.11, 0.13]) {
      ctx.clearRect(0, 0, 640, 480);
      sprites.drawKnightActor(ctx, { x: 220, jump: 0, facing: 1, swordAngle: Math.PI, lean }, false);
      poses.push({ angle: lean, left: count(190, 332, 85, 50), right: count(190, 332, 85, 50) });
    }
    ctx.fillStyle = '#100711';
    ctx.fillRect(0, 0, 640, 480);
    sprites.drawKnightActor(ctx, { x: 320, jump: 0, facing: 1, swordAngle: -2.4, lean: 0 }, false);
    return { poses, png: c.toDataURL('image/png').split(',')[1] };
  });
  await writeFile(
    testInfo.outputPath('roaring-knight-legs-restored.png'),
    Buffer.from(results.png, 'base64'),
  );
  for (const pose of results.poses) {
    expect(pose.left, `left leg remains visible at ${pose.angle}`).toBeGreaterThan(10);
    expect(pose.right, `right leg remains visible at ${pose.angle}`).toBeGreaterThan(10);
  }
});
