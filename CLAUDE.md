# Seasons & Stars Internal Development Context

> `AGENTS.md` is a symlink to this file for tool compatibility.

## Development Guidelines

- Source code is written in TypeScript and bundled with Rollup; do not commit generated `dist` output.
- All calendar data must be verifiable against publicly available information unless the user has explicitly confirmed the data's validity from an external source. Document verification by adding a `sources` array to calendar definitions when possible.
- Only include reference or book citations in the `sources` array when a user has supplied the exact citation text. Do not invent or summarize bibliography entries—use publicly accessible URLs instead.
- Before committing, run:
  - `npm run lint`
  - `npm run typecheck`
  - `npm run test:run`
  - `npm run build`
- Use `npm run format` or `npm run lint:fix` to resolve formatting issues.
- Write descriptive commit messages and keep pull requests focused.
- Continuous integration runs on Node 20, 22, and 24, executing lint, typecheck, build, tests, and calendar validation.
- PR titles must follow the Conventional Commits style.
- Refer to the GitHub Action config in `.github/workflows/semantic-pull-request.yml` for allowed commit message types and scopes.
- Releases are automated with [release-please](https://github.com/googleapis/release-please); do not manually edit version numbers or `CHANGELOG.md`.

### Simple Calendar Compatibility Bridge Coordination

- **Coordinate early:** When planning any Seasons & Stars API change, notify the maintainers of the [Simple Calendar Compatibility Bridge](https://github.com/rayners/foundryvtt-simple-calendar-compat) and link to the tracking issue/PR in both repositories.
- **What counts as an API change?** Treat the following as externally consumed surfaces that require Bridge validation:
  - Hook events documented in `docs/DEVELOPER-GUIDE.md` or exposed through `Hooks.call`/`Hooks.callAll`.
  - Exported TypeScript definitions, interfaces, or enums under `packages/core/src/types/` and any symbols re-exported from package entry points.
  - Public methods on `CalendarManager`, `CalendarEngine`, `BridgeIntegration`, or other classes referenced in integration guides.
  - JSON contracts passed between the compatibility layer and downstream modules (e.g., note payloads, time advancement messages).
- **Examples that require coordination:**
  - Renaming or removing a hook such as `seasons-and-stars.calendarUpdated` or changing its payload structure.
  - Adding mandatory parameters to `BridgeIntegration` methods or modifying the Simple Calendar translation tables.
  - Changing the schema of exported interfaces like `CalendarDateData` that compatibility bridges deserialize.
- **Process checklist:**
  1. Open or update an issue in the Bridge repository describing the required adjustments and reference the Seasons & Stars PR.
  2. Provide migration notes or a draft PR for the Bridge when feasible so dependent modules can test pre-release builds.
  3. Call out the coordination requirement in the Seasons & Stars changelog or release notes once the work lands.
- **Automation:** We are evaluating a GitHub Action that diffs exported symbols and hook declarations to flag potential API changes automatically. Until it lands, rely on manual review and err on the side of coordinating even “minor” tweaks.

## Module Architecture Deep Dive

### Calendar Engine Core (packages/core/src/core/)

**Primary Components**:

- `CalendarEngine`: Core date arithmetic and calendar interpretation
- `DateFormatter`: Human-readable date string generation with cultural context
- `TimeConverter`: Bidirectional worldTime <-> calendar date conversion
- `CalendarValidator`: JSON schema validation and error reporting
- `CalendarManager`: High-level calendar system coordination
- `CalendarLoader`: Dynamic calendar definition loading and caching
- `TimeAdvancementService`: Centralized time progression management

**Critical Implementation Details**:

- Uses `game.time.worldTime` as single source of truth
- JSON calendar definitions with fallback value handling
- Round-trip conversion testing prevents data loss bugs
- Intercalary day support requires special arithmetic handling
- **Monorepo Architecture**: Packages-based structure with core logic in packages/core/
- Notes system with recurring events, categories, and permissions
- Performance-optimized note management with search capabilities

### Widget System Architecture (packages/core/src/ui/)

**Widget Factory Pattern**:

- `WidgetManager`: Registration and lifecycle management
- `CalendarWidget`: Full calendar grid display
- `CalendarMiniWidget`: Compact date display with SmallTime integration
- `CalendarGridWidget`: Main calendar interface
- `QuickTimeButtons`: Time advancement controls (in core/)

**UI Integration Patterns**:

- Element-specific positioning (targets player list for mini widget)
- Automatic fallback positioning for cross-version compatibility
- Event-driven updates with debouncing for performance
- Dialog-based calendar selection and configuration

### System Integration Layer

**Game System Adapters**:

- `BridgeIntegration`: Modern integration approach (packages/core/src/core/)
- `CompatibilityManager`: Feature detection and graceful degradation
- Generic fallback patterns for unsupported systems

**Known Integration Challenges**:

- PF2e worldTime transform requires careful epoch handling
- WFRP calendar weekday calculation needs custom logic
- Cross-system date format consistency requires adaptation
- Bridge integration patterns for complex system interactions

## Development Session Patterns

### Debugging Workflows

**Systematic Bug Investigation**:

1. Reproduce with minimal test case
2. Trace through date conversion pipeline
3. Identify exact failure point in calendar arithmetic
4. Create regression test before fixing
5. Validate fix across all calendar systems

**Common Bug Patterns**:

- Intercalary day conversion issues (round-trip failures)
- Date boundary arithmetic errors (year/month transitions)
- UI synchronization problems (widget update timing)
- System integration conflicts (worldTime interpretation)

### Testing Strategy Details

**Test Organization**:

- Unit tests for individual calendar functions
- Integration tests for system adapters
- UI tests for widget behavior
- Regression tests for known bug patterns

**Critical Test Scenarios**:

- Intercalary day round-trip conversion
- Year boundary transitions (leap years, calendar changes)
- Multi-moon calendar phase calculations
- Cross-system date synchronization

### Quality Assurance Patterns

**Documentation Accuracy Requirements**:

- All calendar system claims verified with actual JSON definitions
- Feature compatibility tested across supported Foundry versions
- API examples verified with actual implementation
- Installation instructions tested in clean environment
- JSDoc examples validated against current code implementation (updated 2025-01-06)
- Hook events documented with accurate data structures and version information

**Release Validation Checklist**:

- 100% test pass rate across all scenarios
- Calendar JSON validation for all included definitions
- Widget positioning tested across different UI configurations
- System integration verified with latest game system versions

## Technical Debt and Improvement Areas

### Current Limitations

**Calendar Format Constraints**:

- Limited support for complex calendar reform scenarios
- Astronomical calculations simplified for performance
- Multi-calendar system support not yet implemented
- Dynamic calendar switching requires world restart

**UI Responsiveness**:

- Widget positioning relies on DOM element detection
- Cross-module UI conflicts possible with aggressive positioning
- Performance impact of frequent date calculations not optimized
- Accessibility features not fully implemented

### Planned Improvements

**Calendar Engine Enhancements**:

- Dynamic calendar switching without restart
- More sophisticated astronomical calculations
- Support for historical calendar reforms
- Multi-calendar system worlds

**Integration Expansion**:

- Additional game system adapters
- Enhanced Simple Calendar compatibility
- Module API for third-party integrations (improved documentation 2025-01-06)
- Weather and season integration hooks
- TimeAdvancementService API with comprehensive JSDoc examples
- Complete hook system documentation with integration patterns

## Notes Management System

### Core Note Features (packages/core/src/core/note-\*)

**Components**:

- `NotesManager`: Central note coordination and lifecycle management
- `NoteDocument`: Foundry Document integration for persistent storage
- `NotePermissions`: User-based access control and visibility rules
- `NoteRecurring`: Automated recurring note generation and management
- `NoteCategories`: Organizational system for note classification
- `NoteSearch`: Full-text search with filtering capabilities
- `NoteStorage`: Efficient data persistence and retrieval
- `NotePerformanceOptimizer`: Large dataset optimization strategies

**Key Features**:

- Calendar-integrated note display with date association
- Recurring notes (daily/weekly/monthly/yearly patterns)
- Category-based organization with custom colors and icons
- Permission-based visibility (GM-only, player-visible, etc.)
- Advanced search and filtering capabilities
- Performance optimization for large note collections

## Development Context Reference

### dev-context/ Directory

The `dev-context/` directory contains comprehensive development standards and patterns for FoundryVTT module development. This reference collection provides:

**Core Reference Documents**:

- `foundry-development-practices.md` - Complete development workflow and quality standards
- `testing-practices.md` - Comprehensive testing strategies (Vitest + Quench) and TDD workflow
- `module-architecture-patterns.md` - Universal module structure and system-agnostic design patterns
- `documentation-standards.md` - Documentation organization and quality requirements
- `automation-infrastructure.md` - Professional CI/CD workflows and release management
- `ai-code-access-restrictions.md` - Security boundaries for AI code access (READ FIRST)
- `external-documentation-references.md` - Official FoundryVTT docs and approved community resources

**Usage Pattern**: Reference specific documents as needed rather than loading all context. For example:

- Development workflow questions → `dev-context/foundry-development-practices.md`
- Testing implementation → `dev-context/testing-practices.md`
- Architecture decisions → `dev-context/module-architecture-patterns.md`

**Integration**: This context enforces universal standards including documentation accuracy (no hyperbole), TDD workflow, 90%+ test coverage for core logic, and system-agnostic design patterns.

## Session Context Requirements

### Essential Context Sources

**Before Any Session**:

- Review recent session logs in `../sessions/` for similar issues
- Check calendar JSON definitions for affected systems
- Verify current test status and any failing scenarios
- Review integration requirements for target systems

**For Bug Investigation Sessions**:

- Gather exact reproduction steps from users
- Review similar issues from session history
- Check calendar arithmetic edge cases
- Prepare debugging environment with relevant calendars

**For Feature Development Sessions**:

- Review existing patterns for similar functionality
- Plan test cases before implementation
- Consider system integration requirements
- Design UI integration approach

### Development Environment Setup

**Required Tools**:

- `npm test` - Runs full test suite (1300+ tests) in watch mode during TDD
- `npm run test:run` - Runs full test suite once (same as CI)
- `npm run test:coverage` - Full test suite with coverage report
- `npm run test:workspaces` - Workspace-only tests (use for targeted testing)
- `npm run test:ui` - Interactive test UI for development
- Calendar JSON validator for schema verification
- Multiple browser tabs for cross-system testing
- FoundryVTT development instance with test worlds

**CRITICAL**: Always use `npm test` or `npm run test:run` for comprehensive testing. Current test suite runs 1316 tests with full coverage of monorepo packages.

**Context Loading Priority**:

1. Current module state and recent changes
2. Related session logs and debugging patterns
3. Calendar system requirements and edge cases
4. Integration requirements and compatibility constraints

---

**Usage**: This context is automatically loaded by module CLAUDE.md and provides detailed technical context for effective development sessions.
