// va-text-field behaviour beyond the generated contract.
import { expect, test } from '../fixtures.js';

test.describe('va-text-field', () => {
  test('the label is the accessible name; help text is the description', async ({ page, open }) => {
    await open('c=text-field&e=1-basic');
    const username = page.getByRole('textbox', { name: 'Username' });
    await expect(username).toBeVisible();
    await expect(username).toHaveAccessibleDescription('Letters and numbers only, 3 to 20 characters.');
  });

  test('no error while typing; the error shows after leaving the field', async ({ page, open }) => {
    await open('c=text-field&e=1-basic');
    const username = page.getByRole('textbox', { name: 'Username' });
    await username.fill('a!');
    await expect(username).not.toHaveAttribute('aria-invalid', 'true');
    await page.keyboard.press('Tab');
    await expect(username).toHaveAttribute('aria-invalid', 'true');
    await username.fill('ada99');
    await expect(username).not.toHaveAttribute('aria-invalid', 'true');
  });

  test('an error appearing on blur does not swallow the click that caused the blur', async ({ page, open }) => {
    await open('c=text-field&e=1-basic');
    // A checkbox right under the field: the error that appears on blur would push it down mid-click.
    await page.evaluate(() => {
      const box = document.createElement('va-checkbox');
      box.textContent = 'Remember me';
      document.querySelector('va-text-field[label="Username"]')!.after(box);
    });
    await page.getByRole('textbox', { name: 'Username' }).fill('a!');
    await page.getByRole('checkbox', { name: 'Remember me' }).click();
    await expect(page.getByRole('checkbox', { name: 'Remember me' })).toBeChecked();
    await expect(page.getByRole('textbox', { name: 'Username' })).toHaveAttribute('aria-invalid', 'true');
  });

  test('required: submit is blocked and the error shows; a valid value submits', async ({ page, open }) => {
    await open('c=text-field&e=2-validation');
    await page.evaluate(() => {
      (window as any).__submitted = null;
      document.querySelector('form')!.addEventListener('submit', (e) => {
        e.preventDefault();
        (window as any).__submitted = [...new FormData(e.target as HTMLFormElement).entries()];
      });
    });
    const email = page.getByRole('textbox', { name: 'Email address' });
    await page.getByRole('button', { name: 'Subscribe' }).click();
    expect(await page.evaluate(() => (window as any).__submitted)).toBeNull();
    await expect(email).toHaveAttribute('aria-invalid', 'true');
    await email.fill('ada@example.com');
    await page.getByRole('button', { name: 'Subscribe' }).click();
    expect(await page.evaluate(() => (window as any).__submitted)).toEqual([['email', 'ada@example.com']]);
  });

  test('a custom error is shown, described and makes the field invalid', async ({ page, open }) => {
    await open('c=text-field&e=3-states');
    const coupon = page.getByRole('textbox', { name: 'Coupon code' });
    await expect(coupon).toHaveAttribute('aria-invalid', 'true');
    await expect(coupon).toHaveAccessibleDescription('This code has expired.');
    expect(await page.locator('va-text-field').first().evaluate((el: any) => el.validity.customError)).toBe(true);
  });

  test('read-only text cannot be changed', async ({ page, open }) => {
    await open('c=text-field&e=3-states');
    const id = page.getByRole('textbox', { name: 'Account ID' });
    await id.focus();
    await page.keyboard.type('xyz');
    await expect(id).toHaveValue('ACC-20817');
  });

  test.describe('warnings for agents', () => {
    test.use({ expectedWarnings: [/has no label/] });
    test('warns when a field has no label', async ({ page, open }) => {
      await open('c=text-field');
      const warning = page.waitForEvent('console', (m) => m.type() === 'warning');
      await page.evaluate(() => document.querySelector('#stage')!.append(document.createElement('va-text-field')));
      expect((await warning).text()).toMatch(/has no label.*Fix: Add label="…".*A placeholder is not a label/);
    });
  });
});
