# Calendar Events Specification

## Overview

Calendar events are recurring occasions (holidays, festivals, observances) that occur predictably according to calendar rules. Events are distinct from notes: events are calendar metadata that recur automatically, while notes are user-created content for specific dates.

## Storage Architecture

### Hybrid Storage Model

Events are stored in two locations with runtime merging:

1. **Calendar JSON** (`calendar.events[]`): Default events provided by calendar author
2. **World Settings** (`seasons-stars.worldEvents`): GM customizations and additions

### Calendar JSON Format

```json
{
  "id": "gregorian",
  "name": "Gregorian Calendar",
  "months": [...],
  "events": [
    {
      "id": "new-year",
      "name": "New Year's Day",
      "description": "Start of the new year",
      "journalEntryId": "@JournalEntry[New Year Traditions]",
      "recurrence": {
        "type": "fixed",
        "month": 1,
        "day": 1
      },
      "visibility": "player-visible",
      "color": "#ff0000",
      "icon": "fas fa-champagne-glasses",
      "translations": {
        "es": {
          "name": "Año Nuevo",
          "description": "Inicio del nuevo año"
        }
      }
    }
  ]
}
```

### World Settings Format

```typescript
interface WorldEventSettings {
  events: CalendarEvent[]; // GM-added or overridden events
  disabledEventIds: string[]; // Calendar event IDs to hide
}
```

**Note**: World events can come from multiple sources:

- GM-created events via the module UI
- GM overrides of calendar-defined events
- Events added programmatically by other modules via the API

### Merge Behavior

At runtime, events are merged in this order:

1. Start with calendar's `events[]` array
2. Remove any events where `id` appears in `disabledEventIds`
3. For each event in world settings `events[]`:
   - If `id` matches calendar event → **Replace completely** (full override)
   - If `id` is new → **Add** to event list

**Important**: Overrides are full replacements, not partial merges. If a calendar event is overridden, all fields must be specified in the world settings version.

## Data Structures

### CalendarEvent

```typescript
interface CalendarEvent {
  id: string; // Unique identifier (stable, never change)
  name: string; // Display name
  description?: string; // Brief plain text summary for tooltips/previews
  journalEntryId?: string; // Optional reference to JournalEntry for rich content
  recurrence: RecurrenceRule; // When this event occurs
  startTime?: string; // Time of day (format: "hh", "hh:mm", "hh:mm:ss", default: "00:00:00")
  duration?: string; // Event duration (format: "<number><s|m|h|d|w>", default: "1d")
  startYear?: number; // First year event occurs (omit for all past years)
  endYear?: number; // Last year event occurs (omit for indefinite future)
  exceptions?: EventException[]; // Specific dates to skip/move
  visibility?: 'gm-only' | 'player-visible'; // Default: 'player-visible'
  color?: string; // Hex color for calendar display (#RRGGBB)
  icon?: string; // CSS icon class (e.g., 'fas fa-star')
  translations?: Record<string, EventTranslation>;
}

// Year Range Behavior:
// - If currentYear < startYear: event has not yet begun (skipped)
// - If currentYear > endYear: event has ended (skipped)
// - If only startYear specified: event continues indefinitely
// - If only endYear specified: event has existed since calendar creation
// - If neither specified: event occurs in all years

// Start Time and Duration:
// - startTime: Time of day when event begins (format: "hh", "hh:mm", or "hh:mm:ss")
//   - Examples: "14:30:00" (2:30 PM), "9" (9 AM), "23:45" (11:45 PM)
//   - Default: "00:00:00" (midnight/start of day)
//   - Uses calendar's time configuration (hoursPerDay, minutesPerHour, secondsPerMinute)
// - duration: How long the event lasts (format: "<number><unit>")
//   - Units: s (seconds), m (minutes), h (hours), d (days), w (weeks)
//   - Examples: "1d" (one day), "3d" (three days), "2h" (two hours), "30m" (thirty minutes)
//   - Zero-duration events ("0s") represent instantaneous moments (e.g., eclipses)
//   - Default: "1d" (one day)
//   - Multi-day events span across multiple calendar dates
//   - Events that cross month or year boundaries are handled correctly

// Journal Entry Integration:
// - description: Brief plain text shown in tooltips, calendar previews
// - journalEntryId: Reference to JournalEntry for rich content about the event
// - Journal can have general event information plus pages for specific occurrences
// - Example: "Winter Solstice" journal with pages like "Winter Solstice 835 PD"
// - Pages created on-demand as individual occurrences need documentation
// - Permissions: Check both event visibility AND journal entry permissions

interface EventTranslation {
  name: string;
  description?: string;
}

type EventException =
  | {
      year: number; // Which year
      type: 'skip'; // Skip this occurrence
    }
  | {
      year: number; // Which year
      type: 'move'; // Move to different date
      moveToMonth: number; // Target month (1-based)
      moveToDay: number; // Target day
    };
```

