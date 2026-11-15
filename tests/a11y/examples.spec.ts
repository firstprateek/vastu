// axe-core on every example, in every mode, against WCAG 2.2 A and AA rules.
import AxeBuilder from '@axe-core/playwright';
import { components, componentDir, exampleName, expect, MODES, test } from '../fixtures.js';

for (const c of components) {
  for (const ex of c['x-examples']) {
    for (const mode of MODES) {
      test(`${c.tagName} ${exampleName(ex)} (${mode}) has no axe violations`, async ({ page, open }) => {
        await open(`c=${componentDir(c.tagName)}&e=${exampleName(ex)}&mode=${mode}`);
        const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']).analyze();
        const summary = results.violations.map((v) => `${v.id}: ${v.help} (${v.nodes.map((n) => n.target.join(' ')).join(', ')})`);
        expect(summary).toEqual([]);
      });
    }
  }

  test(`${c.tagName}: every size meets the 24px target size`, async ({ page, open }) => {
    await open(`c=${componentDir(c.tagName)}&e=${exampleName(c['x-examples'][0])}`);
    const small = await page.evaluate((tag) => {
      return [...document.querySelectorAll(tag)].map((el) => {
        const r = el.getBoundingClientRect();
        return { w: r.width, h: r.height };
      }).filter((r) => r.w < 24 || r.h < 24);
    }, c.tagName);
    expect(small).toEqual([]);
  });
}
