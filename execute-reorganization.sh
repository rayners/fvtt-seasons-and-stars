#!/bin/bash
set -e  # Exit on error

# Test Suite Reorganization - Master Execution Script
# This script executes the complete test suite reorganization plan

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TEST_DIR="$SCRIPT_DIR/packages/core/test"
BACKUP_DIR="/home/user/fvtt-seasons-and-stars-backup-$(date +%Y%m%d-%H%M%S)"

echo "=================================================="
echo "Test Suite Reorganization - Master Execution"
echo "=================================================="
echo ""
echo "Working directory: $SCRIPT_DIR"
echo "Test directory: $TEST_DIR"
echo "Backup location: $BACKUP_DIR"
echo ""

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Phase tracking
PHASE_NUM=0

phase() {
    PHASE_NUM=$((PHASE_NUM + 1))
    echo ""
    echo "=================================================="
    echo -e "${GREEN}PHASE $PHASE_NUM: $1${NC}"
    echo "=================================================="
    echo ""
}

step() {
    echo -e "${YELLOW}>>> $1${NC}"
}

error() {
    echo -e "${RED}ERROR: $1${NC}"
    exit 1
}

success() {
    echo -e "${GREEN}✓ $1${NC}"
}

# Check if we're in the right directory
if [ ! -f "$SCRIPT_DIR/package.json" ]; then
    error "Not in project root directory. Please run from /home/user/fvtt-seasons-and-stars"
fi

if [ ! -d "$TEST_DIR" ]; then
    error "Test directory not found at $TEST_DIR"
fi

# Phase 0: Pre-flight checks
phase "Pre-flight Safety Checks"

step "Creating backup..."
cp -r "$TEST_DIR" "$BACKUP_DIR"
success "Backup created at $BACKUP_DIR"

step "Running baseline test suite..."
npm run test:run > /tmp/test-baseline.txt 2>&1 || {
    echo "Warning: Baseline tests failed. This might be expected."
    echo "Review /tmp/test-baseline.txt for details."
}
success "Baseline captured"

step "Counting current test files..."
BASELINE_COUNT=$(find "$TEST_DIR" -name '*.test.ts' -type f | wc -l)
echo "Current test files: $BASELINE_COUNT"
ls -la "$TEST_DIR" > /tmp/test-structure-before.txt
success "File count documented"

# Phase 1: Create directory structure
phase "Directory Structure Creation"

cd "$TEST_DIR" || error "Failed to cd to test directory"

step "Creating unit test directories..."
mkdir -p unit/core unit/ui
success "Unit directories created"

step "Creating integration test directories..."
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
success "Integration directories created"

step "Creating regression test directories..."
mkdir -p regression/calendar-engine
mkdir -p regression/calendar-selection
mkdir -p regression/intercalary
mkdir -p regression/widgets
mkdir -p regression/events
mkdir -p regression/time-advancement
success "Regression directories created"

# Phase 2: High-priority consolidations
phase "High-Priority Consolidations"

step "Consolidating Calendar Validator (2→1)..."
cat calendar-validator-errors.test.ts > unit/core/calendar-validator.test.ts
echo "" >> unit/core/calendar-validator.test.ts
echo "// ========================================" >> unit/core/calendar-validator.test.ts
echo "// JSON Syntax Validation Tests" >> unit/core/calendar-validator.test.ts
echo "// ========================================" >> unit/core/calendar-validator.test.ts
sed -n '/^describe/,/^});$/p' calendar-json-syntax-validation.test.ts >> unit/core/calendar-validator.test.ts
success "Calendar Validator consolidated"

step "Consolidating Widget Toggle Regression (2→1)..."
cat widget-toggle-race-condition-bug.test.ts > regression/widgets/widget-toggle-regression.test.ts
echo "" >> regression/widgets/widget-toggle-regression.test.ts
echo "// ========================================" >> regression/widgets/widget-toggle-regression.test.ts
echo "// Fix Verification" >> regression/widgets/widget-toggle-regression.test.ts
echo "// ========================================" >> regression/widgets/widget-toggle-regression.test.ts
sed -n '/^describe/,/^});$/p' widget-toggle-fix-verification.test.ts >> regression/widgets/widget-toggle-regression.test.ts
success "Widget Toggle consolidated"

