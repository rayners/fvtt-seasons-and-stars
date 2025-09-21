# Seasons & Stars Calendar Format Specification

> **Complete specification for the S&S JSON calendar format**

This document defines the JSON format used by Seasons & Stars for calendar definitions. The format is designed to be human-readable, easy to edit, and comprehensive enough to support all major calendar systems.

## Design Principles

- **Simplicity**: Minimal required fields, intuitive structure
- **Readability**: Human-editable JSON with descriptive content
- **Completeness**: Support for complex calendars (leap years, intercalary days)
- **Flexibility**: Extensible format for future features
- **Compatibility**: Migration path from Simple Calendar format

## Defaults and Missing Sections

Seasons & Stars can operate with minimal calendar data. If core sections like
`year`, `leapYear`, `months`, `weekdays`, `intercalary`, or `time` are omitted,
the engine fills them with Gregorian defaults and logs a console warning. To
disable leap years entirely, include `"leapYear": { "rule": "none" }`.

## Complete Format Specification

```json
{
  "id": "unique-calendar-id",
  "label": "Human Readable Calendar Name",
  "description": "Detailed description of the calendar and its cultural context",
  "setting": "Optional game setting or system name",
  "sources": [
    "https://example.com/calendar-reference",
    "https://example.com/moon-data",
    {
      "citation": "User-supplied: Doe, Jane. *Chronicles of the Twin Suns.* Emberfall Press, 1492.",
      "notes": "Confirmed by campaign GM"
    }
  ],

  "year": {
    "epoch": 0,
    "currentYear": 1542,
    "prefix": "",
    "suffix": " MVR",
    "startDay": 0
  },

  "leapYear": {
    "rule": "none",
    "interval": 4,
    "month": "February",
    "extraDays": 1
  },

  "months": [
    {
      "name": "Frostwane",
      "abbreviation": "Fro",
      "days": 45,
      "description": "The dying of winter. A time of silence, hunger, and huddled survival."
    }
  ],

  "weekdays": [
    {
      "name": "Brightday",
      "abbreviation": "Bri",
      "description": "Auspicious. New journeys, clear skies, and clean starts."
    }
  ],

  "intercalary": [
    {
      "name": "Hearthmoor",
      "after": "Frostwane",
      "leapYearOnly": false,
      "countsForWeekdays": true,
      "description": "A night of survival rites and shared flame. The long dark wanes."
    },
    {
      "name": "Festival of Flames",
      "days": 3,
      "after": "Summertide",
      "leapYearOnly": false,
      "countsForWeekdays": true,
      "description": "A three-day celebration of the summer's peak with bonfires and feasting."
    }
  ],

  "time": {
    "hoursInDay": 24,
    "minutesInHour": 60,
    "secondsInMinute": 60
  },

  "dateFormats": {
    "default": "{{ss-day format=\"ordinal\"}} {{ss-month format=\"name\"}}, {{year}}",
    "short": "{{ss-day}}/{{ss-month}}/{{year}}",
    "long": "{{ss-weekday format=\"name\"}}, {{ss-day format=\"ordinal\"}} {{ss-month format=\"name\"}}, {{year}}",
    "short-intercalary": "{{intercalary}}, {{year}}",
    "long-intercalary": "{{intercalary}} ({{year}})",
    "widgets": {
      "mini": "{{ss-day}} {{ss-month format=\"abbr\"}}",
      "main": "{{ss-weekday format=\"abbr\"}}, {{ss-day}} {{ss-month format=\"name\"}}",
      "grid": "{{ss-day}}",
      "mini-intercalary": "{{intercalary}}",
      "main-intercalary": "{{intercalary}}, {{year}}"
    }
  },

  "moons": [
    {
      "name": "Luna",
      "cycleLength": 29.53059,
      "firstNewMoon": { "year": 2024, "month": 1, "day": 11 },
      "phases": [
        { "name": "New Moon", "length": 1, "singleDay": true, "icon": "new" },
        {
          "name": "Waxing Crescent",
          "length": 6.38,
          "singleDay": false,
          "icon": "waxing-crescent"
        },
        { "name": "First Quarter", "length": 1, "singleDay": true, "icon": "first-quarter" },
        { "name": "Waxing Gibbous", "length": 6.38, "singleDay": false, "icon": "waxing-gibbous" },
        { "name": "Full Moon", "length": 1, "singleDay": true, "icon": "full" },
        { "name": "Waning Gibbous", "length": 6.38, "singleDay": false, "icon": "waning-gibbous" },
        { "name": "Last Quarter", "length": 1, "singleDay": true, "icon": "last-quarter" },
        { "name": "Waning Crescent", "length": 6.38, "singleDay": false, "icon": "waning-crescent" }
      ],
      "color": "#f0f0f0"
    }
  ]
}
```

