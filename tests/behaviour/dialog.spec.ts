// va-dialog behaviour beyond the generated contract: opening by command, focus, inertness, cancel.
import { expect, test } from '../fixtures.js';

test.describe('va-dialog', () => {
  test('a va-button command opens it, named by its heading, with focus inside', async ({ page, open }) => {
    await open('c=dialog&e=2-form');
    await page.getByRole('button', { name: 'Rename' }).click();
    const dialog = page.getByRole('dialog', { name: 'Rename file' });
    await expect(dialog).toBeVisible();
    await expect(page.getByRole('textbox', { name: 'File name' })).toBeFocused();
  });

  test('Escape closes it and focus returns to the opener', async ({ page, open }) => {
    await open('c=dialog&e=1-confirm');
    const opener = page.getByRole('button', { name: 'Delete project' }).first();
    await opener.click();
    await expect(page.getByRole('dialog', { name: 'Delete this project?' })).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.getByRole('dialog')).toBeHidden();
    await expect(opener).toBeFocused();
  });

  test('the Cancel button closes it through command="--close"', async ({ page, open }) => {
    await open('c=dialog&e=1-confirm');
    await page.getByRole('button', { name: 'Delete project' }).first().click();
    await page.getByRole('button', { name: 'Cancel' }).click();
    await expect(page.getByRole('dialog')).toBeHidden();
  });

  test('the page behind is inert while it is open', async ({ page, open }) => {
    await open('c=dialog&e=1-confirm');
    await page.getByRole('button', { name: 'Delete project' }).first().click();
    // Tab many times: focus is inside the dialog, or briefly in the browser's own UI (body),
    // but never on the page behind.
    for (let i = 0; i < 6; i++) {
      await page.keyboard.press('Tab');
      const where = await page.evaluate(() => {
        const dialog = document.querySelector('va-dialog')!;
        const a = document.activeElement;
        if (a === document.body || a === null) return 'browser';
        return a === dialog || dialog.contains(a) ? 'dialog' : `page: ${a.outerHTML.slice(0, 60)}`;
      });
      expect(['dialog', 'browser']).toContain(where);
    }
  });

  test('cancelling va-close keeps it open', async ({ page, open }) => {
    await open('c=dialog&e=1-confirm');
    await page.evaluate(() => document.querySelector('va-dialog')!.addEventListener('va-close', (e) => e.preventDefault()));
    await page.getByRole('button', { name: 'Delete project' }).first().click();
    await page.keyboard.press('Escape');
    await expect(page.getByRole('dialog', { name: 'Delete this project?' })).toBeVisible();
  });

  test('va-closed fires after every close, including setting open to false', async ({ page, open }) => {
    await open('c=dialog&e=1-confirm');
    await page.evaluate(() => {
      (window as any).__closed = [];
      document.querySelector('va-dialog')!.addEventListener('va-closed', (e: any) => (window as any).__closed.push(e.detail.reason));
    });
    const opener = page.getByRole('button', { name: 'Delete project' }).first();
    await opener.click();
    await page.keyboard.press('Escape');
    await opener.click();
    await page.locator('va-dialog').evaluate(async (el: any) => {
      el.open = false;
      await el.updateComplete;
    });
    expect(await page.evaluate(() => (window as any).__closed)).toEqual(['escape', 'property']);
    await expect(page.getByRole('dialog')).toBeHidden();
  });

  test('va-close reports why it closed', async ({ page, open }) => {
    await open('c=dialog&e=1-confirm');
    await page.evaluate(() => {
      (window as any).__reasons = [];
      document.querySelector('va-dialog')!.addEventListener('va-close', (e: any) => (window as any).__reasons.push(e.detail.reason));
    });
    const opener = page.getByRole('button', { name: 'Delete project' }).first();
    await opener.click();
    await page.getByRole('button', { name: 'Close' }).click();
    await opener.click();
    await page.getByRole('button', { name: 'Cancel' }).click();
    await opener.click();
    await page.keyboard.press('Escape');
    expect(await page.evaluate(() => (window as any).__reasons)).toEqual(['close-button', 'command', 'escape']);
  });
});