### Journal Entry Integration

Events can optionally link to JournalEntry documents for rich content about the event.

#### Basic Pattern

```typescript
// Calendar JSON or world settings
{
  "id": "winter-solstice",
  "name": "Winter Solstice",
  "description": "Longest night of the year, celebrated with bonfires",
  "journalEntryId": "@JournalEntry[abc123def456]",  // or direct ID
  "recurrence": { "type": "fixed", "month": 12, "day": 21 }
}
```

#### Multi-Page Journals for Specific Occurrences

A single journal entry can document both the general event and specific occurrences:

**Journal Structure**:

- **First Page**: General information about the event (history, traditions, significance)
- **Additional Pages**: Created on-demand for specific occurrences
  - "Winter Solstice 835 PD" - What happened this year
  - "Winter Solstice 836 PD" - What happened the next year
  - etc.

**Example Workflow**:

1. Calendar author creates "Winter Solstice" journal with general information
2. Links journal to event via `journalEntryId`
3. During gameplay, GM clicks "Winter Solstice 835 PD" occurrence
4. GM adds new page to the journal titled "Winter Solstice 835 PD"
5. Documents what happened during this specific celebration
6. Next year, creates new page for 836 PD as needed

#### Permission Model

When an event has a linked journal entry:

1. Check event `visibility` setting
2. Check journal entry permissions
3. Apply most restrictive:
   - If event is `gm-only`: Hidden from players regardless of journal permissions
   - If journal is GM-only: Hidden from players regardless of event visibility
   - If both are player-visible: Show to players

#### Fallback Handling

If `journalEntryId` is specified but the journal doesn't exist:

- Show event on calendar normally
- Display `description` in tooltips/previews
- "View Details" button disabled or shows description only
- No error messages (graceful degradation)

#### Calendar Author Guidelines

When including journals with calendar events:

1. Store journal entries in compendiums for distribution
2. Use `@JournalEntry[name]` references for portability
3. Provide meaningful `description` as fallback
4. First page should be general event information
5. Don't pre-create pages for all future occurrences

### RecurrenceRule Types

#### Fixed Date Recurrence

Most common: event occurs on the same calendar date each year.

```typescript
interface FixedDateRecurrence {
  type: 'fixed';
  month: number; // 1-based month index
  day: number; // Day of month (can be intercalary)
  ifDayNotExists?: 'lastDay' | 'beforeDay' | 'afterDay'; // Default: skip
}
```

**Behavior**:

- If `day` doesn't exist in `month` for a given year, event is **skipped** unless `ifDayNotExists` is specified
- Intercalary days are valid targets (event only occurs when intercalary day exists)

**`ifDayNotExists` Options**:

- `'lastDay'`: Event occurs on last day of the month
- `'beforeDay'`: Event occurs on last valid day before specified day
- `'afterDay'`: Event moves to first day of next month
- Omitted: Event is skipped that year (default)

**Examples**:

```json
{
  "type": "fixed",
  "month": 1,
  "day": 1
}
```

Leap day that skips non-leap years:

```json
{
  "type": "fixed",
  "month": 2,
  "day": 29
}
```

Event that moves to last day if month is too short:

```json
{
  "type": "fixed",
  "month": 2,
  "day": 30,
  "ifDayNotExists": "lastDay"
}
```

