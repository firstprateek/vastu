// Screenshots of every example × brand × mode × width. Baselines are made in CI's Linux Playwright
// image only (workflow "Update visual baselines"), so they match pixel for pixel there.
import { BRANDS, components, componentDir, exampleName, expect, MODES, test } from '../fixtures.js';

const WIDTHS = [390, 1280];

for (const c of components) {
  for (const ex of c['x-examples']) {
    for (const brand of BRANDS) for (const mode of MODES) {
      for (const width of WIDTHS) {
        test(`${c.tagName} ${exampleName(ex)} ${brand} ${mode} ${width}`, async ({ page, open }) => {
          await page.setViewportSize({ width, height: 400 });
          await page.emulateMedia({ reducedMotion: 'reduce' });
          await open(`c=${componentDir(c.tagName)}&e=${exampleName(ex)}&brand=${brand}&mode=${mode}`);
          await expect(page.locator('#stage')).toHaveScreenshot(`${componentDir(c.tagName)}/${exampleName(ex)}-${brand}-${mode}-${width}.png`);
        });
      }
    }
  }
}
