# Seasons & Stars Test Suite Comprehensive Analysis

**Date**: 2025-01-10  
**Total Test Files**: 147  
**Source Files Analyzed**: 54

This document provides a complete mapping of all test files to source files, categorizes them by type (unit/integration/regression), identifies overlaps, and highlights gaps in coverage.

---

## 1. UNIT TESTS

Unit tests focus on a single source file/function/class in isolation with minimal dependencies.

### Core Module Unit Tests

#### `packages/core/src/core/api-wrapper.ts`
**Tests**: `api-wrapper.test.ts` ✅  
**Category**: Unit  
**Coverage**: Comprehensive - tests all validation methods, error handling, and logging

#### `packages/core/src/core/logger.ts`
**Tests**: `logger.test.ts` ✅  
**Category**: Unit  
**Coverage**: Basic logging functionality

#### `packages/core/src/core/calendar-time-utils.ts`
**Tests**: `calendar-time-utils.test.ts` ✅  
**Category**: Unit  
**Coverage**: Utility functions for time calculations

#### `packages/core/src/core/manager-access-utils.ts`
**Tests**: `manager-access-utils.test.ts` ✅  
**Category**: Unit  
**Coverage**: Manager access helper functions

#### `packages/core/src/core/calendar-validator.ts`
**Tests**: 
- `calendar-validator-errors.test.ts` ✅
- `calendar-json-syntax-validation.test.ts` ✅  
**Category**: Unit  
**Coverage**: Validation logic and error reporting  
**Note**: Two test files for same source - potential overlap

#### `packages/core/src/core/calendar-loader.ts`
**Tests**: `calendar-loader.test.ts` ✅  
**Category**: Unit  
**Coverage**: Calendar loading logic

#### `packages/core/src/core/sunrise-sunset-calculator.ts`
**Tests**:
- `sunrise-sunset-calculator.test.ts` ✅
- `sunrise-sunset-api.test.ts` ✅
- `sunrise-sunset-seconds-to-string.test.ts` ✅
- `sunrise-sunset-time-components.test.ts` ✅
- `sunrise-sunset-flexible-format.test.ts` ✅  
**Category**: Unit  
**Coverage**: Comprehensive but fragmented across 5 files  
**Overlap**: HIGH - Multiple files testing same source

#### `packages/core/src/core/calendar-date.ts`
**Tests**:
- `calendar-date-formatting.test.ts` ✅
- `calendar-date-counts-for-weekdays.test.ts` ✅  
**Category**: Mixed (formatting is integration, countsForWeekdays is unit)  
**Coverage**: Partial - formatting and specific methods

#### `packages/core/src/core/date-formatter.ts`
**Tests**:
- `date-formatter.test.ts` ✅
- `date-formatter-advanced.test.ts` ✅
- `date-formatter-edge-cases.test.ts` ✅
- `date-formatter-bounds-check.test.ts` ✅
- `date-formatter-integration.test.ts` ✅  
**Category**: Mixed  
**Coverage**: Comprehensive but fragmented  
**Overlap**: HIGH - 5 files with overlapping scenarios

#### `packages/core/src/core/event-time-utils.ts`
**Tests**: `event-time-utils.test.ts` ✅  
**Category**: Unit  
**Coverage**: Event time utility functions

#### `packages/core/src/core/event-recurrence-calculator.ts`
**Tests**: `event-recurrence-calculation.test.ts` ✅  
**Category**: Unit  
**Coverage**: Recurrence calculation logic

#### `packages/core/src/core/predefined-formats.ts`
**Tests**: `predefined-formats.test.ts` ✅  
**Category**: Unit  
**Coverage**: Predefined format constants

---

### UI Module Unit Tests

#### `packages/core/src/ui/sidebar-button-registry.ts`
**Tests**: `sidebar-button-registry.test.ts` ✅  
**Category**: Unit  
**Coverage**: Button registry functionality

