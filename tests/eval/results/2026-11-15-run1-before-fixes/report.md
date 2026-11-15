# Vastu agent eval

- Date: 2026-11-15
- Agent: Claude Code, headless; model `claude-opus-5-5`, effort `high`; 1 run(s) per task and setup

## Pass rates

| Setup | Runs | All checks | renders | lint | axe | tokens | task | Avg cost | Avg turns |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| docs | 12 | **17%** | 100% | 100% | 92% | 17% | 92% | $0.094 | 4.7 |
| mcp | 12 | **83%** | 100% | 100% | 100% | 100% | 83% | $0.179 | 11.4 |

## Per task

| Task | docs | mcp |
| --- | --- | --- |
| signup-form | fail (tokens) | pass |
| settings-tabs | fail (tokens) | pass |
| delete-confirm | fail (tokens) | pass |
| row-actions | fail (tokens) | fail (task) |
| save-toast | pass | pass |
| newsletter | fail (tokens) | pass |
| dark-mode-switch | pass | pass |
| notification-prefs | fail (tokens, task) | fail (task) |
| icon-toolbar | fail (tokens) | pass |
| product-search | fail (tokens) | pass |
| sign-in-error | fail (tokens) | pass |
| button-states | fail (axe, tokens) | pass |

## Failures

### signup-form (docs, run 1)

- **tokens**: --va-space-8 is not a Vastu token or component property, so it has no value.; --va-space-4 is not a Vastu token or component property, so it has no value.; --va-space-2 is not a Vastu token or component property, so it has no value.; --va-space-6 is not a Vastu token or component property, so it has no value.; --va-space-5 is not a Vastu token or component property, so it has no value.; --va-space-2 is not a Vastu token or component property, so it has no value.

### settings-tabs (docs, run 1)

- **tokens**: --va-space-6 is not a Vastu token or component property, so it has no value.; --va-space-4 is not a Vastu token or component property, so it has no value.; --va-space-6 is not a Vastu token or component property, so it has no value.; --va-space-2 is not a Vastu token or component property, so it has no value.; --va-space-4 is not a Vastu token or component property, so it has no value.; --va-space-1 is not a Vastu token or component property, so it has no value.; --va-space-4 is not a Vastu token or component property, so it has no value.; --va-space-5 is not a Vastu token or component property, so it has no value.; --va-space-6 is not a Vastu token or component property, so it has no value.; --va-space-4 is not a Vastu token or component property, so it has no value.

### delete-confirm (docs, run 1)

- **tokens**: --va-space-3 is not a Vastu token or component property, so it has no value.; --va-space-6 is not a Vastu token or component property, so it has no value.

### row-actions (docs, run 1)

- **tokens**: --va-space-6 is not a Vastu token or component property, so it has no value.; --va-space-4 is not a Vastu token or component property, so it has no value.; --va-space-4 is not a Vastu token or component property, so it has no value.; --va-color-border is not a Vastu token or component property, so it has no value.; --va-radius-md is not a Vastu token or component property, so it has no value.; --va-space-3 is not a Vastu token or component property, so it has no value.; --va-space-3 is not a Vastu token or component property, so it has no value.; --va-space-4 is not a Vastu token or component property, so it has no value.; --va-color-border is not a Vastu token or component property, so it has no value.

### row-actions (mcp, run 1)

- **task**: expect(locator).toBeVisible() failed  Locator: getByText('report.pdf') Expected: visible

### newsletter (docs, run 1)

- **tokens**: --va-space-6 is not a Vastu token or component property, so it has no value.; --va-space-4 is not a Vastu token or component property, so it has no value.; --va-space-4 is not a Vastu token or component property, so it has no value.; --va-space-3 is not a Vastu token or component property, so it has no value.; --va-space-4 is not a Vastu token or component property, so it has no value.

### notification-prefs (docs, run 1)

- **tokens**: --va-space-6 is not a Vastu token or component property, so it has no value.; --va-space-4 is not a Vastu token or component property, so it has no value.; --va-space-3 is not a Vastu token or component property, so it has no value.; --va-font-weight-semibold is not a Vastu token or component property, so it has no value.; --va-space-3 is not a Vastu token or component property, so it has no value.
- **task**: expect(locator).toBeChecked() failed  Locator: getByRole('checkbox', { name: /^email$/i }) Expected: checked

### notification-prefs (mcp, run 1)

- **task**: expect(locator).toBeChecked() failed  Locator: getByRole('checkbox', { name: /^email$/i }) Expected: checked

### icon-toolbar (docs, run 1)

- **tokens**: --va-color-border is not a Vastu token or component property, so it has no value.; --va-radius-md is not a Vastu token or component property, so it has no value.; --va-space-1 is not a Vastu token or component property, so it has no value.; --va-space-2 is not a Vastu token or component property, so it has no value.; --va-color-border is not a Vastu token or component property, so it has no value.; --va-space-3 is not a Vastu token or component property, so it has no value.; --va-space-4 is not a Vastu token or component property, so it has no value.

### product-search (docs, run 1)

- **tokens**: --va-space-3 is not a Vastu token or component property, so it has no value.

### sign-in-error (docs, run 1)

- **tokens**: --va-space-8 is not a Vastu token or component property, so it has no value.; --va-space-4 is not a Vastu token or component property, so it has no value.; --va-space-6 is not a Vastu token or component property, so it has no value.; --va-space-4 is not a Vastu token or component property, so it has no value.

### button-states (docs, run 1)

- **axe**: color-contrast: Elements must meet minimum color contrast ratio thresholds
- **tokens**: --va-space-6 is not a Vastu token or component property, so it has no value.; --va-space-6 is not a Vastu token or component property, so it has no value.; --va-space-6 is not a Vastu token or component property, so it has no value.; --va-color-border is not a Vastu token or component property, so it has no value.; --va-space-3 is not a Vastu token or component property, so it has no value.; --va-space-2 is not a Vastu token or component property, so it has no value.; --va-space-6 is not a Vastu token or component property, so it has no value.; --va-space-2 is not a Vastu token or component property, so it has no value.; --va-color-border is not a Vastu token or component property, so it has no value.; --va-space-4 is not a Vastu token or component property, so it has no value.
