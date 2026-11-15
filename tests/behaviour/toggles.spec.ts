// va-switch and va-checkbox behaviour beyond the generated contract: forms, validity, names.
import { expect, test } from '../fixtures.js';

async function captureSubmit(page: import('@playwright/test').Page) {
  await page.evaluate(() => {
    (window as any).__submitted = null;
    document.querySelector('form')!.addEventListener('submit', (e) => {
      e.preventDefault();
      (window as any).__submitted = [...new FormData(e.target as HTMLFormElement).entries()];
    });
  });
}

test.describe('va-switch', () => {
  test('exposes role switch with its slotted label as the name', async ({ page, open }) => {
    await open('c=switch&e=1-settings');
    await expect(page.getByRole('switch', { name: 'Email notifications' })).toHaveAttribute('aria-checked', 'true');
    await expect(page.getByRole('switch', { name: 'Dark theme' })).toHaveAttribute('aria-checked', 'false');
  });

  test('clicking the label flips it and fires input then change', async ({ page, open }) => {
    await open('c=switch&e=1-settings');
    await page.evaluate(() => {
      (window as any).__events = [];
      const el = document.querySelectorAll('va-switch')[1];
      for (const t of ['input', 'change']) el.addEventListener(t, () => (window as any).__events.push(t));
    });
    await page.locator('va-switch').nth(1).locator('[part=label]').click();
    await expect(page.getByRole('switch', { name: 'Dark theme' })).toHaveAttribute('aria-checked', 'true');
    expect(await page.evaluate(() => (window as any).__events)).toEqual(['input', 'change']);
  });

  test('a disabled switch does not flip', async ({ page, open }) => {
    await open('c=switch&e=1-settings');
    await page.locator('va-switch[disabled]').click({ force: true });
    await expect(page.locator('va-switch[disabled]')).not.toHaveAttribute('checked', '');
  });

  test('submits name=value only while on, and resets with its form', async ({ page, open }) => {
    await open('c=switch&e=2-form');
    await captureSubmit(page);
    await page.getByRole('button', { name: 'Save' }).click();
    expect(await page.evaluate(() => (window as any).__submitted)).toEqual([['newsletter', 'weekly']]);
    await page.getByRole('switch').click();
    await page.getByRole('button', { name: 'Save' }).click();
    expect(await page.evaluate(() => (window as any).__submitted)).toEqual([]);
    await page.getByRole('button', { name: 'Reset' }).click();
    await expect(page.getByRole('switch')).toHaveAttribute('aria-checked', 'true');
  });
});

test.describe('va-checkbox', () => {
  test('exposes role checkbox with its slotted label as the name, and mixed state', async ({ page, open }) => {
    await open('c=checkbox&e=1-options');
    await expect(page.getByRole('checkbox', { name: 'Include archived projects' })).toBeChecked();
    await expect(page.getByRole('checkbox', { name: 'Select all (some selected)' })).toBeChecked({ indeterminate: true });
  });

  test('toggling clears indeterminate', async ({ page, open }) => {
    await open('c=checkbox&e=1-options');
    const box = page.getByRole('checkbox', { name: 'Select all (some selected)' });
    await box.click();
    await expect(box).toBeChecked();
    await expect(page.locator('va-checkbox[indeterminate]')).toHaveCount(0);
  });

  test('required: blocks submit until checked, then submits name=value', async ({ page, open }) => {
    await open('c=checkbox&e=2-form');
    await captureSubmit(page);
    await page.getByRole('button', { name: 'Create account' }).click();
    expect(await page.evaluate(() => (window as any).__submitted)).toBeNull();
    expect(await page.locator('va-checkbox').evaluate((el: any) => el.validity.valueMissing)).toBe(true);
    await page.getByRole('checkbox', { name: 'I agree to the terms' }).check();
    await page.getByRole('button', { name: 'Create account' }).click();
    expect(await page.evaluate(() => (window as any).__submitted)).toEqual([['terms', 'accepted']]);
  });
});
