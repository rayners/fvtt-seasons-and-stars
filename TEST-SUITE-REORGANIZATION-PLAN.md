# Test Suite Reorganization - Executable Plan

**Date**: 2025-11-10  
**Status**: Ready for Execution  
**Estimated Duration**: 2-4 hours  
**Estimated File Reduction**: 147 → ~85-90 files (~40% reduction)

---

## Table of Contents

1. [Pre-Flight Safety Checks](#phase-0-pre-flight-safety-checks)
2. [Phase 1: Directory Structure Creation](#phase-1-directory-structure-creation)
3. [Phase 2: High-Priority Consolidations](#phase-2-high-priority-consolidations)
4. [Phase 3: Medium-Priority Consolidations](#phase-3-medium-priority-consolidations)
5. [Phase 4: Test Reorganization](#phase-4-test-reorganization)
6. [Phase 5: Verification](#phase-5-verification)
7. [Rollback Strategy](#rollback-strategy)

---

## Phase 0: Pre-Flight Safety Checks

### 0.1 Create Backup

```bash
# Create timestamped backup
cd /home/user/fvtt-seasons-and-stars
BACKUP_DIR="/home/user/fvtt-seasons-and-stars-backup-$(date +%Y%m%d-%H%M%S)"
cp -r packages/core/test "$BACKUP_DIR"
echo "Backup created at: $BACKUP_DIR"
```

### 0.2 Baseline Test Run

```bash
# Run full test suite and capture results
cd /home/user/fvtt-seasons-and-stars
npm run test:run > /tmp/test-baseline.txt 2>&1
echo "Baseline: $(grep -E 'Test Files.*passed' /tmp/test-baseline.txt)"
```

### 0.3 Count Current Files

```bash
# Document current state
cd /home/user/fvtt-seasons-and-stars/packages/core/test
echo "Current test files: $(find . -name '*.test.ts' -type f | wc -l)"
ls -la > /tmp/test-structure-before.txt
```

---

## Phase 1: Directory Structure Creation

### 1.1 Create New Directory Structure

```bash
cd /home/user/fvtt-seasons-and-stars/packages/core/test

# Create unit test directories
mkdir -p unit/core
mkdir -p unit/ui

# Create integration test directories
mkdir -p integration/calendar-engine
mkdir -p integration/calendar-manager
mkdir -p integration/widgets
mkdir -p integration/events-notes
mkdir -p integration/time-advancement
mkdir -p integration/calendars
mkdir -p integration/bridge
mkdir -p integration/foundry
mkdir -p integration/module
mkdir -p integration/ui

# Create regression test directories
mkdir -p regression/calendar-engine
mkdir -p regression/calendar-selection
mkdir -p regression/intercalary
mkdir -p regression/widgets
mkdir -p regression/events
mkdir -p regression/time-advancement

# Verify structure
tree -L 2 -d .
```

---

## Phase 2: High-Priority Consolidations

These consolidations provide the most value by reducing significant overlap.

### 2.1 Sunrise/Sunset: 5 → 2 files

**Target**: Merge 4 unit test files into 1, keep API test separate

**Files to merge**:
- `sunrise-sunset-calculator.test.ts` (BASE - keep this)
- `sunrise-sunset-seconds-to-string.test.ts` (MERGE)
- `sunrise-sunset-time-components.test.ts` (MERGE)
- `sunrise-sunset-flexible-format.test.ts` (MERGE)

**Keep separate**:
- `sunrise-sunset-api.test.ts` (integration test)

**Execution**:

```bash
cd /home/user/fvtt-seasons-and-stars/packages/core/test

# Create consolidated file in new structure
cat > /tmp/consolidate-sunrise.sh << 'EOF'
#!/bin/bash
BASE="/home/user/fvtt-seasons-and-stars/packages/core/test"
TARGET="$BASE/unit/core/sunrise-sunset-calculator.test.ts"

# Start with base file
cp "$BASE/sunrise-sunset-calculator.test.ts" "$TARGET"

# Extract and append test cases from other files
# We'll add unique test cases, skipping duplicate imports

echo "" >> "$TARGET"
echo "// ========================================" >> "$TARGET"
echo "// Tests from sunrise-sunset-seconds-to-string.test.ts" >> "$TARGET"
echo "// ========================================" >> "$TARGET"
# Extract describe blocks, skipping imports
sed -n '/^describe/,/^});$/p' "$BASE/sunrise-sunset-seconds-to-string.test.ts" >> "$TARGET"

echo "" >> "$TARGET"
echo "// ========================================" >> "$TARGET"
echo "// Tests from sunrise-sunset-time-components.test.ts" >> "$TARGET"
echo "// ========================================" >> "$TARGET"
sed -n '/^describe/,/^});$/p' "$BASE/sunrise-sunset-time-components.test.ts" >> "$TARGET"

echo "" >> "$TARGET"
echo "// ========================================" >> "$TARGET"
echo "// Tests from sunrise-sunset-flexible-format.test.ts" >> "$TARGET"
echo "// ========================================" >> "$TARGET"
sed -n '/^describe/,/^});$/p' "$BASE/sunrise-sunset-flexible-format.test.ts" >> "$TARGET"

echo "Consolidated sunrise-sunset tests created at $TARGET"
EOF

chmod +x /tmp/consolidate-sunrise.sh
/tmp/consolidate-sunrise.sh

# Move API test to integration
cp sunrise-sunset-api.test.ts integration/calendars/sunrise-sunset-api.test.ts

# Verify compilation
npm run typecheck
```

**Verification**:
```bash
# Run just these tests
npm test -- sunrise-sunset
```

**Manual cleanup needed**: Remove duplicate imports and organize describe blocks properly.

---

### 2.2 DateFormatter: 5 → 2 files

**Target**: Merge 4 files into unit test, keep integration separate

**Files to merge**:
- `date-formatter.test.ts` (BASE)
- `date-formatter-advanced.test.ts` (MERGE)
- `date-formatter-edge-cases.test.ts` (MERGE)
- `date-formatter-bounds-check.test.ts` (MERGE)

**Keep separate**:
- `date-formatter-integration.test.ts` (integration)

**Execution**:

```bash
cd /home/user/fvtt-seasons-and-stars/packages/core/test

cat > /tmp/consolidate-formatter.sh << 'EOF'
#!/bin/bash
BASE="/home/user/fvtt-seasons-and-stars/packages/core/test"
TARGET="$BASE/unit/core/date-formatter.test.ts"

# Start with base file
cp "$BASE/date-formatter.test.ts" "$TARGET"

# Append other test suites
for file in "date-formatter-advanced" "date-formatter-edge-cases" "date-formatter-bounds-check"; do
  echo "" >> "$TARGET"
  echo "// ========================================" >> "$TARGET"
  echo "// Tests from $file.test.ts" >> "$TARGET"
  echo "// ========================================" >> "$TARGET"
  sed -n '/^describe/,/^});$/p' "$BASE/$file.test.ts" >> "$TARGET"
done

echo "Consolidated date-formatter tests created at $TARGET"
EOF

chmod +x /tmp/consolidate-formatter.sh
/tmp/consolidate-formatter.sh

# Move integration test
cp date-formatter-integration.test.ts integration/calendar-engine/date-formatter-integration.test.ts

# Verify
npm run typecheck
```

**Verification**:
```bash
npm test -- date-formatter
```

---

### 2.3 Calendar Validator: 2 → 1 file

**Files to merge**:
- `calendar-validator-errors.test.ts` (BASE)
- `calendar-json-syntax-validation.test.ts` (MERGE)

**Execution**:

```bash
cd /home/user/fvtt-seasons-and-stars/packages/core/test

# Create consolidated file
cat calendar-validator-errors.test.ts > unit/core/calendar-validator.test.ts
echo "" >> unit/core/calendar-validator.test.ts
echo "// ========================================" >> unit/core/calendar-validator.test.ts
echo "// JSON Syntax Validation Tests" >> unit/core/calendar-validator.test.ts
echo "// ========================================" >> unit/core/calendar-validator.test.ts
sed -n '/^describe/,/^});$/p' calendar-json-syntax-validation.test.ts >> unit/core/calendar-validator.test.ts

# Verify
npm test -- calendar-validator
```

---

### 2.4 Calendar File Helpers: 3 → 1 file

**Files to merge**:
- `calendar-file-helpers.test.ts` (BASE)
- `calendar-file-path-handling.test.ts` (MERGE)
- `calendar-file-pending-state.test.ts` (MERGE)

**Execution**:

```bash
cd /home/user/fvtt-seasons-and-stars/packages/core/test

cat > /tmp/consolidate-file-helpers.sh << 'EOF'
#!/bin/bash
BASE="/home/user/fvtt-seasons-and-stars/packages/core/test"
TARGET="$BASE/unit/ui/calendar-file-helpers.test.ts"

cp "$BASE/calendar-file-helpers.test.ts" "$TARGET"

for file in "calendar-file-path-handling" "calendar-file-pending-state"; do
  echo "" >> "$TARGET"
  echo "// ========================================" >> "$TARGET"
  echo "// Tests from $file.test.ts" >> "$TARGET"
  echo "// ========================================" >> "$TARGET"
  sed -n '/^describe/,/^});$/p' "$BASE/$file.test.ts" >> "$TARGET"
done

echo "Consolidated calendar-file-helpers tests at $TARGET"
EOF

chmod +x /tmp/consolidate-file-helpers.sh
/tmp/consolidate-file-helpers.sh

# Verify
npm test -- calendar-file-helpers
```

---

### 2.5 Mini Widget: 10 → 3 files

**Strategy**: Split by test type (unit vs integration), group by feature

**Files**:
- `calendar-mini-widget-gm-permissions.test.ts`
- `canonical-hours-mini-widget.test.ts`
- `mini-widget-compact-mode.test.ts`
- `mini-widget-day-display.test.ts`
- `mini-widget-moon-phases.test.ts`
- `mini-widget-pinned-position.test.ts`
- `mini-widget-settings-integration.test.ts`
- `mini-widget-sunrise-sunset-click.test.ts`
- `mini-widget-time-advancement.test.ts`
- `mini-widget-time-display.test.ts`

**New structure**:
- `unit/ui/calendar-mini-widget.test.ts` - Unit tests (permissions, display basics)
- `integration/widgets/calendar-mini-widget-features.test.ts` - Feature integration (moon phases, sunrise/sunset, canonical hours)
- `integration/widgets/calendar-mini-widget-advanced.test.ts` - Advanced features (time advancement, compact mode, pinned position)

**Execution**:

```bash
cd /home/user/fvtt-seasons-and-stars/packages/core/test

# Unit tests: permissions + basic display
cat > unit/ui/calendar-mini-widget.test.ts << 'EOF'
// Consolidated Mini Widget Unit Tests
// Covers: Basic display, permissions, settings

EOF

cat calendar-mini-widget-gm-permissions.test.ts >> unit/ui/calendar-mini-widget.test.ts
echo "" >> unit/ui/calendar-mini-widget.test.ts
echo "// ========================================" >> unit/ui/calendar-mini-widget.test.ts
echo "// Day Display Tests" >> unit/ui/calendar-mini-widget.test.ts
echo "// ========================================" >> unit/ui/calendar-mini-widget.test.ts
sed -n '/^describe/,/^});$/p' mini-widget-day-display.test.ts >> unit/ui/calendar-mini-widget.test.ts

# Integration: Features
cat > integration/widgets/calendar-mini-widget-features.test.ts << 'EOF'
// Consolidated Mini Widget Feature Integration Tests
// Covers: Moon phases, sunrise/sunset, canonical hours, settings

EOF

for file in mini-widget-moon-phases mini-widget-sunrise-sunset-click canonical-hours-mini-widget mini-widget-settings-integration; do
  echo "// ========================================" >> integration/widgets/calendar-mini-widget-features.test.ts
  echo "// Tests from $file.test.ts" >> integration/widgets/calendar-mini-widget-features.test.ts
  echo "// ========================================" >> integration/widgets/calendar-mini-widget-features.test.ts
  cat "$file.test.ts" >> integration/widgets/calendar-mini-widget-features.test.ts
  echo "" >> integration/widgets/calendar-mini-widget-features.test.ts
done

# Integration: Advanced
cat > integration/widgets/calendar-mini-widget-advanced.test.ts << 'EOF'
// Consolidated Mini Widget Advanced Integration Tests
// Covers: Time advancement, compact mode, pinned position, time display

EOF

for file in mini-widget-time-advancement mini-widget-compact-mode mini-widget-pinned-position mini-widget-time-display; do
  echo "// ========================================" >> integration/widgets/calendar-mini-widget-advanced.test.ts
  echo "// Tests from $file.test.ts" >> integration/widgets/calendar-mini-widget-advanced.test.ts
  echo "// ========================================" >> integration/widgets/calendar-mini-widget-advanced.test.ts
  cat "$file.test.ts" >> integration/widgets/calendar-mini-widget-advanced.test.ts
  echo "" >> integration/widgets/calendar-mini-widget-advanced.test.ts
done

# Verify
npm test -- calendar-mini-widget
```

**Manual cleanup**: Deduplicate imports, organize describe blocks, remove redundant setup code.

---

### 2.6 Intercalary: 11 → 6-7 files

**Strategy**: Keep regression tests separate (they document specific bugs), consolidate functional tests

**Regression tests** (keep separate in `regression/intercalary/`):
- `intercalary-fix-verification.test.ts`
- `intercalary-round-trip.test.ts`
- `intercalary-year-boundary-bug.test.ts`
- `intercalary-user-scenario-reproduction.test.ts`
- `intercalary-ui-workflow-simulation.test.ts`

**Functional tests to consolidate**:
- `intercalary-format-recursion.test.ts` → merge into format tests
- `intercalary-format-resolution.test.ts` → merge into format tests
- `intercalary-null-safety.test.ts` → merge into safety tests
- `intercalary-template-variable.test.ts` → merge into format tests
- `intercalary-before-functionality.test.ts` → keep separate (distinct feature)
- `intercalary-first-day-year.test.ts` → keep separate (distinct edge case)

**Execution**:

```bash
cd /home/user/fvtt-seasons-and-stars/packages/core/test

# Move regression tests (keep separate)
cp intercalary-fix-verification.test.ts regression/intercalary/
cp intercalary-round-trip.test.ts regression/intercalary/
cp intercalary-year-boundary-bug.test.ts regression/intercalary/
cp intercalary-user-scenario-reproduction.test.ts regression/intercalary/
cp intercalary-ui-workflow-simulation.test.ts regression/intercalary/

# Keep these separate in regression (distinct features)
cp intercalary-before-functionality.test.ts regression/intercalary/
cp intercalary-first-day-year.test.ts regression/intercalary/

# Consolidate format-related tests
cat > regression/intercalary/intercalary-format.test.ts << 'EOF'
// Consolidated Intercalary Format Tests
// Covers: Format recursion, resolution, template variables

EOF

for file in intercalary-format-recursion intercalary-format-resolution intercalary-template-variable; do
  echo "// ========================================" >> regression/intercalary/intercalary-format.test.ts
  echo "// Tests from $file.test.ts" >> regression/intercalary/intercalary-format.test.ts
  echo "// ========================================" >> regression/intercalary/intercalary-format.test.ts
  cat "$file.test.ts" >> regression/intercalary/intercalary-format.test.ts
  echo "" >> regression/intercalary/intercalary-format.test.ts
done

# Move null safety to regression
cp intercalary-null-safety.test.ts regression/intercalary/

# Verify
npm test -- intercalary
```

**Result**: 11 → 8 files (still a good reduction, preserves bug documentation)

---

## Phase 3: Medium-Priority Consolidations

### 3.1 Time Advancement: 3 → 2 files

**Files**:
- `time-advancement-service.test.ts` (unit - keep)
- `time-advancement-behavior.test.ts` (merge into service)
- `time-advancement-integration.test.ts` (integration - keep separate)

**Execution**:

```bash
cd /home/user/fvtt-seasons-and-stars/packages/core/test

# Consolidate service + behavior
cat time-advancement-service.test.ts > integration/time-advancement/time-advancement-service.test.ts
echo "" >> integration/time-advancement/time-advancement-service.test.ts
echo "// ========================================" >> integration/time-advancement/time-advancement-service.test.ts
echo "// Behavior Tests" >> integration/time-advancement/time-advancement-service.test.ts
echo "// ========================================" >> integration/time-advancement/time-advancement-service.test.ts
sed -n '/^describe/,/^});$/p' time-advancement-behavior.test.ts >> integration/time-advancement/time-advancement-service.test.ts

# Move integration
cp time-advancement-integration.test.ts integration/time-advancement/

# Move regression
cp time-advancement-race-condition.test.ts regression/time-advancement/

# Verify
npm test -- time-advancement
```

---

### 3.2 Calendar Manager: 7 → 4 files

**Consolidate initialization tests**:
- `calendar-manager-sync-init-simple.test.ts`
- `calendar-manager-init-no-settings-save.test.ts`
- `calendar-manager-non-gm-init.test.ts`
→ `integration/calendar-manager/initialization.test.ts`

**Keep separate**:
- `calendar-manager-hook-payload.test.ts` → `integration/calendar-manager/hooks.test.ts`
- `calendar-manager-lazy-events.test.ts` → `integration/calendar-manager/lazy-events.test.ts`
- `calendar-manager-module-flags.test.ts` → `integration/calendar-manager/module-flags.test.ts`
- `calendar-manager-optional-intercalary.test.ts` → `integration/calendar-manager/optional-intercalary.test.ts`

**Execution**:

```bash
cd /home/user/fvtt-seasons-and-stars/packages/core/test

# Consolidate initialization
cat > integration/calendar-manager/initialization.test.ts << 'EOF'
// Consolidated Calendar Manager Initialization Tests

EOF

for file in calendar-manager-sync-init-simple calendar-manager-init-no-settings-save calendar-manager-non-gm-init; do
  echo "// ========================================" >> integration/calendar-manager/initialization.test.ts
  echo "// Tests from $file.test.ts" >> integration/calendar-manager/initialization.test.ts
  echo "// ========================================" >> integration/calendar-manager/initialization.test.ts
  cat "$file.test.ts" >> integration/calendar-manager/initialization.test.ts
  echo "" >> integration/calendar-manager/initialization.test.ts
done

# Move others
cp calendar-manager-hook-payload.test.ts integration/calendar-manager/hooks.test.ts
cp calendar-manager-lazy-events.test.ts integration/calendar-manager/
cp calendar-manager-module-flags.test.ts integration/calendar-manager/
cp calendar-manager-optional-intercalary.test.ts integration/calendar-manager/

# Verify
npm test -- calendar-manager
```

---

### 3.3 Quick Time Buttons: 3 → 2 files

**Files**:
- `quick-time-buttons.test.ts` (BASE)
- `always-show-quick-time-buttons.test.ts` (MERGE)
- `quick-time-buttons-integration.test.ts` (integration - keep separate)

**Execution**:

```bash
cd /home/user/fvtt-seasons-and-stars/packages/core/test

# Merge unit tests
cat quick-time-buttons.test.ts > integration/widgets/quick-time-buttons.test.ts
echo "" >> integration/widgets/quick-time-buttons.test.ts
echo "// ========================================" >> integration/widgets/quick-time-buttons.test.ts
echo "// Always Show Tests" >> integration/widgets/quick-time-buttons.test.ts
echo "// ========================================" >> integration/widgets/quick-time-buttons.test.ts
sed -n '/^describe/,/^});$/p' always-show-quick-time-buttons.test.ts >> integration/widgets/quick-time-buttons.test.ts

# Move integration
cp quick-time-buttons-integration.test.ts integration/widgets/

# Verify
npm test -- quick-time-buttons
```

---

### 3.4 Widget Toggle Regression: 2 → 1 file

**Files**:
- `widget-toggle-race-condition-bug.test.ts`
- `widget-toggle-fix-verification.test.ts`

**Execution**:

```bash
cd /home/user/fvtt-seasons-and-stars/packages/core/test

# Consolidate
cat widget-toggle-race-condition-bug.test.ts > regression/widgets/widget-toggle-regression.test.ts
echo "" >> regression/widgets/widget-toggle-regression.test.ts
echo "// ========================================" >> regression/widgets/widget-toggle-regression.test.ts
echo "// Fix Verification" >> regression/widgets/widget-toggle-regression.test.ts
echo "// ========================================" >> regression/widgets/widget-toggle-regression.test.ts
sed -n '/^describe/,/^});$/p' widget-toggle-fix-verification.test.ts >> regression/widgets/widget-toggle-regression.test.ts

# Verify
npm test -- widget-toggle
```

---

### 3.5 Widget None Option: 2 → 1 file

**Files**:
- `widget-none-option.test.ts`
- `widget-none-option-behavior.test.ts`

**Execution**:

```bash
cd /home/user/fvtt-seasons-and-stars/packages/core/test

cat widget-none-option.test.ts > integration/widgets/widget-none-option.test.ts
echo "" >> integration/widgets/widget-none-option.test.ts
echo "// ========================================" >> integration/widgets/widget-none-option.test.ts
echo "// Behavior Tests" >> integration/widgets/widget-none-option.test.ts
echo "// ========================================" >> integration/widgets/widget-none-option.test.ts
sed -n '/^describe/,/^});$/p' widget-none-option-behavior.test.ts >> integration/widgets/widget-none-option.test.ts

npm test -- widget-none-option
```

---

### 3.6 Canonical Hours: 3 → 2 files

**Files**:
- `canonical-hours-basic.test.ts`
- `canonical-hours-calendar-integration.test.ts`
- `canonical-hours-helper-direct.test.ts`

**Strategy**: Merge basic + helper into unit, keep integration separate

**Execution**:

```bash
cd /home/user/fvtt-seasons-and-stars/packages/core/test

# Unit tests
cat canonical-hours-basic.test.ts > integration/calendars/canonical-hours.test.ts
echo "" >> integration/calendars/canonical-hours.test.ts
echo "// ========================================" >> integration/calendars/canonical-hours.test.ts
echo "// Helper Tests" >> integration/calendars/canonical-hours.test.ts
echo "// ========================================" >> integration/calendars/canonical-hours.test.ts
sed -n '/^describe/,/^});$/p' canonical-hours-helper-direct.test.ts >> integration/calendars/canonical-hours.test.ts

# Integration
cp canonical-hours-calendar-integration.test.ts integration/calendars/

npm test -- canonical-hours
```

---

## Phase 4: Test Reorganization

Move remaining tests to appropriate directories without consolidation.

### 4.1 Move Unit Tests

```bash
cd /home/user/fvtt-seasons-and-stars/packages/core/test

# Core unit tests
mv api-wrapper.test.ts unit/core/
mv logger.test.ts unit/core/
mv calendar-time-utils.test.ts unit/core/
mv manager-access-utils.test.ts unit/core/
mv calendar-loader.test.ts unit/core/
mv event-time-utils.test.ts unit/core/
mv event-recurrence-calculation.test.ts unit/core/
mv predefined-formats.test.ts unit/core/
mv calendar-date-counts-for-weekdays.test.ts unit/core/
mv calendar-date-formatting.test.ts unit/core/

# UI unit tests
mv sidebar-button-registry.test.ts unit/ui/
mv sidebar-button-mixin.test.ts unit/ui/
mv widget-type-resolver.test.ts unit/ui/
```

### 4.2 Move Integration Tests

```bash
cd /home/user/fvtt-seasons-and-stars/packages/core/test

# Calendar Engine
mv calendar-engine.test.ts integration/calendar-engine/
mv calendar-engine-gregorian-defaults.test.ts integration/calendar-engine/
mv calendar-engine-negative-leap-days.test.ts integration/calendar-engine/
mv calendar-engine-optional-leap-year.test.ts integration/calendar-engine/
mv calendar-engine-world-creation-timestamp.test.ts integration/calendar-engine/
mv calendar-engine-error-handling.test.ts integration/calendar-engine/

# Calendar Manager (non-consolidated)
# (already moved in 3.2)

# Notes Manager
mv notes-manager-sync-init-simple.test.ts integration/events-notes/
mv notes-manager-non-gm-init.test.ts integration/events-notes/

# Widgets
mv calendar-widget-gm-permissions.test.ts integration/widgets/
mv calendar-widget-sidebar-template.test.ts integration/widgets/
mv calendar-widget-sunrise-sunset.test.ts integration/widgets/
mv main-widget-time-advancement.test.ts integration/widgets/
mv calendar-grid-widget-set-year.test.ts integration/widgets/
mv calendar-click-behavior.test.ts integration/widgets/
mv widget-manager.test.ts integration/widgets/
mv widget-instance-manager.test.ts integration/widgets/
mv widget-factory-registration.test.ts integration/widgets/
mv widget-sync-integration.test.ts integration/widgets/
mv widget-format-integration.test.ts integration/widgets/

# Events/Notes
mv events-api.test.ts integration/events-notes/
mv events-api-wrapper.test.ts integration/events-notes/
mv events-multi-day.test.ts integration/events-notes/
mv event-occurrence-hooks.test.ts integration/events-notes/
mv note-dialogs.test.ts integration/events-notes/
mv note-permissions-validation.test.ts integration/events-notes/
mv note-deletion-cleanup.test.ts integration/events-notes/
mv create-note-window.test.ts integration/events-notes/

# Calendars
mv calendar-variants.test.ts integration/calendars/
mv calendar-year-offset-variants.test.ts integration/calendars/
mv multi-moon-calendars.test.ts integration/calendars/
mv moon-phase-tracking.test.ts integration/calendars/
mv moon-overrides.test.ts integration/calendars/
mv season-year-crossing.test.ts integration/calendars/
mv time-converter-compatibility-manager.test.ts integration/calendars/

# Bridge
mv bridge-integration.test.ts integration/bridge/

# Foundry
mv foundry-calendar-class.test.ts integration/foundry/
mv foundry-calendar-config.test.ts integration/foundry/
mv applicationv2-template-parts.test.ts integration/foundry/

# Module
mv module-api.test.ts integration/module/
mv module-initialization-simple.test.ts integration/module/
mv module-initialization-calendar-settings.test.ts integration/module/
mv calendar-settings-registration.test.ts integration/module/
mv active-calendar-file-setting.test.ts integration/module/
mv settings-preview.test.ts integration/module/

# UI
mv ui-integration.test.ts integration/ui/

# Miscellaneous Integration
mv calendar-changed-hook.test.ts integration/module/
mv calendar-selection-dialog-bug.test.ts integration/module/
mv calendar-deprecation-dialog.test.ts integration/module/
mv calendar-source-verification.test.ts integration/module/
mv foundry-path-url-conversion.test.ts integration/foundry/
mv helper-context-usage.test.ts integration/module/
mv helper-parameter-verification.test.ts integration/module/
mv icon-url-support.test.ts integration/calendars/
mv integration-detection-timing.test.ts integration/module/
mv production-error-notifications.test.ts integration/module/
mv star-trek-helpers-functionality.test.ts integration/calendars/
mv widgets.test.ts integration/widgets/
mv federation-standard-widget-format.test.ts integration/calendars/
mv duplicate-code-consolidation.test.ts integration/module/
mv external-calendar-registration.test.ts integration/module/
mv external-variants.test.ts integration/calendars/
```

### 4.3 Move Regression Tests

```bash
cd /home/user/fvtt-seasons-and-stars/packages/core/test

# Calendar Engine regressions
mv calendar-engine-leap-year-regression.test.ts regression/calendar-engine/
mv calendar-engine-negative-leap-regression.test.ts regression/calendar-engine/
mv calendar-engine-worldtime-interpretation-regression.test.ts regression/calendar-engine/
mv day-of-year-bounds-checking.test.ts regression/calendar-engine/

# Calendar selection
mv active-calendar-onchange-caching.test.ts regression/calendar-selection/
# (calendar-selection-dialog-bug already moved)

# Intercalary (already handled in 2.6)

# Widgets
mv should-show-pause-button-race-condition.test.ts regression/widgets/

# Events
mv event-hook-double-fire-bug.test.ts regression/events/
mv event-year-rollover.test.ts regression/events/
mv event-visibility-security.test.ts regression/events/

# Other
mv gregorian-weekday-bug.test.ts regression/
mv worldtime-edge-cases-comprehensive.test.ts regression/
mv year-calculation-behavior.test.ts regression/
mv comprehensive-regression.test.ts regression/
mv performance-baseline.test.ts regression/
```

### 4.4 Handle Special Directories

```bash
cd /home/user/fvtt-seasons-and-stars/packages/core/test

# Move calendars directory content
mv calendars/* integration/calendars/

# Keep support directories at root
# - mocks/
# - test-helpers/
# - ui/
# - utils/
# These contain shared test utilities, not test files
```

---

## Phase 5: Verification

### 5.1 Verify File Count

```bash
cd /home/user/fvtt-seasons-and-stars/packages/core/test

echo "=== File Count Verification ==="
echo "Unit tests (core): $(find unit/core -name '*.test.ts' | wc -l)"
echo "Unit tests (ui): $(find unit/ui -name '*.test.ts' | wc -l)"
echo "Integration tests: $(find integration -name '*.test.ts' | wc -l)"
echo "Regression tests: $(find regression -name '*.test.ts' | wc -l)"
echo "Total new structure: $(find unit integration regression -name '*.test.ts' | wc -l)"
echo ""
echo "Old structure remaining: $(find . -maxdepth 1 -name '*.test.ts' | wc -l)"
```

### 5.2 Run Full Test Suite

```bash
cd /home/user/fvtt-seasons-and-stars

# Clean build
npm run clean
npm run build

# Run tests
npm run test:run > /tmp/test-after-reorg.txt 2>&1

# Compare with baseline
echo "=== Test Comparison ==="
echo "Before: $(grep -E 'Test Files.*passed' /tmp/test-baseline.txt)"
echo "After:  $(grep -E 'Test Files.*passed' /tmp/test-after-reorg.txt)"
```

### 5.3 Verify Coverage

```bash
cd /home/user/fvtt-seasons-and-stars

# Run coverage
npm run test:coverage

# Check that coverage hasn't decreased
echo "Review coverage report to ensure no regression"
```

### 5.4 Manual Cleanup Tasks

After automated consolidation, manually review and clean:

1. **Remove duplicate imports** in consolidated files
2. **Organize describe blocks** logically
3. **Remove redundant test setup** code
4. **Update file headers** with consolidated comments
5. **Fix any import path issues** in moved files
6. **Remove empty test files** if any

### 5.5 Update Test Scripts (if needed)

Check if any npm scripts need updating:

```bash
# Review package.json test scripts
cat /home/user/fvtt-seasons-and-stars/package.json | grep -A 10 '"scripts"'
```

Most scripts should work without changes since they use glob patterns.

---

## Phase 6: Cleanup

### 6.1 Remove Old Files

**ONLY AFTER VERIFICATION PASSES**

```bash
cd /home/user/fvtt-seasons-and-stars/packages/core/test

# List files that should be removed
find . -maxdepth 1 -name '*.test.ts' -type f > /tmp/old-test-files.txt

echo "=== Files to Remove ==="
cat /tmp/old-test-files.txt
echo ""
echo "Total: $(cat /tmp/old-test-files.txt | wc -l) files"
echo ""
echo "Review the list above. If correct, run:"
echo "cat /tmp/old-test-files.txt | xargs rm"
```

### 6.2 Final Verification

```bash
cd /home/user/fvtt-seasons-and-stars

# Run all quality checks
npm run lint
npm run typecheck
npm run test:run
npm run build

echo "=== Final State ==="
echo "Total test files: $(find packages/core/test -name '*.test.ts' -type f | wc -l)"
echo "Directory structure:"
tree packages/core/test -L 2 -d
```

---

## Rollback Strategy

If issues occur at any point:

### Quick Rollback

```bash
# Find backup directory
BACKUP_DIR=$(ls -dt /home/user/fvtt-seasons-and-stars-backup-* | head -1)
echo "Rolling back from: $BACKUP_DIR"

# Remove new structure
cd /home/user/fvtt-seasons-and-stars/packages/core
rm -rf test

# Restore backup
cp -r "$BACKUP_DIR" test

# Verify
npm run test:run
```

### Partial Rollback

If only specific consolidations fail:

```bash
# Restore specific files from backup
BACKUP_DIR=$(ls -dt /home/user/fvtt-seasons-and-stars-backup-* | head -1)

# Example: restore sunrise-sunset tests
cp "$BACKUP_DIR"/sunrise-sunset-*.test.ts /home/user/fvtt-seasons-and-stars/packages/core/test/

# Verify
npm test -- sunrise-sunset
```

---

## Execution Checklist

- [ ] Phase 0: Pre-flight checks complete
  - [ ] Backup created
  - [ ] Baseline test run captured
  - [ ] Current file count documented
  
- [ ] Phase 1: Directory structure created
  - [ ] All unit/integration/regression directories exist
  - [ ] Structure verified with tree command
  
- [ ] Phase 2: High-priority consolidations
  - [ ] Sunrise/Sunset: 5→2 ✓
  - [ ] DateFormatter: 5→2 ✓
  - [ ] Calendar Validator: 2→1 ✓
  - [ ] Calendar File Helpers: 3→1 ✓
  - [ ] Mini Widget: 10→3 ✓
  - [ ] Intercalary: 11→8 ✓
  
- [ ] Phase 3: Medium-priority consolidations
  - [ ] Time Advancement: 3→2 ✓
  - [ ] Calendar Manager: 7→4 ✓
  - [ ] Quick Time Buttons: 3→2 ✓
  - [ ] Widget Toggle: 2→1 ✓
  - [ ] Widget None Option: 2→1 ✓
  - [ ] Canonical Hours: 3→2 ✓
  
- [ ] Phase 4: Test reorganization
  - [ ] Unit tests moved ✓
  - [ ] Integration tests moved ✓
  - [ ] Regression tests moved ✓
  - [ ] Special directories handled ✓
  
- [ ] Phase 5: Verification
  - [ ] File count verified
  - [ ] All tests pass
  - [ ] Coverage maintained
  - [ ] Manual cleanup completed
  - [ ] Lint passes
  - [ ] Typecheck passes
  - [ ] Build succeeds
  
- [ ] Phase 6: Cleanup
  - [ ] Old files removed
  - [ ] Final verification passed
  - [ ] Documentation updated

---

## Expected Outcomes

### Before
- **Total files**: 147
- **Structure**: Flat directory
- **Organization**: By feature name
- **Redundancy**: High (5-10 files per feature)

### After
- **Total files**: ~85-90 (40% reduction)
- **Structure**: Organized hierarchy (unit/integration/regression)
- **Organization**: By test type and component
- **Redundancy**: Low (1-3 files per feature)
- **Maintainability**: Significantly improved

### Benefits
1. Clear separation of unit vs integration vs regression tests
2. Easier to locate tests for specific components
3. Reduced redundancy and duplicate test code
4. Better alignment with source code structure
5. Clearer test organization for new contributors
6. Faster test execution through better organization

---

## Notes

- All consolidation scripts use simple concatenation with markers
- Manual cleanup required after automated consolidation
- Import deduplication must be done manually
- Test coverage must remain at 90%+ for core logic
- All 1316+ tests must still pass after reorganization
- Backup allows safe rollback at any point

---

**Ready for Execution**: This plan can be executed step-by-step. Start with Phase 0 and proceed sequentially.
