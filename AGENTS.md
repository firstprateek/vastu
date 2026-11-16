# Working on Vastu

Instructions for coding agents (and people) changing this repository. Read this before your first change.
`docs/design.md` is the source of truth for what Vastu is and why. Sections 14 to 17 record what changed while
it was built.

## Map

```
packages/tokens   @firstprateek/vastu-tokens  DTCG sources → CSS, JSON, TS (brands vastu, lekha × 3 modes)
packages/vastu    @firstprateek/vastu         components (src/<name>/), manifest plugin, dev and prod builds
packages/lint     @firstprateek/vastu-lint    markup validator (library + CLI)
packages/mcp      @firstprateek/vastu-mcp     MCP server for agents
apps/docs         Astro docs site, generated from the manifest (deploys to GitHub Pages from main)
tests/            harness (strict CSP), contract, behaviour, a11y, security, visual, bench, eval
docs/design.md    design document
```

The component manifest, `packages/vastu/custom-elements.json`, is generated from the components' JSDoc.
It drives the docs, `llms.txt`, the contract tests, vastu-lint and vastu-mcp. If something is wrong in any
of those, fix the JSDoc, not the output. The manifest is committed, and CI fails if it differs from a fresh build.

## Commands

```bash
pnpm install
pnpm build            # tokens, components, manifest, lint and mcp data (run before tests)
pnpm build:docs       # docs site, llms.txt, llms-full.txt
pnpm check            # build, lint, types, unit, browser tests (3 engines), size
pnpm test:unit        # Vitest: token contrast, vastu-lint, vastu-mcp
pnpm test:browser     # Playwright: Chromium, Firefox, WebKit
pnpm size             # size-limit budgets
pnpm bench            # render benchmark; compare only runs from the same machine
pnpm eval:dry         # score the eval's reference answers (no model calls)
pnpm eval             # the agent eval; see tests/eval/README.md
```

Before you say a change is done, run `pnpm check` and `pnpm build:docs`. For a change you can see, look at it in
the docs site (`pnpm --filter vastu-docs dev`) at phone (390px) and desktop widths, in light, dark and
high-contrast modes.

## API conventions

These rules are public API. Breaking one after 1.0 is a breaking change; see design doc section 4.

- **Element names** are `va-` plus a noun.
- **`label` is always visible text** (`va-text-field`, `va-menu`). A name that is never shown is
  `accessible-label`, used only when there is no visible text.
- **Native names win.** Use native attribute and property names where a native element has the idea
  (`readonly` / `readOnly`, `minlength` / `minLength`).
- **Boolean attributes default to false.** The build fails otherwise.
- **`checked` doesn't reflect.** The attribute is the initial state only. Live state is a custom state, `:state(checked)`.
- **Events:** `input` and `change` only on form controls, with native timing. Everything else is `va-` plus
  a verb, bubbling and composed, with a typed `detail`:
  - `va-select` and `va-open`;
  - `va-close`: cancellable, fires before closing;
  - `va-closed`: fires after closing, on every path;
  - `va-dismiss`.
- **CSS custom properties** are `--va-<component>[-<sub-part>]-<property>[-<state>]`, with the property words
  `bg`, `fg`, `border`, `radius` and `size`. They and `::part()` are the only styling API.
- **Help text** is `help-text` (attribute, slot and part). Close buttons are the `close-button` part.
- **Composites use plain slotted elements**, such as `<button slot="tab">` and `<button value>` menu items, and
  the component adds the roles and ARIA itself.
- **Opening things without script:** `va-button` has `commandfor` and `command` (`--show`, `--close`), like the
  native Invoker Commands API.
- **No `innerHTML`, `unsafeHTML`, `unsafeStatic` or `eval`.** ESLint enforces it. Everything must work under a
  strict Content Security Policy with Trusted Types.

## Adding or changing a component

1. **Source:** `packages/vastu/src/<name>/<name>.ts` (the class) and `index.ts` (`define('va-<name>', …)`).
   `build.js` generates the package exports and `src/all.ts` from the folders.