#### `packages/core/src/ui/sidebar-button-mixin.ts`
**Tests**: `sidebar-button-mixin.test.ts` ✅  
**Category**: Unit  
**Coverage**: Mixin functionality

#### `packages/core/src/ui/widget-type-resolver.ts`
**Tests**: `widget-type-resolver.test.ts` ✅  
**Category**: Unit  
**Coverage**: Widget type resolution logic

#### `packages/core/src/ui/calendar-file-helpers.ts`
**Tests**: 
- `calendar-file-helpers.test.ts` ✅
- `calendar-file-path-handling.test.ts` ✅
- `calendar-file-pending-state.test.ts` ✅  
**Category**: Unit  
**Coverage**: File handling utilities  
**Overlap**: MEDIUM - Three files for same source

---

## 2. INTEGRATION TESTS

Integration tests exercise multiple components working together across file boundaries.

### Calendar Engine Integration

#### Multiple Components
**Tests**: `calendar-engine.test.ts` ✅  
**Components**: CalendarEngine + CalendarValidator + CalendarDate  
**Category**: Integration  
**Coverage**: Comprehensive - date arithmetic, conversions, multi-day intercalary

#### Calendar Manager Integration
**Tests**:
- `calendar-manager-sync-init-simple.test.ts` ✅
- `calendar-manager-init-no-settings-save.test.ts` ✅
- `calendar-manager-non-gm-init.test.ts` ✅
- `calendar-manager-lazy-events.test.ts` ✅
- `calendar-manager-hook-payload.test.ts` ✅
- `calendar-manager-module-flags.test.ts` ✅
- `calendar-manager-optional-intercalary.test.ts` ✅  
**Components**: CalendarManager + CalendarEngine + Settings + Hooks  
**Category**: Integration  
**Coverage**: Initialization patterns, permissions, hooks

#### Notes Manager Integration
**Tests**:
- `notes-manager-sync-init-simple.test.ts` ✅
- `notes-manager-non-gm-init.test.ts` ✅  
**Components**: NotesManager + permissions + initialization  
**Category**: Integration

#### Time Advancement Integration
**Tests**:
- `time-advancement-service.test.ts` ✅
- `time-advancement-integration.test.ts` ✅
- `time-advancement-behavior.test.ts` ✅  
**Components**: TimeAdvancementService + CalendarManager + Widgets  
**Category**: Integration  
**Overlap**: MEDIUM - Three related test files

### Widget Integration Tests

#### Calendar Widget Integration
**Tests**:
- `calendar-widget-gm-permissions.test.ts` ✅
- `calendar-widget-sidebar-template.test.ts` ✅
- `calendar-widget-sunrise-sunset.test.ts` ✅
- `main-widget-time-advancement.test.ts` ✅  
**Components**: CalendarWidget + permissions + templates + time advancement  
**Category**: Integration

#### Calendar Mini Widget Integration
**Tests**:
- `calendar-mini-widget-gm-permissions.test.ts` ✅
- `canonical-hours-mini-widget.test.ts` ✅
- `mini-widget-compact-mode.test.ts` ✅
- `mini-widget-day-display.test.ts` ✅
- `mini-widget-moon-phases.test.ts` ✅
- `mini-widget-pinned-position.test.ts` ✅
- `mini-widget-settings-integration.test.ts` ✅
- `mini-widget-sunrise-sunset-click.test.ts` ✅
- `mini-widget-time-advancement.test.ts` ✅
- `mini-widget-time-display.test.ts` ✅  
**Components**: CalendarMiniWidget + various features  
**Category**: Integration  
**Overlap**: HIGH - 10 files for mini widget features

#### Calendar Grid Widget Integration
**Tests**:
- `calendar-grid-widget-set-year.test.ts` ✅
- `calendar-click-behavior.test.ts` ✅  
**Components**: CalendarGridWidget + user interaction  
**Category**: Integration

