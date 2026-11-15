import { test as base, expect, type Page } from '@playwright/test';
import fs from 'node:fs';

export { expect };

/** The component manifest, read once. */
export const manifest = JSON.parse(fs.readFileSync(new URL('../packages/vastu/custom-elements.json', import.meta.url), 'utf8'));
export const components: any[] = manifest.modules.flatMap((m: any) => m.declarations ?? []).filter((d: any) => d.customElement && d.tagName);
export const componentDir = (tag: string) => tag.replace(/^va-/, '');
export const exampleName = (ex: any) => ex.path.split('/').pop().replace(/\.html$/, '');
export const MODES = ['light', 'dark', 'high-contrast'] as const;
export const BRANDS = ['vastu', 'lekha'] as const;

type Fixtures = {
  /** Vastu dev warnings this test expects; any other warning fails it. */
  expectedWarnings: RegExp[];
  /** Console errors this test provokes on purpose; any other error fails it. */
  expectedErrors: RegExp[];
  guard: void;
  open: (query: string) => Promise<void>;
};

/**
 * Every browser test runs under the strict CSP with Trusted Types (see tests/vite.config.js).
 * This fixture fails the test on any page error, console error, CSP or Trusted Types violation,
 * or Vastu dev warning it didn't expect: examples must be clean.
 */
export const test = base.extend<Fixtures>({
  expectedWarnings: [[], { option: true }],
  expectedErrors: [[], { option: true }],
  guard: [
    async ({ page, expectedWarnings, expectedErrors }, use) => {
      const problems: string[] = [];
      page.on('pageerror', (e) => problems.push(`page error: ${e.message}`));
      page.on('console', (m) => {
        const text = m.text();
        if (m.type() === 'error' && !expectedErrors.some((r) => r.test(text))) problems.push(`console error: ${text}`);
        if (m.type() === 'warning' && text.startsWith('<va-') && !expectedWarnings.some((r) => r.test(text))) {
          problems.push(`unexpected Vastu warning: ${text}`);
        }
      });
      await page.addInitScript(() => {
        document.addEventListener('securitypolicyviolation', (e) => {
          console.error(`CSP violation: ${e.violatedDirective} blocked ${e.blockedURI || 'inline'}`);
        });
      });
      await use();
      expect(problems, problems.join('\n')).toEqual([]);
    },
    { auto: true },
  ],
  open: async ({ page }, use) => {
    await use(async (query: string) => {
      await page.goto(`/?${query}`);
      await page.locator('body[data-ready="true"]').waitFor();
    });
  },
});

/** Creates a fresh element on the stage and waits for its first render. */
export async function mount(page: Page, tag: string, html = 'Contract'): Promise<void> {
  await page.evaluate(
    async ({ tag, html }) => {
      const el = document.createElement(tag);
      el.id = 'subject';
      el.textContent = html;
      document.querySelector('#stage')!.replaceChildren(el);
      await (el as any).updateComplete;
    },
    { tag, html }
  );
}
