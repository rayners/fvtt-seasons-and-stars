# AGENTS Instructions

This repository provides calendar tools for games in Foundry Virtual Tabletop (VTT), including modules and compendium packs.

## Development Guidelines

- Follow the existing coding standards enforced by ESLint and Prettier.
- Before committing, run:
  - `npm run lint` to check for linting issues
  - `npm test` to execute the unit tests
- Use `npm run format` or `npm run lint:fix` to automatically fix formatting problems.
- Prefer descriptive commit messages and keep pull requests focused.

## GitHub Workflows & Tooling

- Continuous integration and security checks run via GitHub Actions.
- PR titles should follow the Conventional Commits style to satisfy the Semantic Pull Request workflow.
- Releases are automated with [release-please](https://github.com/googleapis/release-please); do not manually edit version numbers or `CHANGELOG.md`.

## Foundry Resources

For API and general development information about Foundry VTT consult:

- [Foundry VTT API Reference](https://foundryvtt.com/api/)
- [Foundry VTT Community Wiki](https://foundryvtt.wiki)

Additional AGENTS.md files in subdirectories may provide more specific instructions.
