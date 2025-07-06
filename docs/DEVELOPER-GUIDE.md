# Developer Guide - Seasons & Stars

Complete API reference and integration guide for module developers working with Seasons & Stars.

## 📚 Table of Contents

- [Getting Started](#getting-started)
- [Core API](#core-api)
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

#### `getCurrentDate(calendarId?: string)`

Get the current date from the active calendar.

```javascript
// Get current date from active calendar
const currentDate = game.seasonsStars.api.getCurrentDate();
// Returns: { year: 2024, month: 12, day: 25, weekday: 3, time: { hour: 14, minute: 30, second: 0 } }

// Get date from specific calendar
const gregorianDate = game.seasonsStars.api.getCurrentDate('gregorian');
```

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
// "starfleet": "Stardate {{ss-dateFmt formatName=\"tng-stardate\"}}"
// "command-log": "{{ss-dateFmt formatName=\"starfleet\"}} - {{ss-dateFmt formatName=\"federation\"}}"

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
    "embedded": "Today is {{ss-dateFmt formatName=\"stardate\"}} ({{ss-dateFmt formatName=\"federation\"}})",
    "widgets": {
      "mini": "SD {{ss-dateFmt formatName=\"stardate\"}}",
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

### Calendar Structure

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

  year: {
    epoch: number; // Starting year for calculations
    currentYear: number; // Default current year
    prefix: string; // Text before year (e.g., "")
    suffix: string; // Text after year (e.g., " CE")
    startDay: number; // Which weekday the epoch starts on
  };

  months: CalendarMonth[];
  weekdays: CalendarWeekday[];
  intercalary: CalendarIntercalary[]; // Special days

  leapYear: {
    rule: 'none' | 'gregorian' | 'custom';
    interval?: number; // For custom rules
    month?: string; // Which month gets extra days
    extraDays?: number; // How many extra days
  };

  time: {
    hoursInDay: number; // Usually 24
    minutesInHour: number; // Usually 60
    secondsInMinute: number; // Usually 60
  };
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
    Hooks.on('seasons-stars:dateChanged', this.checkExpiringEffects.bind(this));
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
