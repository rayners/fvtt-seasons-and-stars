# Calendar Registration Hook System

Seasons & Stars provides a hook-based system for external modules to register custom calendars dynamically during calendar loading.

## Hook Event

**Hook Name**: `seasons-stars:loadCalendars`

**Event Data**:

```typescript
{
  addCalendar: (calendarData: SeasonsStarsCalendar) => boolean;
}
```

## Usage Example

Other modules can register calendars using the hook system:

```javascript
// Register a hook to add calendars during S&S initialization
Hooks.on('seasons-stars:loadCalendars', ({ addCalendar }) => {
  // Example custom calendar
  const myCustomCalendar = {
    id: 'my-module-calendar',
    label: 'My Custom Calendar',
    description: 'A calendar provided by my module',
    months: [
      { name: 'First Month', days: 30 },
      { name: 'Second Month', days: 31 },
      // ... more months
    ],
    weekdays: [
      { name: 'Day One' },
      { name: 'Day Two' },
      // ... more weekdays
    ],
    year: {
      epoch: 0,
      currentYear: 1000,
    },
    leapYear: {
      rule: 'none',
      offset: 0,
    },
    translations: {
      en: {
        label: 'My Custom Calendar',
        description: 'A calendar provided by my module',
      },
    },
  };

  // Register the calendar
  const success = addCalendar(myCustomCalendar);

  if (success) {
    console.log('Custom calendar registered successfully!');
  } else {
    console.error('Failed to register custom calendar');
  }
});
```

## TypeScript Support

For TypeScript modules, you can import the proper types:

```typescript
import type { SeasonsStarsCalendar } from 'path/to/seasons-and-stars/types/calendar';
import type { CalendarRegistrationHookData } from 'path/to/seasons-and-stars/types/foundry-extensions';

Hooks.on('seasons-stars:loadCalendars', ({ addCalendar }: CalendarRegistrationHookData) => {
  const calendar: SeasonsStarsCalendar = {
    // ... calendar definition
  };

  addCalendar(calendar);
});
```

## Hook Timing

The `seasons-stars:loadCalendars` hook is fired during module initialization after:

1. Built-in calendars are loaded
2. External variant files are processed
3. Configured external calendar sources are loaded

This ensures that all standard calendars are available before external modules register their custom calendars.

## Calendar Validation

The `addCalendar` function automatically validates calendar data using the same validation system as built-in calendars. If validation fails, the function returns `false` and logs an error.

Required calendar fields include:

- `id`: Unique calendar identifier
- `label`: Display name
- `months`: Array of month definitions
- `weekdays`: Array of weekday definitions
- `year`: Year configuration
- `translations`: Localization data

## Backward Compatibility

This hook system is additive and maintains full backward compatibility with existing external calendar loading methods:

- External calendar sources via settings
- Protocol handlers (HTTPS, GitHub, Module, Local)
- Manual calendar loading via API

## Error Handling

The `addCalendar` function includes comprehensive error handling:

- Input validation for null/undefined data
- Calendar structure validation
- Graceful failure with logging
- Returns boolean success/failure indicator

```javascript
Hooks.on('seasons-stars:loadCalendars', ({ addCalendar }) => {
  try {
    const success = addCalendar(myCalendar);
    if (!success) {
      console.warn('Calendar registration failed validation');
    }
  } catch (error) {
    console.error('Error during calendar registration:', error);
  }
});
```

## Multiple Calendars

Modules can register multiple calendars in a single hook:

```javascript
Hooks.on('seasons-stars:loadCalendars', ({ addCalendar }) => {
  const calendars = [
    // Calendar 1
    { id: 'calendar-1' /* ... */ },
    // Calendar 2
    { id: 'calendar-2' /* ... */ },
    // Calendar 3
    { id: 'calendar-3' /* ... */ },
  ];

  calendars.forEach(calendar => {
    const success = addCalendar(calendar);
    console.log(`Calendar ${calendar.id}: ${success ? 'success' : 'failed'}`);
  });
});
```

This system provides a clean, standardized way for external modules to extend Seasons & Stars with custom calendar definitions while maintaining compatibility with existing external calendar loading mechanisms.
