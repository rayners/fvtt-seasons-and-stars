# Test Suite Consolidation Mapping

Quick reference for file consolidations during reorganization.

## High-Priority Consolidations

### 1. Sunrise/Sunset: 5 → 2 files

```
SOURCE FILES:
├── sunrise-sunset-calculator.test.ts
├── sunrise-sunset-seconds-to-string.test.ts
├── sunrise-sunset-time-components.test.ts
├── sunrise-sunset-flexible-format.test.ts
└── sunrise-sunset-api.test.ts

DESTINATION:
├── unit/core/sunrise-sunset-calculator.test.ts (merged 4 files)
└── integration/calendars/sunrise-sunset-api.test.ts (moved)
```

**Action**: Consolidate calculator + seconds-to-string + time-components + flexible-format

---

### 2. DateFormatter: 5 → 2 files

```
SOURCE FILES:
├── date-formatter.test.ts
├── date-formatter-advanced.test.ts
├── date-formatter-edge-cases.test.ts
├── date-formatter-bounds-check.test.ts
└── date-formatter-integration.test.ts

DESTINATION:
├── unit/core/date-formatter.test.ts (merged 4 files)
└── integration/calendar-engine/date-formatter-integration.test.ts (moved)
```

**Action**: Consolidate base + advanced + edge-cases + bounds-check

---

### 3. Calendar Validator: 2 → 1 file

```
SOURCE FILES:
├── calendar-validator-errors.test.ts
└── calendar-json-syntax-validation.test.ts

DESTINATION:
└── unit/core/calendar-validator.test.ts (merged 2 files)
```

**Action**: Merge errors + json-syntax

---

### 4. Calendar File Helpers: 3 → 1 file

```
SOURCE FILES:
├── calendar-file-helpers.test.ts
├── calendar-file-path-handling.test.ts
└── calendar-file-pending-state.test.ts

DESTINATION:
└── unit/ui/calendar-file-helpers.test.ts (merged 3 files)
```

**Action**: Consolidate all helpers tests

---

### 5. Mini Widget: 10 → 3 files

```
SOURCE FILES:
├── calendar-mini-widget-gm-permissions.test.ts
├── canonical-hours-mini-widget.test.ts
├── mini-widget-compact-mode.test.ts
├── mini-widget-day-display.test.ts
├── mini-widget-moon-phases.test.ts
├── mini-widget-pinned-position.test.ts
├── mini-widget-settings-integration.test.ts
├── mini-widget-sunrise-sunset-click.test.ts
├── mini-widget-time-advancement.test.ts
└── mini-widget-time-display.test.ts

DESTINATION:
├── unit/ui/calendar-mini-widget.test.ts
│   └── permissions + day-display
├── integration/widgets/calendar-mini-widget-features.test.ts
│   └── moon-phases + sunrise-sunset-click + canonical-hours + settings
└── integration/widgets/calendar-mini-widget-advanced.test.ts
    └── time-advancement + compact-mode + pinned-position + time-display
```

**Action**: Split by unit vs integration, group by feature area

---

### 6. Intercalary: 11 → 8 files

```
SOURCE FILES:
├── intercalary-fix-verification.test.ts
├── intercalary-round-trip.test.ts
├── intercalary-year-boundary-bug.test.ts
├── intercalary-user-scenario-reproduction.test.ts
├── intercalary-ui-workflow-simulation.test.ts
├── intercalary-format-recursion.test.ts
├── intercalary-format-resolution.test.ts
├── intercalary-null-safety.test.ts
├── intercalary-template-variable.test.ts
├── intercalary-before-functionality.test.ts
└── intercalary-first-day-year.test.ts

DESTINATION:
regression/intercalary/
├── intercalary-fix-verification.test.ts (moved)
├── intercalary-round-trip.test.ts (moved)
├── intercalary-year-boundary-bug.test.ts (moved)
├── intercalary-user-scenario-reproduction.test.ts (moved)
├── intercalary-ui-workflow-simulation.test.ts (moved)
├── intercalary-before-functionality.test.ts (moved)
├── intercalary-first-day-year.test.ts (moved)
├── intercalary-null-safety.test.ts (moved)
└── intercalary-format.test.ts (merged 3 files)
    └── format-recursion + format-resolution + template-variable
```

