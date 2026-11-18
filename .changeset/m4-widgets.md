---
"@firstprateek/vastu": minor
"@firstprateek/vastu-mcp": minor
---

Add `va-navbar`, `va-poll` and `va-bar-chart`, rebuilt from the 2023 `minimal-navbar` (with `hamburger-btn`), `poll-widget` and `bar-chart` widgets. The navbar folds its links behind a Menu button below `collapse-below`; the poll takes `<button value data-votes>` answers and fires `va-select` on a vote; the chart takes `<data value>` elements and animates when they change. vastu-mcp's `find_component` knows the three new components.