#### Widget Management Integration
**Tests**:
- `widget-manager.test.ts` ✅
- `widget-instance-manager.test.ts` ✅
- `widget-factory-registration.test.ts` ✅
- `widget-sync-integration.test.ts` ✅
- `widget-format-integration.test.ts` ✅
- `widget-none-option.test.ts` ✅
- `widget-none-option-behavior.test.ts` ✅  
**Components**: WidgetManager + factory pattern + settings  
**Category**: Integration  
**Overlap**: MEDIUM

### Feature Integration Tests

#### Bridge Integration
**Tests**: `bridge-integration.test.ts` ✅  
**Components**: SeasonsStarsIntegration + SidebarButtonRegistry + widgets  
**Category**: Integration

#### External Calendar Integration
**Tests**:
- `external-calendar-registration.test.ts` ✅
- `external-variants.test.ts` ✅  
**Components**: CalendarManager + external calendar loading  
**Category**: Integration

#### Foundry Calendar Integration
**Tests**:
- `foundry-calendar-class.test.ts` ✅
- `foundry-calendar-config.test.ts` ✅  
**Components**: Foundry v13 calendar integration  
**Category**: Integration

#### Quick Time Buttons Integration
**Tests**:
- `quick-time-buttons.test.ts` ✅
- `quick-time-buttons-integration.test.ts` ✅
- `always-show-quick-time-buttons.test.ts` ✅  
**Components**: QuickTimeButtons + settings + widgets  
**Category**: Integration  
**Overlap**: MEDIUM

#### Events/Notes Integration
**Tests**:
- `events-api.test.ts` ✅
- `events-api-wrapper.test.ts` ✅
- `events-multi-day.test.ts` ✅
- `event-occurrence-hooks.test.ts` ✅
- `note-dialogs.test.ts` ✅
- `note-permissions-validation.test.ts` ✅
- `note-deletion-cleanup.test.ts` ✅
- `create-note-window.test.ts` ✅  
**Components**: Events/Notes system + API + UI  
**Category**: Integration

#### Calendar Features Integration
**Tests**:
- `calendar-variants.test.ts` ✅
- `calendar-year-offset-variants.test.ts` ✅
- `multi-moon-calendars.test.ts` ✅
- `moon-phase-tracking.test.ts` ✅
- `moon-overrides.test.ts` ✅
- `season-year-crossing.test.ts` ✅  
**Components**: Various calendar features working together  
**Category**: Integration

#### Canonical Hours Integration
**Tests**:
- `canonical-hours-basic.test.ts` ✅
- `canonical-hours-calendar-integration.test.ts` ✅
- `canonical-hours-helper-direct.test.ts` ✅  
**Components**: Canonical hours + calendar + helpers  
**Category**: Integration  
**Overlap**: LOW

#### Settings Integration
**Tests**:
- `calendar-settings-registration.test.ts` ✅
- `active-calendar-file-setting.test.ts` ✅
- `settings-preview.test.ts` ✅  
**Components**: Settings system + module initialization  
**Category**: Integration

#### UI Integration
**Tests**:
- `ui-integration.test.ts` ✅
- `ui/calendar-mini-widget.test.ts` ✅
- `applicationv2-template-parts.test.ts` ✅  
**Components**: UI components + templates + ApplicationV2  
**Category**: Integration

#### Module Integration
**Tests**:
- `module-api.test.ts` ✅
- `module-initialization-simple.test.ts` ✅
- `module-initialization-calendar-settings.test.ts` ✅  
**Components**: Module initialization + API setup  
**Category**: Integration

#### Miscellaneous Integration
**Tests**:
- `calendar-changed-hook.test.ts` ✅
- `calendar-selection-dialog-bug.test.ts` ✅
- `calendar-deprecation-dialog.test.ts` ✅
- `calendar-source-verification.test.ts` ✅
- `foundry-path-url-conversion.test.ts` ✅
- `helper-context-usage.test.ts` ✅
- `helper-parameter-verification.test.ts` ✅
- `icon-url-support.test.ts` ✅
- `integration-detection-timing.test.ts` ✅
- `production-error-notifications.test.ts` ✅
- `star-trek-helpers-functionality.test.ts` ✅
- `widgets.test.ts` ✅
- `federation-standard-widget-format.test.ts` ✅
- `duplicate-code-consolidation.test.ts` ✅  
**Category**: Integration

