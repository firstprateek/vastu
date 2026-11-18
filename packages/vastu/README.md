# @firstprateek/vastu

Accessible, themeable web components built with [Lit](https://lit.dev/), described in a machine-readable
manifest that drives their docs, their tests and the tools agents use.

**[Docs and live examples](https://firstprateek.github.io/vastu/)** · [Source](https://github.com/firstprateek/vastu)

Components: `va-button`, `va-checkbox`, `va-switch`, `va-text-field`, `va-tabs`, `va-dialog`, `va-menu`, `va-toast`,
`va-navbar`, `va-poll`, `va-bar-chart`.

## Install

```bash
npm install @firstprateek/vastu @firstprateek/vastu-tokens
```

## Use

Load one brand stylesheet once per page, then import the components you use:

```js
import '@firstprateek/vastu-tokens/vastu.css'; // or lekha.css
import '@firstprateek/vastu/button';             // or '@firstprateek/vastu/all'
```

```html
<va-button commandfor="confirm" command="--show">Delete project</va-button>
<va-dialog id="confirm" heading="Delete this project?">
  <p>This can't be undone.</p>
  <va-button slot="footer" variant="secondary" commandfor="confirm" command="--close">Cancel</va-button>
  <va-button slot="footer" variant="danger">Delete</va-button>
</va-dialog>
```

Set `data-va-mode="light|dark|high-contrast"` on `<html>` to choose a mode; without it, the mode follows
the user's system. Components work in plain HTML, React 19, Vue and Svelte, and under a strict Content
Security Policy with Trusted Types.

The development build (the `development` export condition, used by Vite and webpack in dev mode) logs a
warning with the exact fix when a component is used wrongly, such as a button with no accessible name.
The production build drops those warnings.

## For agents and tooling

- `custom-elements.json` ships in this package (`@firstprateek/vastu/custom-elements.json`), with the
  keyboard behaviour, accessibility notes and usage guidance of each component.
- [`@firstprateek/vastu-lint`](https://www.npmjs.com/package/@firstprateek/vastu-lint) checks markup against it.
- [`@firstprateek/vastu-mcp`](https://www.npmjs.com/package/@firstprateek/vastu-mcp) serves it to agents over MCP.
- [`llms.txt`](https://firstprateek.github.io/vastu/llms.txt) and [`llms-full.txt`](https://firstprateek.github.io/vastu/llms-full.txt).

## License

ISC
