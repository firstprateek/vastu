// vastu-lint: checks HTML that uses Vastu components against the component manifest.
// Every problem says what is wrong and the exact fix, so people and agents can act on it directly.
import fs from 'node:fs';
import { parseDocument } from 'htmlparser2';
import { is, selectAll } from 'css-select';
import { getText } from 'domutils';

const DATA = new URL('../data/', import.meta.url);
const read = (file) => JSON.parse(fs.readFileSync(new URL(file, DATA), 'utf8'));

/** The rules, with what each checks. */
export const rules = {
  'unknown-element': { severity: 'error', description: 'A <va-…> element that Vastu does not have.' },
  'unknown-attribute': { severity: 'error', description: 'An attribute that the component does not support.' },
  'invalid-value': { severity: 'error', description: 'An attribute value of the wrong type or outside the allowed values, including boolean attributes set to "false".' },
  'missing-name': { severity: 'error', description: 'A component with no accessible name (no text, label or heading where one is needed).' },
  'unknown-slot': { severity: 'error', description: 'A child with a slot="…" the component does not have.' },
  'command-target': { severity: 'error', description: 'A commandfor that matches no id, or a command the target does not accept.' },
  'tabs-structure': { severity: 'error', description: 'va-tabs whose tab and panel counts differ.' },
  'unknown-token': { severity: 'error', description: 'A var(--va-…) that is not a Vastu token or component property.' },
  'native-instead': { severity: 'warning', description: 'A native element where a Vastu component exists.' },
  'raw-color': { severity: 'warning', description: 'A hard-coded colour where a token would follow the brand and mode.' },
  'strict-csp': { severity: 'warning', description: 'An inline style, inline script or on…= handler, which a strict Content Security Policy blocks.' },
  'role-on-component': { severity: 'warning', description: 'A role attribute on a component, which sets its own role.' },
};

// Attributes any element may carry.
const GLOBAL_ATTRS = new Set(['id', 'class', 'slot', 'hidden', 'title', 'lang', 'dir', 'tabindex', 'autofocus', 'inert', 'part', 'exportparts', 'translate', 'style']);

function loadManifest(manifest) {
  const components = new Map();
  for (const mod of manifest.modules) {
    for (const d of mod.declarations ?? []) if (d.customElement && d.tagName) components.set(d.tagName, d);
  }
  return components;
}

function distance(a, b) {
  const dp = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)]);
  for (let j = 1; j <= b.length; j++) dp[0][j] = j;
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    }
  }
  return dp[a.length][b.length];
}

function closest(name, options) {
  let best;
  let bestScore = Infinity;
  for (const o of options) {
    const d = distance(name, o);
    if (d < bestScore) [best, bestScore] = [o, d];
  }
  return bestScore <= Math.max(2, Math.floor(name.length / 3)) ? best : undefined;
}

function literals(typeText = '') {
  const values = [...typeText.matchAll(/'([^']*)'/g)].map((m) => m[1]);
  return values.length && typeText.replace(/'[^']*'|\|/g, '').trim() === '' ? values : null;
}

/**
 * Lints an HTML string. Returns every problem with its rule, severity, message, fix and position.
 * @param {string} html
 * @param {{ manifest?: object, tokens?: object }} [options]
 */
