# Test Suite Organization Analysis - Seasons & Stars Module

## Executive Summary

The test suite contains **149 test files** with **2,792 test cases** (describe/it blocks) organized primarily in a **flat structure at the package root level** with minimal subdirectory organization. Tests are named by feature/module rather than by test type (unit/integration).

## Current Test Organization Structure

### Directory Layout

```
packages/core/
├── test/                          # Main test directory (147 files)
│   ├── [145 .test.ts files]       # Test files at root level (flat)
│   ├── calendars/                 # Calendar-specific tests (1 file)
│   │   └── cross-calendar-consistency.test.ts
│   ├── ui/                        # UI component tests (1 file)
│   │   └── calendar-mini-widget.test.ts
│   ├── mocks/                     # Mock/fixture data (1 file)
│   │   └── calendar-mocks.ts
│   ├── test-helpers/              # Test utility functions (1 file)
│   │   └── foundry-mocks.ts
│   ├── utils/                     # Test utilities (3 files)
│   │   ├── calendar-loader.ts
│   │   ├── mock-calendar-fetch.ts
│   │   └── test-logger.ts
│   ├── setup.ts                   # Global test configuration
│   └── test-types.d.ts            # TypeScript type definitions
│
├── test-headless/                 # Headless browser tests (2 files + support)
│   ├── connectivity.test.ts
│   ├── foundry-validation.test.ts
│   ├── BaseFoundryTest.ts
│   ├── FoundryTestClient.ts
│   └── headless-test.config.ts
```

### Test File Distribution

#### By Component/Feature (Top-level test files)

| Category | Count | Examples |
|----------|-------|----------|
| Calendar Engine | 8 | calendar-engine.test.ts, calendar-engine-error-handling.test.ts, calendar-engine-leap-year-regression.test.ts |
| Calendar Manager | 7 | calendar-manager.test.ts, calendar-manager-hook-payload.test.ts, calendar-manager-module-flags.test.ts |
| Mini Widget | 8 | mini-widget-day-display.test.ts, mini-widget-time-advancement.test.ts, mini-widget-settings-integration.test.ts |
| Sunrise/Sunset | 5 | sunrise-sunset-calculator.test.ts, sunrise-sunset-flexible-format.test.ts, sunrise-sunset-api.test.ts |
| Time Advancement | 4 | time-advancement-service.test.ts, time-advancement-integration.test.ts, time-advancement-behavior.test.ts |
| Date Formatter | 4 | date-formatter.test.ts, date-formatter-integration.test.ts, date-formatter-advanced.test.ts |
| Canonical Hours | 4 | canonical-hours-basic.test.ts, canonical-hours-calendar-integration.test.ts, canonical-hours-mini-widget.test.ts |
| Widgets (General) | 9 | widgets.test.ts, widget-manager.test.ts, widget-type-resolver.test.ts, widget-none-option.test.ts |
| Calendar Files/Loading | 3 | calendar-loader.test.ts, calendar-file-helpers.test.ts, calendar-file-path-handling.test.ts |
| Events/Notes | 8 | events-api.test.ts, events-manager.test.ts, note-permissions-validation.test.ts, event-recurrence-calculation.test.ts |
| Notes Management | 2 | notes-manager-sync-init-simple.test.ts, notes-manager-non-gm-init.test.ts |
| UI Components (Forms/Dialogs) | 6 | create-note-window.test.ts, calendar-deprecation-dialog.test.ts, calendar-selection-dialog-bug.test.ts |
| Intercalary Days | 10 | intercalary-format-resolution.test.ts, intercalary-round-trip.test.ts, intercalary-ui-workflow-simulation.test.ts |
| Module Initialization | 2 | module-initialization-simple.test.ts, module-initialization-calendar-settings.test.ts |
| Integration & API | 5 | api-wrapper.test.ts, bridge-integration.test.ts, module-api.test.ts, ui-integration.test.ts |
| Other (Settings, Keybindings, Moons, etc.) | 40+ | Various regression tests, bug fixes, moon phase tests, year crossing tests |

## Test Organization Patterns

### 1. Naming Convention

Tests follow a **feature-based naming pattern**:
```
[feature-name]-[scenario-or-variant].test.ts

Examples:
- calendar-engine.test.ts           (main module test)
- calendar-engine-error-handling.test.ts    (specific aspect)
- calendar-engine-leap-year-regression.test.ts (regression test)
- intercalary-format-resolution.test.ts     (specific scenario)
```

### 2. Test Organization Model (Current)

**Primarily by Feature/Module, not by Type:**
- Tests are grouped by what they test (the module/feature name)
- NOT organized as: unit/, integration/, e2e/
- NOT organized to mirror src/ directory structure
- NOT clearly separated by unit vs integration tests

### 3. Test Type Distribution

Based on file naming and imports analysis:

- **Unit Tests**: ~40% - Tests focused on single modules (calendar-engine.test.ts, date-formatter.test.ts)
- **Integration Tests**: ~50% - Tests involving multiple modules (calendar-manager-hook-payload.test.ts, ui-integration.test.ts)
- **Regression Tests**: ~10% - Tests for specific bugs (calendar-engine-leap-year-regression.test.ts, gregorian-weekday-bug.test.ts)
- **Headless Tests**: 2 files - Browser-based integration tests (test-headless/)

