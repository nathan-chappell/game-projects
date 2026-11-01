import type { Page } from '@playwright/test';

declare global {
  interface Window {
    stepLanternFrames: (count: number) => void;
  }
}

/** Test-only frame driver. Gameplay still runs its ordinary frame/update/render functions. */
export async function controlFrames(page: Page) {
  await page.addInitScript(() => {
    let callback: FrameRequestCallback | null = null;
    let time = 0;
    window.requestAnimationFrame = (next) => {
      callback = next;
      return 1;
    };
    window.cancelAnimationFrame = () => {
      callback = null;
    };
    window.stepLanternFrames = (count) => {
      for (let i = 0; i < count; i++) {
        time += 1000 / 60;
        callback?.(time);
      }
    };
    Math.random = () => 0.37;
  });
}
export async function frames(page: Page, count: number) {
  await page.evaluate((count) => window.stepLanternFrames(count), count);
}
export async function confirmRoomDialogue(page: Page) {
  await page.locator('#game').focus();
  await page.keyboard.press('Enter');
  await page.keyboard.press('Enter');
}
