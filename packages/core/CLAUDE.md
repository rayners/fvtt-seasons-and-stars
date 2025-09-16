# Seasons & Stars Package Guidelines

This package is part of the Seasons & Stars suite of calendar tools for Foundry Virtual Tabletop (VTT).

Follow the repository guidelines in the [root CLAUDE.md](../../CLAUDE.md):

- From the repository root, run `npm run lint`, `npm run typecheck`, `npm run test:run`, and `npm run build` before committing.
- Version numbers and changelogs are managed by release-please; avoid editing them manually.

Additional CLAUDE.md files in subdirectories may offer more specific instructions.

When making any changes to the exposed Seasons & Stars API (including hooks, TypeScript definitions, or externally consumed integration points), ensure the [Simple Calendar Compatibility Bridge](https://github.com/rayners/foundryvtt-simple-calendar-compat) module is kept in sync. Coordinate updates with that repository and file or update a tracking issue there so downstream users are aware of the required compatibility work.
