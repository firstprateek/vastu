// va-navbar behaviour beyond the generated contract.
import { expect, test } from '../fixtures.js';

test.describe('va-navbar', () => {
  test('wide: a named nav landmark with the links in a row and no Menu button', async ({ page, open }) => {
    await page.setViewportSize({ width: 1024, height: 700 });
    await open('c=navbar&e=1-site');
    await expect(page.getByRole('navigation', { name: 'Main' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Menu' })).toBeHidden();
    await expect(page.getByRole('link', { name: 'Work' })).toBeVisible();
    const home = await page.getByRole('link', { name: 'Home' }).boundingBox();
    const work = await page.getByRole('link', { name: 'Work' }).boundingBox();
    expect(Math.round(home!.y)).toBe(Math.round(work!.y));
  });

  test('narrow: the links fold behind a Menu button that opens and closes them', async ({ page, open }) => {
    await page.setViewportSize({ width: 390, height: 700 });
    await open('c=navbar&e=1-site');
    const toggle = page.getByRole('button', { name: 'Menu' });
    await expect(toggle).toHaveAttribute('aria-expanded', 'false');
    await expect(page.getByRole('link', { name: 'Work' })).toBeHidden();
    await toggle.click();
    await expect(toggle).toHaveAttribute('aria-expanded', 'true');
    await expect(page.getByRole('link', { name: 'Work' })).toBeVisible();
    await toggle.click();
    await expect(page.getByRole('link', { name: 'Work' })).toBeHidden();
  });

  test('narrow: Escape closes the panel and returns focus to the Menu button', async ({ page, open }) => {
    await page.setViewportSize({ width: 390, height: 700 });
    await open('c=navbar&e=1-site');
    await page.getByRole('button', { name: 'Menu' }).click();
    await page.getByRole('link', { name: 'Work' }).focus();
    await page.keyboard.press('Escape');
    await expect(page.getByRole('link', { name: 'Work' })).toBeHidden();
    await expect(page.getByRole('button', { name: 'Menu' })).toBeFocused();
  });

  test('narrow: following a link or clicking outside closes the panel', async ({ page, open }) => {
    await page.setViewportSize({ width: 390, height: 700 });
    await open('c=navbar&e=1-site');
    const navbar = page.locator('va-navbar');
    const toggle = page.getByRole('button', { name: 'Menu' });

    await toggle.click();
    await page.getByRole('link', { name: 'About' }).click();
    await expect(navbar).not.toHaveAttribute('open', '');

    await toggle.click();
    await page.mouse.click(200, 650);
    await expect(navbar).not.toHaveAttribute('open', '');
  });

  test('narrow: tabbing out of the panel closes it', async ({ page, open, browserName }) => {
    test.skip(browserName === 'webkit' && process.platform === 'darwin', "macOS WebKit only tabs to buttons when the system's keyboard-navigation setting is on; CI runs WebKit on Linux.");
    await page.setViewportSize({ width: 390, height: 700 });
    await open('c=navbar&e=1-site');
    const navbar = page.locator('va-navbar');
    await page.evaluate(() => document.querySelector('#stage')!.append(Object.assign(document.createElement('button'), { textContent: 'after' })));
    await page.getByRole('button', { name: 'Menu' }).click();
    await page.getByRole('link', { name: 'Contact' }).focus();
    await page.keyboard.press('Tab');
    await expect(navbar).not.toHaveAttribute('open', '');
  });

  test('it folds by its own width, and unfolding closes the panel', async ({ page, open }) => {
    await page.setViewportSize({ width: 800, height: 700 });
    await open('c=navbar&e=2-fold-earlier');
    const toggle = page.getByRole('button', { name: 'Pages' });
    await expect(toggle).toBeVisible();
    await toggle.click();
    await page.locator('va-navbar').evaluate(async (el: any) => {
      el.collapseBelow = 500;
      await el.updateComplete;
    });
    await expect(toggle).toBeHidden();
    await expect(page.locator('va-navbar')).not.toHaveAttribute('open', '');
    expect(await page.locator('va-navbar').evaluate((el) => el.matches(':state(collapsed)'))).toBe(false);
  });

  test.describe('warnings', () => {
    test.use({ expectedWarnings: [/has no href/] });
    test('warns about a link without href', async ({ page, open }) => {
      await open('c=navbar');
      const warnings: string[] = [];
      page.on('console', (m) => m.type() === 'warning' && warnings.push(m.text()));
      await page.evaluate(async () => {
        const el = document.createElement('va-navbar') as any;
        el.append(Object.assign(document.createElement('a'), { textContent: 'Work' }));
        document.querySelector('#stage')!.append(el);
        await el.updateComplete;
      });
      await expect.poll(() => warnings.join()).toContain('The link "Work" has no href');
    });
  });
});
