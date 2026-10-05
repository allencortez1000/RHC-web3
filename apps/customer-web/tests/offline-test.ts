import { test as base, expect } from '@playwright/test';

// Context routing also protects popups and requests made before a page fixture is installed.
// Later page-level synthetic handlers fulfill requests without opening a socket.
export const test = base.extend({
  context: async ({ context }, provideContext) => {
    const unexpected: string[] = [];
    await context.route('**/*', (route) => {
      const url = new URL(route.request().url());
      if (['http://127.0.0.1:43102', 'http://127.0.0.1:43103'].includes(url.origin)) return route.continue();
      unexpected.push(url.origin + url.pathname);
      return route.abort('blockedbyclient');
    });
    await provideContext(context);
    expect(unexpected, 'All non-frontend browser requests must be intercepted synthetic fixtures').toEqual([]);
  },
});
export { expect };
export type { Page, Locator, Request } from '@playwright/test';
