import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import lit from 'eslint-plugin-lit';
import globals from 'globals';

// Security rules: components must never build HTML from strings. Lit templates escape
// everything; these are the escape hatches that would bypass that.
const noRawHtml = {
  'no-restricted-imports': ['error', {
    paths: [
      { name: 'lit/directives/unsafe-html.js', message: 'unsafeHTML bypasses escaping. Render with a Lit template instead.' },
      { name: 'lit/directives/unsafe-svg.js', message: 'unsafeSVG bypasses escaping. Render with a Lit svg template instead.' },
      { name: 'lit/static-html.js', message: 'unsafeStatic can inject markup. Use a fixed tag in a normal template.' },
    ],
  }],
  'no-restricted-properties': ['error',
    { property: 'innerHTML', message: 'Build DOM with Lit templates, not innerHTML.' },
    { property: 'outerHTML', message: 'Build DOM with Lit templates, not outerHTML.' },
    { property: 'insertAdjacentHTML', message: 'Build DOM with Lit templates, not insertAdjacentHTML.' },
  ],
  'no-restricted-syntax': ['error',
    { selector: "AssignmentExpression[left.property.name='innerHTML']", message: 'Build DOM with Lit templates, not innerHTML.' },
    { selector: "CallExpression[callee.object.name='document'][callee.property.name='write']", message: 'document.write is not allowed.' },
  ],
  'no-eval': 'error',
  'no-implied-eval': 'error',
  'no-new-func': 'error',
};

export default tseslint.config(
  { ignores: ['**/dist/**', '**/node_modules/**', '**/.astro/**', 'test-results/**', 'playwright-report/**', 'packages/vastu/custom-elements.json', 'tests/eval/results/**', 'packages/*/data/**'] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    languageOptions: { globals: { ...globals.browser, ...globals.node } },
    rules: { '@typescript-eslint/no-explicit-any': 'off' },
  },
  {
    files: ['packages/vastu/src/**/*.ts'],
    plugins: { lit },
    rules: { ...lit.configs.recommended.rules, ...noRawHtml, '@typescript-eslint/no-explicit-any': 'error' },
  },
);
