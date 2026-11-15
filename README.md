# Vastu

[![CI](https://github.com/firstprateek/vastu/actions/workflows/ci.yml/badge.svg)](https://github.com/firstprateek/vastu/actions/workflows/ci.yml)

A small design system of web components, built with [Lit](https://lit.dev/), designed so that AI agents can use it and check their own work.

Every promise a component makes is written once, in a machine-readable manifest: its API, keyboard behaviour, theming hooks, accessibility notes and usage guidance. Docs, agent tools and tests are all generated from that one description, and the tests fail if the code stops matching it.

**[Docs and live examples](https://firstprateek.github.io/vastu/)** · **[Design document](docs/design.md)**

> Status: milestone M1. Eight components: button, checkbox, switch, text field, tabs, dialog, menu and toast. Not on npm yet.

## What runs on every change

| Check | What it proves |
| --- | --- |
| Contract tests, generated from `custom-elements.json` | Every documented attribute, property, event, slot, part, CSS custom property and keyboard row works, and there is no undocumented public API |
| Behaviour tests | Forms and validation, focus management, roles and names, the warnings agents see |
| axe-core, WCAG 2.2 AA | Every example, in light, dark and high-contrast modes |
| Strict CSP with Trusted Types | Every browser test runs under it; any violation fails the test |
| Visual regression | Every example × mode × 390 and 1280 px widths |
| Token contrast | Every text and UI colour pair meets its WCAG minimum in every brand and mode |
| Size budgets | Each component is 1.2 to 2.1 kB on top of Lit (budget 3 kB); all eight with Lit are 13.5 kB (budget 16 kB) |
| ESLint security rules | No `innerHTML`, `unsafeHTML`, `unsafeStatic` or `eval` in components |

Browser tests run in Chromium, Firefox and WebKit.

## Repository

```
packages/tokens   @firstprateek/vastu-tokens: DTCG tokens → CSS, JSON, TS (brand "lekha", 3 modes)
packages/vastu    @firstprateek/vastu: components, manifest plugin, dev and prod builds
apps/docs         Astro docs site, generated from the manifest
tests/            harness (strict CSP), contract, behaviour, a11y, security, visual
```

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
