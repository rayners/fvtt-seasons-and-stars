# Test Suite Reorganization - Documentation Package

This directory contains a complete, executable plan for reorganizing the Seasons & Stars test suite from 147 files in a flat structure to ~85-90 files in an organized hierarchy.

## 📋 Documentation Files

### 1. **test-suite-analysis.md** (Input)
Comprehensive analysis of the current test suite:
- Complete file-by-file mapping
- Categorization (unit/integration/regression)
- Overlap and redundancy identification
- Coverage gap analysis
- **Use this to understand the current state**

### 2. **TEST-SUITE-REORGANIZATION-PLAN.md** (Primary Plan)
Complete, executable reorganization plan with:
- Phase-by-phase execution steps
- Specific bash commands for each operation
- Safety checks and verification steps
- Rollback strategy
- Expected outcomes
- **Use this as your step-by-step guide**

### 3. **CONSOLIDATION-MAPPING.md** (Quick Reference)
Visual reference showing:
- Exact source → destination mappings
- Which files to merge
- Statistics on file reduction
- Import path updates needed
- **Use this for quick lookups during execution**

### 4. **execute-reorganization.sh** (Automation)
Bash script that automates:
- Pre-flight safety checks
- Backup creation
- Directory structure creation
- Simple consolidations
- File movement for regressions and unit tests
- Verification
- **Use this to automate the mechanical parts**

## 🎯 Quick Start

### Option A: Fully Manual (Recommended for first time)

1. Read `TEST-SUITE-REORGANIZATION-PLAN.md`
2. Execute each phase sequentially
3. Use `CONSOLIDATION-MAPPING.md` as reference
4. Verify after each major consolidation

### Option B: Semi-Automated

1. Review the plan first
2. Run `./execute-reorganization.sh` for automated setup
3. Complete manual consolidations (complex merges)
4. Run verification steps
5. Clean up old files

### Option C: Fully Automated (Advanced)

Extend `execute-reorganization.sh` with consolidation logic for:
- Sunrise/Sunset
- DateFormatter
- Calendar File Helpers
- Mini Widget
- Other complex merges

## 📊 Expected Results

### Before
```
packages/core/test/
├── 147 test files (flat structure)
├── Organized by feature name
├── High redundancy (5-10 files per feature)
└── Mixed unit/integration/regression
```

### After
```
packages/core/test/
├── unit/
│   ├── core/ (~13 files)
│   └── ui/ (~4 files)
├── integration/
│   ├── calendar-engine/ (~6 files)
│   ├── calendar-manager/ (~5 files)
│   ├── widgets/ (~15 files)
│   ├── events-notes/ (~10 files)
│   ├── calendars/ (~12 files)
│   └── [other categories] (~20 files)
├── regression/
│   ├── calendar-engine/ (~4 files)
│   ├── intercalary/ (~8 files)
│   ├── widgets/ (~3 files)
│   └── [other categories] (~7 files)
└── ~85-90 test files total (40% reduction)
```

## 🔄 Consolidation Overview

| Priority | Area | Before | After | Reduction |
|----------|------|--------|-------|-----------|
| HIGH | Sunrise/Sunset | 5 | 2 | 60% |
| HIGH | DateFormatter | 5 | 2 | 60% |
| HIGH | Mini Widget | 10 | 3 | 70% |
| HIGH | Calendar Validator | 2 | 1 | 50% |
| HIGH | Calendar File Helpers | 3 | 1 | 67% |
| HIGH | Intercalary | 11 | 8 | 27% |
| MEDIUM | Time Advancement | 3 | 2 | 33% |
| MEDIUM | Calendar Manager | 7 | 4 | 43% |
| MEDIUM | Quick Time Buttons | 3 | 2 | 33% |
| MEDIUM | Widget Toggle | 2 | 1 | 50% |
| MEDIUM | Widget None Option | 2 | 1 | 50% |
| MEDIUM | Canonical Hours | 3 | 2 | 33% |
| **TOTAL** | **Consolidations** | **56** | **29** | **48%** |

**Plus**: ~91 files moved without consolidation (just reorganized)

## ✅ Phases Overview

### Phase 0: Pre-Flight Checks ⚠️
- Create timestamped backup
- Run baseline test suite
- Document current file count

### Phase 1: Structure Creation 🏗️
- Create unit/integration/regression directories
- Verify structure with tree command

### Phase 2: High-Priority Consolidations 🎯
- Sunrise/Sunset (5→2)
- DateFormatter (5→2)
- Calendar Validator (2→1)
- Calendar File Helpers (3→1)
- Mini Widget (10→3)
- Intercalary (11→8)

### Phase 3: Medium-Priority Consolidations 📊
- Time Advancement (3→2)
- Calendar Manager (7→4)
- Quick Time Buttons (3→2)
- Widget Toggle (2→1)
- Widget None Option (2→1)
- Canonical Hours (3→2)

### Phase 4: File Reorganization 📁
- Move unit tests to unit/
- Move integration tests to integration/
- Move regression tests to regression/
- Handle special directories

### Phase 5: Verification ✓
- Verify file counts
- Run full test suite
- Check coverage
- Manual cleanup of imports
- Lint and typecheck

### Phase 6: Cleanup 🧹
- Remove old files (ONLY after verification)
- Final test run
- Update documentation

## 🛡️ Safety Features

### Backup Strategy
- Timestamped backup before any changes
- Keeps original structure intact
- Easy rollback with single command

### Verification Checkpoints
- Typecheck after each consolidation
- Test runs for affected areas
- File count verification
- Coverage comparison