### 4. Test File Mapping to Source

Current mapping is **indirect**:

```
Source Structure:
src/
├── core/
│   ├── calendar-engine.ts          ↔ test/calendar-engine.test.ts
│   ├── calendar-manager.ts         ↔ test/calendar-manager*.test.ts (7+ files)
│   ├── date-formatter.ts           ↔ test/date-formatter*.test.ts (4 files)
│   ├── time-advancement-service.ts ↔ test/time-advancement*.test.ts (4 files)
│   └── notes-manager.ts            ↔ test/notes-manager*.test.ts (2 files)
│
├── ui/
│   ├── calendar-widget.ts          ↔ test/calendar-widget*.test.ts (3 files)
│   ├── calendar-mini-widget.ts     ↔ test/mini-widget*.test.ts (8 files)
│   ├── widget-manager.ts           ↔ test/widget-manager.test.ts
│   └── ...                         ↔ test/ui/ (only 1 file in subdirectory)
```

**Issues with current mapping:**
- One source file may have multiple test files (calendar-manager has 7)
- Not immediately obvious which tests belong to which source file
- Minimal use of directory mirroring (only 2 subdirectory tests)
- Test organization doesn't reflect source directory structure

## Test Infrastructure

### Global Setup (setup.ts)

- **Vitest with jsdom environment**
- Mock Foundry game object with basic properties
- Mock Hooks system with functional implementation
- Mock CalendarData for Foundry v13 integration
- Mock Handlebars template engine
- Console spy setup to silence test output
- PF2e environment setup utilities

### Test Utilities

Located in supporting directories:

**test/test-helpers/:**
- `foundry-mocks.ts` - Foundry-specific mock implementations

**test/utils/:**
- `calendar-loader.ts` - Test utilities for calendar loading
- `mock-calendar-fetch.ts` - Mock HTTP fetch for calendars
- `test-logger.ts` - Test-specific logger

**test/mocks/:**
- `calendar-mocks.ts` - Calendar data fixtures

### Test Framework Configuration

```typescript
// vitest.config.ts
- Environment: jsdom (DOM simulation)
- Globals: true (no imports needed for describe/it/expect)
- Setup Files: ./packages/core/test/setup.ts
- Include: packages/*/test/**/*.test.ts
- Coverage Thresholds: 80% across branches/functions/lines/statements
- Reporters: default, junit (for CI)
```

## Organization Issues & Patterns

### Current Issues

1. **Flat Structure at Root**
   - 145 test files in test/ root directory
   - Hard to navigate and find related tests
   - Mix of unit and integration tests without clear distinction

2. **Weak Source-Test Correspondence**
   - Not mirrored after src/ structure
   - One source file → multiple test files (no clear pattern)
   - Limited subdirectory organization (only 2 subdirs with tests)

3. **Regression Test Proliferation**
   - Multiple regression tests for same module (e.g., 10 intercalary-* tests)
   - Naming doesn't always distinguish between core tests and regressions
   - Makes it harder to understand core functionality tests

4. **Feature-Based Mixed Types**
   - calendar-engine.test.ts is largely unit tests
   - calendar-manager*.test.ts mixes unit and integration
   - No clear separation between test types

5. **UI Tests Scattered**
   - Only 1 test file in test/ui/ subdirectory
   - Other UI tests at root level (create-note-window.test.ts, calendar-deprecation-dialog.test.ts)
   - Inconsistent UI test organization

### Positive Patterns Currently Present

1. **Consistent Naming Convention**
   - Feature-based naming is clear and predictable
   - Regression tests identifiable with specific bug references

2. **Good Test Isolation**
   - Comprehensive Foundry mock setup in setup.ts
   - Tests can run independently

3. **Logical Grouping by Prefix**
   - Similar tests cluster together (mini-widget*, calendar-engine*, etc.)
   - Easy to find related tests by name

4. **Dedicated Subdirectories for Support**
   - test-helpers/, utils/, mocks/ for shared test infrastructure
   - Separation of concerns for test support files

## Statistics Summary

| Metric | Value |
|--------|-------|
| Total Test Files | 149 |
| Test Files at Root Level | 145 |
| Test Files in Subdirectories | 4 |
| Test Cases (describe/it blocks) | 2,792 |
| Source Files in core/src/ | 60+ |
| Source Files in core/src/core/ | 38 |
| Source Files in core/src/ui/ | 14 |
| Test-to-Source Ratio | ~2.5:1 (multiple tests per source file) |

## Test Framework & Tools

- **Test Runner**: Vitest with jsdom
- **Mocking**: Vitest vi.fn(), custom MockHooks, MockApplicationV2
- **Setup**: Global setup.ts with Foundry environment mocks
- **Coverage**: V8 provider, 80% thresholds
- **CI Integration**: JUnit XML reporter for GitHub Actions
- **Headless Tests**: Playwright for browser-based integration tests

## Related Test Guidance

From CLAUDE.md test guidelines:
- Each test file targets a single source module or workflow
- No conditional logic in tests
- Use deterministic data
- Assertions explicit and exact
- Prefer real functionality over mocks when feasible
- Unit tests isolate one source file
- Integration/regression tests cover complete workflows
- Keep tests self-contained with no external state

