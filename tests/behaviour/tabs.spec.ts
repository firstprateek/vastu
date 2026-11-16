// va-tabs behaviour beyond the generated contract.
import { expect, test } from '../fixtures.js';

test.describe('va-tabs', () => {
  test('wires roles, names and panels', async ({ page, open }) => {
    await open('c=tabs&e=1-settings');
    await expect(page.getByRole('tablist', { name: 'Account settings' })).toBeVisible();
    await expect(page.getByRole('tab', { name: 'Profile' })).toHaveAttribute('aria-selected', 'true');
    await expect(page.getByRole('tabpanel', { name: 'Profile' })).toBeVisible();
    await expect(page.getByRole('tabpanel')).toHaveCount(1);
  });

  test('clicking a tab shows its panel and fires va-select once with its index', async ({ page, open }) => {
    await open('c=tabs&e=1-settings');
    await page.evaluate(() => {
      (window as any).__changes = 0;
      (window as any).__index = null;
      document.querySelector('va-tabs')!.addEventListener('va-select', (e: any) => {
        (window as any).__changes++;
        (window as any).__index = e.detail.index;
      });
    });
    await page.getByRole('tab', { name: 'Billing' }).click();
    await expect(page.getByRole('tabpanel', { name: 'Billing' })).toBeVisible();
    await expect(page.getByRole('tabpanel', { name: 'Profile' })).toBeHidden();
    expect(await page.evaluate(() => (window as any).__changes)).toBe(1);
    expect(await page.evaluate(() => (window as any).__index)).toBe(2);
  });

  test('a change event from a control inside a panel is not a tab selection', async ({ page, open }) => {
    await open('c=tabs&e=1-settings');
    await page.evaluate(() => {
      (window as any).__selects = 0;
      const tabs = document.querySelector('va-tabs')!;
      tabs.addEventListener('va-select', () => (window as any).__selects++);
      const box = document.createElement('va-checkbox');
      box.textContent = 'Inside a panel';
      tabs.querySelector('[slot="panel"]')!.append(box);
    });
    await page.getByRole('checkbox', { name: 'Inside a panel' }).check();
    expect(await page.evaluate(() => (window as any).__selects)).toBe(0);
  });

  test('selected-index is kept within the tabs that exist', async ({ page, open }) => {
    await open('c=tabs&e=1-settings');
    const index = await page.locator('va-tabs').evaluate(async (el: any) => {
      el.selectedIndex = 9;
      await el.updateComplete;
      await el.updateComplete;
      return el.selectedIndex;
    });
    expect(index).toBe(2);
    await expect(page.getByRole('tab', { name: 'Billing' })).toHaveAttribute('aria-selected', 'true');
  });

  test('automatic: arrow keys select as they move; only the selected tab is tabbable', async ({ page, open }) => {
    await open('c=tabs&e=1-settings');
    await page.getByRole('tab', { name: 'Profile' }).focus();
    await page.keyboard.press('ArrowRight');
    await expect(page.getByRole('tab', { name: 'Notifications' })).toBeFocused();
    await expect(page.getByRole('tab', { name: 'Notifications' })).toHaveAttribute('aria-selected', 'true');
    await expect(page.getByRole('tab', { name: 'Notifications' })).toHaveAttribute('tabindex', '0');
    await expect(page.getByRole('tab', { name: 'Profile' })).toHaveAttribute('tabindex', '-1');
  });

  test('manual: arrow keys only move focus; Enter selects', async ({ page, open }) => {
    await open('c=tabs&e=2-manual');
    await page.getByRole('tab', { name: 'Weekly' }).focus();
    await page.keyboard.press('ArrowRight');
    await expect(page.getByRole('tab', { name: 'Monthly' })).toBeFocused();
    await expect(page.getByRole('tab', { name: 'Weekly' })).toHaveAttribute('aria-selected', 'true');
    await page.keyboard.press('Enter');
    await expect(page.getByRole('tab', { name: 'Monthly' })).toHaveAttribute('aria-selected', 'true');
    await expect(page.getByRole('tabpanel', { name: 'Monthly' })).toBeVisible();
  });
});
