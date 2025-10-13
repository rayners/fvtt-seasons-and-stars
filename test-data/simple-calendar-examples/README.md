# Simple Calendar Test Data

This directory contains real Simple Calendar JSON files for testing the Calendar Builder's import and conversion functionality.

## File Types

### Full Export Format (with `exportVersion`)

- **`full-export-example.json`** - Complete Simple Calendar settings export
  - Contains `exportVersion: 2`
  - Includes `globalConfig`, `permissions`, `calendars` array, and `notes`
  - This is what users get when they export their full Simple Calendar configuration
  - The Calendar Builder should detect this format and offer to convert the first calendar

### Single Calendar Format (wrapped in `{"calendar": {...}}`)

- **`gregorian.json`** - Standard Gregorian calendar with leap years
  - 12 months, 7-day weeks, moon phases, 4 seasons
  - Includes leap year rule (Gregorian)

- **`harptos.json`** - Forgotten Realms (D&D) Harptos calendar
  - 12 regular months + 6 intercalary days
  - 10-day weeks ("tendays")
  - Includes Selûne moon phases
  - Includes festival notes (Midwinter, Greengrass, Midsummer, etc.)
  - Demonstrates intercalary day handling

## Testing the Import Feature

### In Calendar Builder UI:

1. Open Calendar Builder
2. Click "Import" button
3. Select one of these JSON files
4. For `full-export-example.json`:
   - Should see dialog: "Simple Calendar Format Detected"
   - Choose "Yes" to convert
   - Should convert the Gregorian Calendar from the export
5. For `gregorian.json` or `harptos.json`:
   - Should see same dialog
   - Choose "Yes" to convert
   - Should convert the single calendar

### Expected Conversion Results:

#### Gregorian Calendar

- ✅ 12 months with correct day counts
- ✅ Leap year rule (Gregorian)
- ✅ 7 weekdays
- ✅ Moon phases
- ✅ 4 seasons
- ⚠️ Warnings: gameTimeRatio, updateFrequency (not supported in S&S)

#### Harptos Calendar

- ✅ 12 regular months (Hammer, Alturiak, Ches, etc.)
- ✅ 6 intercalary days (Midwinter, Greengrass, Midsummer, Shieldmeet, Higharvestide, Feast of the Moon)
- ✅ 10 weekdays (1st-10th)
- ✅ Selûne moon with 8 phases
- ✅ 4 seasons
- ⚠️ Warnings:
  - Shieldmeet has `numberOfDays: 0, numberOfLeapYearDays: 1` (leap year only intercalary)
  - Notes are not converted (S&S has its own notes system)

## Source

These files are from the official Simple Calendar repository:

- Repository: https://github.com/vigoren/foundryvtt-simple-calendar
- Path: `/src/predefined-calendars/*.json`
- License: MIT

The `full-export-example.json` was created based on the structure seen in user exports and the Simple Calendar export format documentation.
