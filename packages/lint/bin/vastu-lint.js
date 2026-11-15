#!/usr/bin/env node
// Usage: vastu-lint [--json] file.html [more.html …]   (or pipe HTML on stdin)
// Exits with 1 when any file has an error, so it can gate CI or an agent's loop.
import fs from 'node:fs';
import { format, lint } from '../src/index.js';

const args = process.argv.slice(2);
const json = args.includes('--json');
const files = args.filter((a) => !a.startsWith('--'));
const inputs = files.length ? files.map((f) => [f, fs.readFileSync(f, 'utf8')]) : [['<stdin>', fs.readFileSync(0, 'utf8')]];

let errors = 0;
const results = [];
for (const [file, html] of inputs) {
  const result = lint(html);
  errors += result.errorCount;
  results.push({ file, ...result });
  if (!json && result.problems.length) console.log(format(result.problems, file));
}
if (json) console.log(JSON.stringify(results, null, 2));
else {
  const problems = results.reduce((n, r) => n + r.problems.length, 0);
  console.log(problems ? `\n${problems} problem(s), ${errors} error(s).` : 'No problems found.');
}
process.exit(errors ? 1 : 0);