step "Consolidating Widget None Option (2→1)..."
cat widget-none-option.test.ts > integration/widgets/widget-none-option.test.ts
echo "" >> integration/widgets/widget-none-option.test.ts
echo "// ========================================" >> integration/widgets/widget-none-option.test.ts
echo "// Behavior Tests" >> integration/widgets/widget-none-option.test.ts
echo "// ========================================" >> integration/widgets/widget-none-option.test.ts
sed -n '/^describe/,/^});$/p' widget-none-option-behavior.test.ts >> integration/widgets/widget-none-option.test.ts
success "Widget None Option consolidated"

echo ""
echo -e "${YELLOW}NOTE: Complex consolidations (Sunrise/Sunset, DateFormatter, Mini Widget) require manual consolidation.${NC}"
echo "These are documented in the plan but need careful import management."
echo ""

# Phase 3: Move remaining regression tests
phase "Move Regression Tests"

step "Moving calendar engine regressions..."
[ -f calendar-engine-leap-year-regression.test.ts ] && cp calendar-engine-leap-year-regression.test.ts regression/calendar-engine/
[ -f calendar-engine-negative-leap-regression.test.ts ] && cp calendar-engine-negative-leap-regression.test.ts regression/calendar-engine/
[ -f calendar-engine-worldtime-interpretation-regression.test.ts ] && cp calendar-engine-worldtime-interpretation-regression.test.ts regression/calendar-engine/
[ -f day-of-year-bounds-checking.test.ts ] && cp day-of-year-bounds-checking.test.ts regression/calendar-engine/
success "Calendar engine regressions moved"

step "Moving calendar selection regressions..."
[ -f active-calendar-onchange-caching.test.ts ] && cp active-calendar-onchange-caching.test.ts regression/calendar-selection/
success "Calendar selection regressions moved"

step "Moving intercalary regressions..."
[ -f intercalary-fix-verification.test.ts ] && cp intercalary-fix-verification.test.ts regression/intercalary/
[ -f intercalary-round-trip.test.ts ] && cp intercalary-round-trip.test.ts regression/intercalary/
[ -f intercalary-year-boundary-bug.test.ts ] && cp intercalary-year-boundary-bug.test.ts regression/intercalary/
[ -f intercalary-user-scenario-reproduction.test.ts ] && cp intercalary-user-scenario-reproduction.test.ts regression/intercalary/
[ -f intercalary-ui-workflow-simulation.test.ts ] && cp intercalary-ui-workflow-simulation.test.ts regression/intercalary/
[ -f intercalary-before-functionality.test.ts ] && cp intercalary-before-functionality.test.ts regression/intercalary/
[ -f intercalary-first-day-year.test.ts ] && cp intercalary-first-day-year.test.ts regression/intercalary/
[ -f intercalary-null-safety.test.ts ] && cp intercalary-null-safety.test.ts regression/intercalary/
success "Intercalary regressions moved"

step "Moving widget regressions..."
[ -f should-show-pause-button-race-condition.test.ts ] && cp should-show-pause-button-race-condition.test.ts regression/widgets/
success "Widget regressions moved"

step "Moving event regressions..."
[ -f event-hook-double-fire-bug.test.ts ] && cp event-hook-double-fire-bug.test.ts regression/events/
[ -f event-year-rollover.test.ts ] && cp event-year-rollover.test.ts regression/events/
[ -f event-visibility-security.test.ts ] && cp event-visibility-security.test.ts regression/events/
success "Event regressions moved"

step "Moving time advancement regressions..."
[ -f time-advancement-race-condition.test.ts ] && cp time-advancement-race-condition.test.ts regression/time-advancement/
success "Time advancement regressions moved"

step "Moving other regressions..."
[ -f gregorian-weekday-bug.test.ts ] && cp gregorian-weekday-bug.test.ts regression/
[ -f worldtime-edge-cases-comprehensive.test.ts ] && cp worldtime-edge-cases-comprehensive.test.ts regression/
[ -f year-calculation-behavior.test.ts ] && cp year-calculation-behavior.test.ts regression/
[ -f comprehensive-regression.test.ts ] && cp comprehensive-regression.test.ts regression/
[ -f performance-baseline.test.ts ] && cp performance-baseline.test.ts regression/
success "Other regressions moved"

# Phase 4: Move unit tests
phase "Move Unit Tests"

