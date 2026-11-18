// va-poll behaviour beyond the generated contract.
import { expect, test } from '../fixtures.js';

const shares = (page: any) =>
  page.locator('va-poll').evaluate((el: Element) => [...el.shadowRoot!.querySelectorAll('[part="result"]')].map((r) => r.textContent!.match(/\d+%/)?.[0]));

test.describe('va-poll', () => {
  test('the question names a group of answer buttons; results are hidden before a vote', async ({ page, open }) => {
    await open('c=poll&e=1-quick-poll');
    await expect(page.locator('va-poll')).toMatchAriaSnapshot(`
      - group "Tabs or spaces?":
        - text: Tabs or spaces?
        - list:
          - listitem:
            - button "Tabs"
          - listitem:
            - button "Spaces"
          - listitem:
            - button "Whatever the formatter does"
    `);
    await expect(page.locator('va-poll').locator('[part="result"]').first()).toBeHidden();
  });

  test('voting counts the vote, fires va-select once and shows the results', async ({ page, open }) => {
    await open('c=poll&e=1-quick-poll');
    await page.evaluate(() => {
      (window as any).__votes = [];
      document.querySelector('va-poll')!.addEventListener('va-select', (e: any) => (window as any).__votes.push(e.detail.value));
    });
    await page.getByRole('button', { name: 'Spaces' }).click();
    // 12, 31 and 9 votes: 23%, 60%, 17%.
    expect(await shares(page)).toEqual(['23%', '60%', '17%']);
    await expect(page.getByRole('button', { name: 'Spaces' })).toHaveAttribute('data-votes', '31');
    await expect(page.locator('va-poll')).toHaveJSProperty('value', 'spaces');
    await expect(page.locator('va-poll').getByRole('status')).toHaveText('Vote counted. 52 votes in total.');
    // A second click is not another vote. (Playwright won't click an aria-disabled button, so dispatch it.)
    await page.getByRole('button', { name: 'Tabs' }).dispatchEvent('click');
    expect(await page.evaluate(() => (window as any).__votes)).toEqual(['spaces']);
    for (const name of ['Tabs', 'Spaces', 'Whatever the formatter does']) {
      await expect(page.getByRole('button', { name })).toHaveAttribute('aria-disabled', 'true');
    }
  });

  test('the keyboard votes too, and focus stays on the answer', async ({ page, open }) => {
    await open('c=poll&e=1-quick-poll');
    await page.getByRole('button', { name: 'Tabs' }).focus();
    await page.keyboard.press('Enter');
    await expect(page.locator('va-poll')).toHaveJSProperty('value', 'tabs');
    await expect(page.getByRole('button', { name: 'Tabs' })).toBeFocused();
  });

  test('value shows the results with that answer marked, without counting a vote', async ({ page, open }) => {
    await open('c=poll&e=2-already-voted');
    expect(await shares(page)).toEqual(['32%', '41%', '18%', '9%']);
    const lit = page.locator('va-poll').locator('[part="option"]').first();
    await expect(lit).toHaveClass(/chosen/);
    await expect(page.getByRole('button', { name: 'Lit' })).toHaveAttribute('data-votes', '48');
    await expect(page.locator('va-poll').locator('[part="help-text"]')).toContainText('150 votes');
    await expect(page.locator('va-poll').locator('[part="help-text"]')).toContainText('The poll closes on Friday.');
  });

  test('show-results shows the results with no answer marked; new data-votes update them', async ({ page, open }) => {
    await open('c=poll&e=1-quick-poll');
    await page.locator('va-poll').evaluate((el: any) => (el.showResults = true));
    await expect(page.locator('va-poll').locator('.chosen')).toHaveCount(0);
    expect(await shares(page)).toEqual(['24%', '59%', '18%']);
    await page.getByRole('button', { name: 'Tabs' }).evaluate((b) => (b.dataset.votes = '49'));
    await expect.poll(() => shares(page)).toEqual(['56%', '34%', '10%']);
  });

  test.describe('warnings', () => {
    test.use({ expectedWarnings: [/is not a <button>|no label/] });
    test('warns about answers that are not buttons, and a missing label', async ({ page, open }) => {
      await open('c=poll');
      const warnings: string[] = [];
      page.on('console', (m) => m.type() === 'warning' && warnings.push(m.text()));
      await page.evaluate(async () => {
        const el = document.createElement('va-poll') as any;
        el.append(Object.assign(document.createElement('div'), { textContent: 'Yes' }));
        document.querySelector('#stage')!.append(el);
        await el.updateComplete;
      });
      await expect.poll(() => warnings.join()).toContain('An answer is not a <button>');
      await expect.poll(() => warnings.join()).toContain('has no label');
    });
  });
});
