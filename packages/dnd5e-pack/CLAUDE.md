# D&D 5e Pack Development Context

## Package Overview

This package provides integration between Seasons & Stars and the D&D 5th Edition game system's calendar API.

## Key Integration Points

### dnd5e System Calendar API

The dnd5e system (v4.0+) provides a calendar API through `CONFIG.DND5E.calendar`:

- `calendars`: Array of calendar definitions with `value`, `label`, `config`, and optional `class`
- `formatters`: Array of date/time formatters with `value`, `label`, `formatter`, and optional `group`
- `application`: The calendar HUD application class

### Hooks

**dnd5e Hooks:**

- `dnd5e.setupCalendar` - Called during init, allows modifying calendar config. Return `false` to disable system calendar.
- `updateWorldTime` - Enhanced with `options.dnd5e.deltas` containing midnights, middays, sunrises, sunsets counts

**Seasons & Stars Hooks (listened to):**

- `seasons-stars:dnd5e:systemDetected` - Triggered when dnd5e system is detected
- `seasons-stars:calendarChanged` - Triggered when active calendar changes
- `seasons-stars:dateChanged` - Triggered when current date/time changes
- `seasons-stars:ready` - Triggered when S&S is fully initialized

## Testing Requirements

- Test files must be created before implementation (TDD)
- One test file per source file
- Use `setup-dnd5e.ts` for environment setup utilities
- Follow patterns from `packages/pf2e-pack/test/`

## Build Configuration

- Rollup config at root: `rollup.config.dnd5e-pack.js`
- TypeScript config shared from root: `tsconfig.json`
- Output to: `dist/dnd5e-pack/`

## File Structure

```
packages/dnd5e-pack/
├── src/
│   └── dnd5e-pack.ts       # Main integration module
├── test/
│   ├── setup-dnd5e.ts      # Test environment setup
│   └── dnd5e-integration.test.ts
├── package.json
├── module.json
├── README.md
├── CLAUDE.md
└── CHANGELOG.md
```
