// Custom Elements Manifest config. The vastu plugin adds the x- fields that docs, tests and agent tools read.
import { vastuManifestPlugin } from './scripts/cem-plugin.js';

export default {
  globs: ['src/**/*.ts'],
  exclude: ['src/core/**', 'src/**/index.ts'],
  outdir: '.',
  litelement: true,
  plugins: [vastuManifestPlugin()],
};