#### Ordinal Recurrence

Event occurs on Nth occurrence of a weekday within a month.

**Prerequisites**: Calendar must define a `weekdays` array. If weekdays are not defined, ordinal recurrence events will be skipped with a validation warning.

```typescript
interface OrdinalRecurrence {
  type: 'ordinal';
  month: number; // 1-based month index
  occurrence: 1 | 2 | 3 | 4 | -1; // 1st, 2nd, 3rd, 4th, last
  weekday: number; // Weekday index (calendar-specific)
  includeIntercalary?: boolean; // Count intercalary days? Default: false
}
```

**Behavior**:

- Find the Nth occurrence of the specified weekday in the month
- `occurrence: -1` means "last occurrence" (works with months having 4 or 5 occurrences)
- If specified occurrence doesn't exist, event is **skipped**
- `includeIntercalary: true` allows intercalary days to be candidates if they have a weekday assigned
- `includeIntercalary: false` (default) skips intercalary days even if they have weekdays

**Examples**:

First Monday of September:

```json
{
  "type": "ordinal",
  "month": 9,
  "occurrence": 1,
  "weekday": 1
}
```

Last Thursday of November:

```json
{
  "type": "ordinal",
  "month": 11,
  "occurrence": -1,
  "weekday": 4
}
```

#### Interval Recurrence

Event occurs every N years on a specific date.

```typescript
interface IntervalRecurrence {
  type: 'interval';
  intervalYears: number; // Repeat every N years
  anchorYear: number; // Reference year for calculation
  month: number; // 1-based month index
  day: number; // Day of month
  ifDayNotExists?: 'lastDay' | 'beforeDay' | 'afterDay'; // Same as FixedDateRecurrence
}
```

**Behavior**:

- Event occurs when `(currentYear - anchorYear) % intervalYears === 0`
- Supports same `ifDayNotExists` logic as Fixed Date Recurrence:
  - `'lastDay'`: Event occurs on last day of the month
  - `'beforeDay'`: Event occurs on last valid day before specified day
  - `'afterDay'`: Event moves to first day of next month
  - Omitted: Event is skipped that year (default)

**Example**:

Olympics (every 4 years):

```json
{
  "type": "interval",
  "intervalYears": 4,
  "anchorYear": 2024,
  "month": 7,
  "day": 26
}
```

### RecurrenceRule Union Type

```typescript
type RecurrenceRule = FixedDateRecurrence | OrdinalRecurrence | IntervalRecurrence;
```

## Event-Note Relationship

### Separate Entities with Optional Linking

Events and notes are separate systems with optional connections:

**Events**:

- Calendar metadata (holidays, festivals)
- Defined in calendar JSON or world settings
- Recur automatically
- Display with event indicator (e.g., colored dot)

**Notes**:

- User-created content
- Linked to specific dates
- Can optionally reference an event occurrence
- Display with note indicator (e.g., paper icon)

### Note Enhancement for Event Linking

```typescript
interface NoteDocument {
  // ... existing fields
  eventId?: string; // Optional link to calendar event
  eventOccurrenceYear?: number; // Which year's occurrence
}
```

**Visual Indicators**:

- Event only: Colored dot below date
- Note only: Paper/note icon
- Both: Colored dot + paper icon

**Event Visibility**:

- Default visibility for events is `'player-visible'` if not specified
- Events with `visibility: 'gm-only'` are only visible to GMs
- Events with `visibility: 'player-visible'` are visible to all users

**Permission Interaction**:
When a note is linked to an event:

- Check both event visibility AND note permissions
- Use most restrictive (if either is GM-only, hide from players)
- Example: GM-only event + player-visible note = hidden from players
- Example: player-visible event + GM-only note = hidden from players

## API Surface

### Events Manager

All event operations available via `game.seasonsStars.api.events`:

