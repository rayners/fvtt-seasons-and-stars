# AGENTS Instructions

This repository provides calendar tools for games in Foundry Virtual Tabletop (VTT), including modules and compendium packs.

## Development Guidelines

- Source code is written in TypeScript and bundled with Rollup; do not commit generated `dist` output.
- Before committing, run:
  - `npm run lint` to check for linting issues
  - `npm run typecheck` to validate TypeScript types
  - `npm run test:run` to execute the Vitest unit tests once
  - `npm run build` to ensure packages compile
- Use `npm run format` or `npm run lint:fix` to automatically fix formatting problems.
- Prefer descriptive commit messages and keep pull requests focused.

## GitHub Workflows & Tooling

- Continuous integration runs on Node 18 and 20 via GitHub Actions (`rayners/foundry-module-actions/ci`), performing lint, typecheck, build, tests with coverage, and calendar validation.
- PR titles should follow the Conventional Commits style to satisfy the Semantic Pull Request workflow.
- Releases are automated with [release-please](https://github.com/googleapis/release-please); do not manually edit version numbers or `CHANGELOG.md`.

## Foundry Resources

For API and general development information about Foundry VTT consult:

- [Foundry VTT API Reference](https://foundryvtt.com/api/)
- [Foundry VTT Community Wiki](https://foundryvtt.wiki)

Additional AGENTS.md files in subdirectories may provide more specific instructions.
