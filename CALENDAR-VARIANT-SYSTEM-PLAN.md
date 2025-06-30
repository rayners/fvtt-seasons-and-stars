# Calendar Variant System Implementation Plan

## Problem Analysis

### GitHub Issues Summary

#### Issue #91: Calendar Display Problem

- **User Report**: Date mismatch between S&S calendar and PF2e system
- **Critical Details**:
  - S&S shows year 6749 vs PF2e showing 4725 (same calendar: "О.А." = Russian "Absalom Reckoning")
  - **2024-year difference** (6749 - 4725 = 2024) suggests epoch/baseline calculation mismatch
  - Both systems using identical calendar (Absalom Reckoning), different year calculations
  - Russian PF2e installation shows "О.А." (Cyrillic) instead of "AR" (Latin)
  - Potential weekday misalignment ("Sunday" vs other weekdays)

#### Issue #92: Related Calendar Integration Issues

- **Additional Context**: Further date synchronization problems with PF2e
- **User Comments**: Indicate broader issues with year calculation/setting in S&S
- **Scope**: Not just PF2e-specific, suggests core calendar engine year calculation problems

## Research Findings

### PF2e System Time Management Analysis

From investigation of `~/Code/personal/pf2e`, the PF2e system uses a sophisticated time management approach:

#### Core PF2e Time Architecture

- **WorldClock App**: Main time display and advancement (`/src/module/apps/world-clock/app.ts`)
- **Settings System**: Configuration for date themes and world creation (`/src/module/system/settings/world-clock.ts`)
- **Luxon DateTime**: Uses Luxon library for all date calculations

#### Critical PF2e Date Calculation Logic

```typescript
// How PF2e calculates current time
get worldTime(): DateTime {
    return this.worldCreatedOn.plus({ seconds: game.time.worldTime });
}

// How PF2e calculates displayed year
get year(): number {
    return this.worldTime.year + CONFIG.PF2E.worldClock[this.dateTheme].yearOffset;
}
```

#### PF2e Date Theme System

PF2e supports multiple calendar themes with **different year offsets**:

```javascript
// From PF2e config/index.ts
worldClock: {
    AR: { yearOffset: 2700 },  // Absalom Reckoning (Golarion standard)
    IC: { yearOffset: 5200 },  // Imperial Calendar (Chelish)
    AD: { yearOffset: -95 },   // Anno Domini (Earth historical)
    CE: { yearOffset: 0 }      // Common Era (Earth modern)
}
```

#### PF2e Date Calculation Flow

1. **World Creation Date**: `worldCreatedOn` setting (ISO string, defaults to current UTC)
2. **Elapsed Time**: `game.time.worldTime` seconds added
3. **Current DateTime**: `worldCreatedOn + worldTime`
4. **Final Year**: `currentDateTime.year + yearOffset`

**Example**: World created in 2025 + 2700 offset = **4725 AR**

### Existing S&S PF2e Integration Infrastructure

#### Comprehensive Test Suites

- **PF2e Compatibility Tests**: `test/pf2e-compatibility-verification.test.ts`
- **Date Alignment Tests**: `test/pf2e-date-alignment-comprehensive.test.ts`
- **Integration Tests**: `test/pf2e-integration-complete.test.ts`
- **Known Solutions**: Weekday offset (+5 positions) already implemented

#### Integration Module

- **PF2e Integration**: `src/integrations/pf2e-integration.ts`
- **worldTime Mapping**: Existing logic for date conversion
- **System Detection**: Already detects PF2e environment

#### Golarion Calendar Definition

- **Calendar File**: `calendars/golarion-pf2e.json`
- **Existing Compatibility**: PF2e-specific settings already defined
- **Month/Weekday Names**: Match Golarion standard

#### Calendar Engine

- **System Detection**: `CalendarEngine` already has PF2e compatibility mode
- **Weekday Fixes**: Existing +5 position offset for PF2e weekday alignment

## Root Cause Analysis

### Confirmed: Core Integration Bug (Not Calendar Selection Issue)

- **Same Calendar Used**: Both S&S and PF2e using Absalom Reckoning ("О.А." in Russian)
- **Integration Failure**: S&S not properly integrating with PF2e's worldTime calculation system
- **Year Calculation Bug**: 2024-year difference (6749 - 4725) indicates fundamental epoch/baseline mismatch

### S&S Calendar Engine Issues

