// Custom Elements Manifest config. The vastu plugin adds the x- fields that docs, tests and agent tools read.
import { vastuManifestPlugin } from './scripts/cem-plugin.js';

export default {
  // Components, plus the base classes they inherit public API from.
  globs: ['src/*/*.ts', 'src/core/form-control.ts'],
  exclude: ['src/**/index.ts', 'src/all.ts'],
  outdir: '.',
  litelement: true,
  plugins: [vastuManifestPlugin()],
};
