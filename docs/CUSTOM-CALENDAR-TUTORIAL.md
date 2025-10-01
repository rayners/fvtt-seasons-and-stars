# Custom Calendar Creation Tutorial

A step-by-step guide to creating your own custom calendar for Seasons & Stars.

## 📚 Table of Contents

- [Introduction](#introduction)
- [Prerequisites](#prerequisites)
- [Understanding JSON](#understanding-json)
- [Creating Your Calendar](#creating-your-calendar)
  - [Step 1: Empty JSON File](#step-1-empty-json-file)
  - [Step 2: Bare Minimum Calendar](#step-2-bare-minimum-calendar)
  - [Step 3: Adding Months](#step-3-adding-months)
  - [Step 4: Adding Weekdays](#step-4-adding-weekdays)
  - [Step 5: Configuring Time](#step-5-configuring-time)
  - [Step 6: Adding Leap Years](#step-6-adding-leap-years)
  - [Step 7: Adding Intercalary Days](#step-7-adding-intercalary-days)
  - [Step 8: Adding Moons](#step-8-adding-moons)
  - [Step 9: Adding Seasons](#step-9-adding-seasons)
- [Validating Your Calendar](#validating-your-calendar)
- [Using Your Custom Calendar](#using-your-custom-calendar)
- [Advanced Features](#advanced-features)
- [Troubleshooting](#troubleshooting)

## Introduction

Seasons & Stars allows you to create completely custom calendars for your world. Whether you're running a campaign in a homebrewed setting or adapting an existing calendar system, this tutorial will walk you through the process from an empty file to a fully functional calendar.

## Prerequisites

Before you begin, you'll need:

- A text editor (Notepad, TextEdit, VS Code, or any code editor)
- Basic understanding of your calendar system (how many months, days per month, etc.)
- Access to Foundry VTT with Seasons & Stars installed

## Understanding JSON

JSON (JavaScript Object Notation) is a human-readable text format for storing structured data. Think of it as a way to organize information using:

- **Curly braces `{}`**: Contain objects (collections of properties)
- **Square brackets `[]`**: Contain arrays (lists of items)
- **Quotes `""`**: Surround text values (strings)
- **Colons `:`**: Separate property names from their values
- **Commas `,`**: Separate items in lists and properties in objects

**Important JSON Rules:**

1. Property names must be in double quotes: `"name": "value"`
2. Text values must be in double quotes: `"January"`
3. Numbers don't need quotes: `31`
4. Don't put a comma after the last item in a list or object
5. JSON is case-sensitive: `"Name"` and `"name"` are different

**Learn More:**

- [JSON.org](https://www.json.org/) - Official JSON documentation
- [MDN JSON Guide](https://developer.mozilla.org/en-US/docs/Learn/JavaScript/Objects/JSON) - Comprehensive JSON tutorial

## Creating Your Calendar

### Step 1: Empty JSON File

Create a new file with a `.json` extension (e.g., `my-calendar.json`) and start with an empty object:

```json
{}
```

This is valid JSON, but it doesn't contain any calendar data yet.

### Step 2: Bare Minimum Calendar

The absolute minimum data required for a valid calendar is:

```json
{
  "id": "my-calendar",
  "translations": {
    "en": {
      "label": "My Custom Calendar"
    }
  },
  "year": {
    "epoch": 0,
    "currentYear": 1,
    "prefix": "",
    "suffix": "",
    "startDay": 0
  },
  "leapYear": {
    "rule": "none"
  },
  "months": [{ "name": "Month1", "days": 30 }],
  "weekdays": [{ "name": "Day1" }],
  "intercalary": [],
  "time": {
    "hoursInDay": 24,
    "minutesInHour": 60,
    "secondsInMinute": 60
  }
}
```

**What each field means:**

- `id`: A unique identifier (lowercase, numbers, hyphens only)
- `translations`: Display names in different languages
  - `en`: English translation
    - `label`: The name shown to users
- `year`: Year configuration
  - `epoch`: Starting year for calculations (usually 0)
  - `currentYear`: Default starting year for new worlds
  - `prefix`: Text before the year number (e.g., "Year ")
  - `suffix`: Text after the year number (e.g., " CE")
  - `startDay`: Which weekday the epoch starts on (0-6)
- `leapYear`: Leap year rules (we'll expand this later)
- `months`: Array of months (minimum 1 month required)
- `weekdays`: Array of weekdays (minimum 1 weekday required)
- `intercalary`: Special days outside normal calendar structure
- `time`: Time units configuration

**Try it:** Save this file and skip ahead to [Using Your Custom Calendar](#using-your-custom-calendar) to see it in action!

### Step 3: Adding Months

Let's build a more realistic calendar with multiple months. Each month can have:

- `name`: The month's name (required)
- `days`: Number of days in the month (required)
- `abbreviation`: Short form (optional, auto-generated if omitted)
- `description`: Additional information (optional)

**Example: A 12-month calendar**

```json
{
  "id": "my-calendar",
  "translations": {
    "en": {
      "label": "My Custom Calendar",
      "description": "A custom calendar for my fantasy world",
      "setting": "My World"
    }
  },
  "year": {
    "epoch": 0,
    "currentYear": 1000,
    "prefix": "Year ",
    "suffix": "",
    "startDay": 0
  },
  "leapYear": {
    "rule": "none"
  },
  "months": [
    {
      "name": "Firstmoon",
      "abbreviation": "1st",
      "days": 30,
      "description": "The first month of spring"
    },
    {
      "name": "Secondmoon",
      "abbreviation": "2nd",
      "days": 30,
      "description": "The second month of spring"
    },
    {
      "name": "Thirdmoon",
      "abbreviation": "3rd",
      "days": 30,
      "description": "The first month of summer"
    },
    {
      "name": "Fourthmoon",
      "abbreviation": "4th",
      "days": 30,
      "description": "The second month of summer"
    },
    {
      "name": "Fifthmoon",
      "abbreviation": "5th",
      "days": 30,
      "description": "The first month of autumn"
    },
    {
      "name": "Sixthmoon",
      "abbreviation": "6th",
      "days": 30,
      "description": "The second month of autumn"
    },
    {
      "name": "Seventhmoon",
      "abbreviation": "7th",
      "days": 30,
      "description": "The first month of winter"
    },
    {
      "name": "Eighthmoon",
      "abbreviation": "8th",
      "days": 30,
      "description": "The second month of winter"
    },
    {
      "name": "Ninthmoon",
      "abbreviation": "9th",
      "days": 30,
      "description": "The third month of winter"
    },
    {
      "name": "Tenthmoon",
      "abbreviation": "10th",
      "days": 30,
      "description": "Month of celebrations"
    },
    {
      "name": "Eleventhmoon",
      "abbreviation": "11th",
      "days": 30,
      "description": "Month of harvest"
    },
    { "name": "Twelfthmoon", "abbreviation": "12th", "days": 30, "description": "The final month" }
  ],
  "weekdays": [{ "name": "Day1" }],
  "intercalary": [],
  "time": {
    "hoursInDay": 24,
    "minutesInHour": 60,
    "secondsInMinute": 60
  }
}
```

**Note:** You can have different numbers of days per month. For example: `30, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31`

### Step 4: Adding Weekdays

Weekdays define the days of the week. Each weekday can have:

- `name`: The weekday's name (required)
- `abbreviation`: Short form (optional)
- `description`: Additional information (optional)

**Example: A 7-day week**

```json
{
  "weekdays": [
    { "name": "Moonday", "abbreviation": "Mon", "description": "Day of the moon" },
    { "name": "Tideday", "abbreviation": "Tid", "description": "Day of the tides" },
    { "name": "Fireday", "abbreviation": "Fir", "description": "Day of fire" },
    { "name": "Earthday", "abbreviation": "Ear", "description": "Day of earth" },
    { "name": "Windday", "abbreviation": "Win", "description": "Day of wind" },
    { "name": "Starday", "abbreviation": "Sta", "description": "Day of stars" },
    { "name": "Sunday", "abbreviation": "Sun", "description": "Day of the sun" }
  ]
}
```

**Your calendar can have any number of weekdays** (1-14). For example:

- 5-day week: Common in many fantasy settings
- 7-day week: Earth-like calendars
- 10-day week: Decimal time systems

**Screenshot Placeholder:** _[Screenshot showing a calendar widget with custom weekday names displayed in the header]_

### Step 5: Configuring Time

The `time` object defines how time is divided in your world:

```json
{
  "time": {
    "hoursInDay": 24,
    "minutesInHour": 60,
    "secondsInMinute": 60
  }
}
```

**Examples of different time systems:**

**Earth-like time:**

```json
{
  "time": {
    "hoursInDay": 24,
    "minutesInHour": 60,
    "secondsInMinute": 60
  }
}
```

**Decimal time:**

```json
{
  "time": {
    "hoursInDay": 10,
    "minutesInHour": 100,
    "secondsInMinute": 100
  }
}
```

**Alien world with longer days:**

```json
{
  "time": {
    "hoursInDay": 30,
    "minutesInHour": 60,
    "secondsInMinute": 60
  }
}
```

### Step 6: Adding Leap Years

Leap years add extra days periodically to keep the calendar aligned with astronomical cycles.

**No leap years:**

```json
{
  "leapYear": {
    "rule": "none"
  }
}
```

**Gregorian-style leap years** (every 4 years, except centuries not divisible by 400):

```json
{
  "leapYear": {
    "rule": "gregorian",
    "month": "Secondmoon",
    "extraDays": 1
  }
}
```

**Simple leap years** (every N years):

```json
{
  "leapYear": {
    "rule": "simple",
    "frequency": 4,
    "month": "Secondmoon",
    "extraDays": 1
  }
}
```

**Custom leap year rules:**

```json
{
  "leapYear": {
    "rule": "custom",
    "month": "Twelfthmoon",
    "extraDays": 5,
    "condition": "year % 10 === 0"
  }
}
```

**Important:** The `month` field must exactly match the `name` of one of your months.

### Step 7: Adding Intercalary Days

Intercalary days are special days that fall outside the normal week structure. They're often used for festivals or special occasions.

**Basic intercalary day:**

```json
{
  "intercalary": [
    {
      "name": "Midwinter Festival",
      "abbreviation": "MWF",
      "after": "Sixthmoon",
      "description": "A day of celebration between the old year and the new"
    }
  ]
}
```

**Multiple intercalary days:**

```json
{
  "intercalary": [
    {
      "name": "Spring Festival",
      "abbreviation": "SF",
      "after": "Thirdmoon",
      "description": "Celebration of spring's arrival"
    },
    {
      "name": "Harvest Day",
      "abbreviation": "HD",
      "after": "Ninthmoon",
      "description": "Day of thanksgiving for the harvest"
    },
    {
      "name": "Year's End",
      "abbreviation": "YE",
      "after": "Twelfthmoon",
      "description": "The final day of the year"
    }
  ]
}
```

**Important:** The `after` field must exactly match the `name` of one of your months.

**Screenshot Placeholder:** _[Screenshot showing calendar grid with intercalary days displayed between months]_

### Step 8: Adding Moons

Add celestial bodies that track lunar phases:

**Single moon:**

```json
{
  "moons": [
    {
      "name": "Luna",
      "cycleLength": 30,
      "firstNewMoon": { "year": 1000, "month": 1, "day": 1 },
      "phases": [
        { "name": "New Moon", "length": 1, "singleDay": true, "icon": "new" },
        { "name": "Waxing Crescent", "length": 7, "singleDay": false, "icon": "waxing-crescent" },
        { "name": "First Quarter", "length": 1, "singleDay": true, "icon": "first-quarter" },
        { "name": "Waxing Gibbous", "length": 6, "singleDay": false, "icon": "waxing-gibbous" },
        { "name": "Full Moon", "length": 1, "singleDay": true, "icon": "full" },
        { "name": "Waning Gibbous", "length": 6, "singleDay": false, "icon": "waning-gibbous" },
        { "name": "Last Quarter", "length": 1, "singleDay": true, "icon": "last-quarter" },
        { "name": "Waning Crescent", "length": 7, "singleDay": false, "icon": "waning-crescent" }
      ],
      "color": "#f0f0f0",
      "translations": {
        "en": {
          "description": "The silver moon that lights the night sky"
        }
      }
    }
  ]
}
```

**Multiple moons:**

```json
{
  "moons": [
    {
      "name": "Selune",
      "cycleLength": 30,
      "firstNewMoon": { "year": 1000, "month": 1, "day": 1 },
      "phases": [
        { "name": "New Moon", "length": 7.5, "singleDay": false, "icon": "new" },
        { "name": "Full Moon", "length": 7.5, "singleDay": false, "icon": "full" },
        { "name": "Waning", "length": 7.5, "singleDay": false, "icon": "waning-crescent" },
        { "name": "Dark", "length": 7.5, "singleDay": false, "icon": "new" }
      ],
      "color": "#ffffff",
      "translations": {
        "en": {
          "description": "The white moon, goddess of light"
        }
      }
    },
    {
      "name": "Shar",
      "cycleLength": 40,
      "firstNewMoon": { "year": 1000, "month": 1, "day": 15 },
      "phases": [
        { "name": "New Moon", "length": 10, "singleDay": false, "icon": "new" },
        { "name": "Full Moon", "length": 10, "singleDay": false, "icon": "full" },
        { "name": "Waning", "length": 10, "singleDay": false, "icon": "waning-crescent" },
        { "name": "Dark", "length": 10, "singleDay": false, "icon": "new" }
      ],
      "color": "#4a0080",
      "translations": {
        "en": {
          "description": "The dark moon, associated with secrets"
        }
      }
    }
  ]
}
```

**Phase Configuration:**

- `length`: Duration in days (can be fractional like 7.5)
- `singleDay`: `true` for instantaneous phases, `false` for phases that span multiple days
- `icon`: Visual representation (options: `new`, `waxing-crescent`, `first-quarter`, `waxing-gibbous`, `full`, `waning-gibbous`, `last-quarter`, `waning-crescent`)

**Screenshot Placeholder:** _[Screenshot showing the calendar widget with moon phase indicators]_

### Step 9: Adding Seasons

Define seasonal divisions in your calendar:

```json
{
  "seasons": [
    {
      "name": "Spring",
      "startMonth": 1,
      "endMonth": 3,
      "icon": "spring",
      "description": "The season of growth and renewal"
    },
    {
      "name": "Summer",
      "startMonth": 4,
      "endMonth": 6,
      "icon": "summer",
      "description": "The warm season of abundance"
    },
    {
      "name": "Autumn",
      "startMonth": 7,
      "endMonth": 9,
      "icon": "fall",
      "description": "The harvest season"
    },
    {
      "name": "Winter",
      "startMonth": 10,
      "endMonth": 12,
      "icon": "winter",
      "description": "The cold season of rest"
    }
  ]
}
```

**Season wrapping** (when a season spans year boundaries):

```json
{
  "seasons": [
    {
      "name": "Winter",
      "startMonth": 11,
      "endMonth": 2,
      "icon": "winter",
      "description": "Long winter spanning the year boundary"
    }
  ]
}
```

**Available icons:** `spring`, `summer`, `fall` (autumn), `winter`

## Validating Your Calendar

Before using your calendar, it's important to validate that it's correctly formatted.

### Method 1: Online JSON Validators

**JSONLint** - Simple JSON syntax checking:

1. Go to [jsonlint.com](https://jsonlint.com/)
2. Paste your calendar JSON
3. Click "Validate JSON"
4. Fix any syntax errors shown

**Screenshot Placeholder:** _[Screenshot of JSONLint website with a calendar JSON being validated]_

**JSON Schema Validator** - Comprehensive validation against Seasons & Stars schema:

1. Go to [jsonschemavalidator.net](https://www.jsonschemavalidator.net/)
2. In the left panel, paste the schema from: `https://raw.githubusercontent.com/rayners/fvtt-seasons-and-stars/main/shared/schemas/calendar-v1.0.0.json`
3. In the right panel, paste your calendar JSON
4. Review validation results

**Screenshot Placeholder:** _[Screenshot of JSON Schema Validator with calendar schema and example calendar]_

### Method 2: IDE/Editor Validation

Many text editors support automatic JSON validation:

**Visual Studio Code:**

1. Install the "JSON" extension (built-in)
2. Add this line at the top of your calendar file:

```json
{
  "$schema": "https://raw.githubusercontent.com/rayners/fvtt-seasons-and-stars/main/shared/schemas/calendar-v1.0.0.json",
  "id": "my-calendar",
  ...
}
```

3. VS Code will now show errors as you type

**Screenshot Placeholder:** _[Screenshot of VS Code with calendar JSON showing inline validation]_

### Method 3: Foundry VTT Built-in Validation

When you upload your calendar file to Foundry VTT, Seasons & Stars automatically validates it:

1. Open the Calendar Selection dialog
2. Upload your calendar file
3. If there are errors, you'll see a notification with details
4. Fix the errors and re-upload

**Note:** A more comprehensive built-in validation tool is planned for a future release.

## Using Your Custom Calendar

Once your calendar is created and validated, follow these steps to use it in Foundry VTT:

### Step 1: Open the Calendar Selection Dialog

1. **Click the calendar widget** in your Foundry VTT interface (typically positioned near the player list or above SmallTime if you have it installed)
2. The calendar widget will open showing your current date and time

**Screenshot Placeholder:** _[Screenshot of Foundry VTT interface with arrow pointing to the calendar widget]_

### Step 2: Access Calendar Selection

1. **Click the calendar selection button** (gear icon or dropdown) in the calendar widget
2. This opens the Calendar Selection Dialog showing all available calendars

**Screenshot Placeholder:** _[Screenshot of calendar widget with arrow pointing to the selection button]_

### Step 3: Scroll to Custom Calendar Section

1. In the Calendar Selection Dialog, **scroll to the bottom**
2. You'll see a section labeled "Custom Calendar File" with a file picker option

**Screenshot Placeholder:** _[Screenshot of Calendar Selection Dialog scrolled to bottom showing file picker card]_

### Step 4: Open the File Picker

1. **Click the "Choose File" button** (or file picker icon) in the Custom Calendar section
2. The Foundry VTT file picker dialog opens

**Screenshot Placeholder:** _[Screenshot showing the file picker button being clicked]_

### Step 5: Upload Your Calendar File

1. In the file picker dialog, **click the "Upload" button** (cloud icon)
2. **Select your calendar JSON file** from your computer
3. The file uploads to your Foundry VTT data directory
4. **Select the uploaded file** from the file list
5. Click "Select File" or similar confirmation button

**Screenshot Placeholder:** _[Screenshot of Foundry VTT file picker with upload button highlighted]_

**Screenshot Placeholder:** _[Screenshot of file picker showing uploaded calendar JSON file]_

### Step 6: Activate Your Calendar

1. Back in the Calendar Selection Dialog, your custom calendar now appears as "Custom File: your-calendar-name.json"
2. The file picker card should show your selected file path
3. **Click the "Select Calendar" button** at the bottom of the dialog
4. Your custom calendar is now active!

**Screenshot Placeholder:** _[Screenshot of Calendar Selection Dialog with custom calendar file selected and "Select Calendar" button highlighted]_

### Step 7: Verify Your Calendar

Your calendar widget should now display dates using your custom calendar:

- Check that month names are correct
- Verify weekday names appear properly
- Test advancing time to see month transitions
- Verify that intercalary days appear (if you added them)
- Check moon phases (if you added moons)

**Screenshot Placeholder:** _[Screenshot of calendar widget displaying a custom calendar with unique month and weekday names]_

### Switching Back to Built-in Calendars

To switch back to a built-in calendar:

1. Open the Calendar Selection Dialog again
2. Select any built-in calendar (Gregorian, Forgotten Realms, etc.)
3. Click "Select Calendar"
4. Your custom calendar file remains saved and can be reactivated anytime

### Updating Your Custom Calendar

To update your calendar after making changes:

1. Edit your JSON file on your computer
2. Re-upload the file through the file picker (it will overwrite the old version)
3. In the Calendar Selection Dialog, click "Clear Selection" on the file picker card
4. Re-select your updated file
5. Click "Select Calendar" to activate the new version

## Advanced Features

### Date Formats

Customize how dates are displayed with date format templates:

```json
{
  "dateFormats": {
    "short": "{day} {monthAbbr} {year}",
    "long": "{weekday}, {monthName} {day}, {year}",
    "numeric": "{month}/{day}/{year}",
    "widgets": {
      "mini": "{day} {monthAbbr}"
    }
  }
}
```

**Available placeholders:**

- `{day}` - Day number
- `{month}` - Month number
- `{monthName}` - Full month name
- `{monthAbbr}` - Month abbreviation
- `{year}` - Year number
- `{weekday}` - Weekday name
- `{weekdayAbbr}` - Weekday abbreviation

### Named Years

Add special names to years:

```json
{
  "extensions": {
    "seasons-and-stars": {
      "namedYears": {
        "rule": "repeat",
        "names": [
          "Year of the Dragon",
          "Year of the Phoenix",
          "Year of the Griffin",
          "Year of the Unicorn"
        ]
      }
    }
  }
}
```

### Source Documentation

Document where your calendar information comes from:

```json
{
  "sources": [
    "https://myworld.fandom.com/wiki/Calendar",
    {
      "citation": "Campaign Setting Book, Chapter 3: Time and Calendar",
      "notes": "Official source material"
    }
  ]
}
```

### Localization

Add translations for multiple languages:

```json
{
  "translations": {
    "en": {
      "label": "My Calendar",
      "description": "A custom fantasy calendar"
    },
    "es": {
      "label": "Mi Calendario",
      "description": "Un calendario de fantasía personalizado"
    },
    "de": {
      "label": "Mein Kalender",
      "description": "Ein individueller Fantasy-Kalender"
    }
  }
}
```

## Troubleshooting

### Common Errors and Solutions

**Error: "Calendar must have a valid id string"**

- **Cause:** Missing or invalid `id` field
- **Solution:** Add an `id` field with lowercase letters, numbers, and hyphens only

```json
{
  "id": "my-calendar"
}
```

**Error: "Calendar must have translations object"**

- **Cause:** Missing or invalid `translations` section
- **Solution:** Add proper translations structure:

```json
{
  "translations": {
    "en": {
      "label": "My Calendar Name"
    }
  }
}
```

**Error: "Calendar must have months array"**

- **Cause:** Missing or invalid `months` field
- **Solution:** Add at least one month:

```json
{
  "months": [{ "name": "Month1", "days": 30 }]
}
```

**Error: "Leap year month 'MonthName' does not exist in months list"**

- **Cause:** The leap year configuration references a month name that doesn't exist
- **Solution:** Make sure the month name matches exactly (case-sensitive):

```json
{
  "leapYear": {
    "rule": "gregorian",
    "month": "February"
  },
  "months": [{ "name": "February", "days": 28 }]
}
```

**Error: "Intercalary day references non-existent month"**

- **Cause:** An intercalary day's `after` field references a month that doesn't exist
- **Solution:** Make sure the month name matches exactly:

```json
{
  "intercalary": [{ "name": "Festival", "after": "December" }],
  "months": [{ "name": "December", "days": 31 }]
}
```

**Error: "Unexpected token" or "Unexpected end of JSON"**

- **Cause:** JSON syntax error (missing comma, extra comma, or mismatched brackets)
- **Solution:** Use JSONLint to find the exact syntax error
- **Common causes:**
  - Missing comma between array items
  - Extra comma after last item
  - Mismatched `{` `}` or `[` `]`
  - Missing closing quote

**Calendar loads but dates look wrong**

- **Cause:** Incorrect `startDay` value or month day counts
- **Solution:**
  - Verify `startDay` matches your intended calendar start
  - Double-check day counts for each month
  - Test with multiple dates to identify the issue

**Moons not appearing or showing incorrect phases**

- **Cause:** Invalid `firstNewMoon` date or incorrect phase lengths
- **Solution:**
  - Ensure `firstNewMoon` date exists in your calendar
  - Verify phase lengths add up to `cycleLength`
  - Check that the moon cycle date is within a valid year range

### Getting Help

If you encounter issues not covered here:

1. **Check the JSON syntax** with JSONLint
2. **Validate against the schema** using JSON Schema Validator
3. **Review the examples** in the Seasons & Stars repository: [Calendar Examples](https://github.com/rayners/fvtt-seasons-and-stars/tree/main/packages)
4. **Ask for help** on the Foundry VTT Discord or Seasons & Stars GitHub Discussions
5. **Report bugs** on the [Seasons & Stars GitHub Issues page](https://github.com/rayners/fvtt-seasons-and-stars/issues)

### Example Debugging Process

If your calendar isn't working:

1. **Copy the bare minimum example** from [Step 2](#step-2-bare-minimum-calendar)
2. **Verify it works** by loading it into Foundry VTT
3. **Add your changes one section at a time** (months, then weekdays, then leap years, etc.)
4. **Test after each change** to identify which section causes problems
5. **Compare your syntax** to the examples in this tutorial
6. **Use a JSON validator** to check for syntax errors

## Complete Example

Here's a complete custom calendar with all features:

```json
{
  "$schema": "https://raw.githubusercontent.com/rayners/fvtt-seasons-and-stars/main/shared/schemas/calendar-v1.0.0.json",
  "id": "mystara-calendar",
  "translations": {
    "en": {
      "label": "Mystaran Calendar",
      "description": "The calendar used in the Known World of Mystara",
      "setting": "Mystara (D&D)"
    }
  },
  "sources": ["https://mystara.fandom.com/wiki/Calendar"],
  "year": {
    "epoch": 0,
    "currentYear": 1000,
    "prefix": "AC ",
    "suffix": "",
    "startDay": 0
  },
  "leapYear": {
    "rule": "simple",
    "frequency": 5,
    "month": "Vatermont",
    "extraDays": 1
  },
  "months": [
    { "name": "Nuwmont", "abbreviation": "Nuw", "days": 28 },
    { "name": "Vatermont", "abbreviation": "Vat", "days": 28 },
    { "name": "Thaumont", "abbreviation": "Tha", "days": 28 },
    { "name": "Flaurmont", "abbreviation": "Fla", "days": 28 },
    { "name": "Yarthmont", "abbreviation": "Yar", "days": 28 },
    { "name": "Klarmont", "abbreviation": "Kla", "days": 28 },
    { "name": "Felmont", "abbreviation": "Fel", "days": 28 },
    { "name": "Fyrmont", "abbreviation": "Fyr", "days": 28 },
    { "name": "Ambyrmont", "abbreviation": "Amb", "days": 28 },
    { "name": "Sviftmont", "abbreviation": "Svi", "days": 28 },
    { "name": "Eirmont", "abbreviation": "Eir", "days": 28 },
    { "name": "Kaldmont", "abbreviation": "Kal", "days": 28 }
  ],
  "weekdays": [
    { "name": "Lunadain", "abbreviation": "Lun" },
    { "name": "Gromdain", "abbreviation": "Gro" },
    { "name": "Tserdain", "abbreviation": "Tse" },
    { "name": "Moldain", "abbreviation": "Mol" },
    { "name": "Nytdain", "abbreviation": "Nyt" },
    { "name": "Loshdain", "abbreviation": "Los" },
    { "name": "Soladain", "abbreviation": "Sol" }
  ],
  "intercalary": [
    {
      "name": "Year's End",
      "abbreviation": "YE",
      "after": "Kaldmont",
      "description": "The final day of the year, outside the normal week"
    }
  ],
  "time": {
    "hoursInDay": 24,
    "minutesInHour": 60,
    "secondsInMinute": 60
  },
  "moons": [
    {
      "name": "Matera",
      "cycleLength": 28,
      "firstNewMoon": { "year": 1000, "month": 1, "day": 1 },
      "phases": [
        { "name": "New Moon", "length": 1, "singleDay": true, "icon": "new" },
        { "name": "Waxing", "length": 12, "singleDay": false, "icon": "waxing-crescent" },
        { "name": "Full Moon", "length": 1, "singleDay": true, "icon": "full" },
        { "name": "Waning", "length": 14, "singleDay": false, "icon": "waning-crescent" }
      ],
      "color": "#c0c0c0",
      "translations": {
        "en": {
          "description": "The single moon of Mystara"
        }
      }
    }
  ],
  "seasons": [
    {
      "name": "Spring",
      "startMonth": 3,
      "endMonth": 5,
      "icon": "spring"
    },
    {
      "name": "Summer",
      "startMonth": 6,
      "endMonth": 8,
      "icon": "summer"
    },
    {
      "name": "Autumn",
      "startMonth": 9,
      "endMonth": 11,
      "icon": "fall"
    },
    {
      "name": "Winter",
      "startMonth": 12,
      "endMonth": 2,
      "icon": "winter"
    }
  ]
}
```

Save this as `mystara-calendar.json` and follow the [Using Your Custom Calendar](#using-your-custom-calendar) steps to load it!

## Next Steps

Now that you've created your custom calendar:

1. **Test thoroughly** - Try advancing time through different months and years
2. **Document your calendar** - Add descriptions to help players understand it
3. **Share with your players** - Consider creating a handout with calendar information
4. **Backup your file** - Keep a copy of your calendar JSON in a safe place
5. **Iterate and improve** - Refine your calendar based on actual play experience

For more advanced features and integration options, see:

- [Developer Guide](DEVELOPER-GUIDE.md) - For API integration
- [Integration Guide](INTEGRATION-GUIDE.md) - For connecting with other modules

Happy worldbuilding! 🌟
