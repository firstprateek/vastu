// Fails when a text or UI colour pair falls below its WCAG 2.2 minimum in any brand and mode.
import { describe, expect, test } from 'vitest';
import fs from 'node:fs';

const dist = new URL('../dist/', import.meta.url);
const { pairs } = JSON.parse(fs.readFileSync(new URL('../src/contrast-pairs.json', import.meta.url)));
const brands = fs.readdirSync(dist).filter((f) => f.endsWith('.json') && f !== 'tokens.json');

const luminance = (hex) => {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
    .map((c) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
export const contrast = (a, b) => {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
};

for (const file of brands) {
  const { brand, modes } = JSON.parse(fs.readFileSync(new URL(file, dist)));
  describe(`brand ${brand}`, () => {
    for (const [mode, values] of Object.entries(modes)) {
      test.each(pairs)(`${mode}: $fg on $bg ≥ $min:1`, ({ fg, bg, min }) => {
        expect(values[fg], `${fg} missing in ${mode}`).toMatch(/^#[0-9a-f]{6}$/i);
        expect(values[bg], `${bg} missing in ${mode}`).toMatch(/^#[0-9a-f]{6}$/i);
        const ratio = contrast(values[fg], values[bg]);
        expect(ratio, `${fg} ${values[fg]} on ${bg} ${values[bg]} is ${ratio.toFixed(2)}:1`).toBeGreaterThanOrEqual(min);
      });
    }
  });
}