export function lint(html, options = {}) {
  const components = loadManifest(options.manifest ?? read('custom-elements.json'));
  const tokenVars = new Set(Object.values(options.tokens ?? read('tokens.json')).map((t) => t.cssVar));
  for (const c of components.values()) for (const p of c.cssProperties ?? []) tokenVars.add(p.name);

  const doc = parseDocument(html, { withStartIndices: true, withEndIndices: true, lowerCaseAttributeNames: false });
  const lineStarts = [0];
  for (let i = 0; i < html.length; i++) if (html[i] === '\n') lineStarts.push(i + 1);
  const position = (index = 0) => {
    let line = 0;
    while (line + 1 < lineStarts.length && lineStarts[line + 1] <= index) line++;
    return { line: line + 1, column: index - lineStarts[line] + 1 };
  };

  const problems = [];
  const report = (rule, node, message, fix) => {
    const start = node?.startIndex ?? 0;
    const snippet = html.slice(start, Math.min(node?.endIndex ?? start, start + 120) + 1).split('\n')[0];
    problems.push({ rule, severity: rules[rule].severity, message, fix, ...position(start), snippet });
  };

  const all = selectAll('*', doc);
  const ids = new Map(all.filter((el) => el.attribs.id).map((el) => [el.attribs.id, el]));

  for (const el of all) {
    const tag = el.name;
    const attrs = el.attribs;

    // Inline styles, scripts and handlers, which a strict CSP blocks.
    if ('style' in attrs) {
      report('strict-csp', el, `<${tag}> has an inline style="…", which a strict Content Security Policy blocks.`, 'Move the styles into a stylesheet and use a class.');
    }
    for (const name of Object.keys(attrs)) {
      if (/^on[a-z]+$/i.test(name)) {
        report('strict-csp', el, `<${tag}> has an inline ${name}="…" handler, which a strict Content Security Policy blocks.`, `Add the listener in a script file with addEventListener('${name.slice(2)}', …), or use commandfor/command on a va-button.`);
      }
    }
    if (tag === 'script' && !attrs.src && getText(el).trim()) {
      report('strict-csp', el, 'An inline <script> is blocked by a strict Content Security Policy.', 'Move the code into a file and load it with <script type="module" src="…">.');
    }
    if (tag === 'style') {
      report('strict-csp', el, 'An inline <style> element is blocked by a strict Content Security Policy.', 'Move the rules into a stylesheet loaded with <link rel="stylesheet">.');
    }

    // Colours and tokens, in style attributes and <style> elements.
    const css = tag === 'style' ? getText(el) : attrs.style;
    if (css) {
      for (const m of css.matchAll(/var\(\s*(--va-[\w-]+)/g)) {
        if (!tokenVars.has(m[1])) {
          const guess = closest(m[1], tokenVars);
          report('unknown-token', el, `${m[1]} is not a Vastu token or component property, so it has no value.`, guess ? `Did you mean ${guess}?` : 'Use a token from the token list (get_tokens in vastu-mcp, or the docs).');
        }
      }
      const colour = css.match(/#[0-9a-f]{3,8}\b|\b(?:rgb|rgba|hsl|hsla|oklch|lab)\(/i);
      if (colour) {
        report('raw-color', el, `A hard-coded colour (${colour[0]}) won't follow the brand or the dark and high-contrast modes.`, 'Use a token, such as var(--va-color-text-default), var(--va-color-surface-subtle) or var(--va-color-accent-default).');
      }
    }

    // Native elements where a Vastu component exists. Skipped when the element is the content a
    // component's slot asks for, such as <button slot="tab"> inside va-tabs.
    for (const c of components.values()) {
      if (!c['x-replaces'] || !is(el, c['x-replaces'])) continue;
      const parent = el.parent;
      const parentComponent = parent?.name && components.get(parent.name);
      if (parentComponent) {
        const slot = (parentComponent.slots ?? []).find((s) => (s.name || '') === (attrs.slot || ''));
        if (slot?.description?.includes(`<${tag}`)) continue;
      }
      report('native-instead', el, `<${tag}> is used where Vastu has <${c.tagName}>.`, `Use <${c.tagName}>: ${c.summary}`);
    }

    if (!tag.startsWith('va-')) continue;
    const c = components.get(tag);
    if (!c) {
      const guess = closest(tag, components.keys());
      report('unknown-element', el, `<${tag}> is not a Vastu component.`, guess ? `Did you mean <${guess}>? Components: ${[...components.keys()].join(', ')}.` : `Components: ${[...components.keys()].join(', ')}.`);
      continue;
    }

    const attrDefs = new Map((c.attributes ?? []).map((a) => [a.name, a]));
    for (const [name, value] of Object.entries(attrs)) {
      if (GLOBAL_ATTRS.has(name) || name.startsWith('aria-') || name.startsWith('data-')) continue;
      if (name === 'role') {
        report('role-on-component', el, `<${tag}> sets its own role (${c['x-a11y']?.role}); role="${value}" overrides it.`, 'Remove the role attribute.');
        continue;
      }
      if (/^on[a-z]+$/i.test(name)) continue;
      const def = attrDefs.get(name);
      if (!def) {
        const guess = closest(name, attrDefs.keys());
        report('unknown-attribute', el, `<${tag}> has no ${name} attribute, so it is ignored.`, guess ? `Did you mean ${guess}? Attributes: ${[...attrDefs.keys()].join(', ')}.` : `Attributes: ${[...attrDefs.keys()].join(', ')}.`);
        continue;
      }
      const type = def.type?.text ?? '';
      const allowed = literals(type);
      if (type === 'boolean' && /^(false|0|no|off)$/i.test(value)) {
        report('invalid-value', el, `${name}="${value}" still turns ${name} on: a boolean attribute is on whenever it is present.`, `Remove the ${name} attribute to turn it off.`);
      } else if (type === 'number' && (value === '' || Number.isNaN(Number(value)))) {
        report('invalid-value', el, `${name}="${value}" is not a number.`, `Set ${name} to a number, such as ${name}="${def.default ?? 0}".`);
      } else if (allowed && !allowed.includes(value)) {
        report('invalid-value', el, `${name}="${value}" is not one of ${allowed.map((v) => `"${v}"`).join(', ')}.`, `Use ${name}="${closest(value, allowed) ?? allowed[0]}"${closest(value, allowed) ? '' : ` (the default is ${def.default ?? `"${allowed[0]}"`})`}.`);
      }
    }

    // Accessible name.
    const nameFrom = c['x-a11y']?.nameFrom;
    if (nameFrom?.length) {
      const named = nameFrom.some((source) =>
        source === 'text'
          ? el.children.some((n) => (n.type === 'text' ? n.data.trim() : n.type === 'tag' && !n.attribs.slot && getText(n).trim()))
          : !!attrs[source]?.trim()
      );
      if (!named) {
        const ways = nameFrom.map((s) => (s === 'text' ? 'text inside it' : `${s}="…"`)).join(' or ');
        report('missing-name', el, `<${tag}> has no accessible name, so screen readers can't say what it is.`, `Add ${ways}. ${c['x-a11y'].name}`);
      }
    }

    // Slots.
    const slotNames = new Set((c.slots ?? []).map((s) => s.name));
    for (const child of el.children.filter((n) => n.type === 'tag')) {
      const slot = child.attribs.slot;
      if (slot && !slotNames.has(slot)) {
        report('unknown-slot', child, `<${tag}> has no "${slot}" slot, so this content is not shown.`, slotNames.size ? `Slots: ${[...slotNames].map((s) => (s ? `"${s}"` : 'default (no slot attribute)')).join(', ')}.` : `<${tag}> takes no content.`);
      }
    }

    // Commands sent by va-button (or a native button) to this element are checked from the sender below.
    if (tag === 'va-tabs') {
      const tabs = el.children.filter((n) => n.type === 'tag' && n.attribs.slot === 'tab').length;
      const panels = el.children.filter((n) => n.type === 'tag' && n.attribs.slot === 'panel').length;
      if (tabs !== panels) {
        report('tabs-structure', el, `<va-tabs> has ${tabs} tabs but ${panels} panels.`, 'Give every <button slot="tab"> a matching <div slot="panel">, in the same order.');
      }
    }
  }

  // commandfor / command pairs, on va-button and native buttons.
  for (const el of all.filter((e) => e.attribs.commandfor !== undefined)) {
    const target = ids.get(el.attribs.commandfor);
    if (!target) {
      report('command-target', el, `commandfor="${el.attribs.commandfor}" matches no element id, so the button does nothing.`, `Set commandfor to the id of the element to control${ids.size ? `, such as one of: ${[...ids.keys()].slice(0, 6).join(', ')}` : ''}.`);
      continue;
    }
    const accepted = components.get(target.name)?.['x-commands'];
    const cmd = accepted?.find((c) => c.name === el.attribs.command);
    if (accepted && !cmd) {
      report('command-target', el, `<${target.name}> doesn't accept command="${el.attribs.command ?? ''}".`, `Use one of: ${accepted.map((c) => `command="${c.name}" (${c.description})`).join('; ')}.`);
    }
    for (const data of cmd?.data ?? []) {
      const value = el.attribs[data.name];
      if (value !== undefined && !data.values.includes(value)) {
        report('command-target', el, `${data.name}="${value}" is not one of ${data.values.map((v) => `"${v}"`).join(', ')}, so <${target.name}> ignores it.`, `Use ${data.name}="${data.values.find((v) => v.startsWith(value[0])) ?? data.values[0]}".`);
      }
    }
  }

  problems.sort((a, b) => a.line - b.line || a.column - b.column);
  return {
    problems,
    errorCount: problems.filter((p) => p.severity === 'error').length,
    warningCount: problems.filter((p) => p.severity === 'warning').length,
  };
}

/** Formats problems as human-readable lines: file:line:col severity rule message, then the fix. */
export function format(problems, file = '<input>') {
  return problems
    .map((p) => `${file}:${p.line}:${p.column}  ${p.severity}  ${p.rule}  ${p.message}\n    fix: ${p.fix}`)
    .join('\n');
}
