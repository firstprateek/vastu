# @firstprateek/vastu

## 1.1.0

### Minor Changes

- 0528849: Add `va-navbar`, `va-poll` and `va-bar-chart`, rebuilt from the 2023 `minimal-navbar` (with `hamburger-btn`), `poll-widget` and `bar-chart` widgets. The navbar folds its links behind a Menu button below `collapse-below`; the poll takes `<button value data-votes>` answers and fires `va-select` on a vote; the chart takes `<data value>` elements and animates when they change. vastu-mcp's `find_component` knows the three new components.

### Patch Changes

- @firstprateek/vastu-tokens@1.1.0

## 1.0.0

### Major Changes

- First stable release. Eight components (button, checkbox, switch, text field, tabs, dialog, menu, toast) in two brands (vastu, lekha) with light, dark and high-contrast modes; a markup validator; an MCP server for coding agents. Every documented attribute, event, slot, styling hook and keyboard behaviour is covered by contract tests generated from the component manifest.

### Patch Changes

- Updated dependencies
  - @firstprateek/vastu-tokens@1.0.0
