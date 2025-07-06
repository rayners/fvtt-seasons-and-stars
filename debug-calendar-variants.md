# Calendar Variant Debug Report

## Issue Summary

The mini widget is showing "30 Dec 0" instead of the expected federation standard format "SD 47015.0".

## Root Cause Analysis

### 1. Calendar Variant Selection

- **Base Calendar**: `gregorian` (no dateFormats)
- **Variant Calendar**: `gregorian-star-trek-variants(federation-standard)` (has dateFormats with widgets.mini)
- **Current Active**: Likely just `gregorian` (not the variant)

### 2. External vs Inline Variants

- **External variants** (from `-variants.json` files) are not automatically selected as defaults
- **Inline variants** (within the calendar file) can have automatic defaults
- The federation-standard variant is external, so it must be explicitly selected

### 3. Calendar Resolution Flow

1. User sets active calendar to "gregorian"
2. `resolveDefaultVariant("gregorian")` returns "gregorian" (not the variant)
3. `getActiveCalendar()` returns base gregorian calendar (no dateFormats)
4. `CalendarDate.toShortString()` finds no `widgets.mini` format
5. Falls back to basic format: `${day} ${monthAbbr} ${year}` = "30 Dec 0"

## Solution Options

### Option 1: User selects correct variant

User needs to explicitly select `gregorian-star-trek-variants(federation-standard)` as their active calendar.

### Option 2: Improve dateFormats merging

Currently: `variantCalendar.dateFormats = { ...variant.overrides.dateFormats };`
Should be: Deep merge with base calendar dateFormats (though not needed for this specific case)

### Option 3: Auto-apply external defaults

Modify `resolveDefaultVariant` to check external variants for defaults (risky)

## Recommended Fix

**Option 1** - Ensure the user has selected the correct calendar variant in their settings.

The calendar selection UI should show:

- "Gregorian Calendar" (base, no special formatting)
- "Star Trek Calendar Variants > Federation Standard Calendar" (with stardate formatting)

## Testing

The existing test works because it:

1. Creates an inline variant (not external)
2. Explicitly uses the variant calendar object
3. Tests the formatter directly with the correct calendar instance

The issue occurs in the real UI because the active calendar is the base calendar, not the variant.
