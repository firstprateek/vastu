// vastu-lint: one passing and one failing case per rule, and every documented example must be clean.
import { describe, expect, test } from 'vitest';
import fs from 'node:fs';
import { lint, rules } from '../src/index.js';

const rulesHit = (html) => lint(html).problems.map((p) => p.rule);

describe('rules', () => {
  const cases = {
    'unknown-element': ['<va-buton>Save</va-buton>', '<va-button>Save</va-button>'],
    'unknown-attribute': ['<va-button colour="red">Save</va-button>', '<va-button variant="secondary">Save</va-button>'],
    'invalid-value': ['<va-button variant="primery">Save</va-button>', '<va-button variant="danger">Delete</va-button>'],
    'missing-name': ['<va-text-field placeholder="Email"></va-text-field>', '<va-text-field label="Email"></va-text-field>'],
    'unknown-slot': ['<va-dialog heading="Hi"><va-button slot="actions">OK</va-button></va-dialog>', '<va-dialog heading="Hi"><va-button slot="footer">OK</va-button></va-dialog>'],
    'command-target': ['<va-button commandfor="d" command="--open">Open</va-button><va-dialog id="d" heading="Hi"></va-dialog>', '<va-button commandfor="d" command="--show">Open</va-button><va-dialog id="d" heading="Hi"></va-dialog>'],
    'tabs-structure': ['<va-tabs label="T"><button slot="tab">A</button><div slot="panel">a</div><button slot="tab">B</button></va-tabs>', '<va-tabs label="T"><button slot="tab">A</button><div slot="panel">a</div></va-tabs>'],
    'unknown-token': ['<link rel="stylesheet" href="x.css"><style>p { color: var(--va-color-txt) }</style>', '<style>p { color: var(--va-color-text-muted) }</style>'],
    'native-instead': ['<button>Save</button>', '<va-menu label="Actions"><button value="save">Save</button></va-menu>'],
    'raw-color': ['<style>p { color: #333 }</style>', '<style>p { color: var(--va-color-text-default) }</style>'],
    'strict-csp': ['<div onclick="go()">x</div>', '<div class="note">x</div>'],
    'role-on-component': ['<va-button role="link">Go</va-button>', '<va-button>Go</va-button>'],
  };

  test('every rule has a case', () => {
    expect(Object.keys(cases).sort()).toEqual(Object.keys(rules).sort());
  });

  for (const [rule, [bad, good]] of Object.entries(cases)) {
    test(`${rule}: reports the bad case, with a fix`, () => {
      const hit = lint(bad).problems.find((p) => p.rule === rule);
      expect(hit, `expected ${rule} for ${bad}`).toBeTruthy();
      expect(hit.fix.length).toBeGreaterThan(10);
    });
    test(`${rule}: accepts the good case`, () => {
      expect(rulesHit(good)).not.toContain(rule);
    });
  }
});

test('a boolean attribute set to "false" is caught, with the fix to remove it', () => {
  const [p] = lint('<va-button disabled="false">Save</va-button>').problems;
  expect(p).toMatchObject({ rule: 'invalid-value', fix: 'Remove the disabled attribute to turn it off.' });
});

test('suggestions name the closest valid choice', () => {
  expect(lint('<va-button variant="secondery">x</va-button>').problems[0].fix).toBe('Use variant="secondary".');
  expect(lint('<va-swich>x</va-swich>').problems[0].fix).toMatch(/^Did you mean <va-switch>\?/);
});

test('positions are 1-based line and column', () => {
  const [p] = lint('<p>ok</p>\n  <va-buton>x</va-buton>').problems;
  expect(p).toMatchObject({ line: 2, column: 3 });
});

test('every documented example is lint-clean', () => {
  const manifest = JSON.parse(fs.readFileSync(new URL('../data/custom-elements.json', import.meta.url), 'utf8'));
  const examples = manifest.modules.flatMap((m) => m.declarations ?? []).flatMap((d) => d['x-examples'] ?? []);
  expect(examples.length).toBeGreaterThan(10);
  for (const ex of examples) {
    const { problems } = lint(ex.code);
    expect(problems, `${ex.path}:\n${problems.map((p) => `${p.rule}: ${p.message}`).join('\n')}`).toEqual([]);
  }
});
