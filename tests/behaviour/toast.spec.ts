// va-toast behaviour beyond the generated contract.
import { expect, test } from '../fixtures.js';

test.describe('va-toast', () => {
  test('a va-button command shows its value as a status message', async ({ page, open }) => {
    await open('c=toast&e=1-status');
    await page.getByRole('button', { name: 'Save' }).click();
    await expect(page.getByRole('status')).toContainText('Changes saved');
    await expect(page.getByRole('region', { name: 'Notifications' })).toBeVisible();
  });

  test('errors use role=alert and stay until dismissed', async ({ page, open }) => {
    await open('c=toast&e=1-status');
    await page.locator('va-toast').evaluate((el: any) => (el.duration = 300));
    await page.getByRole('button', { name: 'Simulate an error' }).click();
    const alert = page.getByRole('alert');
    await expect(alert).toContainText("Couldn't sync");
    await page.waitForTimeout(600);
    await expect(alert).toBeVisible();
    await alert.getByRole('button', { name: 'Dismiss' }).click();
    await expect(alert).toBeHidden();
  });

  test('info messages close by themselves, but not while hovered', async ({ page, open }) => {
    await open('c=toast&e=1-status');
    await page.locator('va-toast').evaluate((el: any) => (el.duration = 1200));
    await page.getByRole('button', { name: 'Copy link' }).click();
    const message = page.locator('va-toast').locator('[part~="toast"]');
    await message.hover();
    await page.waitForTimeout(1500);
    await expect(message).toBeVisible();
    await page.mouse.move(0, 0);
    await expect(message).toBeHidden({ timeout: 3000 });
  });

  test('over an open modal dialog, messages stay clickable; the region returns when it closes', async ({ page, open }) => {
    await open('c=toast&e=1-status');
    await page.evaluate(() => {
      const dialog = document.createElement('va-dialog');
      dialog.id = 'modal';
      dialog.setAttribute('heading', 'Edit profile');
      dialog.append(Object.assign(document.createElement('p'), { textContent: 'Form goes here.' }));
      document.querySelector('#stage')!.append(dialog);
      (dialog as any).show();
    });
    await expect(page.getByRole('dialog', { name: 'Edit profile' })).toBeVisible();
    await page.locator('va-toast').evaluate((el: any) => el.show('Draft saved'));
    await expect(page.getByRole('status')).toContainText('Draft saved');
    // Clickable despite the modal: the dismiss button responds.
    await page.getByRole('button', { name: 'Dismiss' }).click();
    await expect(page.getByRole('status')).not.toContainText('Draft saved');
    await page.keyboard.press('Escape');
    await expect(page.getByRole('dialog')).toBeHidden();
    expect(await page.locator('va-toast').evaluate((el) => el.parentElement!.id)).toBe('stage');
  });

  test('show() returns an id that dismiss() closes, with the reason in va-close', async ({ page, open }) => {
    await open('c=toast&e=1-status');
    const reasons = await page.locator('va-toast').evaluate(async (el: any) => {
      const reasons: string[] = [];
      el.addEventListener('va-close', (e: any) => reasons.push(e.detail.reason));
      const id = el.show('First');
      el.show('Second');
      el.dismiss(id);
      await el.updateComplete;
      return { reasons, left: el.shadowRoot.querySelectorAll('[part~="toast"]').length };
    });
    expect(reasons).toEqual({ reasons: ['method'], left: 1 });
  });
});
