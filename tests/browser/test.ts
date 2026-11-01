import { test as base, expect } from '@playwright/test';
export const test = base.extend({
  page: async ({ page }, use) => {
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.stack ?? error.message));
    await use(page);
    expect(errors, 'browser runtime errors').toEqual([]);
  },
});
export { expect };
