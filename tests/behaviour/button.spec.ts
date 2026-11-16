// va-button behaviour that the generated contract tests don't cover: forms, states, names, warnings.
import { expect, mount, test } from '../fixtures.js';

test.describe('va-button behaviour', () => {
  test('type="submit" submits its form with name=value and the form fields', async ({ page, open }) => {
    await open('c=button&e=5-form');
    await page.evaluate(() => {
      document.querySelector('form')!.addEventListener('submit', (e) => {
        e.preventDefault();
        (window as any).__submitted = Object.fromEntries(new FormData(e.target as HTMLFormElement, (e as SubmitEvent).submitter));
      });
    });
    await page.getByRole('button', { name: 'Subscribe' }).click();
    expect(await page.evaluate(() => (window as any).__submitted)).toEqual({ email: 'ada@example.com', intent: 'subscribe' });
  });

  test('the default type="button" never submits', async ({ page, open }) => {
    await open('c=button&e=5-form');
    await page.evaluate(() => {
      const form = document.querySelector('form')!;
      (window as any).__submits = 0;
      form.addEventListener('submit', (e) => { e.preventDefault(); (window as any).__submits++; });
      const b = document.createElement('va-button');
      b.textContent = 'Plain';
      form.append(b);
    });
    await page.getByRole('button', { name: 'Plain' }).click();
    expect(await page.evaluate(() => (window as any).__submits)).toBe(0);
  });

  test('type="reset" resets its form', async ({ page, open }) => {
    await open('c=button&e=5-form');
    await page.getByRole('textbox').fill('changed@example.com');
    await page.getByRole('button', { name: 'Reset' }).click();
    await expect(page.getByRole('textbox')).toHaveValue('ada@example.com');
  });

  test('disabled: no click, not focusable', async ({ page, open, browserName }) => {
    await open('c=button');
    await mount(page, 'va-button', 'Disabled');
    await page.evaluate(async () => {
      const el = document.querySelector('#subject') as any;
      el.disabled = true;
      await el.updateComplete;
      (window as any).__clicks = 0;
      el.addEventListener('click', () => (window as any).__clicks++);
      el.before(Object.assign(document.createElement('button'), { id: 'before', textContent: 'before' }));
      el.after(Object.assign(document.createElement('button'), { id: 'after', textContent: 'after' }));
    });
    await page.locator('#subject').click({ force: true });
    expect(await page.evaluate(() => (window as any).__clicks)).toBe(0);
    if (!(browserName === 'webkit' && process.platform === 'darwin')) {
      // macOS WebKit only tabs to buttons when the system's keyboard-navigation setting is on.
      await page.locator('#before').focus();
      await page.keyboard.press('Tab');
      await expect(page.locator('#after')).toBeFocused();
    }
  });

  test('loading: blocks clicks, stays focusable, announces it is loading', async ({ page, open }) => {
    await open('c=button&e=3-states');
    const saving = page.getByRole('button', { name: 'Saving, loading' });
    await expect(saving).toHaveAttribute('aria-busy', 'true');
    await expect(saving).toHaveAttribute('aria-disabled', 'true');
    await page.evaluate(() => {
      (window as any).__clicks = 0;
      document.querySelector('va-button[loading]')!.addEventListener('click', () => (window as any).__clicks++);
    });
    // force: Playwright would otherwise wait for aria-disabled to clear; the blocked click is the point.
    await saving.click({ force: true });
    expect(await page.evaluate(() => (window as any).__clicks)).toBe(0);
    await saving.focus();
    await expect(saving).toBeFocused();
  });

  test('an icon-only button takes its name from label', async ({ page, open }) => {
    await open('c=button&e=4-icons');
    await expect(page.getByRole('button', { name: 'Close' })).toBeVisible();
  });

  test.describe('warnings for agents', () => {
    test.use({ expectedWarnings: [/has no accessible name/] });
    test('warns, with the fix, when a button has no accessible name', async ({ page, open }) => {
      await open('c=button');
      const warning = page.waitForEvent('console', (m) => m.type() === 'warning');
      await mount(page, 'va-button', '');
      expect((await warning).text()).toMatch(/^<va-button>: This button has no accessible name.*Fix: .*accessible-label="…"/);
    });
  });

  test.describe('warnings for agents (tokens)', () => {
    test.use({ expectedWarnings: [/No Vastu tokens are loaded/] });
    test('warns, with the fix, when no token stylesheet is loaded', async ({ page, open }) => {
      await open('c=button');
      await page.evaluate(() => document.querySelectorAll('link[rel="stylesheet"], style').forEach((s) => s.remove()));
      const warning = page.waitForEvent('console', (m) => m.type() === 'warning');
      await mount(page, 'va-button', 'Unstyled');
      expect((await warning).text()).toMatch(/No Vastu tokens are loaded.*Fix: import "@firstprateek\/vastu-tokens\/lekha.css"/);
    });
  });
});
