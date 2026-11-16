// Render benchmark: how long each component takes to create and render 1,000 instances in
// Chromium, using the production build. Each figure is the median of 7 fresh page loads.
// Usage: node tests/bench/render.js [--update]   (--update rewrites baseline.json)
// Without --update it compares with baseline.json and flags anything more than 50% slower.
// Timings depend on the machine, so compare runs from the same machine only.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from '@playwright/test';
import { build, preview } from 'vite';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '../..');
const manifest = JSON.parse(fs.readFileSync(path.join(root, 'packages/vastu/custom-elements.json'), 'utf8'));
const components = manifest.modules.flatMap((m) => m.declarations ?? []).filter((d) => d.customElement && d.tagName);
const N = 1000;
const RUNS = 7;

const configFile = path.join(root, 'tests/vite.config.js');
await build({ configFile, logLevel: 'warn' });
const server = await preview({ configFile });
const url = server.resolvedUrls.local[0];
const browser = await chromium.launch();

const results = {};
for (const c of components) {
  const hasLabel = (c.attributes ?? []).some((a) => a.name === 'label');
  const times = [];
  for (let run = 0; run < RUNS; run++) {
    const page = await browser.newPage();
    await page.goto(`${url}?c=${c.tagName.replace(/^va-/, '')}`);
    await page.locator('body[data-ready="true"]').waitFor();
    times.push(
      await page.evaluate(
        async ({ tag, n, hasLabel }) => {
          const stage = document.querySelector('#stage');
          const start = performance.now();
          const elements = [];
          for (let i = 0; i < n; i++) {
            const el = document.createElement(tag);
            if (hasLabel) el.setAttribute('label', `Item ${i}`);
            el.textContent = `Item ${i}`;
            elements.push(el);
          }
          stage.append(...elements);
          await Promise.all(elements.map((el) => el.updateComplete));
          // Wait for style, layout and paint of the result.
          await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
          return performance.now() - start;
        },
        { tag: c.tagName, n: N, hasLabel }
      )
    );
    await page.close();
  }
  times.sort((a, b) => a - b);
  results[c.tagName] = Math.round(times[Math.floor(RUNS / 2)]);
}
await browser.close();
server.httpServer.close();

const baselineFile = path.join(here, 'baseline.json');
const baseline = fs.existsSync(baselineFile) ? JSON.parse(fs.readFileSync(baselineFile, 'utf8')).results : {};
let slower = 0;
console.log(`\nRender ${N} instances (median of ${RUNS}, Chromium, production build)\n`);
console.log('Component       Now (ms)  Baseline  Change');
for (const [tag, ms] of Object.entries(results)) {
  const base = baseline[tag];
  const change = base ? `${ms > base ? '+' : ''}${Math.round(((ms - base) / base) * 100)}%` : 'new';
  if (base && ms > base * 1.5) slower++;
  console.log(`${tag.padEnd(15)} ${String(ms).padStart(8)}  ${String(base ?? '–').padStart(8)}  ${change}${base && ms > base * 1.5 ? '  <- more than 50% slower' : ''}`);
}
if (process.argv.includes('--update')) {
  fs.writeFileSync(baselineFile, JSON.stringify({ machine: `${process.platform} ${process.arch}`, date: new Date().toISOString().slice(0, 10), instances: N, results }, null, 2) + '\n');
  console.log(`\nBaseline updated: ${path.relative(root, baselineFile)}`);
}
process.exit(slower && !process.argv.includes('--update') ? 1 : 0);