Based on GitHub issue comments indicating broader year calculation problems:

- **Core Engine Problem**: Year calculation/setting issues beyond just PF2e integration
- **WorldTime Conversion**: Fundamental problems in worldTime → calendar date conversion
- **Epoch Handling**: Incorrect baseline assumptions about worldTime=0 mapping

### PF2e Integration Mismatch Details

- **S&S Approach**: Uses epoch-based calculation (worldTime=0 maps to epoch year 2700)
- **PF2e Approach**: Uses real-world creation date + year offset (2025 + 2700 = 4725)
- **Russian Localization**: "О.А." (Cyrillic) = "AR" (Latin) = Absalom Reckoning
- **Integration Gap**: S&S not using PF2e's `worldCreatedOn + worldTime + yearOffset` method

### Secondary Issues

- **Weekday Alignment**: S&S weekday calculations differ from PF2e by +5 positions (existing solution available)
- **Multiple PF2e Themes**: PF2e supports AR (+2700), IC (+5200), AD (-95), CE (0) - variants could provide workarounds
- **Broader Compatibility**: Year calculation issues likely affect other game systems too

## Solution: Dynamic Calendar Expansion via Variants

### Core Concept

Create a calendar variant system that **dynamically expands** a single calendar file into multiple selectable calendar options:

1. **Primary Purpose - Cultural/Regional Differences**: Different naming conventions for same calendar structure (Imperial vs Varisian vs Absalom naming)
2. **Dynamic Calendar Generation**: One `golarion-pf2e.json` file generates (1 + number of variants) calendar options in selection dialog
3. **Configuration Format**: `"<calendarId>"` for base calendar, `"<calendarId>(<variantId>)"` for variants
4. **Perfect Backward Compatibility**: Existing users stay on base calendar, can opt-in to variants when desired
5. **Integration Workarounds**: Variants can include different year offset configurations as **temporary workarounds** for integration bugs

### Calendar Variant Structure

```json
{
  "id": "golarion-pf2e",
  "name": "Golarion Calendar System",

  // Base calendar definition (shared structure)
  "months": [
    { "name": "Abadius", "days": 31, "description": "..." },
    { "name": "Calistril", "days": 28, "description": "..." }
    // ... rest of months
  ],
  "weekdays": [
    { "name": "Moonday", "abbreviation": "Mo", "description": "..." },
    { "name": "Toilday", "abbreviation": "To", "description": "..." }
    // ... rest of weekdays
  ],
  "year": {
    "epoch": 2700,
    "suffix": " AR"
  },

  // System-specific technical adjustments (hidden from users)
  "compatibility": {
    "pf2e": {
      "weekdayOffset": 5, // Technical fix for weekday alignment
      "useWorldClockMapping": true // Use PF2e's date calculation method
    }
  },

  // User-facing cultural/regional variants
  "variants": {
    "absalom-reckoning": {
      "name": "Absalom Reckoning",
      "description": "Standard Pathfinder Society calendar",
      "default": true,
      "config": {
        "yearOffset": 2700 // Matches PF2e AR theme
      },
      "overrides": {
        "year": { "suffix": " AR" }
      }
    },

    "imperial-calendar": {
      "name": "Imperial Calendar",
      "description": "Chelish Imperial dating system",
      "config": {
        "yearOffset": 5200 // Matches PF2e IC theme
      },
      "overrides": {
        "year": { "suffix": " IC" },
        "months": {
          "Abadius": { "name": "First Imperial", "description": "..." },
          "Calistril": { "name": "Second Imperial", "description": "..." }
          // ... other imperial names
        }
      }
    },

    "varisian-traditional": {
      "name": "Varisian Traditional",
      "description": "Traditional Varisian calendar with local names",
      "config": {
        "yearOffset": 2700 // Same epoch as AR, different names
      },
      "overrides": {
        "year": { "suffix": " VC" }, // Varisian Calendar
        "months": {
          "Calistril": { "name": "Winter's Heart", "description": "..." },
          "Pharast": { "name": "Death's Door", "description": "..." }
        }
      }
    },

    "earth-historical": {
      "name": "Earth Historical (AD)",
      "description": "Earth Anno Domini calendar for modern campaigns",
      "config": {
        "yearOffset": -95 // Matches PF2e AD theme
      },
      "overrides": {
        "year": { "suffix": " AD" },
        "months": {
          "Abadius": { "name": "January" },
          "Calistril": { "name": "February" }
          // ... standard Earth month names
        }
      }
    }
  }
}
```

