// vastu-mcp: an MCP server that gives agents what they need to build with Vastu.
// Everything it answers comes from the component manifest and the token files, the same
// sources the docs and the contract tests use, so it can't drift from the components.
import fs from 'node:fs';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { lint, rules } from '@firstprateek/vastu-lint';

const DATA = new URL('../data/', import.meta.url);
const read = (file) => JSON.parse(fs.readFileSync(new URL(file, DATA), 'utf8'));

const manifest = read('custom-elements.json');
const catalogue = read('tokens.json');
const brands = Object.fromEntries(
  fs.readdirSync(DATA).filter((f) => f.endsWith('.json') && !['tokens.json', 'custom-elements.json'].includes(f)).map((f) => [f.replace('.json', ''), read(f)])
);
export const components = manifest.modules.flatMap((m) => m.declarations ?? []).filter((d) => d.customElement && d.tagName);

const slug = (tag) => tag.replace(/^va-/, '');
const importLine = (tag) => `import '@firstprateek/vastu/${slug(tag)}';`;

export const SETUP = {
  install: 'npm install @firstprateek/vastu @firstprateek/vastu-tokens',
  tokens: "Load one brand stylesheet once per page: import '@firstprateek/vastu-tokens/vastu.css' (or lekha.css), or <link rel=\"stylesheet\">.",
  components: "Import each component you use once, e.g. import '@firstprateek/vastu/button'; or import '@firstprateek/vastu/all' for every component.",
  modes: 'Set data-va-mode="light|dark|high-contrast" on <html> (or any element) to choose a mode; without it the mode follows the user\'s system.',
  rules: [
    'Give every component an accessible name: its text, or label (text fields, menus) or heading (dialogs). Use accessible-label only where nothing visible names it, such as an icon-only button.',
    'Use commandfor/command on va-button to open dialogs and show toasts; no inline scripts or styles (strict CSP).',
    'Style with tokens (var(--va-…)) and component properties, never hard-coded colours.',
    'Run validate_markup on your HTML and fix every problem before finishing.',
  ],
};

/** A compact, complete description of one component, for an agent. */
export function describeComponent(c) {
  return {
    tag: c.tagName,
    import: importLine(c.tagName),
    summary: c.summary,
    whenToUse: c['x-guidance']?.use,
    whenNotToUse: c['x-guidance']?.avoid,
    useInstead: c['x-guidance']?.instead,
    accessibleName: c['x-a11y']?.name,
    accessibility: c['x-a11y']?.notes ?? [],
    attributes: (c.attributes ?? []).map((a) => ({ name: a.name, property: a.fieldName, type: a.type?.text, default: a.default, description: a.description })),
    methods: (c.members ?? []).filter((m) => m.kind === 'method' && m.description).map((m) => ({ name: m.name, description: m.description })),
    events: (c.events ?? []).map((e) => ({ name: e.name, description: e.description })),
    commands: c['x-commands'] ?? [],
    slots: (c.slots ?? []).map((s) => ({ name: s.name || '(default)', description: s.description })),
    cssProperties: (c.cssProperties ?? []).map((p) => ({ name: p.name, type: p.syntax ?? p.type?.text, description: p.description })),
    parts: (c.cssParts ?? []).map((p) => ({ name: p.name, description: p.description })),
    keyboard: (c['x-keyboard'] ?? []).map((k) => ({ key: k.key, does: k.description })),
    examples: (c['x-examples'] ?? []).map((e) => ({ title: e.title, description: e.description, html: e.code })),
  };
}

// Words people use for each component that its own text may not contain.
const SYNONYMS = {
  'va-button': ['button', 'submit', 'action', 'click', 'save', 'cta'],
  'va-checkbox': ['checkbox', 'check', 'tick', 'agree', 'terms', 'consent', 'select', 'multiple', 'opt'],
  'va-switch': ['switch', 'toggle', 'on', 'off', 'setting', 'preference', 'enable', 'disable', 'dark'],
  'va-text-field': ['input', 'field', 'textbox', 'text', 'type', 'email', 'name', 'password', 'search', 'phone', 'url', 'form'],
  'va-tabs': ['tabs', 'tab', 'sections', 'views', 'panels', 'switch between'],
  'va-dialog': ['dialog', 'modal', 'popup', 'confirm', 'confirmation', 'are you sure', 'overlay', 'prompt'],
  'va-menu': ['menu', 'dropdown', 'actions', 'overflow', 'kebab', 'more', 'options', 'context'],
  'va-toast': ['toast', 'notification', 'snackbar', 'message', 'status', 'saved', 'copied', 'feedback', 'alert'],
};
const words = (text = '') => text.toLowerCase().match(/[a-z]+/g) ?? [];
const STOP = new Set(['a', 'an', 'the', 'to', 'for', 'of', 'or', 'and', 'in', 'on', 'with', 'that', 'is', 'it', 'i', 'want', 'need', 'some', 'user', 'users', 'let', 'lets', 'can', 'my', 'page']);