```typescript
interface EventsAPI {
  /**
   * Get all events occurring on a specific date
   */
  getEventsForDate(year: number, month: number, day: number): CalendarEvent[];

  /**
   * Get all event occurrences in a date range
   * Returns events with their computed occurrence dates
   */
  getEventsInRange(
    startYear: number,
    startMonth: number,
    startDay: number,
    endYear: number,
    endMonth: number,
    endDay: number
  ): EventOccurrence[];

  /**
   * Get next occurrence of a specific event after given date
   */
  getNextOccurrence(
    eventId: string,
    afterYear: number,
    afterMonth: number,
    afterDay: number
  ): EventOccurrence | null;

  /**
   * Check if a specific date has any events (fast check)
   */
  hasEventsOnDate(year: number, month: number, day: number): boolean;

  /**
   * Get all event definitions (merged calendar + world)
   */
  getAllEvents(): CalendarEvent[];

  /**
   * Get event definition by ID
   */
  getEvent(eventId: string): CalendarEvent | null;

  /**
   * Set world-level event (GM only)
   * Adds new event or fully replaces existing event by ID
   * Can be used to override calendar-defined events or add world-specific events
   */
  setWorldEvent(event: CalendarEvent): Promise<void>;

  /**
   * Remove world event override/addition (GM only)
   * If event ID was a calendar event, it will reappear from calendar definition
   * If event ID was world-only, it will be completely removed
   */
  removeWorldEvent(eventId: string): Promise<void>;

  /**
   * Hide a calendar-defined event (GM only)
   * Adds to disabledEventIds list
   */
  disableCalendarEvent(eventId: string): Promise<void>;

  /**
   * Show a previously hidden calendar event (GM only)
   * Removes from disabledEventIds list
   */
  enableCalendarEvent(eventId: string): Promise<void>;

  /**
   * Get the journal entry associated with an event
   * Returns null if no journal is linked or user lacks permission
   */
  getEventJournal(eventId: string): JournalEntry | null;

  /**
   * Set the journal entry for an event (GM only)
   * Updates world event settings if event is world-defined or calendar override
   */
  setEventJournal(eventId: string, journalEntryId: string): Promise<void>;

  /**
   * Clear the journal entry association for an event (GM only)
   * If event was from calendar, reverts to calendar's journal (if any)
   * If event was world-only, removes the journal reference
   */
  clearEventJournal(eventId: string): Promise<void>;
}

interface EventOccurrence {
  event: CalendarEvent;
  year: number;
  month: number;
  day: number;
}
```

## Hook Events

### Event Occurrence Hook

**Hook Name**: `seasons-stars:eventOccurs`

**When Fired**:

1. When time advancement crosses a day boundary into a day with events
2. On application startup if current date has events (with `isStartup: true` flag)

**Data Structure**:

```typescript
interface EventOccursData {
  events: EventOccurrence[]; // All events occurring on this date
  date: {
    // The date these events occur
    year: number;
    month: number;
    day: number;
  };
  isStartup: boolean; // True if fired during initialization
  previousDate?: {
    // Only present during time advancement
    year: number;
    month: number;
    day: number;
  };
}
```

**Usage Example**:

```javascript
Hooks.on('seasons-stars:eventOccurs', data => {
  if (data.isStartup) {
    console.log('Current date has events:', data.events);
  } else {
    console.log('Time advanced into event date:', data.events);
    console.log('Advanced from:', data.previousDate);
  }
});
```

### Implementation Notes

The hook should fire:

1. **During time advancement** when `seasons-stars:dateChanged` indicates day boundary crossed
2. **At startup** during `seasons-stars:ready` if current date has events

Hook should NOT fire excessively:

- Only when day changes (not for hour/minute changes within same day)
- Only if the new day actually has events
- Once per day transition (not multiple times for same day)

## Event Time and Duration

_Added in v0.21.0_

Events support precise start times and durations, allowing for multi-day events, sub-day events, and instantaneous moments.

### Start Time

The `startTime` field specifies when an event begins on its occurrence date:

**Format**: `"hh"`, `"hh:mm"`, or `"hh:mm:ss"`
**Default**: `"00:00:00"` (midnight/start of day)

```json
{
  "id": "morning-meeting",
  "name": "Town Meeting",
  "startTime": "9",
  "recurrence": { "type": "fixed", "month": 1, "day": 15 }
}
```

