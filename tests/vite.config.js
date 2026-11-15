import { defineConfig } from 'vite';
import { fileURLToPath } from 'node:url';

// The strict policy every browser test runs under. Lit's Trusted Types policy is "lit-html";
// "vastu-harness" only renders example fixtures.
export const CSP = [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self'",
  "img-src 'self' data:",
  "require-trusted-types-for 'script'",
  'trusted-types lit-html vastu-harness',
].join('; ');

export default defineConfig({
  root: fileURLToPath(new URL('./harness', import.meta.url)),
  build: { outDir: 'dist', emptyOutDir: true, target: 'es2022', assetsInlineLimit: 0, cssCodeSplit: false },
  preview: { host: '127.0.0.1', port: 4173, strictPort: true, headers: { 'Content-Security-Policy': CSP } },
});