/** Ranks components for an intent, with the reason for each match. Deterministic: no model involved. */
export function findComponent(intent) {
  const terms = words(intent).filter((w) => !STOP.has(w));
  const phrase = intent.toLowerCase();
  return components
    .map((c) => {
      const synonyms = SYNONYMS[c.tagName] ?? [];
      const own = new Set([...words(c.summary), ...words(c['x-guidance']?.use), ...words(c.description)]);
      const matched = new Set();
      let score = 0;
      const hit = (term, weight) => {
        score += weight;
        matched.add(term);
      };
      for (const t of terms) {
        if (synonyms.includes(t)) hit(t, 3);
        else if (own.has(t)) hit(t, 1);
      }
      for (const s of synonyms) if (s.includes(' ') && phrase.includes(s)) hit(s, 3);
      return { c, score, matched: [...matched] };
    })
    .filter((r) => r.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 3)
    .map(({ c, score, matched }) => ({
      tag: c.tagName,
      score,
      why: `Matches ${matched.map((m) => `"${m}"`).join(', ')}. ${c.summary}`,
      whenToUse: c['x-guidance']?.use,
      whenNotToUse: c['x-guidance']?.avoid,
      useInstead: c['x-guidance']?.instead,
      next: `Call get_component with "${c.tagName}" for its full API and examples.`,
    }));
}

/** System tokens with their values in one brand and mode. */
export function getTokens({ brand = 'vastu', mode = 'light', category } = {}) {
  const values = brands[brand]?.modes?.[mode];
  if (!values) throw new Error(`Unknown brand or mode. Brands: ${Object.keys(brands).join(', ')}. Modes: light, dark, high-contrast.`);
  return Object.entries(catalogue)
    .filter(([path]) => !category || path.startsWith(category))
    .map(([path, t]) => ({ token: t.cssVar, use: `var(${t.cssVar})`, value: values[path], type: t.type, description: t.description || undefined }));
}

const text = (value) => ({ content: [{ type: 'text', text: typeof value === 'string' ? value : JSON.stringify(value, null, 2) }] });

/** Creates the MCP server with Vastu's tools. Connect it to a transport (stdio in bin/vastu-mcp.js). */
export function createServer() {
  const server = new McpServer({ name: 'vastu', version: '0.0.0' });

  server.registerTool(
    'list_components',
    {
      title: 'List Vastu components',
      description: 'Lists every Vastu web component with its purpose, plus how to install and set up Vastu on a page. Start here.',
      inputSchema: {},
    },
    async () => text({ setup: SETUP, components: components.map((c) => ({ tag: c.tagName, summary: c.summary, import: importLine(c.tagName) })) })
  );

  server.registerTool(
    'find_component',
    {
      title: 'Find the right component',
      description: 'Given what the UI needs to do, in plain words (e.g. "a yes/no setting", "confirm before deleting"), returns the best-matching components, why, and when not to use them.',
      inputSchema: { intent: z.string().describe('What the UI element needs to do, in plain words.') },
    },
    async ({ intent }) => {
      const results = findComponent(intent);
      return text(results.length ? results : { results: [], hint: `No match. Components: ${components.map((c) => c.tagName).join(', ')}. Call list_components for summaries.` });
    }
  );

  server.registerTool(
    'get_component',
    {
      title: 'Get a component’s API',
      description: 'Returns one component’s full API: attributes with allowed values and defaults, events, commands, slots, CSS custom properties, parts, keyboard behaviour, accessibility requirements, usage guidance and correct examples.',
      inputSchema: { tag: z.string().describe('The element name, e.g. "va-dialog". "dialog" also works.') },
    },
    async ({ tag }) => {
      const name = tag.startsWith('va-') ? tag : `va-${tag}`;
      const c = components.find((d) => d.tagName === name);
      if (!c) return { ...text(`No component "${tag}". Components: ${components.map((d) => d.tagName).join(', ')}.`), isError: true };
      return text(describeComponent(c));
    }
  );

  server.registerTool(
    'get_tokens',
    {
      title: 'Get design tokens',
      description: 'Returns Vastu’s design tokens (CSS custom properties) with their values in a brand and mode. Use these in your CSS instead of hard-coded colours, sizes or fonts.',
      inputSchema: {
        brand: z.enum(['vastu', 'lekha']).optional().describe('Default: vastu.'),
        mode: z.enum(['light', 'dark', 'high-contrast']).optional().describe('Default: light.'),
        category: z.string().optional().describe('Filter by prefix, e.g. "color", "space", "font", "radius".'),
      },
    },
    async (args) => {
      try {
        return text(getTokens(args));
      } catch (error) {
        return { ...text(error.message), isError: true };
      }
    }
  );

  server.registerTool(
    'validate_markup',
    {
      title: 'Validate HTML that uses Vastu',
      description: `Checks HTML against the component manifest and returns every problem with its line, column and exact fix. Rules: ${Object.keys(rules).join(', ')}. Fix every error, then validate again until it reports none.`,
      inputSchema: { html: z.string().describe('The HTML to check: a whole page or a fragment.') },
    },
    async ({ html }) => {
      const result = lint(html);
      return text(result.problems.length ? result : { problems: [], summary: 'No problems found.' });
    }
  );

  return server;
}
