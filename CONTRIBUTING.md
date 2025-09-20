# Contributing to Seasons & Stars

Thank you for your interest in contributing to Seasons & Stars! This document provides guidelines for contributing to the project.

## Project Structure

Seasons & Stars is organized as a **monorepo with split modules**:

- **`packages/core/`** - Core calendar engine and widgets (`seasons-and-stars`)
- **`packages/pf2e-pack/`** - PF2e-specific calendars (`seasons-and-stars-pf2e`) _[Coming Soon]_
- **`packages/fantasy-pack/`** - Fantasy calendar collection (`seasons-and-stars-fantasy`)
- **`packages/scifi-pack/`** - Sci-fi calendar collection (`seasons-and-stars-scifi`)
- **`packages/test-module/`** - Integration testing helpers

Each module can be installed independently, with the core module required for calendar pack functionality.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
- [Development Setup](#development-setup)
- [Making Changes](#making-changes)
- [Submitting Changes](#submitting-changes)
- [Coding Standards](#coding-standards)
- [Testing](#testing)
- [Documentation](#documentation)
- [Module-Specific Guidelines](#module-specific-guidelines)

## Code of Conduct

This project follows the [Contributor Covenant Code of Conduct](CODE_OF_CONDUCT.md). By participating, you are expected to uphold this code.

## Getting Started

### Prerequisites

- Node.js 18+ and npm
- Foundry VTT v13+ for testing
- Git
- TypeScript knowledge recommended

### Development Setup

1. **Fork and Clone**

   ```bash
   git clone https://github.com/your-username/fvtt-seasons-and-stars.git
   cd fvtt-seasons-and-stars
   ```

2. **Install Dependencies** (installs for all modules)

   ```bash
   npm install
   ```

3. **Build All Modules**

   ```bash
   npm run build
   ```

4. **Link to Foundry** (optional - links all modules)

   ```bash
   npm run link-electron  # For Electron app
   npm run link-node      # For Node.js version
   ```

5. **Run Tests** (tests all modules)
   ```bash
   npm run test:run
   ```

### Module-Specific Development

To work on a specific module:

```bash
# Build only core module
npm run build --workspace=packages/core

# Test only core module
npm run test --workspace=packages/core

# Watch mode for core development
npm run watch --workspace=packages/core

# Validate calendars in specific pack
npm run validate:calendars --workspace=packages/fantasy-pack
```

## Making Changes

### Branch Naming

Use descriptive branch names with module context:

- `feature/core-calendar-widget-enhancement`
- `fix/core-smalltime-integration-positioning`
- `feat/fantasy-pack-eberron-calendar`
- `fix/scifi-pack-traveller-date-format`
- `docs/contributing-split-modules`

### Commit Messages

Follow conventional commit format with module-specific scopes:

```
type(scope): description

feat(core): add monthly grid widget
fix(core): resolve SmallTime integration positioning
feat(fantasy-pack): add Eberron calendar definition
fix(scifi-pack): correct Traveller date formatting
docs(contributing): update for split modules
chore(monorepo): update workspace configuration
```

**Types**: `feat`, `fix`, `docs`, `style`, `refactor`, `test`, `chore`
**Scopes**: `core`, `fantasy-pack`, `scifi-pack`, `pf2e-pack`, `golarion`, `ui`, `api`, `tests`, `ci`, `deps`, `deps-dev`, `monorepo`, `docs`

## Submitting Changes

### Pull Request Process

1. **Create Feature Branch**

   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **Make Your Changes**
   - Follow coding standards
   - Add/update tests
   - Update documentation

3. **Test Your Changes**

   ```bash
   npm run validate  # Runs tests, build, and typecheck
   ```

4. **Commit and Push**

   ```bash
   git add .
   git commit -m "feat(scope): description"
   git push origin feature/your-feature-name
   ```

5. **Create Pull Request**
   - Use the PR template
   - Fill out all applicable sections
   - Link related issues

### Pull Request Requirements

- [ ] All tests pass (`npm run test:run`)
- [ ] Build succeeds (`npm run build`)
- [ ] TypeScript compiles cleanly (`npm run typecheck`)
- [ ] Code follows project standards
- [ ] Documentation updated if needed
- [ ] Self-review completed

## Coding Standards

### TypeScript

- Use strict TypeScript configuration
- Prefer interfaces over types for object shapes
- Use proper typing for Foundry VTT APIs
- Avoid `any` types - use proper Foundry type definitions

### Code Style

- Use 2 spaces for indentation
- Prefer `const` over `let` where possible
- Use descriptive variable and function names
- Add JSDoc comments for public APIs

### File Organization

**Monorepo Structure:**

```
packages/
  core/
    src/
      core/        # Calendar engine and business logic
      ui/          # UI widgets and components
      types/       # TypeScript type definitions
      styles/      # SCSS styling
    templates/     # Handlebars templates
    test/          # Unit tests
  fantasy-pack/
    calendars/     # Calendar JSON definitions
    test/          # Calendar validation tests
  scifi-pack/
    calendars/     # Calendar JSON definitions
    test/          # Calendar validation tests
```

**Core Module File Organization:**

```
packages/core/src/
  core/
    calendar-manager.ts    # Main calendar orchestration
    calendar-engine.ts     # Date arithmetic and conversion
    time-converter.ts      # World time integration
  ui/
    widgets/              # Calendar display widgets
    applications/         # Settings and configuration UIs
  types/
    calendar.ts           # Calendar definition interfaces
    foundry.ts           # Foundry VTT type extensions
```

### Naming Conventions

- **Classes**: PascalCase (`CalendarWidget`)
- **Functions/Variables**: camelCase (`getCurrentDate`)
- **Constants**: UPPER_SNAKE_CASE (`DEFAULT_CALENDAR_ID`)
- **Files**: kebab-case (`calendar-widget.ts`)

## Testing

### Unit Tests

- Write tests for new functionality
- Test edge cases and error conditions
- Use the existing mock framework in `test/setup.ts`
- Aim for >80% coverage on core business logic

### Integration Testing

Test module integration points:

- Simple Calendar Compatibility Bridge
- Simple Weather integration
- SmallTime positioning
- Calendar widget functionality

### Running Tests

```bash
npm run test:run      # Run all tests once
npm run test:watch    # Run tests in watch mode
npm run coverage      # Generate coverage report
```

## Simple Calendar Compatibility Bridge Coordination

Maintaining parity with the [Simple Calendar Compatibility Bridge](https://github.com/rayners/foundryvtt-simple-calendar-compat) keeps downstream modules functioning when we evolve the Seasons & Stars API.

### When to Coordinate

- Changes to documented hook names, payloads, or invocation timing.
- Updates to exported TypeScript interfaces, enums, or helper types under `packages/core/src/types/` (including re-exports from package entry points).
- Signature or behavior changes for public classes that integrators touch, such as `CalendarManager`, `CalendarEngine`, `BridgeIntegration`, and other APIs highlighted in `docs/DEVELOPER-GUIDE.md` and `docs/INTEGRATION-GUIDE.md`.
- Adjustments to JSON structures passed between the bridge and external modules (note payloads, time advancement messages, integration metadata, etc.).

### Examples Requiring Bridge Updates

- Removing or renaming hooks like `seasons-and-stars.calendarUpdated` or altering the shape of their payload objects.
- Adding new required parameters to bridge translation utilities or changing default behaviors that Simple Calendar expects.
- Refactoring exported types such as `CalendarDateData` or `BridgeRegistrationConfig` in a way that breaks existing consumers.

### Coordination Checklist

1. Open or update an issue in the Bridge repository describing the planned change and link to the Seasons & Stars PR.
2. Provide migration guidance or a draft PR for the Bridge when feasible so dependent module authors can test against the update.
3. Reference the bridge coordination in release notes or changelog entries to keep the community informed.

### Automation Outlook

We are exploring a GitHub Action that monitors exported symbols and hook declarations to automatically flag potential API changes. Until that lands, treat manual coordination as mandatory for any change that might affect the bridge.

## Documentation

### Code Documentation

- Add JSDoc comments for all public APIs
- Document complex logic with inline comments
- Include examples in API documentation

### User Documentation

- Update user guides for new features
- Include screenshots for UI changes
- Update migration guides if needed

### Documentation Files

- `README.md` - Overview and quick start
- `docs/USER-GUIDE.md` - Comprehensive user manual
- `docs/DEVELOPER-GUIDE.md` - API and integration documentation
- `docs/MIGRATION-GUIDE.md` - Migration from Simple Calendar

## Issue Guidelines

### Choosing the Right Issue Template

**Bug Report** - Use for unexpected behavior in any module:

- Include the specific affected module (Core, Fantasy Pack, Sci-Fi Pack, etc.)
- Steps to reproduce
- Expected vs actual behavior
- Console errors and Foundry/module versions

**Feature Request** - Use for new functionality:

- Specify target module (Core for engine features, specific pack for calendars)
- Include problem statement and proposed solution
- Consider cross-module implications

**Calendar Pack Issue** - Use for calendar-specific problems:

- Calendar definition errors
- Incorrect date calculations for specific calendars
- Pack-specific integration issues
- Calendar validation failures

**Module Integration Issue** - Use for cross-module problems:

- Issues involving multiple S&S modules
- Compatibility with external modules
- System integration problems
- Cross-module dependency issues

### GitHub Project Board

We use [@rayners's Foundry Modules](https://github.com/users/rayners/projects/3) project board for task management. After creating an issue:

1. **Module Assignment**: Issue will be tagged with the appropriate S&S module
2. **Priority Triage**: Maintainers will assign priority and size estimates
3. **Contributor Views**: Use filtered views to find work matching your interests:
   - "S&S Core Contributors" - Core engine work
   - "Calendar Pack Contributors" - Calendar definitions and pack work
   - "External Contributors Welcome" - Good first issues and help wanted

## Module Integration

### Simple Calendar Compatibility

- Changes to bridge integration require careful testing
- Bridge module handles all Simple Calendar-specific requirements
- S&S core should remain bridge-agnostic

### Other Module Integration

- Test with SmallTime, Simple Weather, About Time
- Ensure graceful degradation when modules unavailable
- Use feature detection rather than version checking

## Release Process

Releases follow semantic versioning:

- **Major** (v1.0.0): Breaking changes
- **Minor** (v0.1.0): New features, backward compatible
- **Patch** (v0.1.1): Bug fixes, backward compatible

## Module-Specific Guidelines

### Core Module (`packages/core/`)

**Focus**: Calendar engine, widgets, time conversion, Foundry integration

**Key Areas**:

- Calendar arithmetic and date conversion logic
- UI widgets (calendar grid, mini widget, time controls)
- Foundry VTT API integration and compatibility
- Performance optimization and memory management

**Testing Requirements**:

- Unit tests for all calendar arithmetic
- Integration tests for Foundry API usage
- Cross-system compatibility testing
- Widget positioning and responsiveness tests

### Calendar Packs (`packages/*-pack/`)

**Focus**: Calendar definitions, cultural accuracy, system integration

**Key Areas**:

- JSON calendar definitions following the schema
- Historical and cultural accuracy research
- Game system-specific adaptations
- Localization and translation support

**Testing Requirements**:

- Calendar validation tests (automatic)
- Date arithmetic verification tests
- Round-trip conversion tests (worldTime ↔ calendar date)
- Cultural accuracy review by subject matter experts

**Calendar Definition Guidelines**:

- Research historical sources when possible
- Include cultural context in calendar descriptions
- Test edge cases (leap years, intercalary days, calendar reforms)
- Provide multiple date format options for user preference
- Document sources and inspirations in calendar metadata

### PF2e Pack (Coming Soon)

The PF2e pack will focus on:

- Pathfinder 2e-specific calendar integration
- Golarion calendar systems (Absalom Reckoning, etc.)
- Campaign-specific calendar variants
- Enhanced worldTime synchronization

### Cross-Module Development

When working across multiple modules:

1. **Core API Changes**: Test impact on all calendar packs
2. **Calendar Schema Updates**: Validate all existing calendar definitions
3. **Release Coordination**: Use "Release Coordination" project field to track dependencies
4. **Breaking Changes**: Coordinate major version bumps across affected modules

## Getting Help

- **Issues**: Check existing issues first, use appropriate template
- **Project Board**: Check [@rayners's Foundry Modules](https://github.com/users/rayners/projects/3) for current priorities
- **Discussions**: Use GitHub Discussions for questions and design discussions
- **Discord**: Find @rayners78 on the Foundry VTT Discord
- **Documentation**: Check docs.rayners.dev for comprehensive guides

## License

By contributing, you agree that your contributions will be licensed under the same MIT License that covers this project.

---

Thank you for contributing to Seasons & Stars! Your help makes this module better for the entire Foundry VTT community.
