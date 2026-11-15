# Vastu agent eval

- Date: 2026-11-15
- Agent: Claude Code, headless; model `claude-opus-5-5`, effort `high`; 1 run(s) per task and setup

## Pass rates

| Setup | Runs | All checks | renders | lint | axe | tokens | task | Avg cost | Avg turns |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| docs | 12 | **100%** | 100% | 100% | 100% | 100% | 100% | $0.093 | 3.7 |
| mcp | 12 | **100%** | 100% | 100% | 100% | 100% | 100% | $0.179 | 11.8 |

## Per task

| Task | docs | mcp |
| --- | --- | --- |
| signup-form | pass | pass |
| settings-tabs | pass | pass |
| delete-confirm | pass | pass |
| row-actions | pass | pass |
| save-toast | pass | pass |
| newsletter | pass | pass |
| dark-mode-switch | pass | pass |
| notification-prefs | pass | pass |
| icon-toolbar | pass | pass |
| product-search | pass | pass |
| sign-in-error | pass | pass |
| button-states | pass | pass |

## Failures