```json
{
  "id": "evening-ceremony",
  "name": "Evening Ceremony",
  "startTime": "18:30",
  "recurrence": { "type": "fixed", "month": 6, "day": 21 }
}
```

```json
{
  "id": "precise-event",
  "name": "Precise Timing Event",
  "startTime": "14:30:45",
  "recurrence": { "type": "fixed", "month": 12, "day": 31 }
}
```

**Calendar Time Configuration**: Start times respect the calendar's time configuration (`hoursPerDay`, `minutesPerHour`, `secondsPerMinute`). For a calendar with 10-hour days, `"9"` means the 9th hour of that calendar's day.

### Duration

The `duration` field specifies how long an event lasts:

**Format**: `"<number><unit>"` where unit is `s` (seconds), `m` (minutes), `h` (hours), `d` (days), or `w` (weeks)
**Default**: `"1d"` (one day)

**Single-Day Events**:

```json
{
  "id": "new-year",
  "name": "New Year's Day",
  "duration": "1d",
  "recurrence": { "type": "fixed", "month": 1, "day": 1 }
}
```

**Multi-Day Events**:

```json
{
  "id": "festival-week",
  "name": "Harvest Festival",
  "startTime": "00:00:00",
  "duration": "7d",
  "recurrence": { "type": "fixed", "month": 9, "day": 1 }
}
```

```json
{
  "id": "olympics",
  "name": "Summer Olympics",
  "startTime": "20:00",
  "duration": "16d",
  "recurrence": {
    "type": "interval",
    "intervalYears": 4,
    "anchorYear": 2024,
    "month": 7,
    "day": 26
  }
}
```

**Sub-Day Events**:

```json
{
  "id": "short-ceremony",
  "name": "Morning Ceremony",
  "startTime": "9:00",
  "duration": "2h",
  "recurrence": { "type": "fixed", "month": 1, "day": 1 }
}
```

```json
{
  "id": "brief-meeting",
  "name": "Council Meeting",
  "startTime": "14:00",
  "duration": "90m",
  "recurrence": { "type": "weekly" }
}
```

**Instantaneous Events**:

```json
{
  "id": "solar-eclipse",
  "name": "Solar Eclipse",
  "startTime": "12:34:56",
  "duration": "0s",
  "recurrence": { "type": "fixed", "month": 8, "day": 21 }
}
```

### Multi-Day Event Behavior

Events with duration > 1 day appear on all dates they span:

- `startTime: "20:00"`, `duration: "16d"` starting on July 26 → event appears on July 26-August 10 (inclusive)
- Events crossing month boundaries are handled correctly
- Events crossing year boundaries are handled correctly
- Each date shows the same event instance

### API Detection

Use `getEventsForDate()` to find all events occurring on a specific date, including multi-day events that started on previous dates:

```javascript
// Get all events for a date (includes multi-day events in progress)
const events = game.seasonsStars.api.events.getEventsForDate(2024, 8, 1);

// Event might have started days earlier but still active on this date
events.forEach(event => {
  console.log(`${event.name}: ${event.startTime} for ${event.duration}`);
});
```

## Calendar JSON Schema Updates

The `events` array is **optional** in calendar JSON, making this a **backwards-compatible** addition to the existing schema. Calendars without an `events` property simply have no calendar-defined events.

```json
{
  "$schema": "https://raw.githubusercontent.com/rayners/fvtt-seasons-and-stars/main/schemas/calendar-v1.0.0.json",
  "id": "my-calendar",
  "events": [
    {
      "id": "must-be-unique-and-stable",
      "name": "Event Name",
      "recurrence": { "type": "fixed", "month": 1, "day": 1 },
      "startTime": "00:00:00",
      "duration": "1d"
    }
  ]
}
```

**Schema Compatibility**:

- Omitting `events` property: Calendar has no predefined events
- Empty `events` array: Explicitly no events (functionally equivalent)
- Existing calendars without events continue to work without modification

## Validation Requirements

### Calendar Event Validation

When loading calendar events, validate:

