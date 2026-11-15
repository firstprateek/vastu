// Generates llms.txt (an index) and llms-full.txt (everything) from the manifest.
// See https://llmstxt.org. Agents get the same facts as the docs and the MCP server.
import { components, slug } from './manifest';
import vastu from '@firstprateek/vastu-tokens/vastu.json';
import catalogue from '@firstprateek/vastu-tokens/tokens.json';

const SITE = 'https://firstprateek.github.io/vastu';

const setup = `## Setup

\`\`\`sh
npm install @firstprateek/vastu @firstprateek/vastu-tokens
\`\`\`

\`\`\`js
import '@firstprateek/vastu-tokens/vastu.css'; // one brand stylesheet per page (or lekha.css)
import '@firstprateek/vastu/all';              // or one component: '@firstprateek/vastu/button'
\`\`\`

Rules that keep pages correct:

- Give every component an accessible name: text, \`label\` or \`heading\`, as each component says.
- Open dialogs and show toasts with \`commandfor\`/\`command\` on a \`va-button\`. Don't use inline scripts, styles or \`on…=\` handlers: Vastu pages run under a strict Content Security Policy.
- Style with tokens (\`var(--va-…)\`) and component custom properties, never hard-coded colours.
- Set \`data-va-mode="light|dark|high-contrast"\` on \`<html>\` to choose a mode; without it the mode follows the system.
- Check your HTML with \`npx @firstprateek/vastu-lint page.html\`, or the \`validate_markup\` tool of the MCP server (\`npx @firstprateek/vastu-mcp\`), and fix every problem.
`;

// Every system token with its value in the default brand's light mode, so agents never have to guess names.
function tokensSection(): string {
  const light = (vastu as any).modes.light as Record<string, string>;
  const rows = Object.entries(catalogue as Record<string, any>).map(
    ([path, t]) => `| \`var(${t.cssVar})\` | ${light[path] ?? ''} | ${t.description || path.replace(/\./g, ' ')} |`
  );
  return `## Design tokens

Use only these names in your CSS; any other \`--va-…\` name has no value. Values are the vastu brand's light mode; brands and modes change the values, never the names.

| Token | Light value | Use |
| --- | --- | --- |
${rows.join('\n')}
`;
}

export function llmsIndex(): string {
  return `# Vastu

> A small design system of accessible, themeable web components built with Lit. Every component is described in a machine-readable manifest that also drives its docs and tests.

${setup}
## Components

${components.map((c) => `- [${c.tagName}](${SITE}/components/${slug(c.tagName)}/): ${c.summary}`).join('\n')}

## Optional

- [Everything in one file](${SITE}/llms-full.txt): every component's API, guidance and examples, and every design token.
- [Component manifest (JSON)](https://github.com/firstprateek/vastu/blob/main/packages/vastu/custom-elements.json)
`;
}

const table = (head: string[], rows: string[][]) =>
  rows.length ? `| ${head.join(' | ')} |\n| ${head.map(() => '---').join(' | ')} |\n${rows.map((r) => `| ${r.map((x) => (x ?? '').replace(/\|/g, '\\|').replace(/\n/g, ' ')).join(' | ')} |`).join('\n')}\n` : '';

export function llmsFull(): string {
  const sections = components.map((c) => {
    const g = c['x-guidance'] ?? {};
    const a11y = c['x-a11y'] ?? {};
    return `## <${c.tagName}>

${c.summary}

\`import '@firstprateek/vastu/${slug(c.tagName)}';\`

- Use it: ${g.use}
- Don't use it: ${g.avoid}${g.instead ? `\n- Use instead: ${g.instead}` : ''}
- Accessible name: ${a11y.name}
${(a11y.notes ?? []).map((n: string) => `- ${n}`).join('\n')}

### Attributes

${table(['Attribute', 'Type', 'Default', 'Description'], (c.attributes ?? []).map((a: any) => [`\`${a.name}\``, `\`${a.type?.text}\``, a.default ? `\`${a.default}\`` : '', a.description]))}
${c.events?.length ? `### Events\n\n${table(['Event', 'Description'], c.events.map((e: any) => [`\`${e.name}\``, e.description]))}` : ''}
${c['x-commands']?.length ? `### Commands (send with commandfor/command)\n\n${table(['Command', 'Description'], c['x-commands'].map((x: any) => [`\`${x.name}\``, x.description]))}` : ''}
${(c.members ?? []).some((m: any) => m.kind === 'method' && m.description) ? `### Methods\n\n${table(['Method', 'Description'], c.members.filter((m: any) => m.kind === 'method' && m.description).map((m: any) => [`\`${m.name}()\``, m.description]))}` : ''}
${c.slots?.length ? `### Slots\n\n${table(['Slot', 'Description'], c.slots.map((s: any) => [s.name ? `\`${s.name}\`` : '(default)', s.description]))}` : ''}
### Styling

${table(['Custom property', 'Type', 'Description'], (c.cssProperties ?? []).map((p: any) => [`\`${p.name}\``, p.syntax ?? p.type?.text, p.description]))}
${table(['Part', 'Description'], (c.cssParts ?? []).map((p: any) => [`\`::part(${p.name})\``, p.description]))}
### Keyboard

${table(['Key', 'Does'], (c['x-keyboard'] ?? []).map((k: any) => [k.key, k.description]))}
### Examples

${(c['x-examples'] ?? []).map((e: any) => `#### ${e.title}\n\n${e.description}\n\n\`\`\`html\n${e.code}\n\`\`\``).join('\n\n')}
`.replace(/\n{3,}/g, '\n\n');
  });
  return `# Vastu: full reference

> Every Vastu component's API, accessibility requirements, usage guidance and examples, generated from the component manifest.

${setup}
${tokensSection()}
${sections.join('\n')}`;
}
