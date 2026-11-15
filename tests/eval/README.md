# Agent eval

Can an agent build correct pages with Vastu? This eval gives an agent 12 page-building tasks and
scores what it builds, in two setups:

| Setup | What the agent gets |
| --- | --- |
| `docs` | The full reference, [`llms-full.txt`](https://firstprateek.github.io/vastu/llms-full.txt), in its system prompt |
| `mcp` | The [`vastu-mcp`](../../packages/mcp) tools instead: `list_components`, `find_component`, `get_component`, `get_tokens`, `validate_markup` |

Each page is scored in Chromium, under the same strict Content Security Policy as the test harness:

| Check | Passes when |
| --- | --- |
| renders | No console errors, page errors or CSP violations |
| lint | [`vastu-lint`](../../packages/lint) reports no errors |
| axe | No WCAG 2.2 AA violations |
| tokens | No hard-coded colours and no made-up `--va-…` tokens |
| task | The task's own Playwright checks pass (roles, names and behaviour, not markup) |

The tasks, their reference answers and their checks are in [`tasks.js`](tasks.js).

## Running it

```bash
pnpm build && pnpm build:docs
pnpm eval:dry                                   # scores each task's reference answer; no model calls
pnpm eval                                       # Claude Code, headless, with your claude sign-in
pnpm eval -- --agent api                        # the Claude API tool runner; needs ANTHROPIC_API_KEY
pnpm eval -- --tasks signup-form --setups mcp --repeat 3 --model claude-sonnet-5-5
```

The default agent is **Claude Code itself** (`claude -p`), run in an empty folder outside any project
with only Read, Write and Edit (plus the vastu MCP server in the `mcp` setup). It loads project settings
only and has auto-memory turned off, so nothing from the machine's own Claude Code setup reaches it.
With a Claude subscription it uses plan limits; the report shows what each run would cost at API prices.

Results go to `results/<date>/`: `report.md`, `results.json`, and for every run the page the agent
wrote (`site/runs/<task>/<setup>/<run>/`) with a screenshot.