## Field Specifications

### Root Level Fields

| Field         | Type   | Required | Description                                      |
| ------------- | ------ | -------- | ------------------------------------------------ |
| `id`          | string | ✅       | Unique identifier for the calendar               |
| `label`       | string | ✅       | Display name for users                           |
| `description` | string | ❌       | Detailed description and cultural context        |
| `setting`     | string | ❌       | Game setting or system this calendar belongs to  |
| `sources`     | array  | ❌       | URLs (or user-provided citations) verifying data |

### Sources

> Optional – strongly recommended for published calendars.

- Provide publicly accessible URLs that validate the calendar's structure (months, weekdays, leap rules, moons, etc.).
- Only include book or reference citations when the user supplies the exact text; do not invent bibliographic entries.
- Leave the array empty or omit the field entirely if no authoritative source exists yet (flag for follow-up).
- When a user provides a bibliographic reference, represent it as an object with a `citation` string and optional `notes` for context:

```json
"sources": [
  "https://example.com/calendar-reference",
  {
    "citation": "User-supplied: Aveni, Anthony. *Empires of Time: Calendars, Clocks, and Cultures.* Tauris Parke, 2002.",
    "notes": "Provided by GM Tallis on 2024-12-11"
  }
]
```

- Keep citation objects exactly as supplied by the user and avoid editing the wording or formatting.

### Year Configuration

> Optional – defaults to Gregorian year settings when omitted.

| Field         | Type   | Default | Description                                   |
| ------------- | ------ | ------- | --------------------------------------------- |
| `epoch`       | number | 0       | What year is considered "year zero"           |
| `currentYear` | number | 1       | Starting year for new campaigns               |
| `prefix`      | string | ""      | Text before year number ("Year ", "Anno ")    |
| `suffix`      | string | ""      | Text after year number (" CE", " DR", " MVR") |
| `startDay`    | number | 0       | Which weekday the year starts on (0-based)    |

### Leap Year Rules

> Optional – omitting this block applies Gregorian leap-year rules. Use
> `{ "rule": "none" }` to disable leap years entirely.

| Field       | Type   | Default | Description                                          |
| ----------- | ------ | ------- | ---------------------------------------------------- |
| `rule`      | string | "none"  | Leap year calculation: "none", "gregorian", "custom" |
| `interval`  | number | 4       | For custom rules: leap year every N years            |
| `month`     | string | -       | Which month receives extra days                      |
| `extraDays` | number | 1       | How many extra days in leap years                    |

**Leap Year Rules:**

- `"none"`: No leap years
- `"gregorian"`: Standard Gregorian calendar rules (every 4 years, except centuries not divisible by 400)
- `"custom"`: Simple interval-based (every N years)

### Month Definitions

> Optional – missing months fall back to the 12 Gregorian months.

| Field          | Type   | Required | Description                      |
| -------------- | ------ | -------- | -------------------------------- |
| `name`         | string | ✅       | Full month name                  |
| `abbreviation` | string | ❌       | Short form (3-4 characters)      |
| `days`         | number | ✅       | Number of days in the month      |
| `description`  | string | ❌       | Cultural or seasonal description |

### Weekday Definitions

> Optional – missing weekdays fall back to the 7-day Gregorian week.

| Field          | Type   | Required | Description                      |
| -------------- | ------ | -------- | -------------------------------- |
| `name`         | string | ✅       | Full weekday name                |
| `abbreviation` | string | ❌       | Short form (2-3 characters)      |
| `description`  | string | ❌       | Cultural significance or meaning |

### Intercalary Days

> Optional – absence means no intercalary days.

| Field               | Type    | Default | Description                               |
| ------------------- | ------- | ------- | ----------------------------------------- |
| `name`              | string  | ✅      | Name of the intercalary day/festival      |
| `days`              | number  | 1       | Number of days in this intercalary period |
| `after`             | string  | ✅\*    | Month name this day comes after           |
| `before`            | string  | ✅\*    | Month name this day comes before          |
| `leapYearOnly`      | boolean | false   | Only exists in leap years                 |
| `countsForWeekdays` | boolean | true    | Whether this day advances the weekday     |
| `description`       | string  | ❌      | Cultural significance and traditions      |

