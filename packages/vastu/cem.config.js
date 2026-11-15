// Custom Elements Manifest config. The vastu plugin adds the x- fields that docs, tests and agent tools read.
import { vastuManifestPlugin } from './scripts/cem-plugin.js';

export default {
  // Components, plus the base classes they inherit public API from.
  globs: ['src/*/*.ts', 'src/core/form-control.ts'],
  // Helpers in core/ are not public API; only the base class is analyzed, for inheritance.
  exclude: ['src/**/index.ts', 'src/all.ts', 'src/core/define.ts', 'src/core/dev-mode.ts', 'src/core/warn.ts', 'src/core/focus-ring.ts'],
  outdir: '.',
  litelement: true,
  plugins: [vastuManifestPlugin()],
};
