// Screenshots of every example × mode × width. Baselines are made in CI's Linux Playwright
// image only (workflow "Update visual baselines"), so they match pixel for pixel there.
import { components, componentDir, exampleName, expect, MODES, test } from '../fixtures.js';

const WIDTHS = [390, 1280];

for (const c of components) {
  for (const ex of c['x-examples']) {
    for (const mode of MODES) {
      for (const width of WIDTHS) {
        test(`${c.tagName} ${exampleName(ex)} ${mode} ${width}`, async ({ page, open }) => {
          await page.setViewportSize({ width, height: 400 });
          await page.emulateMedia({ reducedMotion: 'reduce' });
          await open(`c=${componentDir(c.tagName)}&e=${exampleName(ex)}&mode=${mode}`);
          await expect(page.locator('#stage')).toHaveScreenshot(`${componentDir(c.tagName)}/${exampleName(ex)}-${mode}-${width}.png`);
        });
      }
    }
  }
}