**Note**: Each intercalary day must have either `after` OR `before`, but not both.

### Date Format Definitions

> Optional – Handlebars templates for custom date formatting.

| Field                | Type   | Description                                        |
| -------------------- | ------ | -------------------------------------------------- |
| `default`            | string | Default date format used throughout the UI         |
| `short`              | string | Compact date format for space-constrained contexts |
| `long`               | string | Full date format with complete information         |
| `{name}-intercalary` | string | Specialized format variants for intercalary days   |
| `widgets`            | object | Widget-specific format definitions                 |

#### Widget Formats

| Field                  | Type   | Description                             |
| ---------------------- | ------ | --------------------------------------- |
| `mini`                 | string | Ultra-compact format for mini widgets   |
| `main`                 | string | Standard format for main widgets        |
| `grid`                 | string | Minimal format for calendar grid cells  |
| `{widget}-intercalary` | string | Widget-specific intercalary day formats |

#### Format Template Syntax

Date formats use [Handlebars](https://handlebarsjs.com/) template syntax with S&S-specific helpers:

**Basic Variables:**

- `{{year}}` - Calendar year with prefix/suffix
- `{{month}}` - Month number (1-based)
- `{{day}}` - Day number (1-based)
- `{{weekday}}` - Weekday number (0-based)
- `{{intercalary}}` - Intercalary day name (only for intercalary dates)

**S&S Helpers:**

- `{{ss-day format="ordinal"}}` - Day with ordinal suffix (1st, 2nd, 3rd)
- `{{ss-month format="name"}}` - Month name or abbreviation
- `{{ss-weekday format="name"}}` - Weekday name or abbreviation
- `{{ss-dateFmt "format-name"}}` - Embed other named formats

#### Automatic Intercalary Format Selection

_Added in v0.14.0_

For any named format, you can define an `-intercalary` variant that automatically applies to intercalary dates:

**Priority System:**

1. For intercalary dates: `${formatName}-intercalary` (if exists)
2. Fallback: `${formatName}` (standard format)
3. For regular dates: Always uses `${formatName}`

**Example:**

```json
{
  "dateFormats": {
    "short": "{{day}} {{month}} {{year}}",
    "short-intercalary": "{{intercalary}}, {{year}}",
    "widgets": {
      "mini": "{{day}}/{{month}}",
      "mini-intercalary": "{{intercalary}}"
    }
  }
}
```

**Results:**

- Regular date: `"15 January 2024"`
- Intercalary date: `"Midwinter Festival, 2024"`

### Time Configuration

> Optional – defaults to 24‑hour days with 60‑minute hours.

| Field             | Type   | Default | Description                   |
| ----------------- | ------ | ------- | ----------------------------- |
| `hoursInDay`      | number | 24      | Number of hours in a day      |
| `minutesInHour`   | number | 60      | Number of minutes in an hour  |
| `secondsInMinute` | number | 60      | Number of seconds in a minute |

### Moon Definitions

| Field          | Type   | Required | Description                            |
| -------------- | ------ | -------- | -------------------------------------- |
| `name`         | string | ✅       | Full moon name                         |
| `cycleLength`  | number | ✅       | Length of full lunar cycle in days     |
| `firstNewMoon` | object | ✅       | Reference date for first new moon      |
| `phases`       | array  | ✅       | Array of moon phase definitions        |
| `color`        | string | ❌       | Hex color code for moon identification |

#### First New Moon Object

| Field   | Type   | Required | Description                     |
| ------- | ------ | -------- | ------------------------------- |
| `year`  | number | ✅       | Year of the reference new moon  |
| `month` | number | ✅       | Month of the reference new moon |
| `day`   | number | ✅       | Day of the reference new moon   |

#### Moon Phase Definitions

| Field       | Type    | Required | Description                           |
| ----------- | ------- | -------- | ------------------------------------- |
| `name`      | string  | ✅       | Name of the phase (e.g., "Full Moon") |
| `length`    | number  | ✅       | Duration of this phase in days        |
| `singleDay` | boolean | ✅       | Whether this is a single-day phase    |
| `icon`      | string  | ✅       | Icon identifier for UI display        |

## Format Examples

### Simple Calendar (Earth-like)

```json
{
  "id": "gregorian",
  "label": "Gregorian Calendar",
  "description": "Standard Earth calendar with 12 months and leap years",

  "year": {
    "epoch": 0,
    "currentYear": 2024,
    "prefix": "",
    "suffix": " CE",
    "startDay": 1
  },

  "leapYear": {
    "rule": "gregorian",
    "month": "February",
    "extraDays": 1
  },

  "months": [
    { "name": "January", "abbreviation": "Jan", "days": 31 },
    { "name": "February", "abbreviation": "Feb", "days": 28 },
    { "name": "March", "abbreviation": "Mar", "days": 31 },
    { "name": "April", "abbreviation": "Apr", "days": 30 },
    { "name": "May", "abbreviation": "May", "days": 31 },
    { "name": "June", "abbreviation": "Jun", "days": 30 },
    { "name": "July", "abbreviation": "Jul", "days": 31 },
    { "name": "August", "abbreviation": "Aug", "days": 31 },
    { "name": "September", "abbreviation": "Sep", "days": 30 },
    { "name": "October", "abbreviation": "Oct", "days": 31 },
    { "name": "November", "abbreviation": "Nov", "days": 30 },
    { "name": "December", "abbreviation": "Dec", "days": 31 }
  ],

  "weekdays": [
    { "name": "Sunday", "abbreviation": "Sun" },
    { "name": "Monday", "abbreviation": "Mon" },
    { "name": "Tuesday", "abbreviation": "Tue" },
    { "name": "Wednesday", "abbreviation": "Wed" },
    { "name": "Thursday", "abbreviation": "Thu" },
    { "name": "Friday", "abbreviation": "Fri" },
    { "name": "Saturday", "abbreviation": "Sat" }
  ]
}
```

### Fantasy Calendar with Intercalary Days

```json
{
  "id": "harptos",
  "label": "Calendar of Harptos",
  "description": "The calendar used in the Forgotten Realms, featuring intercalary days",
  "setting": "D&D Forgotten Realms",

  "year": {
    "epoch": 0,
    "currentYear": 1495,
    "suffix": " DR",
    "startDay": 0
  },

  "leapYear": {
    "rule": "custom",
    "interval": 4
  },

  "months": [
    { "name": "Hammer", "days": 30 },
    { "name": "Alturiak", "days": 30 },
    { "name": "Ches", "days": 30 },
    { "name": "Tarsakh", "days": 30 },
    { "name": "Mirtul", "days": 30 },
    { "name": "Kythorn", "days": 30 },
    { "name": "Flamerule", "days": 30 },
    { "name": "Eleasis", "days": 30 },
    { "name": "Eleint", "days": 30 },
    { "name": "Marpenoth", "days": 30 },
    { "name": "Uktar", "days": 30 },
    { "name": "Nightal", "days": 30 }
  ],

  "weekdays": [
    { "name": "1st", "abbreviation": "1s" },
    { "name": "2nd", "abbreviation": "2n" },
    { "name": "3rd", "abbreviation": "3r" },
    { "name": "4th", "abbreviation": "4t" },
    { "name": "5th", "abbreviation": "5t" },
    { "name": "6th", "abbreviation": "6t" },
    { "name": "7th", "abbreviation": "7t" },
    { "name": "8th", "abbreviation": "8t" },
    { "name": "9th", "abbreviation": "9t" },
    { "name": "10th", "abbreviation": "10" }
  ],

  "intercalary": [
    {
      "name": "Midwinter",
      "after": "Hammer",
      "description": "Festival marking the midpoint of winter"
    },
    {
      "name": "Greengrass",
      "after": "Tarsakh",
      "description": "Festival welcoming the first day of spring"
    },
    {
      "name": "Midsummer",
      "after": "Flamerule",
      "description": "Festival celebrating love and music through feast"
    },
    {
      "name": "Shieldmeet",
      "after": "Midsummer",
      "leapYearOnly": true,
      "description": "Occurs only in leap years, a day of great celebration"
    },
    {
      "name": "Higharvestide",
      "after": "Eleint",
      "description": "Festival of the autumn harvest"
    },
    {
      "name": "Feast of the Moon",
      "after": "Uktar",
      "description": "Festival honoring the dead and ancestors"
    }
  ],

  "dateFormats": {
    "default": "{{ss-day format=\"ordinal\"}} of {{ss-month format=\"name\"}}, {{year}} DR",
    "default-intercalary": "{{intercalary}}, {{year}} DR",
    "short": "{{ss-day}}/{{ss-month}}/{{year}}",
    "short-intercalary": "{{intercalary}} {{year}}",
    "festival": "{{ss-day format=\"ordinal\"}} {{ss-month format=\"name\"}} ({{ss-weekday format=\"name\"}})",
    "festival-intercalary": "{{intercalary}} Festival",
    "widgets": {
      "mini": "{{ss-day}} {{ss-month format=\"abbr\"}}",
      "main": "{{ss-weekday format=\"name\"}}, {{ss-day}} {{ss-month format=\"name\"}} {{year}}",
      "grid": "{{ss-day}}",
      "mini-intercalary": "{{intercalary}}",
      "main-intercalary": "{{intercalary}}, {{year}} DR"
    }
  }
}
```

### Multi-Day Intercalary Festivals

For intercalary periods longer than one day, use the `days` field:

```json
{
  "intercalary": [
    {
      "name": "Needfest",
      "days": 7,
      "after": "Sunsebb",
      "description": "A week-long festival at year's end celebrating the winter solstice"
    },
    {
      "name": "Cooling Sun",
      "days": 5,
      "after": "Gather",
      "description": "A five-day period when the sun's killing heat allegedly lessens"
    },
    {
      "name": "Midsummer",
      "after": "Flamerule",
      "description": "Single-day festival (defaults to 1 day)"
    }
  ]
}
```

**Usage Notes:**

- **Single-day intercalary**: Omit `days` field (defaults to 1)
- **Multi-day intercalary**: Include explicit `days` field (2-365)
- **Festival weeks**: Common values are 5-7 days for festival periods
- **Seasonal breaks**: Longer periods like 10-15 days for major seasonal transitions

### Intercalary Days Before Months

Intercalary days can be placed before months using the `before` field. This is useful for New Year celebrations or other events that occur at the start of a period:

```json
{
  "intercalary": [
    {
      "name": "New Year Day",
      "before": "Firstmoon",
      "countsForWeekdays": false,
      "description": "The first day of the new year, before the calendar begins"
    },
    {
      "name": "Spring Herald",
      "before": "Springtide",
      "description": "A day announcing the arrival of spring"
    },
    {
      "name": "Winter's End",
      "after": "Lastmoon",
      "description": "Traditional placement after the final month"
    }
  ]
}
```

**Placement Rules:**

- **`before: "MonthName"`**: Places intercalary day before the specified month
- **`after: "MonthName"`**: Places intercalary day after the specified month
- **Required**: Each intercalary day must have either `before` OR `after`, but not both
- **New Year**: Use `before` with the first month name for start-of-year celebrations

### Moon Phase Tracking

For calendars with lunar cycles, add moon definitions with phase tracking:

```json
{
  "moons": [
    {
      "name": "Catha",
      "cycleLength": 33,
      "firstNewMoon": { "year": 835, "month": 1, "day": 1 },
      "phases": [
        { "name": "New Moon", "length": 1, "singleDay": true, "icon": "new" },
        { "name": "Waxing Crescent", "length": 7, "singleDay": false, "icon": "waxing-crescent" },
        { "name": "First Quarter", "length": 1, "singleDay": true, "icon": "first-quarter" },
        { "name": "Waxing Gibbous", "length": 7, "singleDay": false, "icon": "waxing-gibbous" },
        { "name": "Full Moon", "length": 1, "singleDay": true, "icon": "full" },
        { "name": "Waning Gibbous", "length": 7, "singleDay": false, "icon": "waning-gibbous" },
        { "name": "Last Quarter", "length": 1, "singleDay": true, "icon": "last-quarter" },
        { "name": "Waning Crescent", "length": 8, "singleDay": false, "icon": "waning-crescent" }
      ],
      "color": "#e0e0e0"
    },
    {
      "name": "Ruidus",
      "cycleLength": 328,
      "firstNewMoon": { "year": 835, "month": 1, "day": 15 },
      "phases": [
        { "name": "New Moon", "length": 41, "singleDay": false, "icon": "new" },
        { "name": "Full Moon", "length": 41, "singleDay": false, "icon": "full" },
        { "name": "New Moon", "length": 41, "singleDay": false, "icon": "new" },
        { "name": "Full Moon", "length": 41, "singleDay": false, "icon": "full" },
        { "name": "New Moon", "length": 41, "singleDay": false, "icon": "new" },
        { "name": "Full Moon", "length": 41, "singleDay": false, "icon": "full" },
        { "name": "New Moon", "length": 41, "singleDay": false, "icon": "new" },
        { "name": "Full Moon", "length": 41, "singleDay": false, "icon": "full" }
      ],
      "color": "#800020"
    }
  ]
}
```

**Moon Usage Notes:**

- **Multiple moons**: Fantasy settings can have multiple moons with different cycles
- **Standard phases**: Use 8 standard phases for Earth-like moons
- **Custom phases**: Define any phase system that fits your world
- **Reference dates**: Use a known new moon date for accurate calculations
- **Color coding**: Helps distinguish multiple moons in the UI

## Validation Rules

### Required Fields

- Root: `id`, `label`
- Months: `name`, `days`
- Weekdays: `name`
- Intercalary: `name`, `after`
- Moons: `name`, `cycleLength`, `firstNewMoon`, `phases`
- Moon Phases: `name`, `length`, `singleDay`, `icon`

### Data Constraints

- `id`: Must be unique, alphanumeric with hyphens/underscores
- `days` (months): Must be positive integer (1-366)
- `days` (intercalary): Must be positive integer (1-365), defaults to 1 if omitted
- `hoursInDay`, `minutesInHour`, `secondsInMinute`: Must be positive integers
- `epoch`, `currentYear`: Can be negative (BCE/before epoch years)
- `startDay`: Must be 0 to (weekdays.length - 1)
- `cycleLength`: Must be positive number (supports fractional days)
- `length` (moon phases): Must be positive number, total must equal `cycleLength`
- `color`: Must be valid hex color code (e.g., "#ffffff")

### Cross-References

- `leapYear.month`: Must match a month name
- `intercalary[].after`: Must match a month name
- All month and weekday names must be unique within their arrays

### Default Handling

When any core section (`year`, `leapYear`, `months`, `weekdays`, `intercalary`, or
`time`) is omitted, Seasons & Stars substitutes Gregorian defaults and emits a
console warning.

## Migration from Simple Calendar

### Data Mapping

| Simple Calendar                             | S&S Equivalent     | Notes                  |
| ------------------------------------------- | ------------------ | ---------------------- |
| `calendar.months[].name`                    | `months[].name`    | Direct mapping         |
| `calendar.months[].numberOfDays`            | `months[].days`    | Direct mapping         |
| `calendar.weekdays[].name`                  | `weekdays[].name`  | Direct mapping         |
| `calendar.year.numericRepresentation`       | `year.currentYear` | Direct mapping         |
| `calendar.year.prefix`                      | `year.prefix`      | Direct mapping         |
| `calendar.year.postfix`                     | `year.suffix`      | Direct mapping         |
| `calendar.leapYear.rule`                    | `leapYear.rule`    | Needs rule translation |
| Intercalary months with `intercalary: true` | `intercalary[]`    | Structural change      |

### Conversion Process

1. **Extract basic data**: months, weekdays, year info
2. **Convert leap year rules**: Translate Simple Calendar rules to S&S format
3. **Restructure intercalary days**: Move from months array to separate intercalary array
4. **Add descriptions**: Enhance with cultural context where possible
5. **Validate**: Ensure all required fields and constraints are met

## Extension Points

The format is designed for future extensibility:

### Planned Extensions

- **Seasons**: Add seasonal definitions with dates and characteristics
- **Holiday systems**: More complex recurring events beyond intercalary days
- **Regional variants**: Support for regional calendar differences
- **Display formatting**: Custom date format strings
- **Weather integration**: Link calendar to weather pattern systems

### Custom Extensions

Modules can add custom fields in the format:

```json
{
  "extensions": {
    "module-name": {
      "customField": "value"
    }
  }
}
```

## Implementation Notes

### Date Calculations

- Days are numbered starting from 1 within each month
- Weekdays cycle continuously, including through intercalary days (unless `countsForWeekdays: false`)
- Leap year extra days are added to the specified month
- Year numbering can be negative for "before epoch" dates

### Performance Considerations

- Pre-calculate frequently used values (days per year, cumulative month lengths)
- Cache weekday calculations for date ranges
- Minimize recalculation on calendar format changes

### Compatibility Layer

- Provide Simple Calendar API translation functions
- Emit equivalent hooks for module compatibility
- Support import/export of Simple Calendar JSON format

---

**Version**: 1.1
**Last Updated**: 2025-06-04
**Related**: FOU-83, FOU-84, FOU-85, FOU-86, FOU-92