---

## 3. REGRESSION TESTS

Regression tests specifically written to prevent known bugs from reoccurring.

### Calendar Engine Regressions

**Tests**:
- `calendar-engine-leap-year-regression.test.ts` ✅  
  **Bug**: Leap year calculation inconsistencies  
  **Source**: CalendarEngine  
  
- `calendar-engine-negative-leap-regression.test.ts` ✅  
  **Bug**: Negative leap days with existing calendars  
  **Source**: CalendarEngine  
  
- `calendar-engine-worldtime-interpretation-regression.test.ts` ✅  
  **Bug**: GitHub Issue #20 - PF2e Calendar Date Mismatch  
  **Source**: CalendarEngine  
  **Critical**: Prevents calendars from being stuck at epoch

### Intercalary Day Regressions

**Tests**:
- `intercalary-fix-verification.test.ts` ✅  
  **Bug**: Intercalary day handling  
  
- `intercalary-round-trip.test.ts` ✅  
  **Bug**: Intercalary day conversion issues  
  
- `intercalary-year-boundary-bug.test.ts` ✅  
  **Bug**: Year boundary with intercalary days  
  
- `intercalary-user-scenario-reproduction.test.ts` ✅  
  **Bug**: Real user-reported scenario  
  
- `intercalary-ui-workflow-simulation.test.ts` ✅  
  **Bug**: UI workflow with intercalary days  
  
- `intercalary-format-recursion.test.ts` ✅  
  **Bug**: Format recursion issue  
  
- `intercalary-format-resolution.test.ts` ✅  
  **Bug**: Format resolution  
  
- `intercalary-null-safety.test.ts` ✅  
  **Bug**: Null safety for intercalary  
  
- `intercalary-template-variable.test.ts` ✅  
  **Bug**: Template variable handling  
  
- `intercalary-before-functionality.test.ts` ✅  
  **Bug**: "before" positioning  
  
- `intercalary-first-day-year.test.ts` ✅  
  **Bug**: First day of year handling

### Calendar Selection/Loading Regressions

**Tests**:
- `active-calendar-onchange-caching.test.ts` ✅  
  **Bug**: Race condition - "Calendar not found" error  
  **Source**: calendar-selection-handler.ts

- `calendar-selection-dialog-bug.test.ts` ✅  
  **Bug**: Dialog selection issues

### Widget Regressions

**Tests**:
- `widget-toggle-race-condition-bug.test.ts` ✅  
  **Bug**: Widget toggle race condition  
  
- `widget-toggle-fix-verification.test.ts` ✅  
  **Bug**: Widget toggle fix verification  
  
- `should-show-pause-button-race-condition.test.ts` ✅  
  **Bug**: Pause button display race condition

- `time-advancement-race-condition.test.ts` ✅  
  **Bug**: Time advancement race condition

### Event/Hook Regressions

**Tests**:
- `event-hook-double-fire-bug.test.ts` ✅  
  **Bug**: Hooks firing twice  
  
- `event-year-rollover.test.ts` ✅  
  **Bug**: Year rollover in events

- `event-visibility-security.test.ts` ✅  
  **Bug**: Event visibility security issue

### Other Regressions

**Tests**:
- `gregorian-weekday-bug.test.ts` ✅  
  **Bug**: Gregorian weekday calculation  
  
- `day-of-year-bounds-checking.test.ts` ✅  
  **Bug**: Day of year bounds  
  
- `worldtime-edge-cases-comprehensive.test.ts` ✅  
  **Bug**: Various worldTime edge cases  
  
