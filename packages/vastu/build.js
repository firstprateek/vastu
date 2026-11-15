// Builds the package twice: dist/dev keeps the developer warnings, dist/prod drops them.
// package.json "exports" serves dev under the "development" condition and prod by default.
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';

fs.rmSync('dist', { recursive: true, force: true });
execFileSync('npx', ['tsc', '-p', 'tsconfig.json'], { stdio: 'inherit' });
fs.cpSync('dist/dev', 'dist/prod', { recursive: true });
fs.writeFileSync('dist/prod/core/dev-mode.js', 'export const DEV_MODE = false;\n');
// Replace the warning helpers outright, so no message text reaches production bundles.
fs.writeFileSync('dist/prod/core/warn.js', 'export function devWarn() {}\nexport function checkTokensLoaded() {}\n');
for (const f of fs.readdirSync('dist/prod', { recursive: true })) {
  if (String(f).endsWith('.map') || String(f).endsWith('.d.ts')) fs.rmSync(`dist/prod/${f}`);
}
execFileSync('npx', ['cem', 'analyze', '--config', 'cem.config.js'], { stdio: 'inherit' });
