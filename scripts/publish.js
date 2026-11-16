// Publishes each package whose version is not on npm yet. Used by the Release workflow.
// pnpm pack turns workspace: dependencies into real version ranges; npm publish then uploads the
// tarball, using trusted publishing (OIDC from GitHub Actions) and adding a provenance attestation.
// Usage: node scripts/publish.js [--dry-run]
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const PACKAGES = ['packages/tokens', 'packages/vastu', 'packages/lint', 'packages/mcp'];
const dryRun = process.argv.includes('--dry-run');
const out = fs.mkdtempSync(path.join(process.env.RUNNER_TEMP ?? '/tmp', 'vastu-pack-'));

for (const dir of PACKAGES) {
  const { name, version } = JSON.parse(fs.readFileSync(path.join(dir, 'package.json'), 'utf8'));
  let published;
  try {
    published = execFileSync('npm', ['view', `${name}@${version}`, 'version'], { encoding: 'utf8' }).trim() === version;
  } catch {
    published = false; // npm view fails when the package or version doesn't exist
  }
  if (published) {
    console.log(`${name}@${version} is already on npm; skipping.`);
    continue;
  }
  execFileSync('pnpm', ['pack', '--pack-destination', out], { cwd: dir, stdio: 'inherit' });
  const tarball = fs.readdirSync(out).find((f) => f.startsWith(name.replace('@', '').replace('/', '-') + '-' + version));
  const args = ['publish', path.join(out, tarball), '--access', 'public'];
  // Provenance needs the OIDC identity of a CI run; a first publish from a laptop goes without it.
  if (process.env.GITHUB_ACTIONS) args.push('--provenance');
  if (dryRun) args.push('--dry-run');
  console.log(`Publishing ${name}@${version}${dryRun ? ' (dry run)' : ''}`);
  execFileSync('npm', args, { stdio: 'inherit' });
}