- `year-calculation-behavior.test.ts` ✅  
  **Bug**: Year calculation edge cases

- `comprehensive-regression.test.ts` ✅  
  **Bug**: Multiple regression scenarios

### Performance Regressions

**Tests**:
- `performance-baseline.test.ts` ✅  
  **Type**: Performance regression prevention

---

## 4. CALENDAR-SPECIFIC TESTS

**Location**: `packages/core/test/calendars/`

**Tests**:
- `cross-calendar-consistency.test.ts` ✅  
  **Type**: Integration  
  **Coverage**: Tests consistency across different calendar types

---

## 5. SOURCE FILES WITHOUT DEDICATED UNIT TESTS

### Core Files Lacking Unit Tests

- `packages/core/src/core/bridge-integration.ts` - Only integration tests
- `packages/core/src/core/calendar-date.ts` - Only partial coverage (formatting, countsForWeekdays)
- `packages/core/src/core/calendar-engine.ts` - Only integration tests
- `packages/core/src/core/calendar-localization.ts` - **NO TESTS** ❌
- `packages/core/src/core/calendar-manager.ts` - Only integration tests
- `packages/core/src/core/calendar-selection-handler.ts` - Only regression test
- `packages/core/src/core/compatibility-manager.ts` - Only integration tests
- `packages/core/src/core/constants.ts` - **NO TESTS** ❌
- `packages/core/src/core/errors-echoes-integration.ts` - **NO TESTS** ❌
- `packages/core/src/core/events-manager.ts` - Only integration tests
- `packages/core/src/core/foundry-calendar-class.ts` - Only integration tests
- `packages/core/src/core/foundry-calendar-config.ts` - Only integration tests
- `packages/core/src/core/foundry-calendar-integration.ts` - **NO TESTS** ❌
- `packages/core/src/core/gregorian-defaults.ts` - Only integration tests
- `packages/core/src/core/keybindings.ts` - **NO TESTS** ❌
- `packages/core/src/core/note-categories.ts` - **NO TESTS** ❌
- `packages/core/src/core/note-document.ts` - **NO TESTS** ❌
- `packages/core/src/core/note-performance-optimizer.ts` - **NO TESTS** ❌
- `packages/core/src/core/note-permissions.ts` - Only integration tests
- `packages/core/src/core/note-recurring.ts` - Only integration tests  
- `packages/core/src/core/note-search.ts` - **NO TESTS** ❌
- `packages/core/src/core/note-storage.ts` - **NO TESTS** ❌
- `packages/core/src/core/notes-manager.ts` - Only integration tests
- `packages/core/src/core/quick-time-buttons.ts` - Only integration tests
- `packages/core/src/core/settings-preview.ts` - Only integration tests
- `packages/core/src/core/time-converter.ts` - Only integration tests
- `packages/core/src/core/validation-utils.ts` - **NO TESTS** ❌

### UI Files Lacking Unit Tests

- `packages/core/src/ui/base-widget-manager.ts` - **NO TESTS** ❌
- `packages/core/src/ui/calendar-deprecation-dialog.ts` - Only integration tests
- `packages/core/src/ui/calendar-grid-widget.ts` - Only integration tests
- `packages/core/src/ui/calendar-mini-widget.ts` - Only integration tests
- `packages/core/src/ui/calendar-selection-dialog.ts` - Only integration tests
- `packages/core/src/ui/calendar-widget.ts` - Only integration tests
- `packages/core/src/ui/create-note-window.ts` - Only integration tests
- `packages/core/src/ui/note-editing-dialog.ts` - **NO TESTS** ❌
- `packages/core/src/ui/scene-controls.ts` - **NO TESTS** ❌
- `packages/core/src/ui/widget-manager.ts` - Only integration tests

### Module Entry Files

- `packages/core/src/module.ts` - Only integration tests
- `packages/core/src/types/type-guards.ts` - **NO TESTS** ❌

---