**Action**: Keep regression tests separate, merge format tests

---

## Medium-Priority Consolidations

### 7. Time Advancement: 3 → 2 files

```
SOURCE FILES:
├── time-advancement-service.test.ts
├── time-advancement-behavior.test.ts
└── time-advancement-integration.test.ts

DESTINATION:
integration/time-advancement/
├── time-advancement-service.test.ts (merged service + behavior)
└── time-advancement-integration.test.ts (moved)

regression/time-advancement/
└── time-advancement-race-condition.test.ts (moved)
```

**Action**: Merge service + behavior

---

### 8. Calendar Manager: 7 → 4 files

```
SOURCE FILES:
├── calendar-manager-sync-init-simple.test.ts
├── calendar-manager-init-no-settings-save.test.ts
├── calendar-manager-non-gm-init.test.ts
├── calendar-manager-hook-payload.test.ts
├── calendar-manager-lazy-events.test.ts
├── calendar-manager-module-flags.test.ts
└── calendar-manager-optional-intercalary.test.ts

DESTINATION:
integration/calendar-manager/
├── initialization.test.ts (merged 3 files)
│   └── sync-init-simple + init-no-settings-save + non-gm-init
├── hooks.test.ts (renamed from hook-payload)
├── lazy-events.test.ts (moved)
├── module-flags.test.ts (moved)
└── optional-intercalary.test.ts (moved)
```

**Action**: Consolidate initialization tests

---

### 9. Quick Time Buttons: 3 → 2 files

```
SOURCE FILES:
├── quick-time-buttons.test.ts
├── always-show-quick-time-buttons.test.ts
└── quick-time-buttons-integration.test.ts

DESTINATION:
integration/widgets/
├── quick-time-buttons.test.ts (merged base + always-show)
└── quick-time-buttons-integration.test.ts (moved)
```

**Action**: Merge base + always-show

---

### 10. Widget Toggle Regression: 2 → 1 file

```
SOURCE FILES:
├── widget-toggle-race-condition-bug.test.ts
└── widget-toggle-fix-verification.test.ts

DESTINATION:
regression/widgets/
└── widget-toggle-regression.test.ts (merged 2 files)
```

**Action**: Consolidate race condition + verification

---

### 11. Widget None Option: 2 → 1 file

```
SOURCE FILES:
├── widget-none-option.test.ts
└── widget-none-option-behavior.test.ts

DESTINATION:
integration/widgets/
└── widget-none-option.test.ts (merged 2 files)
```

**Action**: Merge option + behavior

---

### 12. Canonical Hours: 3 → 2 files

```
SOURCE FILES:
├── canonical-hours-basic.test.ts
├── canonical-hours-calendar-integration.test.ts
└── canonical-hours-helper-direct.test.ts

DESTINATION:
integration/calendars/
├── canonical-hours.test.ts (merged basic + helper)
└── canonical-hours-calendar-integration.test.ts (moved)
```

**Action**: Merge basic + helper

---

## Import Path Updates Needed

After moving files, these import paths may need updates:

### Relative Imports to Test Helpers

**Old location** (flat): `./test-helpers/...`
**New locations**:
- `unit/core/*.test.ts` → `../../test-helpers/...`
- `unit/ui/*.test.ts` → `../../test-helpers/...`
- `integration/*//*.test.ts` → `../../test-helpers/...` or `../../../test-helpers/...`
- `regression/*//*.test.ts` → `../../test-helpers/...` or `../../../test-helpers/...`

### Relative Imports to Mocks

**Old location** (flat): `./mocks/...`
**New locations**: Similar depth adjustments as test-helpers

### Source File Imports

Most source imports use absolute paths from `@core/...` so should not need changes.

---

## Consolidation Statistics

