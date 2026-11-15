// Bundles the component manifest and token catalogue into data/, so the published package
// is self-contained. Runs after the vastu and tokens packages build.
import fs from 'node:fs';

fs.mkdirSync('data', { recursive: true });
fs.copyFileSync('../vastu/custom-elements.json', 'data/custom-elements.json');
fs.copyFileSync('../tokens/dist/tokens.json', 'data/tokens.json');
console.log('vastu-lint: copied the manifest and token catalogue into data/');