## 6. REDUNDANT/OVERLAPPING TESTS

### High Overlap

**Sunrise/Sunset** - 5 test files for 1 source file:
- `sunrise-sunset-calculator.test.ts`
- `sunrise-sunset-api.test.ts`
- `sunrise-sunset-seconds-to-string.test.ts`
- `sunrise-sunset-time-components.test.ts`
- `sunrise-sunset-flexible-format.test.ts`
**Recommendation**: Consolidate into `sunrise-sunset-calculator.test.ts` (unit) and `sunrise-sunset-api.test.ts` (integration)

**DateFormatter** - 5 test files for 1 source file:
- `date-formatter.test.ts`
- `date-formatter-advanced.test.ts`
- `date-formatter-edge-cases.test.ts`
- `date-formatter-bounds-check.test.ts`
- `date-formatter-integration.test.ts`
**Recommendation**: Consolidate into `date-formatter.test.ts` (unit) and keep integration test

**Mini Widget** - 10 test files for 1 UI component:
- All `mini-widget-*.test.ts` files
**Recommendation**: Consolidate into unit and integration categories

**Intercalary Days** - 11 test files, many overlapping:
- All `intercalary-*.test.ts` files
**Recommendation**: Keep regression tests separate, consolidate functional tests

### Medium Overlap

**Calendar Validator** - 2 test files:
- `calendar-validator-errors.test.ts`
- `calendar-json-syntax-validation.test.ts`
**Recommendation**: Merge into single unit test file

**Calendar File Helpers** - 3 test files:
- `calendar-file-helpers.test.ts`
- `calendar-file-path-handling.test.ts`
- `calendar-file-pending-state.test.ts`
**Recommendation**: Consolidate into single unit test file

**Time Advancement** - 3 test files:
- `time-advancement-service.test.ts`
- `time-advancement-integration.test.ts`
- `time-advancement-behavior.test.ts`
**Recommendation**: Keep service (unit) and integration separate, merge behavior into one

**Widget Management** - 7 test files with overlapping widget management tests
**Recommendation**: Consolidate by feature

**Quick Time Buttons** - 3 test files:
- `quick-time-buttons.test.ts`
- `quick-time-buttons-integration.test.ts`
- `always-show-quick-time-buttons.test.ts`
**Recommendation**: Merge into unit and integration

**Widget Toggle** - 2 regression test files:
- `widget-toggle-race-condition-bug.test.ts`
- `widget-toggle-fix-verification.test.ts`
**Recommendation**: Merge into single regression test

**Widget None Option** - 2 test files:
- `widget-none-option.test.ts`
- `widget-none-option-behavior.test.ts`
**Recommendation**: Merge into single test file

---

## 7. RECOMMENDED TEST REORGANIZATION

### Proposed Directory Structure

