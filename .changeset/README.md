# Changesets

Every pull request that changes a published package adds a changeset: `pnpm changeset`, pick the bump,
write one line for the changelog. The four packages are versioned together (`fixed` in `config.json`),
so they always share a version number.

To release: `pnpm changeset version` (bumps versions and writes changelogs), commit, then run the
**Release** workflow on GitHub. It publishes every package whose version isn't on npm yet.