### Override System Design

#### Index-Based Overrides

```json
{
  "overrides": {
    "weekdays": {
      "4": { "name": "Thorsday", "description": "Day honoring Thor" }
    }
  }
}
```

#### String Replacement Overrides

```json
{
  "overrides": {
    "weekdays": {
      "Thursday": { "name": "Thorsday", "description": "Day honoring Thor" }
    }
  }
}
```

#### Multiple Override Methods

- **Index-based**: `"4": {...}` - Override weekday at index 4
- **Name-based**: `"Thursday": {...}` - Override weekday with matching name
- **Partial Properties**: Only specified properties get overridden, others inherited

## Implementation Plan

### Phase 1: Fix Core Calendar Engine Year Calculation (3-4 hours)

#### Core Engine Investigation

- **Primary Issue**: Debug fundamental year calculation problems in S&S calendar engine
- **Root Cause Analysis**: Investigate why S&S shows 6749 vs PF2e's 4725 using same calendar
- **WorldTime Conversion**: Fix core `worldTime → calendar date` conversion logic
- **Epoch Handling**: Correct baseline assumptions about worldTime=0 mapping to calendar years

#### Calendar Engine Repair

- **Fix Year Calculation**: Ensure proper epoch-based to real-world year conversion
- **WorldTime Integration**: Fix fundamental worldTime interpretation in calendar engine
- **Baseline Correction**: Address 2024-year offset suggesting epoch calculation error
- **Broader Compatibility**: Ensure fixes work across all game systems, not just PF2e

#### PF2e Integration Specific Fixes

- **Integration Layer**: Fix `src/integrations/pf2e-integration.ts` to use PF2e's worldTime method
- **Year Offset Application**: Ensure S&S uses PF2e's `worldCreatedOn + worldTime + yearOffset` when PF2e detected
- **Russian Localization**: Test with Russian PF2e installation showing "О.А."
- **Weekday Alignment**: Apply existing weekdayOffset=5 fix correctly within integration system

#### Comprehensive Testing

- **Issue Reproduction**: Test exact GitHub issue scenarios (6749 → 4725 discrepancy)
- **Multi-Language**: Verify fix works with Russian PF2e installation ("О.А." display)
- **Date Advancement**: Test that date advancement maintains synchronization
- **Cross-System**: Verify calendar engine fixes don't break other game systems

### Phase 2: Dynamic Calendar Variant System (2-3 hours)

#### Calendar Loading Enhancement

- Modify calendar loading to detect `variants` object in calendar definitions
- Implement dynamic calendar expansion: one file → multiple selectable options
- Add configuration parsing for `"<calendarId>"` vs `"<calendarId>(<variantId>)"` format
- Ensure backward compatibility: existing `"golarion-pf2e"` settings continue working

#### Calendar Selection Dialog Enhancement

- Update calendar selection to show expanded list with base + variant options
- Display format: "Golarion Calendar System", "Golarion Calendar System (Imperial Calendar)", etc.
- Maintain existing selection UI patterns - no new interface components needed
- Support variant switching without data loss or reconfiguration

#### Variant Merging System

- Implement base calendar + variant override merging logic
- Support selective property replacement (variant overrides specific properties, inherits others)
- Handle both index-based and string-replacement override methods
- Add validation to ensure variant overrides don't break calendar structure

### Phase 3: Cultural Calendar Variants (2-3 hours)

#### Create Golarion Cultural Variants

- **Imperial Calendar**: Imperial month names, " IC" suffix, imperial cultural context
- **Varisian Traditional**: Traditional Varisian month names, local cultural descriptions
- **Absalom Reckoning**: Standard Pathfinder Society calendar (base calendar)
- **Earth Historical**: Earth month names for modern campaigns, " AD" suffix

#### Override System Implementation

- Support both index-based overrides: `"weekdays": {"4": {"name": "Thorsday"}}`
- Support string replacement: `"months": {"Calistril": {"name": "Winter's Heart"}}`
- Handle partial property overrides (change name, keep description, etc.)
- Test mixed override methods within same variant

#### Integration Workaround Support

- Include yearOffset configurations in variants as **temporary workarounds** for edge cases
- Document that variants provide cultural choice, not integration bug fixes
- Ensure integration workarounds don't interfere with proper calendar engine fixes from Phase 1