```
packages/core/test/
├── unit/
│   ├── core/
│   │   ├── api-wrapper.test.ts
│   │   ├── calendar-date.test.ts (consolidated)
│   │   ├── calendar-loader.test.ts
│   │   ├── calendar-time-utils.test.ts
│   │   ├── calendar-validator.test.ts (merged from 2 files)
│   │   ├── date-formatter.test.ts (merged from 5 files)
│   │   ├── event-recurrence-calculator.test.ts
│   │   ├── event-time-utils.test.ts
│   │   ├── logger.test.ts
│   │   ├── manager-access-utils.test.ts
│   │   ├── predefined-formats.test.ts
│   │   └── sunrise-sunset-calculator.test.ts (merged from 5 files)
│   └── ui/
│       ├── calendar-file-helpers.test.ts (merged from 3 files)
│       ├── sidebar-button-mixin.test.ts
│       ├── sidebar-button-registry.test.ts
│       └── widget-type-resolver.test.ts
│
├── integration/
│   ├── calendar-engine/
│   │   ├── calendar-engine.test.ts
│   │   ├── gregorian-defaults.test.ts
│   │   ├── leap-year-handling.test.ts
│   │   ├── negative-leap-days.test.ts
│   │   ├── optional-leap-year.test.ts
│   │   └── world-creation-timestamp.test.ts
│   ├── calendar-manager/
│   │   ├── initialization.test.ts (merged from multiple files)
│   │   ├── hooks.test.ts
│   │   ├── permissions.test.ts
│   │   └── optional-intercalary.test.ts
│   ├── widgets/
│   │   ├── calendar-widget.test.ts (merged)
│   │   ├── calendar-mini-widget.test.ts (merged from 10 files)
│   │   ├── calendar-grid-widget.test.ts
│   │   ├── widget-management.test.ts (merged from 7 files)
│   │   └── quick-time-buttons.test.ts (merged from 3 files)
│   ├── events-notes/
│   │   ├── events-api.test.ts (merged)
│   │   ├── notes-manager.test.ts (merged)
│   │   └── note-permissions.test.ts
│   ├── time-advancement/
│   │   ├── time-advancement-service.test.ts (merged from 3 files)
│   │   └── time-advancement-integration.test.ts
│   ├── calendars/
│   │   ├── multi-moon.test.ts
│   │   ├── canonical-hours.test.ts (merged from 3 files)
│   │   ├── calendar-variants.test.ts
│   │   └── cross-calendar-consistency.test.ts
│   ├── bridge/
│   │   └── bridge-integration.test.ts
│   ├── foundry/
│   │   ├── foundry-calendar.test.ts (merged)
│   │   └── applicationv2-templates.test.ts
│   ├── module/
│   │   ├── module-initialization.test.ts (merged)
│   │   ├── module-api.test.ts
│   │   └── settings.test.ts (merged)
│   └── ui/
│       └── ui-integration.test.ts
│
└── regression/
    ├── calendar-engine/
    │   ├── leap-year-regression.test.ts
    │   ├── negative-leap-regression.test.ts
    │   ├── worldtime-interpretation-regression.test.ts
    │   └── day-of-year-bounds.test.ts
    ├── calendar-selection/
    │   ├── onchange-caching-regression.test.ts
    │   └── selection-dialog-regression.test.ts
    ├── intercalary/
    │   ├── intercalary-round-trip.test.ts
    │   ├── intercalary-year-boundary.test.ts
    │   ├── intercalary-user-scenario.test.ts
    │   ├── intercalary-ui-workflow.test.ts
    │   ├── intercalary-format.test.ts (merged from 3 files)
    │   └── intercalary-functionality.test.ts (merged)
    ├── widgets/
    │   ├── widget-toggle-regression.test.ts (merged from 2 files)
    │   └── pause-button-race-condition.test.ts
    ├── events/
    │   ├── event-hook-double-fire.test.ts
    │   ├── event-year-rollover.test.ts
    │   └── event-visibility-security.test.ts
    ├── time-advancement/
    │   └── time-advancement-race-condition.test.ts
    ├── gregorian-weekday-regression.test.ts
    ├── worldtime-edge-cases.test.ts
    ├── year-calculation-regression.test.ts
    └── comprehensive-regression.test.ts
```

---

## 8. CONSOLIDATION RECOMMENDATIONS

### Files to Merge

1. **Sunrise/Sunset (5→2 files)**:
   - Merge: calculator, seconds-to-string, time-components, flexible-format → `sunrise-sunset-calculator.test.ts`
   - Keep separate: `sunrise-sunset-api.test.ts` (integration)

2. **DateFormatter (5→2 files)**:
   - Merge: base, advanced, edge-cases, bounds-check → `date-formatter.test.ts`
   - Keep separate: `date-formatter-integration.test.ts`

3. **Calendar Validator (2→1 file)**:
   - Merge: errors + json-syntax → `calendar-validator.test.ts`

4. **Calendar File Helpers (3→1 file)**:
   - Merge: helpers + path-handling + pending-state → `calendar-file-helpers.test.ts`

