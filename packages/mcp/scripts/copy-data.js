// Bundles the manifest and tokens into data/, so the published server is self-contained.
import fs from 'node:fs';

fs.mkdirSync('data', { recursive: true });
fs.copyFileSync('../vastu/custom-elements.json', 'data/custom-elements.json');
for (const f of fs.readdirSync('../tokens/dist').filter((f) => f.endsWith('.json'))) {
  fs.copyFileSync(`../tokens/dist/${f}`, `data/${f}`);
}
console.log('vastu-mcp: copied the manifest and tokens into data/');
