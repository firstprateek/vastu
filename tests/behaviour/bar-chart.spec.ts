// va-bar-chart behaviour beyond the generated contract.
import { expect, test } from '../fixtures.js';

/** Height of each bar as a share of the plot, in percent. */
const heights = (page: any) =>
  page.locator('va-bar-chart').evaluate((el: Element) => {
    const plot = el.shadowRoot!.querySelector('[part="plot"]')!.getBoundingClientRect().height;
    return [...el.shadowRoot!.querySelectorAll('[part="bar"]')].map((b) => (b.getBoundingClientRect().height / plot) * 100);
  });

/** Within half a percent: bar heights are rounded to device pixels. */
function expectClose(actual: number[], expected: number[]): void {
  expect(actual).toHaveLength(expected.length);
  actual.forEach((a, i) => expect(a).toBeCloseTo(expected[i], 0));
}

const ticks = (page: any) =>
  page.locator('va-bar-chart').evaluate((el: Element) => [...el.shadowRoot!.querySelectorAll('.tick')].map((t) => t.textContent!.trim()));

test.describe('va-bar-chart', () => {
  test.beforeEach(async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
  });

  test('a figure named by its label, with one focusable data point per bar', async ({ page, open }) => {
    await open('c=bar-chart&e=1-per-day');
    await expect(page.getByRole('figure', { name: 'Visitors per day' })).toBeVisible();
    await expect(page.getByRole('img', { name: 'Fri: 164' })).toBeVisible();
    expect(await page.locator('va-bar-chart data').evaluateAll((items) => items.map((i) => (i as HTMLElement).tabIndex))).toEqual([0, -1, -1, -1, -1, -1, -1]);
  });

  test('the axis rounds up to a round number and the bars are to scale', async ({ page, open }) => {
    await open('c=bar-chart&e=1-per-day');
    expect(await ticks(page)).toEqual(['0', '50', '100', '150', '200']);
    expectClose(await heights(page), [60, 49, 71.5, 43.5, 82, 30.5, 22.5]);
  });

  test('max fixes the top of the axis', async ({ page, open }) => {
    await open('c=bar-chart&e=2-fixed-scale');
    expect(await ticks(page)).toEqual(['0', '20', '40', '60', '80', '100']);
    expectClose(await heights(page), [97, 88, 91, 99]);
  });

  test('negative values hang below the zero line', async ({ page, open }) => {
    await open('c=bar-chart&e=3-negative');
    const geometry = await page.locator('va-bar-chart').evaluate((el) => {
      const zero = el.shadowRoot!.querySelector('.grid.zero')!.getBoundingClientRect().top;
      return [...el.shadowRoot!.querySelectorAll('[part="bar"]')].map((b) => {
        const r = b.getBoundingClientRect();
        return { above: Math.round(zero - r.top), below: Math.round(r.bottom - zero) };
      });
    });
    expect(geometry[0].above).toBeGreaterThan(0);
    expect(geometry[0].below).toBeLessThanOrEqual(1);
    expect(geometry[1].above).toBeLessThanOrEqual(1);
    expect(geometry[1].below).toBeGreaterThan(0);
  });

  test('changing a <data> value redraws the bar and its name', async ({ page, open }) => {
    await open('c=bar-chart&e=2-fixed-scale');
    await page.locator('va-bar-chart data').first().evaluate((d) => d.setAttribute('value', '50'));
    await expect.poll(async () => (await heights(page)).map(Math.round)).toEqual([50, 88, 91, 99]);
    await expect(page.getByRole('img', { name: 'Web: 50' })).toBeAttached();
  });

  test('Tab enters at the last focused bar, and the focused bar shows its value', async ({ page, open }) => {
    await open('c=bar-chart&e=1-per-day');
    await page.getByRole('img', { name: 'Mon: 120' }).focus();
    await page.keyboard.press('ArrowRight');
    await page.keyboard.press('ArrowRight');
    await expect(page.getByRole('img', { name: 'Wed: 143' })).toBeFocused();
    const value = page.locator('va-bar-chart').locator('.focused .value');
    await expect(value).toHaveText('143');
    await expect(value).toBeVisible();
    await page.locator('body').click({ position: { x: 5, y: 5 } });
    await page.keyboard.press('Tab');
    await expect(page.getByRole('img', { name: 'Wed: 143' })).toBeFocused();
  });

  test.describe('warnings', () => {
    test.use({ expectedWarnings: [/is not a number|not a <data> element/] });
    test('warns about values that are not numbers and children that are not <data>', async ({ page, open }) => {
      await open('c=bar-chart');
      const warnings: string[] = [];
      page.on('console', (m) => m.type() === 'warning' && warnings.push(m.text()));
      await page.evaluate(async () => {
        const el = document.createElement('va-bar-chart') as any;
        el.label = 'Sales';
        const d = document.createElement('data');
        d.value = '1,200';
        d.textContent = 'North';
        el.append(d, Object.assign(document.createElement('span'), { textContent: 'South' }));
        document.querySelector('#stage')!.append(el);
        await el.updateComplete;
      });
      await expect.poll(() => warnings.join()).toContain('has value="1,200", which is not a number');
      await expect.poll(() => warnings.join()).toContain('A child is not a <data> element');
    });
  });
});