| Area | Before | After | Reduction |
|------|--------|-------|-----------|
| Sunrise/Sunset | 5 | 2 | -3 (60%) |
| DateFormatter | 5 | 2 | -3 (60%) |
| Calendar Validator | 2 | 1 | -1 (50%) |
| Calendar File Helpers | 3 | 1 | -2 (67%) |
| Mini Widget | 10 | 3 | -7 (70%) |
| Intercalary | 11 | 8 | -3 (27%) |
| Time Advancement | 3 | 2 | -1 (33%) |
| Calendar Manager | 7 | 4 | -3 (43%) |
| Quick Time Buttons | 3 | 2 | -1 (33%) |
| Widget Toggle | 2 | 1 | -1 (50%) |
| Widget None Option | 2 | 1 | -1 (50%) |
| Canonical Hours | 3 | 2 | -1 (33%) |
| **TOTAL** | **56** | **29** | **-27 (48%)** |

**Overall reduction from consolidations alone**: 27 files (48%)

**Total reduction including reorganization**: ~147 → ~85-90 files (40-42%)

---

## Verification Checklist

After each consolidation:

- [ ] Run `npm run typecheck` - ensure no TypeScript errors
- [ ] Run `npm test -- <pattern>` - ensure consolidated tests pass
- [ ] Check for duplicate imports in consolidated files
- [ ] Verify test coverage hasn't decreased
- [ ] Check that all unique test cases are preserved

---

## Manual Cleanup Required

For each consolidated file:

1. **Deduplicate imports**: Remove duplicate import statements
2. **Organize describe blocks**: Group related tests logically
3. **Remove redundant setup**: Consolidate beforeEach/afterEach blocks where possible
4. **Update file headers**: Add comment explaining consolidation
5. **Check for duplicate test cases**: Remove truly redundant tests
6. **Fix formatting**: Run `npm run format` on consolidated files

---

## Files That Don't Need Consolidation

These files stay as-is (just moved to new structure):

### Unit Tests (moved to unit/core/ or unit/ui/)
- api-wrapper.test.ts
- logger.test.ts
- calendar-time-utils.test.ts
- manager-access-utils.test.ts
- calendar-loader.test.ts
- event-time-utils.test.ts
- event-recurrence-calculation.test.ts
- predefined-formats.test.ts
- calendar-date-counts-for-weekdays.test.ts
- calendar-date-formatting.test.ts
- sidebar-button-registry.test.ts
- sidebar-button-mixin.test.ts
- widget-type-resolver.test.ts

### Integration Tests (moved to integration/*/)
- calendar-engine.test.ts
- bridge-integration.test.ts
- foundry-calendar-class.test.ts
- foundry-calendar-config.test.ts
- module-api.test.ts
- calendar-variants.test.ts
- multi-moon-calendars.test.ts
- events-api.test.ts
- (and many more - see full plan for complete list)

### Regression Tests (moved to regression/*/)
- calendar-engine-leap-year-regression.test.ts
- calendar-engine-negative-leap-regression.test.ts
- calendar-engine-worldtime-interpretation-regression.test.ts
- day-of-year-bounds-checking.test.ts
- gregorian-weekday-bug.test.ts
- worldtime-edge-cases-comprehensive.test.ts
- year-calculation-behavior.test.ts
- comprehensive-regression.test.ts
- event-hook-double-fire-bug.test.ts
- event-year-rollover.test.ts
- event-visibility-security.test.ts
- performance-baseline.test.ts

---

## Special Cases

### Files with Calendar-Specific Tests

The `calendars/` subdirectory contains calendar-specific tests. Move entire directory:

```bash
mv calendars/* integration/calendars/
```

### Files in ui/ Subdirectory

Check what's in `ui/` subdirectory - may be test files or utilities:

```bash
ls -la ui/
```

If test files, move to appropriate new location. If utilities, keep at root.

---

## Post-Consolidation Next Steps

1. Update CI/CD if needed (likely not - glob patterns should still work)
2. Update developer documentation about test organization
3. Create TESTING.md guide explaining the new structure
4. Consider creating test templates for each category
5. Update CLAUDE.md with new test organization reference

