# Vastu

[![CI](https://github.com/firstprateek/vastu/actions/workflows/ci.yml/badge.svg)](https://github.com/firstprateek/vastu/actions/workflows/ci.yml)

A small design system of web components, built with [Lit](https://lit.dev/), designed so that AI agents can use it and check their own work.

Every promise a component makes is written once, in a machine-readable manifest: its API, keyboard behaviour, theming hooks, accessibility notes and usage guidance. Docs, agent tools and tests are all generated from that one description, and the tests fail if the code stops matching it.

**[Docs and live examples](https://firstprateek.github.io/vastu/)** · **[Design document](docs/design.md)**

> **1.0.** Eight components (button, checkbox, switch, text field, tabs, dialog, menu, toast) in two brands, plus the agent layer: a markup validator, an MCP server, `llms.txt`, and an eval in which Claude Code builds pages with Vastu.
>
> ```bash
> npm install @firstprateek/vastu @firstprateek/vastu-tokens
> ```
>
> **[What the agent eval found](tests/eval/FINDINGS.md)**: three defects and a docs gap, which 1,000+ component tests had missed.

## What runs on every change

| Check | What it proves |
| --- | --- |
| Contract tests, generated from `custom-elements.json` | Every documented attribute, property, event, slot, part, CSS custom property and keyboard row works, and there is no undocumented public API |
| Behaviour tests | Forms and validation, focus management, roles and names, the warnings agents see |
| axe-core, WCAG 2.2 AA | Every example, in both brands (Vastu, Lekha) and all three modes |
| Strict CSP with Trusted Types | Every browser test runs under it; any violation fails the test |
| Visual regression | Every example × brand × mode × 390 and 1280 px widths |
| Token contrast | Every text and UI colour pair meets its WCAG minimum in both brands and every mode |
| Size budgets | Each component is 1.3 to 2.1 kB on top of Lit (budget 3 kB); all eight with Lit are 14.3 kB (budget 16 kB) |
| ESLint security rules | No `innerHTML`, `unsafeHTML`, `unsafeStatic` or `eval` in components |

Browser tests run in Chromium, Firefox and WebKit.

## Repository

```
packages/tokens   @firstprateek/vastu-tokens: DTCG tokens → CSS, JSON, TS (brands "vastu" and "lekha", 3 modes each)
packages/vastu    @firstprateek/vastu: components, manifest plugin, dev and prod builds
packages/lint     @firstprateek/vastu-lint: markup validator (library and CLI)
packages/mcp      @firstprateek/vastu-mcp: MCP server for agents
apps/docs         Astro docs site, generated from the manifest
tests/            harness (strict CSP), contract, behaviour, a11y, security, visual
tests/eval        the agent eval: tasks, runner, results
```

## For agents

- [`llms.txt`](https://firstprateek.github.io/vastu/llms.txt) and [`llms-full.txt`](https://firstprateek.github.io/vastu/llms-full.txt): setup rules, every component and every token
- MCP server: `claude mcp add vastu -- npx -y @firstprateek/vastu-mcp`, with `list_components`, `find_component`, `get_component`, `get_tokens` and `validate_markup`
- Validator: `npx @firstprateek/vastu-lint page.html`

## Development

```bash
pnpm install
pnpm build          # tokens, components, manifest
pnpm check          # build, lint, types, token contrast, browser tests, size
pnpm --filter vastu-docs dev
```

Visual baselines come only from CI's Linux Playwright image, so they match pixel for pixel. After an intended visual change, run the **Update visual baselines** workflow; it commits the new baselines.

## License

ISC