### Phase 4: Testing and Documentation (1-2 hours)

#### Core Engine Fix Verification

- **Primary Goal**: Verify Phase 1 calendar engine fixes resolve year calculation issues
- **Issue Resolution**: Test exact GitHub issue scenarios (6749 → 4725 discrepancy eliminated)
- **Russian Localization**: Verify fix works with Russian PF2e installation ("О.А." display)
- **Weekday Alignment**: Ensure weekday synchronization works correctly (Sunday = Sunday)
- **Date Advancement**: Test that date advancement maintains synchronization between systems

#### Variant System Testing

- Test base calendar loading (backward compatibility for existing users)
- Test variant calendar loading and selection
- Test variant switching without breaking calendar functionality
- Test override system with various property combinations

#### Comprehensive Compatibility Testing

- **Cross-System**: Verify calendar engine fixes work across all game systems, not just PF2e
- **Existing Installations**: Confirm existing S&S installations continue working without changes
- **Integration Layer**: Test PF2e integration improvements don't affect other systems
- **Cultural Variants**: Validate that users can choose cultural variants independently of core fixes

#### Documentation Updates

- **Core Issue Resolution**: Document calendar engine year calculation fixes
- **Variant System**: Document variant system as cultural/regional choice enhancement
- **Clear Separation**: Clarify that year synchronization is handled by engine fixes, not calendar switching
- **Migration Guidance**: Provide guidance for users wanting cultural variants vs. integration fixes

## Architecture Benefits

### Addresses Root Causes

- **Year Calculation**: yearOffset in variants directly addresses 6749 vs 4725 discrepancy
- **Multiple PF2e Themes**: Variants support all four PF2e calendar themes (AR, IC, AD, CE)
- **Weekday Alignment**: Existing +5 offset integrated into compatibility system
- **Cultural Accuracy**: Variants represent actual in-world dating systems

### Framework Advantages

- **System Agnostic**: Same calendar works across game systems with automatic compatibility
- **Flexible Overrides**: Support both minor tweaks and major cultural differences
- **Backward Compatible**: Existing installations continue working with default variants
- **Extensible**: Framework supports future calendar variants and game systems

### User Experience

- **Clear Choices**: Users select based on campaign culture, not technical compatibility
- **Automatic Compatibility**: Technical fixes applied transparently when game system detected
- **Cultural Context**: Variants provide lore-appropriate calendar variations
- **Migration Support**: Existing users can upgrade without losing calendar data

## Success Criteria

### Technical Requirements

- S&S calendar shows same dates as PF2e World Clock when using matching variant
- Year calculations align exactly across all PF2e themes (AR, IC, AD, CE)
- Weekday calculations match PF2e expectations with +5 offset
- Date advancement maintains synchronization between systems

### User Experience Requirements

- Users can select variant matching their campaign's calendar theme
- Variant selection is intuitive and well-documented
- Existing S&S installations continue working without changes
- Migration from current Golarion calendar is seamless

### Integration Requirements

- Auto-detection recommends appropriate variant for PF2e system
- Override system supports both minor and major calendar customizations
- Framework extensible for other game systems and calendar families
- Comprehensive test coverage prevents regressions

## Estimated Timeline

- **Phase 1**: Fix Core Calendar Engine Year Calculation (3-4 hours)
- **Phase 2**: Dynamic Calendar Variant System (2-3 hours)
- **Phase 3**: Cultural Calendar Variants (2-3 hours)
- **Phase 4**: Testing and Documentation (1-2 hours)

**Total: 8-12 hours** (reduced from original 10-14 hours due to clearer problem scope)

## Priority and Approach

### **Phase 1 is Critical**

The core calendar engine year calculation fix is the **primary goal** - this resolves the actual user-reported problems. The 2024-year difference (6749 vs 4725) using the same calendar ("О.А." = Absalom Reckoning) confirms this is a fundamental integration bug, not a calendar selection issue.

### **Phases 2-3 are Enhancements**

The variant system provides **cultural choice and regional flexibility** - valuable additions that support different campaign styles and provide workarounds for edge cases, but not the core solution to the GitHub issues.

### **Combined Benefits**

This plan addresses both the immediate integration bugs (Phase 1) and provides long-term architectural improvements (Phases 2-3) that enhance user choice while maintaining perfect backward compatibility for existing S&S installations.