1. **Required Fields**: `id`, `name`, `recurrence` must be present
2. **Recurrence Validation**:
   - `month` must exist in calendar
   - For `fixed` and `interval`: `day` must be valid for month (or handled by `ifDayNotExists`)
   - For `ordinal`: `weekday` must be valid weekday index
   - For `ordinal`: Calendar must define weekdays
3. **Color Format**: If present, must be valid hex color `#RRGGBB`
4. **Icon Format**: If present, should be valid CSS class string
5. **Date Ranges**: If `startYear` and `endYear` present, `startYear <= endYear`
6. **Journal Entry Reference**: If `journalEntryId` present:
   - Validate format (UUID or ID string)
   - Don't fail if journal doesn't exist (graceful degradation)
   - Warn if journal exists but user can't access it

### World Settings Validation

When saving world event settings:

1. Event IDs in `disabledEventIds` should reference existing calendar events (warn if not)
2. World event IDs should not conflict with each other
3. All events in world settings must pass same validation as calendar events

## Implementation Phases

### Phase 1: Core Event System

- Data structures and types
- Calendar JSON event loading
- World settings storage and merge logic
- Basic API methods (`getAllEvents`, `getEventsForDate`)
- Hook implementation

### Phase 2: UI Integration

- Event indicators on calendar widgets
- Event details display (click date to see events)
- GM event management UI
- Event permission visibility

### Phase 3: Advanced Features

- Event exceptions system
- Recurring event performance optimization
- Event search and filtering
- Import/export event definitions

## Documentation Requirements

### JSON Schema

- Update calendar schema to include optional `events` array
- Provide schema for event validation
- Include examples for all recurrence types

### User Documentation

- How to add events to custom calendars
- GM guide for world-level event management
- Visual guide for event indicators
- How to link journal entries to events
- Best practices for multi-page journals with specific occurrences

### Developer Documentation

- Update DEVELOPER-GUIDE.md with events API
- Add examples for common event patterns
- Document hook integration patterns
- Add TSDoc comments to all API methods

## Testing Requirements

### Unit Tests

- Recurrence rule calculation for all types
- Edge cases (leap years, missing days, intercalary days)
- Event merge logic (calendar + world settings)
- Exception handling

### Integration Tests

- Event hooks fire correctly during time advancement
- Event hooks fire on startup
- Permission system integration
- Calendar switching with events

### Test Coverage Goals

- 90%+ coverage for event recurrence calculations
- 100% coverage for API methods
- Edge case testing for all recurrence types

## Calendar Author Guidelines

### Event ID Stability Contract

**CRITICAL**: Event IDs are part of your calendar's public API.

- **Never change** an event ID after publication
- Changing an ID is a **breaking change** (requires major version bump)
- GMs may reference event IDs in world settings
- Other modules may reference event IDs programmatically

### Recommended ID Format

Use descriptive, stable IDs:

- ✅ `"new-year"`, `"winter-solstice"`, `"harvest-festival"`
- ❌ `"event-1"`, `"holiday-2024"`, `"temp-id"`

### Event Quality Standards

1. **Relevance**: Include events meaningful to majority of users
2. **Accuracy**: If based on real-world calendar, verify dates
3. **Completeness**: Provide descriptions and translations when possible
4. **Visual Design**: Use appropriate colors and icons
5. **Rich Content**: Consider providing linked journal entries for major events
6. **Journal Distribution**: Store journals in compendiums for easy sharing
7. **Page Structure**: Use first page for general info, add occurrence pages as examples only

### Versioning Events

When updating calendar events:

- **Adding events**: Minor version bump
- **Removing events**: Major version bump (breaking change)
- **Changing event names/descriptions**: Patch version bump
- **Changing event IDs**: Major version bump (breaking change)

## Migration Path

### From Simple Calendar

Simple Calendar note-based events can be migrated by:

1. Identifying recurring patterns in notes
2. Creating calendar event definitions
3. Removing redundant recurring notes
4. Keeping one-time notes as regular notes

Bridge module may provide migration tools in future.

---

**Version**: Draft 1.0
**Status**: Specification
**Target Implementation**: v0.X.0
