// va-menu behaviour beyond the generated contract.
import { expect, test } from '../fixtures.js';

test.describe('va-menu', () => {
  test('the button announces the popup; opening focuses the first item', async ({ page, open }) => {
    await open('c=menu&e=1-actions');
    const button = page.getByRole('button', { name: 'Actions' });
    await expect(button).toHaveAttribute('aria-haspopup', 'menu');
    await expect(button).toHaveAttribute('aria-expanded', 'false');
    await button.click();
    await expect(button).toHaveAttribute('aria-expanded', 'true');
    await expect(page.getByRole('menu', { name: 'Actions' })).toBeVisible();
    await expect(page.getByRole('menuitem', { name: 'Edit' })).toBeFocused();
  });

  test('ArrowUp on the button opens with the last item focused', async ({ page, open }) => {
    await open('c=menu&e=1-actions');
    await page.getByRole('button', { name: 'Actions' }).focus();
    await page.keyboard.press('ArrowUp');
    await expect(page.getByRole('menuitem', { name: 'Delete' })).toBeFocused();
  });

  test('choosing an item fires va-select with its value, closes, and returns focus', async ({ page, open }) => {
    await open('c=menu&e=1-actions');
    await page.evaluate(() => {
      (window as any).__values = [];
      document.querySelector('va-menu')!.addEventListener('va-select', (e: any) => (window as any).__values.push(e.detail.value));
    });
    await page.getByRole('button', { name: 'Actions' }).click();
    await page.getByRole('menuitem', { name: 'Duplicate' }).click();
    expect(await page.evaluate(() => (window as any).__values)).toEqual(['duplicate']);
    await expect(page.getByRole('menu')).toBeHidden();
    await expect(page.locator('va-menu')).toBeFocused();
  });

  test('typing a letter moves to the next item starting with it', async ({ page, open }) => {
    await open('c=menu&e=1-actions');
    await page.getByRole('button', { name: 'Actions' }).click();
    await page.keyboard.press('m');
    await expect(page.getByRole('menuitem', { name: 'Move to folder' })).toBeFocused();
    await page.keyboard.press('d');
    await expect(page.getByRole('menuitem', { name: 'Delete' })).toBeFocused();
  });

  test('a click outside closes it', async ({ page, open }) => {
    await open('c=menu&e=1-actions');
    await page.getByRole('button', { name: 'Actions' }).click();
    await page.mouse.click(5, 300);
    await expect(page.getByRole('menu')).toBeHidden();
    await expect(page.locator('va-menu')).not.toHaveAttribute('open', '');
  });

  test('the menu stays inside a narrow window', async ({ page, open }) => {
    await page.setViewportSize({ width: 390, height: 700 });
    await open('c=menu&e=2-end');
    await page.getByRole('button', { name: 'More' }).click();
    const box = await page.getByRole('menu').boundingBox();
    expect(box!.x).toBeGreaterThanOrEqual(0);
    expect(box!.x + box!.width).toBeLessThanOrEqual(390);
  });
});
