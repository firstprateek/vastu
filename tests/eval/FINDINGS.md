# What the agent eval found (2026-11-15)

Claude Code (headless, `claude -p`) on Claude Opus 5.5 at effort high built each of 12 pages twice:
once with Vastu's full reference (`llms-full.txt`) in its prompt (**docs**), once with the
`vastu-mcp` tools instead (**mcp**). One run per task and setup, so treat small differences as noise.

## Results

| Run | Setup | All checks pass | Fails on | Avg turns | Avg cost at API prices |
| --- | --- | --- | --- | --- | --- |
| [1, before fixes](results/2026-11-15-run1-before-fixes/report.md) | docs | 2 / 12 | tokens (10), task (1), axe (1) | 4.7 | $0.09 |
| | mcp | 10 / 12 | task (2) | 11.4 | $0.18 |
| [2, after fixes](results/2026-11-15-run2/report.md) | docs | **12 / 12** | | 3.7 | $0.09 |
| | mcp | **12 / 12** | | 11.8 | $0.18 |

The runs used a Claude Max subscription, so the costs are what the same runs would cost through the API.

## What run 1 found, and what changed

Every failure in run 1 was read by hand. Only one was the agent's fault, and none of the agent's choices
were unreasonable:

1. **The docs listed no design tokens.** `llms-full.txt` described every component but not the tokens,
   so the docs-setup agent guessed plausible names (`--va-space-4`, `--va-color-border`, `--va-radius-md`)
   with fallbacks. They looked right and did nothing. The mcp setup had `get_tokens` and never guessed.
   *Fix:* `llms-full.txt` now lists every token with its value and use, and the token sources gained
   descriptions.
2. **`va-checkbox` put its help text into its accessible name.** The agent used the `description` slot
   as documented; screen readers would have read "Email Sent to the address on your account." as the
   checkbox's name. This broke the same task in both setups. *Fix:* the checkbox is labelled by its
   label slot only and the help text is its description. A behaviour test now covers it.
3. **A disabled `va-text-field` faded its help text to 2.2:1 contrast.** Help text often says *why* a
   field is disabled, so it must stay readable. *Fix:* only the input box fades. The disabled example
   now has help text, so axe checks it in every brand and mode.
4. **One of the eval's own checks was wrong.** It looked for the text "report.pdf", which the agent had
   also (sensibly) put in the menu's label, "Actions for report.pdf". *Fix:* the check matches exactly.

Building the eval also found a bug before any agent ran: an error message appearing when a text field
lost focus pushed the next control down mid-click, so the click was lost. Errors now wait for the
pointer to be released.

## What it means

- **With complete docs, Opus 5.5 doesn't need the MCP server for these tasks.** Both setups passed
  everything in run 2, and the docs setup took a third of the turns at half the cost. Run 1's gap
  measured missing docs, not the value of tools.
- **The tools earn their place by catching what docs leave out.** In run 1, `get_tokens` made the mcp
  agent immune to the token gap, and in both runs the mcp agent ran `validate_markup` on every page
  (12 of 12 in run 2) before finishing.
- **The eval paid for itself by finding problems.** Three real defects in Vastu came from reading 12
  failures, none of which the 1,000+ component tests had caught: they only show up when someone builds
  a page the way the docs say to.

## Next

- **Harder tasks.** These 12 are at the ceiling for Opus 5.5. Next: multi-step flows (a wizard with
  validation), layouts that use several components together, and tasks that need the less obvious API
  (cancelling `va-close`, manual tab activation).
- **Smaller models.** Run the same tasks on Claude Sonnet 5.5 and Haiku 5.5, where the docs-versus-tools
  difference should be larger.
- **Repeats.** Three or more runs per task and setup, to separate real differences from noise.