### Rollback Process
```bash
# Quick rollback
BACKUP_DIR=$(ls -dt /home/user/fvtt-seasons-and-stars-backup-* | head -1)
rm -rf packages/core/test
cp -r "$BACKUP_DIR" packages/core/test
npm run test:run
```

## 🔧 Manual Cleanup Required

After consolidation, each merged file needs:

1. **Import deduplication**: Remove duplicate imports
2. **Describe organization**: Group related tests logically
3. **Setup consolidation**: Merge beforeEach/afterEach blocks
4. **Path updates**: Fix import paths for new locations
5. **Formatting**: Run `npm run format`
6. **Documentation**: Update file headers

## 📈 Benefits

### Immediate
- 40% reduction in test files (147 → 85-90)
- Clear separation: unit vs integration vs regression
- Easy to locate tests for specific components
- Better alignment with source structure

### Long-term
- Easier onboarding for new contributors
- Clearer test organization patterns
- Reduced maintenance overhead
- Better test discoverability
- Improved CI/CD organization

## 🚨 Important Notes

### Before Starting
- Commit all current changes
- Ensure tests are passing (or note failures)
- Review the full plan document
- Set aside 2-4 hours for execution

### During Execution
- Work phase by phase
- Verify after each major consolidation
- Don't delete old files until final verification
- Keep backup until fully satisfied

### After Completion
- Run full test suite: `npm run test:run`
- Run linter: `npm run lint`
- Run typecheck: `npm run typecheck`
- Build: `npm run build`
- Update CLAUDE.md if needed

## 📝 Import Path Updates

When moving files to new structure, update relative imports:

### From Flat → Unit
```typescript
// Old (flat structure)
import { helper } from './test-helpers/helper';

// New (unit/core/)
import { helper } from '../../test-helpers/helper';

// New (unit/ui/)
import { helper } from '../../test-helpers/helper';
```

### From Flat → Integration
```typescript
// Old (flat structure)
import { helper } from './test-helpers/helper';

// New (integration/calendar-engine/)
import { helper } from '../../test-helpers/helper';

// New (integration/widgets/)
import { helper } from '../../test-helpers/helper';
```

### From Flat → Regression
```typescript
// Old (flat structure)
import { helper } from './test-helpers/helper';

// New (regression/intercalary/)
import { helper } from '../../test-helpers/helper';

// New (regression/ - root level)
import { helper } from './test-helpers/helper';
```

## 🎓 Testing Philosophy

The new structure enforces clear separation:

### Unit Tests (`unit/`)
- Test single components in isolation
- Mock external dependencies
- Fast execution
- High coverage of edge cases

### Integration Tests (`integration/`)
- Test multiple components together
- Real dependencies (where practical)
- Verify component interactions
- Test realistic scenarios

### Regression Tests (`regression/`)
- Document specific bugs
- Prevent bug recurrence
- Include issue/PR references
- Keep even if covered elsewhere

## 🔍 Finding Tests After Reorganization

### By Component
```bash
# Find all tests for CalendarEngine
find packages/core/test -name '*calendar-engine*'

# Find all tests for widgets
find packages/core/test/integration/widgets -name '*.test.ts'
```

### By Type
```bash
# All unit tests
find packages/core/test/unit -name '*.test.ts'

# All regression tests
find packages/core/test/regression -name '*.test.ts'
```

### By Feature
```bash
# All intercalary-related tests
find packages/core/test -name '*intercalary*'

# All time advancement tests
find packages/core/test -name '*time-advancement*'
```

## 📚 Additional Resources

- **test-suite-analysis.md**: Detailed current state analysis
- **CLAUDE.md**: Project development guidelines
- **dev-context/testing-practices.md**: Testing standards
- **packages/core/test/README.md**: Test organization guide (create after reorganization)

## ❓ Troubleshooting

### Tests fail after consolidation
1. Check for duplicate imports
2. Verify import paths are correct
3. Check for missing describe block closures
4. Look for test name conflicts
5. Verify mocks are still properly imported

### TypeScript errors in consolidated files
1. Check for circular dependencies
2. Verify all imports are valid
3. Look for missing type imports
4. Check for conflicting variable names
5. Run `npm run typecheck` for details

### Coverage decreased
1. Check that all tests were copied
2. Verify no describe blocks were skipped
3. Compare test counts before/after
4. Review git diff for missing tests

### Can't find a test file
1. Check CONSOLIDATION-MAPPING.md
2. Search by test name: `grep -r "describe('TestName'"`
3. Check backup if needed
4. Review git history

## 🎯 Success Criteria

Reorganization is complete when:

- [ ] All test files moved to new structure
- [ ] All consolidations completed with manual cleanup
- [ ] No files remain in flat structure (except support dirs)
- [ ] `npm run test:run` passes with same or better results
- [ ] `npm run typecheck` passes
- [ ] `npm run lint` passes
- [ ] `npm run build` succeeds
- [ ] Coverage maintained or improved
- [ ] File count reduced by ~40%
- [ ] All imports working correctly
- [ ] Documentation updated

## 🚀 Next Steps After Completion

1. Create `packages/core/test/README.md` documenting new structure
2. Update CLAUDE.md with test organization reference
3. Consider updating CI/CD for better test organization
4. Create test templates for each category
5. Update developer onboarding docs
6. Remove backup after confidence period (1-2 weeks)

---

**Ready to begin?** Start with `TEST-SUITE-REORGANIZATION-PLAN.md` Phase 0.

**Questions?** Review the plan document or CONSOLIDATION-MAPPING.md for specifics.

**Issues?** Use the rollback strategy and report what went wrong.