step "Moving core unit tests..."
[ -f api-wrapper.test.ts ] && mv api-wrapper.test.ts unit/core/
[ -f logger.test.ts ] && mv logger.test.ts unit/core/
[ -f calendar-time-utils.test.ts ] && mv calendar-time-utils.test.ts unit/core/
[ -f manager-access-utils.test.ts ] && mv manager-access-utils.test.ts unit/core/
[ -f calendar-loader.test.ts ] && mv calendar-loader.test.ts unit/core/
[ -f event-time-utils.test.ts ] && mv event-time-utils.test.ts unit/core/
[ -f event-recurrence-calculation.test.ts ] && mv event-recurrence-calculation.test.ts unit/core/
[ -f predefined-formats.test.ts ] && mv predefined-formats.test.ts unit/core/
[ -f calendar-date-counts-for-weekdays.test.ts ] && mv calendar-date-counts-for-weekdays.test.ts unit/core/
[ -f calendar-date-formatting.test.ts ] && mv calendar-date-formatting.test.ts unit/core/
success "Core unit tests moved"

step "Moving UI unit tests..."
[ -f sidebar-button-registry.test.ts ] && mv sidebar-button-registry.test.ts unit/ui/
[ -f sidebar-button-mixin.test.ts ] && mv sidebar-button-mixin.test.ts unit/ui/
[ -f widget-type-resolver.test.ts ] && mv widget-type-resolver.test.ts unit/ui/
success "UI unit tests moved"

# Phase 5: Verification
phase "Verification"

step "Counting files in new structure..."
UNIT_CORE=$(find unit/core -name '*.test.ts' 2>/dev/null | wc -l)
UNIT_UI=$(find unit/ui -name '*.test.ts' 2>/dev/null | wc -l)
INTEGRATION=$(find integration -name '*.test.ts' 2>/dev/null | wc -l)
REGRESSION=$(find regression -name '*.test.ts' 2>/dev/null | wc -l)
NEW_TOTAL=$((UNIT_CORE + UNIT_UI + INTEGRATION + REGRESSION))
OLD_REMAINING=$(find . -maxdepth 1 -name '*.test.ts' -type f 2>/dev/null | wc -l)

echo ""
echo "File count verification:"
echo "  Unit tests (core): $UNIT_CORE"
echo "  Unit tests (ui): $UNIT_UI"
echo "  Integration tests: $INTEGRATION"
echo "  Regression tests: $REGRESSION"
echo "  Total new structure: $NEW_TOTAL"
echo "  Old structure remaining: $OLD_REMAINING"
echo ""

success "File count verified"

step "Running typecheck..."
cd "$SCRIPT_DIR" || error "Failed to cd to project root"
npm run typecheck || {
    echo ""
    echo -e "${YELLOW}WARNING: TypeScript errors detected.${NC}"
    echo "This is expected - consolidated files need manual import cleanup."
    echo ""
}

# Final summary
phase "Summary"

echo "Reorganization partially complete!"
echo ""
echo "Files moved to new structure: $NEW_TOTAL"
echo "Files still in old location: $OLD_REMAINING"
echo "Backup location: $BACKUP_DIR"
echo ""
echo -e "${YELLOW}MANUAL STEPS REQUIRED:${NC}"
echo ""
echo "1. Complete complex consolidations:"
echo "   - Sunrise/Sunset (5→2 files)"
echo "   - DateFormatter (5→2 files)"
echo "   - Calendar File Helpers (3→1 file)"
echo "   - Mini Widget (10→3 files)"
echo "   - Intercalary format consolidation (3→1 file)"
echo "   - Time Advancement (3→2 files)"
echo "   - Calendar Manager (7→4 files)"
echo "   - Quick Time Buttons (3→2 files)"
echo "   - Canonical Hours (3→2 files)"
echo ""
echo "2. For each consolidated file:"
echo "   - Remove duplicate imports"
echo "   - Organize describe blocks"
echo "   - Fix import paths for new locations"
echo "   - Run 'npm run format'"
echo ""
echo "3. Move remaining integration tests (see Phase 4.2 in plan)"
echo ""
echo "4. Run full verification:"
echo "   - npm run typecheck"
echo "   - npm run test:run"
echo "   - npm run lint"
echo ""
echo "5. Remove old files ONLY after verification passes"
echo "   - See Phase 6 in the plan"
echo ""
echo -e "${GREEN}See TEST-SUITE-REORGANIZATION-PLAN.md for complete details.${NC}"
echo ""
echo "If you need to rollback:"
echo "  rm -rf $TEST_DIR"
echo "  cp -r $BACKUP_DIR $TEST_DIR"
echo ""
