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
