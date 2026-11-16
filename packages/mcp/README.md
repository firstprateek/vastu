# @firstprateek/vastu-mcp

An MCP server that helps coding agents build with [Vastu](https://firstprateek.github.io/vastu/): find the
right component, read its full API and the design tokens, and validate the markup they write.

```bash
claude mcp add vastu -- npx -y @firstprateek/vastu-mcp
```

Any MCP client works; the server runs over stdio.

| Tool | What it does |
| --- | --- |
| `list_components` | Every component, plus setup rules |
| `find_component` | Ranks components for a need described in plain words ("confirm before deleting"), with when not to use each |
| `get_component` | One component's full API: attributes with allowed values, events, commands, slots, styling hooks, keyboard, accessibility, examples |
| `get_tokens` | Design tokens with their values for a brand and mode |
| `validate_markup` | Runs [vastu-lint](https://www.npmjs.com/package/@firstprateek/vastu-lint) and returns every problem with its fix |

Everything comes from the same manifest that drives Vastu's docs and contract tests, so the answers can't
drift from the components. `find_component` is deterministic (no model call).

In [Vastu's agent eval](https://github.com/firstprateek/vastu/blob/main/tests/eval/FINDINGS.md), Claude Code
with this server ran `validate_markup` on every page it built before finishing.

## License

ISC
