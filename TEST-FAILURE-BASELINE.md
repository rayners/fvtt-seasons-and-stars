# Date Alignment Issues - Test Failure Baseline

This document captures the current state of date alignment issues as revealed by comprehensive TDD testing. These tests define the expected behavior before implementing fixes.

## 🎯 Test Summary

### ✅ Passing Tests (Good Foundation)

- **Gregorian Calendar**: All 30 tests passing - weekday calculations are correct
- **WFRP Calendar**: Intercalary day handling working correctly
- **Dark Sun Calendar**: Month start alignment working correctly
- **Comprehensive Regression**: All 138 tests passing - no existing functionality broken

### ❌ Failing Tests (Issues to Fix)

#### 1. PF2e Calendar Weekday Misalignment (Issue #66)

**Status**: 3/12 tests failing
**Core Problem**: Weekday calculations are off by 5 positions for PF2e calendar

**Key Findings**:

- Date 4712/10/21 shows as "Toilday" (index 1) instead of "Sunday" (index 6)
- **Consistent 5-position offset** identified: Add 5 to S&S weekday calculations
- PF2e calendar is using `epoch-based` interpretation instead of `real-time-based`
- Year calculation produces 2700 AR (epoch) instead of ~4725 AR (expected for PF2e)

**Failed Tests**:

```
❌ Screenshot date: Sunday, 21st of Lamashan, 4712 AR should be Sunday
   Expected: 6 (Sunday), Got: 1 (Toilday)

❌ Test worldTime interpretation mode affects date calculation
   Expected worldTime=0 to produce year > 2700, Got: 2700 (stuck at epoch)

❌ Test PF2e year calculation compatibility
   Expected year difference < 10, Got: 2025 years (massive gap)
```

#### 2. WorldTime Edge Cases

**Status**: 4/11 tests failing
**Core Problems**: Boundary conditions and round-trip conversion issues

**Key Findings**:

- WorldTime=0 produces year 0 instead of valid dates
- Time arithmetic has -0 vs +0 precision issues
- Vale Reckoning calendar has round-trip conversion problems
- Some calendars produce invalid years (year 0)

**Failed Tests**:

```
❌ Handle worldTime = 0 (epoch start)
   Expected year > 0, Got: 0 (invalid year)

❌ Handle time arithmetic edge cases
   Expected hour: 0, Got: -0 (precision issue)

❌ Stress test round-trip conversion with random dates
   Expected year: 1986, Got: 1987 (round-trip failure in Vale Reckoning)

❌ Compare worldTime interpretation across calendar types
   Expected year > 0, Got: 0 (invalid years across multiple calendars)
```

#### 3. Calendar-Specific Issues

**Status**: 1/11 tests failing
**Core Problem**: WFRP calendar year length validation too strict

**Key Findings**:

- WFRP calendar has exactly 400 days (394 regular + 6 intercalary)
- Test expects < 400 but gets exactly 400 - boundary condition issue
- All other WFRP functionality working correctly

**Failed Test**:

```
❌ All fantasy calendars should handle basic date operations consistently
   Expected year length < 400, Got: 400 (boundary condition)
```

## 🔍 Root Cause Analysis

### Primary Issue: PF2e Calendar Configuration

The PF2e calendar (`golarion-pf2e.json`) is configured with:

```json
{
  "worldTime": {
    "interpretation": "epoch-based", // ← Should be "real-time-based"
    "epochYear": 2700,
    "currentYear": 4725
  }
}
```

This causes:

1. WorldTime=0 maps to epoch year (2700) instead of current year (4725)
2. Weekday calculations start from wrong base year
3. Massive year difference from PF2e World Clock expectations

### Secondary Issues

1. **Epoch Handling**: Some calendars produce year 0 for worldTime=0
2. **Precision**: JavaScript -0 vs +0 precision in time calculations
3. **Round-trip**: Vale Reckoning calendar has conversion accuracy issues
4. **Validation**: Test boundary conditions need adjustment for calendars with exactly expected limits

## 📋 Fix Strategy (TDD Approach)

### Phase 1: PF2e Calendar Fix (High Priority)

1. **Update PF2e calendar configuration**: Change `interpretation` to `"real-time-based"`
2. **Verify worldTime interpretation**: Ensure worldTime=0 produces year ~4725
3. **Test weekday calculations**: Confirm Sunday, 21st Lamashan, 4712 AR calculation
4. **Validate PF2e compatibility**: Ensure year difference < 10 years from PF2e World Clock

### Phase 2: WorldTime Edge Cases (Medium Priority)

1. **Fix year 0 handling**: Ensure all calendars produce valid years (> 0)
2. **Address precision issues**: Resolve -0 vs +0 in time arithmetic
3. **Fix round-trip conversion**: Investigate Vale Reckoning date conversion accuracy
4. **Improve error handling**: Add validation for edge cases

### Phase 3: Test Refinement (Low Priority)

1. **Adjust boundary conditions**: Update WFRP test to expect <= 400 instead of < 400
2. **Enhance error messages**: Provide clearer test failure descriptions
3. **Add performance validation**: Ensure fixes don't impact performance

## 🧪 Test Files Created

### Core Test Files

- `test/pf2e-date-alignment-comprehensive.test.ts` - PF2e Issue #66 comprehensive testing
- `test/gregorian-weekday-bug.test.ts` - Enhanced with 20 additional real-world test cases
- `test/worldtime-edge-cases-comprehensive.test.ts` - Edge cases and boundary conditions
- `test/calendar-specific-alignment-issues.test.ts` - WFRP, Dark Sun, Forbidden Lands, Exandrian testing

### Test Coverage

- **Total New Tests**: 54 tests added
- **PF2e Specific**: 12 tests (3 failing, 9 passing)
- **Gregorian Enhanced**: 30 tests (all passing)
- **WorldTime Edge Cases**: 11 tests (4 failing, 7 passing)
- **Calendar-Specific**: 11 tests (1 failing, 10 passing)

## ✅ Validation Criteria

Tests will be considered successful when:

1. **PF2e Issue #66 Resolved**:

   - Date 4712/10/21 calculates as Sunday (weekday 6)
   - WorldTime=0 produces year ~4725 AR (not 2700)
   - Year difference from PF2e World Clock < 10 years

2. **WorldTime Edge Cases Fixed**:

   - All calendars produce valid years (> 0) for worldTime=0
   - Time arithmetic produces consistent precision (no -0 vs +0)
   - Round-trip conversions preserve exact dates

3. **No Regression**:
   - All existing 138 regression tests continue passing
   - Gregorian calendar remains accurate
   - WFRP and Dark Sun functionality unchanged

## 📊 Current Status

- **Tests Written**: ✅ Complete (following TDD principles)
- **Baseline Documented**: ✅ Complete (this document)
- **Issues Identified**: ✅ Complete (root causes known)
- **Fix Strategy**: ✅ Defined (clear implementation path)
- **Ready for Implementation**: ✅ Yes (can now proceed with fixes)

This baseline establishes the exact current state and provides clear success criteria for implementing fixes using Test-Driven Development principles.