2. **Properties:** declare reactive properties with `static properties: PropertyDeclarations` and `declare` fields,
   not decorators. Write union types inline (`'primary' | 'secondary'`) so the manifest shows the values. Form
   controls extend `core/form-control.ts`.
3. **JSDoc:** put the JSDoc block directly above the class; a gap drops the component from the manifest, and the
   build fails. The manifest plugin requires these tags and fails the build when one is missing:
   - `@summary`
   - `@keyboard [context:] Key | action | description`. The actions are `activates`, `toggles`, `focus-next`,
     `opens`, `closes`, `next`, `previous`, `first`, `last` and `selects`. The contexts are `host`, `items` and
     `open`.
   - `@keyboard-items <selector>`, when keys move between items.
   - `@a11y-role`, `@a11y-name`, `@a11y-name-from` and `@a11y-note`.
   - `@guidance-use`, `@guidance-avoid` and `@guidance-instead`.
   - `@cssprop` with `@cssprop-applies --var part[:state] property` (or `light(selector)[:focus]`). The states
     are `hover`, `checked`, `unchecked`, `invalid` and `open`.
   - `@fires` with `@event-trigger event | click | click-item N | press Key | commit | call method [| open]`.
   - `@replaces <selector>`, `@command` and `@command-data`, where they apply.
4. **Examples:** add `examples/N-name.html` files with a `<!-- title: … description: … -->` header. The first
   example is the contract tests' fixture. Examples must pass a strict CSP (no inline `style`, `<script>` or
   `on…=`) and must lint clean; both are enforced.
5. **Tests:** the contract tests are generated from the manifest, so don't hand-write them. Add behaviour tests in
   `tests/behaviour/` for what the manifest can't express, such as forms, focus, roles and names, and the
   warnings.
6. **Development warnings:** add them for mistakes an agent is likely to make, with `devWarn(tag, problem, fix)`.
   The fix must be the exact change. Production builds drop them.
7. **Visual baselines:** after a visible change, run the **Update visual baselines** workflow on GitHub. It
   commits new baselines from CI's Linux image; local screenshots won't match. Commits pushed by a workflow don't
   trigger CI, so run CI afterwards (`gh workflow run ci.yml`).

## Traps that have cost time

- **A stale harness server tests stale code.** Playwright builds the harness and serves it from
  `tests/serve-harness.js`. If a run hangs or tests pass against code you changed, look for a leftover
  `vite.js preview` holding port 4173 and stop it.
- **Prove a new check can fail.** Break the code on purpose and watch the test fail before trusting a pass.
- **macOS WebKit doesn't Tab to buttons.** Tab-order checks skip there only. CI runs WebKit on Linux, where they
  run.
- **pnpm 12 refuses to install** until each dependency's install script is decided in `allowBuilds` in
  `pnpm-workspace.yaml`.
- **The manifest's module order** is sorted by the plugin, because file listing order differs between macOS and
  Linux.

## Releases

1. Every change to a published package adds a changeset: `pnpm changeset`. The four packages share one version.
2. To release, run `pnpm changeset version`, review the versions and changelogs, commit and push.
3. Run the **Release** workflow on GitHub. Its dry-run option checks everything without publishing.

The workflow publishes every package whose version isn't on npm yet, using npm trusted publishing (OIDC, with
provenance). No npm token exists anywhere: don't add one, and don't publish from a laptop. A new version can take
a few minutes to appear on the registry. Never publish without the maintainer's go-ahead.

## Security and privacy

- **The repository is public.** Commits use the GitHub noreply address of the maintainer's account. Before
  committing, set it per repository with `git config user.email`. Never put personal email addresses, home paths,
  machine names, tokens or API keys in commits, docs, test fixtures or eval results.
- **The eval needs no stored credentials.** It drives Claude Code with the local sign-in, or the Claude API with
  `ANTHROPIC_API_KEY` from the environment. Keep keys out of files and out of command lines that are logged.
- **Dependencies:** keep runtime dependencies to Lit (components) and the few listed in each package. Every new
  dependency is a supply-chain risk and needs a reason.