5. **Mini Widget (10→2 files)**:
   - Unit tests: permissions, display, settings → `calendar-mini-widget.test.ts`
   - Integration tests: compact-mode, moon-phases, sunrise-sunset-click, time-advancement, time-display, pinned-position → `calendar-mini-widget-integration.test.ts`

6. **Intercalary (11→6 files)**:
   - Keep regression tests separate (7 files)
   - Merge: format-recursion, format-resolution, null-safety, template-variable → `intercalary-functionality.test.ts`

7. **Time Advancement (3→2 files)**:
   - Merge: service + behavior → `time-advancement-service.test.ts`
   - Keep: integration

8. **Calendar Manager (7→3 files)**:
   - Initialization: sync-init-simple + init-no-settings-save + non-gm-init → `calendar-manager-initialization.test.ts`
   - Keep separate: hooks, module-flags, lazy-events

9. **Quick Time Buttons (3→2 files)**:
   - Merge: base + always-show → `quick-time-buttons.test.ts`
   - Keep: integration

10. **Widget Toggle (2→1 file)**:
    - Merge: race-condition + fix-verification → `widget-toggle-regression.test.ts`

### Estimated Reduction

**Current**: 147 test files  
**After consolidation**: ~85-90 test files  
**Reduction**: ~55-60 files (~40% reduction)

---

## 9. CRITICAL GAPS IN COVERAGE

### No Tests At All (12 files)

1. `calendar-localization.ts` ❌
2. `constants.ts` ❌
3. `errors-echoes-integration.ts` ❌
4. `foundry-calendar-integration.ts` ❌
5. `keybindings.ts` ❌
6. `note-categories.ts` ❌
7. `note-document.ts` ❌
8. `note-performance-optimizer.ts` ❌
9. `note-search.ts` ❌
10. `note-storage.ts` ❌
11. `validation-utils.ts` ❌
12. `type-guards.ts` ❌
13. `base-widget-manager.ts` ❌
14. `note-editing-dialog.ts` ❌
15. `scene-controls.ts` ❌

### Only Integration Tests (No Unit Tests)

Major components that should have dedicated unit tests:
- CalendarEngine (complex date arithmetic)
- CalendarManager (complex state management)
- CalendarDate (partial coverage only)
- TimeConverter
- CompatibilityManager
- All widget classes (CalendarWidget, CalendarMiniWidget, CalendarGridWidget)
- WidgetManager
- EventsManager
- NotesManager

---

## 10. SUMMARY STATISTICS

**Total Test Files**: 147

**By Category**:
- Unit Tests: ~15 files (10%)
- Integration Tests: ~105 files (71%)
- Regression Tests: ~27 files (18%)

**Test Distribution**:
- Core module tests: ~90 files (61%)
- UI module tests: ~50 files (34%)
- Calendar-specific tests: ~1 file (1%)
- Module-level tests: ~6 files (4%)

**Coverage Analysis**:
- Source files with unit tests: ~15 (28%)
- Source files with only integration tests: ~27 (50%)
- Source files with no tests: ~12 (22%)

**Overlap Analysis**:
- High overlap (5+ test files for 1 source): 4 areas
- Medium overlap (2-4 test files for 1 source): 8 areas
- Total redundant files: ~60-70 files

**Recommended Actions**:
1. Create unit tests for 12 untested source files
2. Extract unit tests from integration tests for major components
3. Consolidate 60-70 redundant test files
4. Reorganize into unit/integration/regression structure
5. Target result: ~85-90 well-organized test files with better coverage

---

## 11. NEXT STEPS

1. **Phase 1**: Create missing unit tests (priority: CalendarEngine, CalendarManager, CalendarDate)
2. **Phase 2**: Consolidate redundant tests (start with high-overlap areas)
3. **Phase 3**: Reorganize into new directory structure
4. **Phase 4**: Update CI/CD to reflect new structure
5. **Phase 5**: Document testing patterns and conventions

