# Developer Guide - Seasons & Stars

Complete API reference and integration guide for module developers working with Seasons & Stars.

## 📚 Table of Contents

- [Getting Started](#getting-started)
- [Core API](#core-api)
- [Calendar Pack Modules](#calendar-pack-modules)
- [Bridge Integration](#bridge-integration)
- [Hook System](#hook-system)
- [System Integration](#system-integration)
- [Calendar Data Structures](#calendar-data-structures)
- [Integration Examples](#integration-examples)
- [Migration Guide](#migration-guide)
- [Best Practices](#best-practices)

## 🚀 Getting Started

### API Access

Seasons & Stars exposes its API through the global `game` object:

```javascript
// Check if Seasons & Stars is available
if (game.seasonsStars) {
  const currentDate = game.seasonsStars.api.getCurrentDate();
  console.log('Current date:', currentDate);
}
```

### Detecting Seasons & Stars

```javascript
// Method 1: Direct check
const hasSeasonsStars = !!game.seasonsStars;

// Method 2: Feature detection
const hasAdvancedCalendar = typeof game.seasonsStars?.api?.getCurrentDate === 'function';

// Method 3: Version check (when available)
const version = game.seasonsStars?.VERSION;
```

## 🔧 Core API

### Date Retrieval

#### `getCurrentDate()`

Get the current date from the active calendar.

```javascript
// Get current date from active calendar
const currentDate = game.seasonsStars.api.getCurrentDate();
// Returns: { year: 2024, month: 12, day: 25, weekday: 3, time: { hour: 14, minute: 30, second: 0 } }
```

**Note**: Calendar-specific operations (passing a calendarId parameter) are not yet implemented.

**Returns:** `CalendarDate | null`

### Time Manipulation

#### `advanceDays(days: number)`

Advance world time by specified number of days.

```javascript
// Advance by 1 day
await game.seasonsStars.api.advanceDays(1);

// Go back 3 days (negative values)
await game.seasonsStars.api.advanceDays(-3);
```

#### `advanceHours(hours: number)`

Advance world time by specified number of hours.

```javascript
// Advance by 8 hours (long rest)
await game.seasonsStars.api.advanceHours(8);

// Advance by 30 minutes
await game.seasonsStars.api.advanceMinutes(30);
```

#### Other Time Functions

```javascript
// Time advancement functions
await game.seasonsStars.api.advanceMinutes(minutes);
await game.seasonsStars.api.advanceWeeks(weeks);
await game.seasonsStars.api.advanceMonths(months);
await game.seasonsStars.api.advanceYears(years);
```

### Time Advancement

Time advancement in Seasons & Stars is handled internally by the module. External modules should use the calendar advancement API methods and listen to time advancement hooks for integration.

#### Listening to Time Advancement Events

```javascript
// Listen for when time advancement starts
Hooks.on('seasons-stars:timeAdvancementStarted', ratio => {
  console.log(`Time advancement started at ${ratio}x speed`);
});

// Listen for when time advancement is paused
Hooks.on('seasons-stars:timeAdvancementPaused', () => {
  console.log('Time advancement paused');
});

// Listen for date changes during advancement
Hooks.on('seasons-stars:dateChanged', data => {
  console.log('Date changed:', data);
});
```

### Date Conversion

#### `dateToWorldTime(date: CalendarDate)`

Convert a calendar date to Foundry world time.

```javascript
const date = {
  year: 2024,
  month: 12,
  day: 25,
  weekday: 3,
  time: { hour: 12, minute: 0, second: 0 },
};

const worldTime = game.seasonsStars.api.dateToWorldTime(date);
console.log('World time:', worldTime); // Returns timestamp in seconds
```

#### `worldTimeToDate(timestamp: number)`

Convert Foundry world time to calendar date.

```javascript
const currentTime = game.time.worldTime;
const date = game.seasonsStars.api.worldTimeToDate(currentTime);
console.log('Calendar date:', date);
```

### Date Formatting

#### `formatDate(date: CalendarDate, options?: DateFormatOptions)`

Format a date according to calendar conventions.

```javascript
const date = game.seasonsStars.api.getCurrentDate();

// Default formatting
const formatted = game.seasonsStars.api.formatDate(date);
// Returns: "December 25th, 2024 CE"

// Custom formatting options
const custom = game.seasonsStars.api.formatDate(date, {
  includeTime: true,
  includeWeekday: true,
  format: 'long',
});
// Returns: "Wednesday, December 25th, 2024 CE at 2:30 PM"
```

**Options:**

```typescript
interface DateFormatOptions {
  includeTime?: boolean;
  includeWeekday?: boolean;
  includeYear?: boolean;
  format?: 'short' | 'long' | 'numeric';
}
```

#### Using Named Formats

Format a date using named formats from the calendar's `dateFormats` configuration.

```javascript
const date = game.seasonsStars.api.getCurrentDate();

// Access named formats through the calendar date's format method
const stardate = date.format(); // Uses calendar's default format
const shortFormat = date.toShortString(); // Uses widget.mini format
const longFormat = date.toLongString(); // Uses widget.main format

// For custom named formats, access through the calendar's dateFormats
const calendar = game.seasonsStars.api.getActiveCalendar();
if (calendar.dateFormats?.diplomatic) {
  // Format manually using calendar definitions
}
```

#### Widget-Optimized Formatting

Use widget-specific formats optimized for different UI contexts.

```javascript
const date = game.seasonsStars.api.getCurrentDate();

// Widget-optimized formats are built into CalendarDate methods
const miniFormat = date.toShortString(); // Compact format for mini widgets
const mainFormat = date.toLongString(); // Standard format for main widgets
const gridFormat = date.day.toString(); // Minimal format for grid cells

// These automatically use the calendar's widget-specific dateFormats if defined
```

### Advanced Date Formatting

Seasons & Stars includes a powerful [Handlebars-based formatting system](https://handlebarsjs.com/) with mathematical operations and format embedding:

**Template Variables Available:**

- `{{year}}`, `{{ss-month format="name"}}`, `{{ss-day}}`, `{{ss-weekday format="name"}}` - Basic date components
- `{{dayOfYear}}` - Day of year (1-365)
- `{{hour}}`, `{{minute}}`, `{{second}}` - Time components

**Mathematical Operations:**

```javascript
// Calendar defines: "historical": "{{ss-math year op=\"subtract\" value=894}} years since the Last War"
// Access through calendar date's format method when calendar has this format defined
const formatted = date.format(); // Uses calendar's default format
// Returns: "130 years since the Last War" (if current year is 1024)
```

**Format Embedding:**

```javascript
// Calendar defines:
// "tng-stardate": "{{ss-stardate year prefix=\"47\" baseYear=2370 dayOfYear=dayOfYear}}"
// "starfleet": "Stardate {{ss-dateFmt \"tng-stardate\"}}"
// "command-log": "{{ss-dateFmt \"starfleet\"}} - {{ss-dateFmt \"federation\"}}"

// Access complex formats through calendar's dateFormats configuration
const calendar = game.seasonsStars.api.getActiveCalendar();
// Returns: "Stardate 47015.0 - Jan 15, 2024" when calendar defines this format
```

**Custom Calendar Date Formats:**

Define advanced formats in your calendar JSON:

```json
{
  "dateFormats": {
    "stardate": "{{ss-stardate year prefix=\"47\" baseYear=2370 dayOfYear=dayOfYear}}",
    "mathematical": "Year {{ss-math year op=\"add\" value=1000}} of the Empire",
    "embedded": "Today is {{ss-dateFmt \"stardate\"}} ({{ss-dateFmt \"federation\"}})",
    "widgets": {
      "mini": "SD {{ss-dateFmt \"stardate\"}}",
      "main": "{{ss-weekday format=\"abbr\"}}, Day {{dayOfYear}}",
      "grid": "{{ss-day}}"
    }
  }
}
```

### Calendar Management

#### `getActiveCalendar()`

Get the currently active calendar definition.

```javascript
const calendar = game.seasonsStars.api.getActiveCalendar();
console.log('Active calendar:', calendar.id);
console.log(
  'Months:',
  calendar.months.map(m => m.name)
);
```

#### `setActiveCalendar(calendarId: string)`

Switch to a different calendar system.

```javascript
// Switch to Vale Reckoning calendar
await game.seasonsStars.api.setActiveCalendar('vale-reckoning');

// Switch back to Gregorian
await game.seasonsStars.api.setActiveCalendar('gregorian');
```

#### `getAvailableCalendars()`

Get list of all available calendar IDs.

```javascript
const calendars = game.seasonsStars.api.getAvailableCalendars();
console.log('Available calendars:', calendars);
// Returns: ['gregorian', 'vale-reckoning', 'custom-calendar']
```

## 📦 Calendar Pack Modules

Calendar pack modules are **pure data modules** that provide additional calendars for Seasons & Stars through an **auto-detection system**. No JavaScript required - just properly structured JSON files.

### ✨ Auto-Detection System

Seasons & Stars automatically discovers and loads calendar pack modules that follow the naming convention:

- **Module ID Pattern**: `seasons-and-stars-{pack-name}`
- **Examples**: `seasons-and-stars-fantasy`, `seasons-and-stars-scifi`, `seasons-and-stars-homebrew`
- **Auto-Load**: Enabled modules are detected and loaded automatically on world startup

### 📁 Standard Layout

Calendar pack modules must follow this directory structure:

```
modules/seasons-and-stars-{pack-name}/
├── module.json
└── calendars/
    ├── index.json        # Collection metadata
    ├── calendar-1.json   # Individual calendar files
    ├── calendar-2.json
    └── ...
```

### 🗂️ Collection Format (`index.json`)

The `index.json` file describes the calendar collection:

```json
{
  "$schema": "https://raw.githubusercontent.com/rayners/fvtt-seasons-and-stars/main/schemas/calendar-collection-v1.0.0.json",
  "name": "Fantasy Calendar Pack",
  "description": "Popular calendars for fantasy RPG campaigns",
  "version": "1.0.0",
  "author": "Your Name",
  "calendars": [
    {
      "id": "dragonlance",
      "name": "Dragonlance Calendar",
      "description": "Calendar system for the world of Krynn",
      "file": "dragonlance.json",
      "preview": "15th of Autumn Twilight, 421 AC",
      "tags": ["dragonlance", "fantasy"],
      "author": "Your Name"
    },
    {
      "id": "custom-setting",
      "name": "My Custom Setting",
      "description": "Calendar for homebrew campaign world",
      "file": "custom-setting.json",
      "preview": "Day 42 of the Third Season, Year 1024",
      "tags": ["homebrew", "custom"]
    }
  ]
}
```

**Key Properties:**

- **`file`**: Relative path to calendar JSON file (in same directory)
- **`preview`**: Sample date text shown in calendar selection dialog
- **`tags`**: Categories for filtering and organization
- **Schema validation**: Use `$schema` for IDE support and validation

### 📝 Module Definition (`module.json`)

Standard Foundry module definition with S&S dependency:

```json
{
  "id": "seasons-and-stars-fantasy",
  "title": "Seasons & Stars: Fantasy Calendar Pack",
  "description": "Fantasy calendars for D&D, Pathfinder, and other fantasy RPGs",
  "version": "1.0.0",
  "authors": [
    {
      "name": "Your Name",
      "discord": "yourname#1234"
    }
  ],
  "compatibility": {
    "minimum": "13",
    "verified": "13"
  },
  "relationships": {
    "requires": [
      {
        "id": "seasons-and-stars",
        "type": "module",
        "compatibility": {
          "minimum": "0.7.0"
        }
      }
    ]
  },
  "manifest": "https://your-repo.com/module.json",
  "download": "https://your-repo.com/releases/latest/download/module.zip"
}
```

### 🎯 Calendar File Format

Individual calendar files follow the standard [Seasons & Stars calendar format](../CALENDAR-FORMAT.md):

```json
{
  "id": "dragonlance",
  "translations": {
    "en": {
      "label": "Dragonlance Calendar",
      "description": "The calendar system used in Krynn with its three moons",
      "setting": "Dragonlance"
    }
  },
  "year": {
    "epoch": 0,
    "currentYear": 421,
    "suffix": " AC"
  },
  "months": [
    {
      "name": "Winter Night",
      "abbreviation": "WN",
      "days": 30
    }
    // ... more months
  ],
  "weekdays": [
    {
      "name": "Luinday",
      "abbreviation": "Lu"
    }
    // ... more weekdays
  ],
  "dateFormats": {
    "default": "{{ss-day format=\"ordinal\"}} {{ss-month format=\"name\"}}, {{year}} AC"
  }
}
```

### 🔧 API Integration

Calendar pack modules are loaded automatically, but you can also manage them programmatically:

```javascript
// Load calendars from a specific module
const results = await game.seasonsStars.api.loadModuleCalendars('seasons-and-stars-fantasy');

// Check results
results.forEach(result => {
  if (result.success) {
    console.log(`Loaded calendar: ${result.calendar.id}`);
  } else {
    console.error(`Failed to load: ${result.error}`);
  }
});

// Get collection metadata
if (result.collectionEntry) {
  console.log('Preview:', result.collectionEntry.preview);
  console.log('Tags:', result.collectionEntry.tags);
}
```

### 🔧 External Calendar Loading (Advanced Users Only)

> **⚠️ Developer/Power-User Feature**: The external calendar loading APIs are intended for advanced users, developers, and those comfortable with console-based operations. These features are not documented for general users as they require technical knowledge and may encounter CORS restrictions or other technical issues.

**External calendar loading methods**:

```javascript
// Load a single calendar from URL (console only - no UI yet)
const result = await game.seasonsStars.api.loadCalendarFromUrl('https://example.com/calendar.json');

// Load multiple calendars from a collection
const results = await game.seasonsStars.api.loadCalendarCollection(
  'https://example.com/collection.json'
);

// Manage external sources programmatically
const sourceId = game.seasonsStars.api.addExternalSource({
  name: 'My External Calendar',
  url: 'https://example.com/calendar.json',
  enabled: true,
  type: 'calendar',
});

// Refresh external calendars
await game.seasonsStars.api.refreshExternalCalendar(sourceId);
await game.seasonsStars.api.refreshAllExternalCalendars();
```

**Technical considerations for external calendar loading**:

- CORS policies may prevent loading from many hosts
- No user-friendly UI exists for managing external sources
- Requires manual console interaction and technical troubleshooting
- Intended for developers and advanced users comfortable with debugging web requests
- May require CORS proxies or specially configured hosting for many calendar sources

### 🚀 Development Workflow

**1. Create Module Structure**

```bash
mkdir seasons-and-stars-mypack
cd seasons-and-stars-mypack
mkdir calendars
```

**2. Add Module Definition**

```bash
# Create module.json with required S&S dependency
```

**3. Create Collection Index**

```bash
# Create calendars/index.json with calendar metadata
```

**4. Add Calendar Files**

```bash
# Create individual .json files for each calendar
```

**5. Test in Foundry**

```bash
# Copy to Foundry modules directory
# Enable module in world
# Check console for auto-detection logs
```

### 🛡️ Security & Validation

- **HTML Sanitization**: Preview text is automatically sanitized for security
- **Schema Validation**: Collection files are validated against JSON schema
- **Module Validation**: Only active, valid modules are processed
- **Error Handling**: Detailed error reporting for failed calendar loads

### 🎨 UI Integration

Calendar pack calendars appear in the calendar selection dialog with:

- **Source Badge**: "Module: Pack Name" indicator
- **Preview Text**: Sample date format from collection metadata
- **Organization**: Grouped by source type (Built-in/Module/External)
- **Visual Hierarchy**: Clear distinction between calendar sources

### 📋 Best Practices

**✅ Do:**

- Use descriptive, unique calendar IDs
- Provide meaningful preview text showing actual date format
- Include comprehensive descriptions and metadata
- Test calendars thoroughly before distribution
- Use semantic versioning for pack releases
- Add proper tags for discoverability

**❌ Don't:**

- Include JavaScript in calendar pack modules
- Hardcode absolute paths in collection files
- Use conflicting calendar IDs with other packs
- Skip schema validation during development
- Include sensitive data in preview text

### 🔍 Troubleshooting

**Module Not Detected:**

- Check module ID starts with `seasons-and-stars-`
- Ensure module is enabled in Foundry
- Verify `calendars/index.json` exists and is valid JSON

**Calendar Load Failures:**

- Check console for detailed error messages
- Validate JSON syntax in calendar files
- Ensure `file` property matches actual filename
- Verify calendar format follows S&S schema

**Preview Not Showing:**

- Check `preview` field in collection entry
- Ensure preview text is under 200 characters
- Verify HTML is properly escaped if used

## 🔄 Bridge Integration

Seasons & Stars provides **generic integration APIs** designed for calendar bridges and third-party integrations. Simple Calendar compatibility is handled by the **Simple Calendar Compatibility Bridge** module.

### Integration Interface

Seasons & Stars exposes its integration interface via `game.seasonsStars.integration`:

```javascript
// Check for integration interface availability
if (game.seasonsStars?.integration?.isAvailable) {
  const integration = game.seasonsStars.integration;

  console.log('S&S Integration available:', integration.version);
  console.log('API methods:', Object.keys(integration.api));
  console.log('Available widgets:', Object.keys(integration.widgets));
}
```

### Integration API

The integration interface provides clean access to all S&S functionality:

```javascript
const integration = game.seasonsStars.integration;

// Core calendar operations
const currentDate = integration.api.getCurrentDate();
const formattedDate = integration.api.formatDate(currentDate);
await integration.api.advanceDays(1);

// Widget management
integration.widgets.main?.addSidebarButton('weather', 'fas fa-cloud', 'Weather', () => {
  console.log('Weather button clicked');
});

// Hook system
integration.hooks.onDateChanged(event => {
  console.log('Date changed:', event.newDate);
});
```

### For Simple Calendar Compatibility

**Use the Simple Calendar Compatibility Bridge module** for automatic Simple Calendar API compatibility:

1. Install **Seasons & Stars** (this module)
2. Install **Simple Calendar Compatibility Bridge**
3. Existing Simple Calendar integrations work automatically

The bridge provides the complete Simple Calendar API surface:

```javascript
// These work automatically with the bridge installed:
const current = SimpleCalendar.api.currentDateTime();
const dateInfo = SimpleCalendar.api.timestampToDate(game.time.worldTime);
await SimpleCalendar.api.changeDate(newDate);

// Access formatted display data for weather modules
console.log(
  `Today is ${dateInfo.display.monthName} ${dateInfo.display.day}${dateInfo.display.daySuffix}`
);
```

### Why Use the Bridge Pattern?

- **Clean Separation**: S&S focuses on calendar functionality, bridge handles compatibility
- **Zero SC Knowledge**: S&S has no Simple Calendar-specific code
- **Robust Error Handling**: Bridge provides comprehensive fallbacks
- **Format Translation**: Bridge handles all 0-based ↔ 1-based conversions
- **CSS/DOM Authority**: Bridge adds required Simple Calendar classes and structure

## 🪝 Hook System

### Seasons & Stars Hooks

#### `seasons-stars:dateChanged`

Fired when the world time changes.

```javascript
Hooks.on('seasons-stars:dateChanged', data => {
  console.log('Date changed from', data.oldTime, 'to', data.newTime);
  console.log('New date:', data.newDate);
  console.log('Time delta:', data.delta, 'seconds');

  // Update your module's time-sensitive features
  updateWeatherForNewDate(data.newDate);
  refreshTimedAbilities();
});
```

**Data Structure:**

```typescript
interface DateChangeData {
  newDate: CalendarDate;
  oldTime: number;
  newTime: number;
  delta: number;
}
```

#### `seasons-stars:timeAdvancementStarted`

Fired when automatic time advancement begins. Added in v0.2.0.

```javascript
Hooks.on('seasons-stars:timeAdvancementStarted', ratio => {
  console.log(`Time advancement started at ${ratio}x speed`);

  // Pause weather generation during fast advancement
  if (ratio > 2.0) {
    weatherModule.enableFastMode();
  }

  // Update UI to show advancement state
  updateTimeControlsUI(true, ratio);
});
```

**Parameters:**

- `ratio` (number): The advancement ratio (game seconds per real second)

#### `seasons-stars:timeAdvancementPaused`

Fired when automatic time advancement stops. Added in v0.2.0.

```javascript
Hooks.on('seasons-stars:timeAdvancementPaused', () => {
  console.log('Time advancement paused');

  // Resume normal weather processing
  weatherModule.disableFastMode();

  // Update UI to show paused state
  updateTimeControlsUI(false);

  // Recalculate any accumulated effects
  processAccumulatedEffects();
});
```

**No parameters - this is a simple notification event.**

#### `seasons-stars:calendarChanged`

Fired when the active calendar system changes.

```javascript
Hooks.on('seasons-stars:calendarChanged', data => {
  console.log('Calendar changed to:', data.newCalendarId);
  console.log('New calendar data:', data.calendar);

  // Recalculate seasonal effects, holidays, etc.
  recalculateSeasonalEffects(data.calendar);
});
```

#### `seasons-stars:ready`

Fired when Seasons & Stars is fully initialized.

```javascript
Hooks.on('seasons-stars:ready', data => {
  console.log('Seasons & Stars ready');
  console.log('Manager:', data.manager);
  console.log('API:', data.api);

  // Safe to use Seasons & Stars API
  initializeCalendarIntegration();
});
```

**Data Structure:**

```typescript
interface ReadyData {
  manager: CalendarManager;
  api: SeasonsStarsAPI;
}
```

#### `seasons-stars:settingsChanged`

Fired when module settings are updated.

```javascript
Hooks.on('seasons-stars:settingsChanged', settingName => {
  console.log('Setting changed:', settingName);

  switch (settingName) {
    case 'miniWidgetShowTime':
      this.refreshMiniWidget();
      break;
    case 'quickTimeButtons':
      this.updateTimeControls();
      break;
    case 'alwaysShowQuickTimeButtons':
      this.toggleTimeButtonVisibility();
      break;
  }
});
```

#### `seasons-stars:noteCreated`

Fired when a calendar note is created.

```javascript
Hooks.on('seasons-stars:noteCreated', journalEntry => {
  console.log('Calendar note created:', journalEntry.name);

  // Update calendar displays
  this.refreshCalendarWidgets();

  // Notify other systems
  this.notifyEventSystems(journalEntry);
});
```

#### `seasons-stars:noteUpdated`

Fired when a calendar note is modified.

```javascript
Hooks.on('seasons-stars:noteUpdated', journalEntry => {
  console.log('Calendar note updated:', journalEntry.name);

  // Refresh displays showing this note
  this.updateNoteDisplays(journalEntry.id);
});
```

#### `seasons-stars:noteDeleted`

Fired when a calendar note is removed.

```javascript
Hooks.on('seasons-stars:noteDeleted', noteId => {
  console.log('Calendar note deleted:', noteId);

  // Clean up references
  this.removeNoteReferences(noteId);

  // Refresh calendar displays
  this.refreshCalendarWidgets();
});
```

#### `seasons-stars:registerExternalCalendars`

Fired during initialization to allow modules to register calendars programmatically.

```javascript
Hooks.on('seasons-stars:registerExternalCalendars', ({ registerCalendar, manager }) => {
  // Register custom calendars
  const myCalendar = {
    id: 'my-custom-calendar',
    name: 'My Custom Calendar',
    months: [
      /* month definitions */
    ],
    weekdays: [
      /* weekday definitions */
    ],
    // ... full calendar definition
  };

  const sourceInfo = {
    name: 'My Calendar Module',
    version: '1.0.0',
    type: 'external',
  };

  const success = registerCalendar(myCalendar, sourceInfo);
  console.log('Calendar registered:', success);
});
```

### Complete Hook Reference

Here's a complete reference table of all Seasons & Stars hooks:

| Hook Event                                | When Fired               | Data Passed                                | Added  |
| ----------------------------------------- | ------------------------ | ------------------------------------------ | ------ |
| `seasons-stars:dateChanged`               | World time changes       | `{newDate, oldTime, newTime, delta}`       | v0.1.0 |
| `seasons-stars:calendarChanged`           | Active calendar switches | `{newCalendarId, oldCalendarId, calendar}` | v0.1.0 |
| `seasons-stars:ready`                     | Module fully initialized | `{manager, api}`                           | v0.1.0 |
| `seasons-stars:timeAdvancementStarted`    | Auto advancement begins  | `ratio (number)`                           | v0.2.0 |
| `seasons-stars:timeAdvancementPaused`     | Auto advancement stops   | None                                       | v0.2.0 |
| `seasons-stars:settingsChanged`           | Module setting updated   | `settingName (string)`                     | v0.1.0 |
| `seasons-stars:noteCreated`               | Calendar note created    | `journalEntry`                             | v0.1.0 |
| `seasons-stars:noteUpdated`               | Calendar note modified   | `journalEntry`                             | v0.1.0 |
| `seasons-stars:noteDeleted`               | Calendar note removed    | `noteId (string)`                          | v0.1.0 |
| `seasons-stars:registerExternalCalendars` | Module initialization    | `{registerCalendar, manager}`              | v0.8.0 |

### Hook Integration Best Practices

```javascript
class ModuleHookIntegration {
  constructor() {
    this.setupHooks();
  }

  setupHooks() {
    // Wait for Seasons & Stars to be ready
    Hooks.on('seasons-stars:ready', this.onSeasonsStarsReady.bind(this));

    // Listen for time changes
    Hooks.on('seasons-stars:dateChanged', this.onDateChanged.bind(this));

    // Listen for advancement state
    Hooks.on('seasons-stars:timeAdvancementStarted', this.onAdvancementStarted.bind(this));
    Hooks.on('seasons-stars:timeAdvancementPaused', this.onAdvancementPaused.bind(this));
  }

  onSeasonsStarsReady({ manager, api }) {
    console.log('Seasons & Stars ready - safe to use API');
    this.seasonsStarsAPI = api;
    this.calendarManager = manager;

    // Initialize your module's calendar features
    this.initializeCalendarFeatures();
  }

  onDateChanged({ newDate, oldTime, newTime, delta }) {
    // Handle time progression
    this.updateTimeBasedFeatures(newDate, delta);
  }

  onAdvancementStarted(ratio) {
    if (ratio > 2.0) {
      // Switch to batch processing for fast advancement
      this.enableBatchMode();
    }
  }

  onAdvancementPaused() {
    // Process any accumulated changes
    this.processBatchedChanges();
    this.disableBatchMode();
  }
}
```

### Simple Calendar Hook Compatibility

**Use the Simple Calendar Compatibility Bridge** for automatic hook translation:

```javascript
// With the bridge installed, these work automatically:
Hooks.on(SimpleCalendar.Hooks.DateTimeChange, data => {
  // Bridge translates from 'seasons-stars:dateChanged'
  console.log('SC-compatible date change:', data);
});

Hooks.on(SimpleCalendar.Hooks.Ready, data => {
  // Bridge translates from 'seasons-stars:ready'
  console.log('SC-compatible ready event:', data);
});

// Direct S&S hooks (recommended for new integrations):
Hooks.on('seasons-stars:dateChanged', data => {
  // Native S&S hook with clean data structure
  console.log('Native S&S date change:', data);
});
```

## 🎮 System Integration

Seasons & Stars provides an extensible system compatibility framework that allows different game systems to integrate custom time sources and calendar adjustments.

**For complete system integration documentation, see: [System Integration Guide](SYSTEM-INTEGRATION.md)**

### Quick System Integration

```typescript
// Register compatibility for your game system
Hooks.on('seasons-stars:your-system:systemDetected', compatibilityManager => {
  // Register custom time source
  const timeSourceFunction = () => {
    return game.yourSystem?.customTime?.worldTime || null;
  };

  compatibilityManager.registerTimeSource('your-system', timeSourceFunction);
});
```

### System-Specific Hooks

S&S automatically detects the current game system and triggers system-specific hooks:

```typescript
// Pathfinder 2e integration (built-in)
Hooks.on('seasons-stars:pf2e:systemDetected', compatibilityManager => {
  // PF2e-specific integration code
});

// D&D 5e integration (example)
Hooks.on('seasons-stars:dnd5e:systemDetected', compatibilityManager => {
  // D&D 5e-specific integration code
});
```

### Calendar-Based Compatibility

Add compatibility blocks to calendar JSON files:

```json
{
  "compatibility": {
    "pf2e": {
      "weekdayOffset": 5,
      "description": "Adjusts weekday calculation to match PF2e World Clock"
    }
  }
}
```

## 📊 Calendar Data Structures

### CalendarDate Interface

```typescript
interface CalendarDate {
  year: number;
  month: number; // 1-based (1 = first month)
  day: number; // 1-based (1 = first day)
  weekday: number; // 0-based (0 = first weekday)
  intercalary?: string; // Special day name (optional)
  time?: {
    hour: number; // 0-23
    minute: number; // 0-59
    second: number; // 0-59
  };
}
```

### CalendarCanonicalHour Interface

Added in v0.8.0 for time period naming (e.g., "Strange's Bells" for 3-6 AM).

```typescript
interface CalendarCanonicalHour {
  name: string; // Display name (e.g., "Strange's Bells", "Matins")
  startHour: number; // Start hour (0-23)
  endHour: number; // End hour (0-23)
  startMinute?: number; // Start minute (0-59, default: 0)
  endMinute?: number; // End minute (0-59, default: 0)
  description?: string; // Optional description
}
```

**Time Range Logic:**

- Start and end times can span midnight (e.g., startHour: 23, endHour: 2)
- End time is exclusive (endHour: 6 means "up to but not including 6:00")
- Supports minute precision for precise time periods
- Works with calendars having different `minutesInHour` values

### Calendar Structure

> The engine substitutes Gregorian defaults and logs a warning when any
> section is omitted.

```typescript
interface SeasonsStarsCalendar {
  id: string;
  translations: {
    [languageCode: string]: {
      label: string;
      description?: string;
      setting?: string;
    };
  };

  year?: {
    epoch: number; // Starting year for calculations
    currentYear: number; // Default current year
    prefix: string; // Text before year (e.g., "")
    suffix: string; // Text after year (e.g., " CE")
    startDay: number; // Which weekday the epoch starts on
  }; // Defaults to Gregorian year if omitted

  months?: CalendarMonth[]; // Defaults to Gregorian months
  weekdays?: CalendarWeekday[]; // Defaults to 7-day week
  intercalary?: CalendarIntercalary[]; // Defaults to none

  leapYear?: {
    rule: 'none' | 'gregorian' | 'custom';
    interval?: number; // For custom rules
    month?: string; // Which month gets extra days
    extraDays?: number; // How many extra days
  }; // Defaults to Gregorian; use { rule: 'none' } to disable

  time?: {
    hoursInDay: number; // Usually 24
    minutesInHour: number; // Usually 60
    secondsInMinute: number; // Usually 60
  }; // Defaults to 24/60/60

  // Optional canonical hours for time period naming (added in v0.8.0)
  canonicalHours?: CalendarCanonicalHour[];
}
```

## 🔧 Integration Examples

### Weather Module Integration

```javascript
class WeatherManager {
  constructor() {
    this.setupCalendarIntegration();
  }

  setupCalendarIntegration() {
    // Support both Simple Calendar and Seasons & Stars
    if (window.SimpleCalendar) {
      Hooks.on(SimpleCalendar.Hooks.DateTimeChange, this.onDateChange.bind(this));
      this.calendarAPI = SimpleCalendar.api;
    }

    // Direct Seasons & Stars integration (preferred)
    if (game.seasonsStars) {
      Hooks.on('seasons-stars:dateChanged', this.onDateChange.bind(this));
      this.calendarAPI = game.seasonsStars.api;
    }
  }

  onDateChange(data) {
    const currentDate = this.calendarAPI.getCurrentDate();
    const season = this.calculateSeason(currentDate);
    const weather = this.generateWeather(season, currentDate);

    this.updateWeatherDisplay(weather);
    this.saveWeatherToNotes(currentDate, weather);
  }

  calculateSeason(date) {
    // Use calendar months to determine season
    const calendar = this.calendarAPI.getActiveCalendar();
    const monthsPerSeason = calendar.months.length / 4;
    return Math.floor((date.month - 1) / monthsPerSeason);
  }

  async saveWeatherToNotes(date, weather) {
    // Phase 1: Use Simple Calendar compatibility
    if (this.calendarAPI.addNote) {
      await this.calendarAPI.addNote({
        date: date,
        title: 'Weather',
        content: weather.description,
        category: 'weather',
      });
    }
  }
}
```

### Time-Sensitive Spell Effects

```javascript
class SpellEffectManager {
  constructor() {
    this.setupTimeIntegration();
  }

  setupTimeIntegration() {
    // Listen for time changes
    Hooks.on('seasons-stars:dateChanged', this.checkExpiringEffects.bind(this));

    // Listen for time advancement state changes
    Hooks.on('seasons-stars:timeAdvancementStarted', this.onAdvancementStarted.bind(this));
    Hooks.on('seasons-stars:timeAdvancementPaused', this.onAdvancementPaused.bind(this));
  }

  async addTimedEffect(actorId, effectData, duration) {
    const currentDate = game.seasonsStars.api.getCurrentDate();
    const expirationTime = game.time.worldTime + duration;

    // Store expiration time with effect
    const effect = {
      ...effectData,
      expirationTime: expirationTime,
      startDate: currentDate,
    };

    await this.storeEffect(actorId, effect);
  }

  checkExpiringEffects(data) {
    const currentTime = data.newTime;

    // Check all active effects
    for (const [actorId, effects] of this.activeEffects) {
      const expired = effects.filter(e => e.expirationTime <= currentTime);

      expired.forEach(effect => {
        this.removeEffect(actorId, effect);
        ui.notifications.info(`${effect.name} effect has expired on ${actorId}`);
      });
    }
  }

  onAdvancementStarted(ratio) {
    // Fast advancement may skip precise expiration times
    if (ratio > 5.0) {
      this.enableBatchProcessing = true;
      console.log('Enabled batch effect processing for fast time advancement');
    }
  }

  onAdvancementPaused() {
    // Resume precise timing after advancement stops
    this.enableBatchProcessing = false;

    // Process any effects that may have been missed during fast advancement
    this.processAllPendingEffects();
    console.log('Resumed precise effect timing');
  }
}
```

### Time Advancement Integration Module

```javascript
/**
 * Complete example of a module that integrates with time advancement
 */
class WeatherTimeModule {
  constructor() {
    this.weatherData = new Map();
    this.isProcessingBatch = false;
    this.setupTimeIntegration();
  }

  setupTimeIntegration() {
    const timeService = TimeAdvancementService.getInstance();

    // Monitor time advancement state
    Hooks.on('seasons-stars:timeAdvancementStarted', ratio => {
      this.onTimeAdvancementStart(ratio);
    });

    Hooks.on('seasons-stars:timeAdvancementPaused', () => {
      this.onTimeAdvancementPause();
    });

    // Monitor time changes
    Hooks.on('seasons-stars:dateChanged', data => {
      this.onTimeChange(data);
    });
  }

  onTimeAdvancementStart(ratio) {
    console.log(`Weather module: Time advancement started at ${ratio}x`);

    // Switch to batch processing for fast advancement
    if (ratio > 2.0) {
      this.isProcessingBatch = true;
      this.batchStartTime = game.time.worldTime;
      ui.notifications.info(`Weather processing switched to batch mode (${ratio}x speed)`);
    }
  }

  onTimeAdvancementPause() {
    console.log('Weather module: Time advancement paused');

    if (this.isProcessingBatch) {
      // Process accumulated time in batch
      const totalTime = game.time.worldTime - this.batchStartTime;
      this.processBatchWeather(totalTime);

      this.isProcessingBatch = false;
      ui.notifications.info('Weather processing resumed normal mode');
    }
  }

  onTimeChange(data) {
    if (this.isProcessingBatch) {
      // Don't process individual changes during batch mode
      return;
    }

    // Normal weather processing
    this.processWeatherChange(data);
  }

  processBatchWeather(totalSeconds) {
    const days = Math.floor(totalSeconds / 86400);
    console.log(`Processing ${days} days of weather in batch`);

    // Generate weather for each day efficiently
    for (let i = 0; i < days; i++) {
      const dayTime = this.batchStartTime + i * 86400;
      const dayWeather = this.generateWeatherForTime(dayTime);
      this.weatherData.set(dayTime, dayWeather);
    }
  }

  // Method to control time advancement from weather events
  async handleWeatherEvent(eventType) {
    const timeService = TimeAdvancementService.getInstance();

    switch (eventType) {
      case 'storm':
        // Pause time during dramatic weather
        timeService.pause();
        ui.notifications.warn('Storm approaching - time advancement paused');
        break;

      case 'clearWeather':
        // Resume normal advancement
        if (!timeService.isActive) {
          await timeService.play();
          ui.notifications.info('Weather cleared - time advancement resumed');
        }
        break;

      case 'rapidWeatherChange':
        // Temporarily increase speed
        const originalRatio = timeService.advancementRatio || 1.0;
        timeService.updateRatio(5.0);

        // Reset after 30 seconds
        setTimeout(() => {
          timeService.updateRatio(originalRatio);
        }, 30000);
        break;
    }
  }
}
```

### Calendar Event System

```javascript
class EventManager {
  constructor() {
    this.events = new Map();
    this.setupEventHandling();
  }

  setupEventHandling() {
    Hooks.on('seasons-stars:dateChanged', this.checkEvents.bind(this));
    Hooks.on('seasons-stars:calendarChanged', this.convertEventDates.bind(this));
  }

  addRecurringEvent(eventData) {
    const event = {
      id: foundry.utils.randomID(),
      name: eventData.name,
      description: eventData.description,
      recurrence: eventData.recurrence, // 'daily', 'weekly', 'monthly', 'yearly'
      startDate: eventData.startDate,
      endDate: eventData.endDate,
    };

    this.events.set(event.id, event);
  }

  checkEvents(data) {
    const currentDate = data.newDate;

    for (const event of this.events.values()) {
      if (this.shouldTriggerEvent(event, currentDate)) {
        this.triggerEvent(event, currentDate);
      }
    }
  }

  shouldTriggerEvent(event, currentDate) {
    // Check if event should trigger on current date
    switch (event.recurrence) {
      case 'daily':
        return true;
      case 'weekly':
        return currentDate.weekday === event.startDate.weekday;
      case 'monthly':
        return currentDate.day === event.startDate.day;
      case 'yearly':
        return (
          currentDate.month === event.startDate.month && currentDate.day === event.startDate.day
        );
      default:
        return false;
    }
  }
}
```

## 🔄 Migration Guide

### From Simple Calendar

#### Phase 1: Basic Compatibility

Your existing Simple Calendar integration should work immediately:

```javascript
// This code continues working unchanged:
const currentDate = SimpleCalendar.api.currentDateTime();
const formatted = SimpleCalendar.api.timestampToDate(game.time.worldTime);

Hooks.on(SimpleCalendar.Hooks.DateTimeChange, data => {
  // Your existing hook handler
});
```

#### Phase 2: Enhanced Integration

Migrate to native Seasons & Stars API for better features:

```javascript
// Old Simple Calendar code:
const oldDate = SimpleCalendar.api.currentDateTime();

// New Seasons & Stars code:
const newDate = game.seasonsStars.api.getCurrentDate();

// Benefits: Better type safety, more features, direct access
```

#### Phase 3: Notes System Migration

When Phase 2 releases, migrate note handling:

```javascript
// Old Simple Calendar notes:
const notes = SimpleCalendar.api.getNotes(date);

// New Seasons & Stars notes:
const notes = game.seasonsStars.api.getNotes(date);
```

### From Custom Time Systems

#### Step 1: Replace Time Calculations

```javascript
// Old custom time code:
function advanceGameTime(hours) {
  const newTime = game.time.worldTime + hours * 3600;
  game.time.advance(newTime - game.time.worldTime);
}

// New Seasons & Stars code:
async function advanceGameTime(hours) {
  await game.seasonsStars.api.advanceHours(hours);
}
```

#### Step 2: Use Calendar-Aware Functions

```javascript
// Old date calculation:
function addDaysToDate(date, days) {
  // Complex calculation considering month lengths, leap years, etc.
}

// New calendar-aware calculation:
function addDaysToDate(date, days) {
  return game.seasonsStars.api.dateToWorldTime(
    game.seasonsStars.manager.getActiveEngine().addDays(date, days)
  );
}
```

## 💖 Support This Project

Enjoying Seasons & Stars? Consider supporting continued development:

[![Patreon](https://img.shields.io/badge/Patreon-Support%20Development-ff424d?style=for-the-badge&logo=patreon)](https://patreon.com/rayners)

Your support helps fund new features, bug fixes, and comprehensive documentation.

## 🎯 Best Practices

### Error Handling

```javascript
// Always check if Seasons & Stars is available
function safeGetCurrentDate() {
  if (!game.seasonsStars?.api?.getCurrentDate) {
    console.warn('Seasons & Stars not available');
    return null;
  }

  try {
    return game.seasonsStars.api.getCurrentDate();
  } catch (error) {
    console.error('Failed to get current date:', error);
    return null;
  }
}
```

### Performance Considerations

```javascript
// Cache calendar data instead of repeated API calls
class CalendarCache {
  constructor() {
    this.calendarData = null;
    this.lastUpdate = 0;

    Hooks.on('seasons-stars:calendarChanged', () => {
      this.invalidateCache();
    });
  }

  getCalendar() {
    const now = Date.now();
    if (!this.calendarData || now - this.lastUpdate > 60000) {
      this.calendarData = game.seasonsStars.api.getActiveCalendar();
      this.lastUpdate = now;
    }
    return this.calendarData;
  }

  invalidateCache() {
    this.calendarData = null;
    this.lastUpdate = 0;
  }
}
```

### Graceful Degradation

```javascript
// Support multiple calendar systems
class UniversalCalendarAdapter {
  constructor() {
    this.adapter = this.detectCalendarSystem();
  }

  detectCalendarSystem() {
    if (game.seasonsStars) {
      return new SeasonsStarsAdapter();
    } else if (window.SimpleCalendar) {
      return new SimpleCalendarAdapter();
    } else {
      return new FallbackAdapter();
    }
  }

  getCurrentDate() {
    return this.adapter.getCurrentDate();
  }

  onDateChange(callback) {
    this.adapter.onDateChange(callback);
  }
}
```

## 🎨 Handlebars Template Helpers

Seasons & Stars provides custom Handlebars helpers for advanced date formatting in calendar templates.

### `ss-time-display` Helper

Added in v0.8.0 for canonical hours and smart time display.

```handlebars
{{! Basic usage: shows canonical hour or exact time }}
{{ss-time-display}}

{{! Force exact time only }}
{{ss-time-display mode='exact'}}

{{! Force canonical hours only (hides time if no match) }}
{{ss-time-display mode='canonical'}}

{{! Smart mode (default): canonical hours when available, exact time otherwise }}
{{ss-time-display mode='canonical-or-exact'}}
```

**Display Modes:**

- `canonical-or-exact` (default): Shows canonical hour name when current time falls within a defined period, otherwise shows exact time (e.g., "Strange's Bells" or "07:30")
- `exact`: Always shows exact time in HH:MM format
- `canonical`: Only shows canonical hour name, hides time completely when no canonical hour matches

**Example Output:**

```handlebars
{{! With canonical hours defined for 3-6 AM as "Strange's Bells" }}
{{! At 4:30 AM: }}
{{ss-time-display}}
→ "Strange's Bells"

{{! At 7:30 AM (no canonical hour): }}
{{ss-time-display}}
→ "07:30"

{{! Force exact time: }}
{{ss-time-display mode='exact'}}
→ "04:30"

{{! Canonical only mode at 7:30 AM: }}
{{ss-time-display mode='canonical'}}
→ "" (empty)
```

**Calendar Template Integration:**

```json
{
  "formats": {
    "widgets": {
      "mini": "{{ss-time-display mode=\"canonical-or-exact\"}}",
      "main": "{{ss-weekday format=\"abbr\"}}, {{ss-month format=\"name\"}} {{ss-day format=\"ordinal\"}} - {{ss-time-display}}"
    }
  }
}
```

### Module Dependencies

```javascript
// In your module.json
{
  "relationships": {
    "systems": [],
    "requires": [],
    "recommends": [
      {
        "id": "seasons-and-stars",
        "type": "module",
        "reason": "Enhanced calendar functionality"
      }
    ]
  }
}
```

---

**Need more help?** Check the [User Guide](./USER-GUIDE.md) for basic usage or visit our [GitHub Discussions](https://github.com/rayners/fvtt-seasons-and-stars/discussions) for developer support.
