# @firstprateek/vastu-lint

Checks HTML that uses [Vastu](https://firstprateek.github.io/vastu/) components against the component
manifest, and gives the exact fix for every problem. Built for people and for coding agents, which can run
it and act on the fixes without guessing.

```bash
npx @firstprateek/vastu-lint page.html        # exits 1 when there are errors
npx @firstprateek/vastu-lint --json page.html
```

```text
page.html:12:3  error  invalid-value  variant="primery" is not one of "primary", "secondary", "ghost", "danger".
    fix: Use variant="primary".
page.html:14:3  error  missing-name  <va-text-field> has no accessible name, so screen readers can't say what it is.
    fix: Add label="…". The `label` attribute, shown above the field. Every text field needs one.
```

```js
import { lint, format, rules } from '@firstprateek/vastu-lint';
const { problems, errorCount } = lint(html);
```

Rules: `unknown-element`, `unknown-attribute`, `invalid-value` (including boolean attributes set to
`"false"`), `missing-name`, `unknown-slot`, `command-target`, `tabs-structure`, `unknown-token`,
`native-instead`, `raw-color`, `strict-csp`, `role-on-component`.

## License

ISC
