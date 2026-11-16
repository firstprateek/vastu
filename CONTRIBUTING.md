# Contributing to Vastu

Thanks for helping. Vastu is small on purpose: a handful of components, each with every check in place.

- **Read first:** [`AGENTS.md`](AGENTS.md) has the commands, the API conventions, how to add a component, the
  release process and the security rules. [`docs/design.md`](docs/design.md) explains the design.
- **Before opening a pull request:** run `pnpm check` and `pnpm build:docs`, and add a changeset
  (`pnpm changeset`) if you changed a published package.
- **Bugs and ideas:** open an issue with the smallest HTML that shows the problem. If vastu-lint or a dev-build
  warning gave a wrong or unhelpful fix, include its message.
- **Security problems:** please don't open a public issue. Use GitHub's private vulnerability reporting
  on this repository instead.
