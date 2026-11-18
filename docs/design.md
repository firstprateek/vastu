# Vastu: a design system that agents can use and test

Design document, draft of 2026-11-15. Build from this once it is agreed.

## 1. What it is

Vastu is a small design system of web components built with [Lit](https://lit.dev/). The name comes from Vastu Shastra, the ancient Indian science of space, layout and proportion.

It has one difference from the many design systems that already exist. **Every promise it makes is machine-readable and machine-checked.** The API, the keyboard behaviour, the theming hooks, the accessibility notes and the usage guidance all live in one manifest. That manifest feeds three readers:

- **Docs** for people.
- **Tools** for agents: an MCP server, `llms.txt` and a markup validator.
- **Tests** that fail when the code stops doing what the manifest says.

An agent asked to build a page with Vastu can find the right component, use it correctly and check its own work. An eval measures how well that goes.

Principles, in priority order when they conflict:

1. **Accessible by default.** A component is not done until it meets WCAG 2.2 AA with a keyboard and a screen reader.
2. **Documented means tested.** Anything public that the manifest describes has a test generated from that description. Anything public that the manifest leaves out fails CI.
3. **Boring, consistent APIs.** Names and events copy the native HTML elements. An agent, or a person, who has used one Vastu component can guess the next one.
4. **Small.** Lit is the only runtime dependency. Every entry point has a size budget.
5. **Themeable through tokens only.** Components read design tokens and never hard-code colours, spacing or type.

## 2. Goals, non-goals and phases

The owner's order of priority decides the trade-offs. **First a portfolio piece, deep rather than wide. Then a system the owner's own apps actually use.**

| Phase | Goal | Done when |
| --- | --- | --- |
| 1. Portfolio | Eight components with the full treatment, the agent layer and the eval. | Docs are live, packages are on npm, and a write-up of the eval results is published. |
| 2. Widgets | The five 2023 widgets are rebuilt as Vastu components (section 11). | Old packages are deprecated with pointers to the new ones. |
| 3. Adoption | Vastu is used in the owner's apps, one app at a time. | Each adopted app ships with Vastu and the gaps it exposed are fixed. |

Non-goals for phase 1:

- Breadth. No data grid, date picker or rich-text editor.
- Framework wrappers. React, Vue and Svelte use the custom elements directly, with generated types (section 6).
- A Figma library. Tokens are the shared source; a Figma export can come later.
- Server-side rendering. Lit SSR is possible but adds complexity that phase 1 doesn't need.

## 3. Scope: the first eight components

Each component was chosen because it exercises a different hard pattern. The point is that the system proves it can handle every one.

| Component | Element | The hard pattern it proves |
| --- | --- | --- |
| Button | `<va-button>` | Form association (`ElementInternals`), variants, loading and disabled states |
| Text field | `<va-text-field>` | Labels, help and error text wired with ARIA, native-style validation |
| Checkbox | `<va-checkbox>` | Form value, indeterminate state |
| Switch | `<va-switch>` | `role="switch"`, form value (replaces the 2023 `switch` widget) |
| Dialog | `<va-dialog>` | Modal on the native `<dialog>`: top layer, focus trap and return, Escape |
| Menu | `<va-menu>` | Menu-button pattern: popover API, anchor positioning, arrow-key navigation, typeahead |
| Tabs | `<va-tabs>` | Roving tabindex, manual and automatic activation |
| Toast | `<va-toast>` | Live regions, timing that respects WCAG 2.2.1 |

Each follows its pattern from the W3C [ARIA Authoring Practices Guide](https://www.w3.org/WAI/ARIA/apg/) (APG). The keyboard table from that pattern is copied into the manifest and tested (section 8).

## 4. API conventions

These rules are what make the system predictable, for agents above all. A lint check enforces them where it can.

- **Element names** are `va-` plus a noun: `va-text-field`, not `va-input-text`.
- **Attributes** are lower-case, hyphenated forms of camelCase properties: `helpText` ↔ `help-text`. Booleans are present-or-absent, as in HTML: `disabled`, never `disabled="false"`.
- **Values and events copy native controls.** Form controls have `name`, `value`, `disabled`, `required` and `form`. They fire `input` while the value changes and `change` when it is committed. Read the new value from `event.target.value`; there is no custom `detail` payload.
- **Component events** that have no native equivalent are named `va-` plus a verb: `va-open`, `va-close`. They bubble and are composed. Events fired before something happens can be cancelled with `preventDefault()`: `va-close` on a dialog, for example.
- **Content goes in slots.** Text and icons are slotted, not passed in attributes, apart from short labels such as `label` on a text field.
- **Styling goes through component tokens and parts.** Each component documents its CSS custom properties (`--va-button-radius`) and CSS parts (`::part(control)`). Nothing else is a styling API.
- **No global side effects** apart from defining the element. Defining an element twice is a no-op, not an error. The one exception is `va-toast` moving itself into an open modal dialog, which is documented on the component.
- **`label` is always visible text** (`va-text-field`, `va-menu`). A name that is never shown is `accessible-label`, used only when there is no visible text; dev builds warn when it would replace visible text (WCAG 2.5.3).
- **Native names win.** Where a native element has the same idea, use its attribute and property names, even unhyphenated: `readonly` / `readOnly`, `minlength` / `minLength`. A `checked` attribute is the initial state only, as on a native checkbox, and doesn't reflect. Style live state with custom states: `:state(checked)`.
- **Events:** `change` and `input` only on form controls, with native timing. Everything else is `va-` plus a verb with a typed `detail`: `va-select`, `va-open`, `va-close` (cancellable, before), `va-closed` (after, on every path), `va-dismiss`.
- **CSS custom properties** are `--va-<component>[-<sub-part>]-<property>[-<state>]`, with `bg`, `fg`, `border`, `radius` and `size` as property words: `--va-button-bg-hover`, `--va-switch-track-bg-checked`, `--va-menu-item-bg-hover`.
- **Parts and slots** use one name per idea across components: `help-text` for help text (attribute, slot and part), `close-button` for close buttons.

## 5. Tokens and theming

Tokens are written in the W3C Design Tokens Community Group (DTCG) format, version 2025.10, and built with Style Dictionary into:

- CSS custom properties.
- A JSON file.
- TypeScript types, so an agent or editor can complete token names.

Three tiers:

1. **Reference tokens:** the raw palette and scales (`color.teal.600`, `space.4`). Components never use them directly.
2. **System tokens:** what a value is for (`color.surface`, `color.text.muted`, `color.accent`, `radius.control`, `space.inline.md`). Themes switch these.
3. **Component tokens:** one per styling hook (`--va-button-bg`), defaulting to a system token.

**Themes have two independent parts: a brand and a mode.**

- **Brand themes** set the look: palette, type, radius, density. Each brand is one set of system-token values, so a new brand never touches component code.
- **Modes** are light, dark and high-contrast, and every brand provides all three.
- Both are chosen on any ancestor: `data-va-brand="lekha"` and `data-va-mode="dark"`. Without `data-va-mode`, the mode follows `prefers-color-scheme` and `prefers-contrast`.

**Brands planned:**

| Brand | Look | When |
| --- | --- | --- |
| `lekha` (working name; Sanskrit for writing) | Continues the personal site: warm paper background `#fdfcfa`, ink text `#1f1d1a`, one muted teal accent `#35697c` (`#7fb0be` in dark), near-square 2px corners, Source Serif for headings and reading text, the system sans-serif for controls. | M0, the first and default brand |
| `vastu` | Vastu's own fresh identity, also used for the docs site's chrome and the logo | Designed in M1. It becomes the default brand once it exists. |

Further brands, for example one per app in phase 3, are a token file each.

Modes, per component:
- `forced-colors` (Windows High Contrast) is handled per component with system colours.
- All motion respects `prefers-reduced-motion`.

**A CI check computes contrast for every text and background pair in every brand and mode.** A text pair that falls below 4.5:1 fails the build. A large text or UI pair below 3:1 fails too.

## 6. Architecture

**Monorepo.** It uses pnpm workspaces and lives in the public repo `firstprateek/vastu`.

| Package | Contents |
| --- | --- |
| `@firstprateek/vastu-tokens` | DTCG sources and built CSS, JSON and TS |
| `@firstprateek/vastu` | All components, one entry point per component: `@firstprateek/vastu/button` |
| `@firstprateek/vastu-mcp` | The MCP server (section 7) |
| `@firstprateek/vastu-lint` | The markup validator, as a library and a CLI |

Components ship as one package with subpath exports instead of one package per component. A single version means no version-skew bugs between components. It also means one changelog, and imports are still tree-shakeable. Shared code (focus helpers, form association, dev-mode warnings) lives in an internal `core/` folder, not a separate package.

**Each component is:**

- A Lit 3 element with Shadow DOM, written in TypeScript with full JSDoc.
- Form controls use `ElementInternals` and `static formAssociated = true`, so they work in a plain `<form>`.

**Types for frameworks.** Each component registers itself in `HTMLElementTagNameMap`, and the build generates JSX typings for React 19 (which supports custom elements natively), Vue and Svelte from the manifest. So `<va-button variant="…">` type-checks in all three without wrappers.

**Browser support:** the last two versions of Chrome, Edge, Firefox and Safari. The menu uses the popover API and CSS anchor positioning, with a small fallback while anchor positioning is not everywhere. The fallback is removed when it is.

## 7. The agent layer

This is the showcase. Everything in it is generated from one source.

**The manifest.** `custom-elements.json` is generated from the TypeScript and JSDoc with the Custom Elements Manifest analyzer. It is the standard format that editors and Storybook already read. A plugin adds Vastu fields to each component:

- `x-keyboard`: the keyboard table (key → behaviour).
- `x-a11y`: role, required labelling, and what a screen reader announces.
- `x-guidance`: when to use this component, when not to, and which component to use instead.
- `x-examples`: short, correct usage snippets. These are the same files the docs and tests use.

**`llms.txt` and `llms-full.txt`.** These are generated from the manifest at the docs site root. The short file indexes the components. The full file has every API, example and piece of guidance in one Markdown document.

**MCP server (`vastu-mcp`).** Run with `npx @firstprateek/vastu-mcp`. Tools:

- `list_components()`: names, one-line purpose.
- `get_component(name)`: full API, keyboard table, guidance, examples.
- `find_component(intent)`: maps "a yes/no setting" to `va-switch`, with the reason and the alternatives considered.
- `get_tokens(category?)`: system tokens with their light, dark and high-contrast values.
- `validate_markup(html)`: runs `vastu-lint` and returns problems with fixes (below).

**The validator (`vastu-lint`).** It checks HTML or Lit templates against the manifest:

- Unknown elements and attributes.
- Wrong value types.
- Missing required labels.
- Native controls used where a Vastu one exists.
- Raw colours where a token exists.

Every message says what is wrong, why and the exact fix, for example: ``<va-dialog> has no accessible name. Add heading="…" (shown) or accessible-label="…" (not shown)``. The same messages appear in the browser console in development builds and are stripped from production builds, the way Lit's own dev mode works.

## 8. Testing

Browser tests use Playwright Test against Chromium, Firefox and WebKit. Node-only code (tokens, manifest plugin, validator, MCP server) uses Vitest. Every check below runs in CI on each pull request, apart from the agent eval.

**Contract tests, generated from the manifest.** For each component, a generator reads the manifest and writes tests that check:

- Every attribute sets its property, with the declared type, and reflects if declared.
- Every event fires with the declared shape. A small `trigger` recipe per event in the examples says how to cause it.
- Every CSS custom property changes the computed style of the part it claims to.
- Every slot renders its content, and every part exists.
- Every row of the keyboard table does what it says.

The check also runs in reverse. A public property, attribute or event on the class that the manifest doesn't describe fails the build as "undocumented API". That keeps the manifest, and so the docs and the agent tools, honest.

**Accessibility.**

- axe-core runs on every example in every brand and mode.
- Focus-order tests run for dialog, menu and tabs.
- A target-size check enforces 24 by 24 CSS pixels minimum (WCAG 2.2).
- A manual VoiceOver checklist per component is ticked before each release, because screen-reader output can't be fully automated.

**Visual regression.**

- Playwright screenshots of every example × brand × mode × width (390 and 1280 pixels).
- Run in the official Playwright Docker image so the pixels match across machines.
- Baselines are committed.

**Performance.**

- `size-limit` budgets per entry point fail CI when exceeded. The starting budget is 6 kB gzipped per component on top of Lit and the shared core; it is tightened after the first components land.
- A render benchmark (1,000 instances of each component, with Tachometer) is compared against `main` on each pull request.

**Security.**

- A lint rule bans `innerHTML`, `unsafeHTML` and `unsafeStatic`.
- A test page runs every example under a strict Content Security Policy with `require-trusted-types-for 'script'`. Any CSP or Trusted Types violation report fails the test.
- Runtime dependencies: Lit only.
- npm releases use trusted publishing from GitHub Actions (OIDC), so every package carries a provenance attestation. It also removes the manual browser approval for each publish.
- Dependabot and `npm audit` run in CI.

**Agent eval.** This answers the question the whole system is built around: can an agent build correct pages with it? The test set is about 12 tasks with clear checks, such as:

- "A sign-up form with name, email, a terms checkbox and a submit button that shows an error under an invalid email."
- "A settings page with tabs and a confirm dialog before deleting."

Each task runs with an agent (Claude through the Agent SDK) in a clean project. It runs in two setups: with the Vastu MCP server, and with only the npm package and its README. The output is scored automatically:

| Check | How |
| --- | --- |
| It renders without console errors | Playwright |
| It's valid Vastu | `vastu-lint` reports nothing |
| It's accessible | axe reports nothing; keyboard checks pass |
| It uses tokens | No raw colours or pixel spacing in its styles |
| It does the task | Task-specific Playwright assertions |

The eval reports pass rates per task, per check and per setup, with tokens used and time taken. It runs on demand and before each release, not on every pull request, because it costs money. The results, including failures and what changed because of them, become the published write-up.

## 9. Docs site

The docs site is an Astro site in `apps/docs`, deployed to GitHub Pages at `firstprateek.github.io/vastu/`. Astro matches the owner's personal site, and it keeps the docs light where Storybook would add weight.

- Component pages are generated from the manifest: API tables, keyboard table, guidance, and live examples from the `x-examples` files.
- There is a token page per brand, and a brand and mode switcher on every page.
- `llms.txt` and `llms-full.txt` are served from the site root.
- The same example files drive the docs, the contract tests, the visual tests and the agent eval's reference answers. **One source, four uses.**

## 10. Repo layout and releases

```
vastu/
  docs/design.md            this document
  packages/
    tokens/                 DTCG sources, Style Dictionary config
    vastu/                  components: src/<component>/, src/core/
    mcp/                    MCP server
    lint/                   validator + CLI
  apps/docs/                Astro docs site
  tests/
    contract/               generator + generated specs
    a11y/ visual/ perf/ security/
    eval/                   tasks, runner, scoring, results/
  .github/workflows/        ci.yml, release.yml, eval.yml
```

**Releases.**

- Releases use Changesets: every pull request that changes a package adds a changeset, and merging the release PR publishes.
- Versions stay at `0.x` through phase 1, so the API can still change. `1.0.0` ships when phase 1 is done and the API is frozen.
- Commits use the GitHub noreply author. `main` is protected once CI is green, so changes land through pull requests.

## 11. The 2023 widgets (phase 2)

The owner asked for this. If it's the industry standard and efficient, move the five widget repos into this monorepo and keep publishing them under their old npm names as a breaking release. Otherwise, rebuild them inside Vastu.

**Decision: rebuild inside Vastu, publish under the Vastu names, deprecate the old packages.** This is the standard path when standalone components join a namespaced system. Material Web did it when it moved its `mwc-*` packages into `@material/web`. Keeping the old names isn't efficient here, for four reasons:

- **Mixed names.** The old names don't follow the system's naming (`minimal-navbar`, `hamburger-btn`, `@firstprateek/switch`). Two naming schemes in one system defeat the consistency rule that agents depend on.
- **Separate versions.** Five extra packages, each with its own version, would undo the one-version decision in section 6.
- **Doubled release work.** Each would need a changelog, a release and a deprecation story of its own.
- **Nothing gained.** The old packages have almost no downloads, so there is little to protect.

What happens to each:

| 2023 widget | Becomes | Note |
| --- | --- | --- |
| `switch` | `va-switch` | Already in phase 1 (section 3) |
| `hamburger-btn` | The Menu button inside `va-navbar` | A menu trigger, not a component of its own |
| `minimal-navbar` | `va-navbar` | |
| `poll-widget` | `va-poll` | |
| `bar-chart` | `va-bar-chart` | Drawn with CSS, not D3 (section 18) |

**History is kept.** Each widget's history is imported into its folder (section 18 has how), so the original commits stay reachable in Vastu. Then the code is rewritten on Vastu's base. After the new component ships:

- **npm:** `npm deprecate` is run on each old package with a one-line pointer: "Moved to @firstprateek/vastu/navbar: <docs link>". Old versions keep installing, so nothing that depends on them breaks.
- **GitHub:** each old repo gets a README pointer, and then it is archived. The demo URLs keep working while the personal site still links them, and the site's project page is updated to point to Vastu.

## 12. Milestones

| Milestone | Contents | Proves |
| --- | --- | --- |
| **M0: foundation** | Repo, tokens with the `lekha` brand in all three modes, `va-button`, manifest plugin, contract-test generator, a11y, visual, size, CSP tests, CI, docs site with one page | The whole pipeline works end to end on one component. **This is the first milestone.** |
| M1: components | The other seven components, and the `vastu` brand (Vastu's own identity) | The patterns hold up, and a second brand needs no component changes |
| M2: agent layer | `vastu-lint`, `vastu-mcp`, `llms.txt`, eval with 12 tasks, first results | The headline claim |
| M3: release | Trusted publishing, `1.0.0`, eval write-up on the personal site | Phase 1 done |
| M4: widgets | Section 11 | Phase 2 done |
| M5+: adoption | The personal site first (it already uses Astro), then Check-in, Sparring, i.inc | Phase 3 |

M0 is deliberately one component with every check in place. Adding the next seven is then repetition, and any gap in the pipeline shows up on the first component, when it is cheap to fix.

## 13. Decisions made on open questions (2026-11-15)

1. **Brand look:** Vastu gets a fresh identity of its own, and supports several brand themes. The first brand built, `lekha`, continues the personal site's look (section 5).
2. **Eval models:** Claude only at first. Add one other model once the eval works, to show Vastu isn't tuned to one agent.
3. **Docs domain:** GitHub Pages at `firstprateek.github.io/vastu/` for now. A domain can come later.
4. **Screen readers:** VoiceOver on macOS and iOS for phase 1. Add NVDA on Windows before `1.0.0` if a Windows machine or VM is available.

Still open: the final name of the `lekha` brand, and the `vastu` brand's look (decided in M1).

## 14. Implementation notes from M0

Choices made while building M0, and where they differ from the plan above:

- **TypeScript 5.9, not 7.** The manifest analyzer and typescript-eslint don't support TypeScript 7 yet.
- **No decorators.** Components declare reactive properties with Lit's `static properties` and `declare` fields. The analyzer reads them directly, and there is no decorator-compiler mismatch to manage.
- **Union types are written inline on properties** (`variant: 'primary' | 'secondary' | …`), not as aliases. The manifest, and any agent reading it, then sees the allowed values. Aliases are exported for TypeScript users as `VaButton['variant']`.
- **Machine-checkable JSDoc tags** feed the manifest plugin: `@keyboard Key | action | description`, `@cssprop-applies --var part[:hover] property`, `@event-trigger event | click`, `@a11y-*` and `@guidance-*`. The build fails when any is missing, so a component can't ship half-described.
- **"Documented" means listed with a description.** The analyzer lists every public member, so the reverse contract check requires a description, not just a listing. A mutation check confirmed this: adding an undocumented method and breaking a CSS hook each fail the suite.
- **`va-button` defaults to `type="button"`,** unlike the native `<button>`, so it never submits a form by accident. This is a deliberate exception to "copy native controls".
- **The high-contrast mode is black on white.** A dark high-contrast variant can follow if it's needed. Windows High Contrast is handled separately through `forced-colors`.
- **Every browser test runs under the strict CSP and Trusted Types,** not only the security tests. A shared fixture also fails any test that logs an error or an unexpected Vastu warning, so the examples stay clean.
- **Visual baselines are made only in CI's Linux Playwright image,** by a manually run workflow that commits them. Local runs on macOS would not match pixel for pixel.
- **Tab-order checks skip on macOS WebKit,** which only tabs to buttons when a system setting is on. CI runs WebKit on Linux, where they run.
- **The render benchmark (Tachometer) is deferred to M1.** M0 has size budgets only.

## 15. Implementation notes from M1

- **Two contract-test vocabularies grew.** Keyboard rows now have a context: `host` (the default), `items` (an arrow-key item has focus) or `open` (inside the open component). The actions are now `activates`, `toggles`, `focus-next`, `opens`, `closes`, `next`, `previous`, `first`, `last` and `selects`. `@keyboard-items` names the items. CSS hooks can target states (`hover`, `checked`, `unchecked`, `invalid`, `open`) and slotted elements (`light(selector)`). Event triggers take `click`, `click-item N`, `press Key`, `commit` and `call method`, optionally after opening. Contract tests run on each component's first example, so composite components have real content.
- **Form controls share a `FormControl` base class:** form association, `name`, `disabled`, `required`, the validity API, fieldset disabling and reset. The manifest includes it, so inherited API is documented and tested on each control.
- **Commands, not scripts.** Examples must pass a strict CSP, so they can't contain scripts. `va-button` has `commandfor` and `command`, shaped like the native Invoker Commands API: `command="--show"` opens a `va-dialog` or shows a `va-toast` message. The plugin now rejects examples with inline styles, scripts or `on…=` handlers. Agents copy examples.
- **Composite components use plain slotted elements:** `<button slot="tab">` for tabs, `<button value>` for menu items. The component adds roles, ids, relationships and roving tabindex, so authors write less and can't get the ARIA wrong.
- **The menu positions itself with JavaScript (CSSOM writes)**, not CSS anchor positioning. It flips above the button near the bottom of the window and stays inside narrow windows. Anchor positioning can replace it once it's in all three engines.
- **The toast is fixed-position, not in the top layer.** A toast shown while a modal dialog is open appeared above it but was inert. The top layer alone doesn't help, because popovers outside a modal are inert in all three engines. M3 fixed it by moving the toast into the open modal (see section 17).
- **`package.json` exports and `src/all.ts` are generated** from the component folders, and CI checks they're committed, so a new component can't be left out of the package.
- **The `vastu` brand is sandstone and indigo** (the owner's choice, 2026-11-15). It has warm sandstone surfaces, indigo ink and accent, terracotta for danger, 6px control and 10px surface corners, and Inter throughout. It is now the default brand; `lekha` is the second. Tokens don't load fonts: the docs site self-hosts Inter, and an app without it falls back to the system sans.
- **Brand selectors:** a brand applies where `data-va-brand` names it, and to a page that sets no `data-va-brand`. A mode applies on the brand's element or any element inside it. With several brand files loaded, set `data-va-brand`. Without it, the last file loaded wins.
- **Accessibility and visual tests run on every brand:** 2 brands × 3 modes, plus 2 widths for screenshots. The contrast check covers every pair in both brands.
- **Still deferred:** the render benchmark (Tachometer).

## 16. Implementation notes from M2

- **vastu-lint** checks HTML against the manifest with a fix for every problem. Every documented example must lint clean, and that check caught one of the button examples using a native `<input>`. The manifest gained machine-readable fields for it: `x-a11y.nameFrom`, `x-replaces` and `x-commands`.
- **Boolean attributes must default to false.** HTML can only turn a boolean attribute on. `va-dialog`'s `dismissible` (default true) became `hide-close-button`, and the manifest build now rejects any boolean that defaults to true.
- **vastu-mcp's `find_component` is deterministic.** It ranks components by keyword, with no model call, so it is free, fast and testable: eight plain-language intents map to the right component in the unit tests.
- **The eval drives Claude Code itself** (`claude -p`) by default, not the Claude API, so it runs on a Claude subscription. Each run is isolated: an empty folder outside any project, project settings only, auto-memory off, and only Read, Write and Edit (plus the vastu MCP server). An isolation check before the first run confirmed the agent saw no machine-specific instructions. `--agent api` keeps a Claude API Tool Runner version.
- **Results:** see [`tests/eval/FINDINGS.md`](../tests/eval/FINDINGS.md). Run 1 found three Vastu defects and a gap in the docs. After the fixes, both setups pass all 12 tasks on Opus 5.5. The next eval work is harder tasks, smaller models and repeats.

## 17. Implementation notes from M3

- **An API review before 1.0** by an agent that read the manifest cold, with no anchoring on the original choices, found twelve things that would be breaking changes later. All twelve were changed:
  - `label` meant visible text on two components and a hidden name on six, so the hidden one became `accessible-label`.
  - `va-tabs` fired `change`, which collided with form controls in its panels, so it became `va-select`. `selected` became `selected-index` and is clamped.
  - `va-close` meant "about to close" on the dialog and "has closed" on the toast. The dialog now adds `va-closed`, and the toast fires `va-dismiss`.
  - A disabled `<fieldset>` overwrote an author's own `disabled`.
  - `checked` reflected, so reconnecting a checkbox changed its form-reset default. It doesn't reflect now, and live state is exposed as `:state(checked)`.
  - The toast variant became `data-toast-variant`, validated in the component and by vastu-lint.
  - The toast's read-only `open` became `hasMessages`.
  - The CSS custom property names now follow one pattern.
  - Help text became `help-text` everywhere, and close buttons became `close-button`.
  - `readonly` became the `readOnly` property, as on a native input.
  - A menu item without a value reports its text.
  - Guessed events were removed from the manifest.
- **Toasts over modal dialogs:** `va-toast` moves itself into an open modal (`va-dialog[open]` or `dialog:modal`) and back when it closes, so its messages stay clickable and announced.
- **The render benchmark** uses Playwright, not Tachometer, because the tests already run on it: 1,000 instances per component in Chromium, median of 7, compared with a committed baseline. It isn't in CI, because timings depend on the machine.
- **Releases** use Changesets, with the four packages on one version, and a manual Release workflow that publishes with npm trusted publishing (OIDC, provenance). `pnpm pack` resolves `workspace:` ranges, and `npm publish` uploads the tarball.
- **1.0.0 was published on 2026-11-16** from the owner's machine, with browser approval, because npm only lets a package get a trusted publisher once it exists. Each package's trusted publisher is GitHub Actions, `firstprateek/vastu`, `release.yml`, environment `npm`. `npm trust github` (npm 11.12) returned "400 Bad Request" with no reason, so they were set in the npm web form instead. A dry run of the Release workflow passes. The first OIDC publish, with provenance, will be the next release.

## 18. Implementation notes from M4

- **History import.** The old commits were authored with a personal address and a machine name, which this public repo must not contain (`AGENTS.md`). So each widget repo was rewritten with `git filter-repo` before it was merged: authors mapped to the noreply address, only `src/`, `demo/`, the README, LICENSE, `index.js`, `package.json` and `.gitignore` kept (the old repos had committed `node_modules`, about 13 MB each), personal strings removed from file contents, and each message given a line naming the original repo and commit. Then `git merge --allow-unrelated-histories` into `packages/vastu/src/<name>/` (the owner chose this over skipping the history or importing it unchanged, 2026-11-17). The next commit deletes the old files; `git log -- packages/vastu/src/<name>` reaches the history. `hamburger-btn` went into `navbar/hamburger-btn/` and `switch` into `switch/`. The older `hamburger-button` repo, the predecessor of `hamburger-btn`, was not imported.
- **Content is markup, as in the other composites.** Poll answers are `<button value data-votes>`; chart data is `<data value>Category</data>`, the native element for a machine-readable value. No JSON attributes. Agents already know both elements, the markup lints, and it renders as plain text without script.
- **Components don't fetch.** The 2023 poll and chart loaded and posted data themselves (`requestapi`, `voteapi`, `dataapi`, `autoupdate`). Vastu's don't: the poll fires `va-select` and the app sends the vote; the app changes `data-votes` or `<data value>` and the component redraws (a MutationObserver). That keeps network policy, auth and errors in the app, keeps `connect-src` out of the CSP story, and leaves nothing to mock in tests.
- **No D3.** Section 11 planned to keep D3 for the chart. Its jobs here are a linear scale, nice ticks and transitions, which take about 30 lines plus CSS transitions. Without it `va-bar-chart` is 2.2 kB on top of Lit, inside the normal 3 kB budget, with no new runtime dependencies. A future chart that needs real D3 features can still add it.
- **Manual slot assignment.** The poll and the chart render shadow content next to each slotted item (a result bar, a value label), so they use `slotAssignment: 'manual'` and assign each item to its own slot. Supported in all three engines.
- **`cssom()` instead of `styleMap`.** Lit's `styleMap` writes a `style` attribute on first render, which the strict CSP blocks (the tests caught it). `core/cssom.ts` is a small element directive that sets the same styles through `element.style`.
- **Accessibility choices.** The navbar follows the APG disclosure navigation pattern: a `<nav>` landmark, a Menu button with a visible label (not icon-only), and Escape, an outside click or focus leaving to close. The current page is the author's `aria-current="page"`, not tracked by the component. After a vote the poll keeps the answers focusable with `aria-disabled`, puts each share in text after its button, and announces the count in a polite live region; focus never moves. Each chart point is a focusable `role="img"` named "Category: value", with arrow keys between points (roving tabindex); the axis is hidden from assistive technology.
- **Folding by the navbar's own width** (`collapse-below`, ResizeObserver), not the window's, so it works in a sidebar layout. The navbar, poll and chart are `width: 100%`, since in a flex container they would otherwise shrink to their content and fold or truncate.
- **Dropped from the 2023 API:** the navbar's `brandplacement` and `activeLinkChanged` (routers set `aria-current`), the poll's `width`, `height` and time-ago footer (`help-text` covers the note), and the chart's fixed pixel `width` and `height` (it fills its container; `--va-bar-chart-size` sets the plot height).
- **Known limit:** page styles such as `a { color: … }` beat the navbar's `::slotted(a)` styles, as for any slotted content. Style the links with the navbar's custom properties, or exclude `va-navbar a` from global link rules.
- **1.1.0 was the first release through trusted publishing** (2026-11-18), with provenance. The first attempt failed with `403 OIDC permission denied for this action`: each package's trusted publisher allowed only **npm stage publish**, npm's default for a new connection. The owner chose direct publishing, so "Allow npm publish" is now ticked on all four (dist-tag stays off). Each save asks for the owner's security key; leaving the page before it completes drops the change, so check the Permissions line afterwards.
- **M4 done, 2026-11-18.** On the owner's instruction the six old widget repos (`minimal-navbar`, `hamburger-btn`, `switch`, `poll-widget`, `bar-chart` and the older `hamburger-button`) were made **private** and then archived, rather than given a README pointer and left public as section 11 planned. Their GitHub Pages demos went offline with them, and the personal site's "Lit web components" project page was removed first. The five npm packages are deprecated with `npm deprecate` (the npm website's form takes no message), each pointing to its Vastu component's docs page. Old versions still install.

