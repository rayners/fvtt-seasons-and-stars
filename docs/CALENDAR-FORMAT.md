# Calendar Format Specification

Complete reference for Seasons & Stars calendar format and external loading system.

## Table of Contents

- [Calendar JSON Format](#calendar-json-format)
- [External Calendar Loading](#external-calendar-loading)
- [Calendar Collection Index](#calendar-collection-index)
- [Protocol Handlers](#protocol-handlers)
- [Fragment Selection](#fragment-selection)
- [Calendar Variants](#calendar-variants)
- [Validation and Error Handling](#validation-and-error-handling)
- [Best Practices](#best-practices)

## Calendar JSON Format

### Basic Calendar Structure

```json
{
  "id": "unique-calendar-id",
  "translations": {
    "en": {
      "label": "Calendar Name",
      "description": "Calendar description",
      "setting": "Settings menu description"
    }
  },
  "year": {
    "epoch": 1,
    "currentYear": 2024,
    "prefix": "",
    "suffix": " CE",
    "startDay": 6
  },
  "months": [
    {
      "name": "January",
      "length": 31,
      "description": "First month of the year"
    }
  ],
  "weekdays": [
    {
      "name": "Sunday",
      "description": "First day of the week"
    }
  ],
  "intercalary": [],
  "leapYear": {
    "rule": "gregorian"
  },
  "time": {
    "hoursInDay": 24,
    "minutesInHour": 60,
    "secondsInMinute": 60
  }
}
```

### Required Fields

- `id`: Unique identifier for the calendar
- `translations`: Localization data with at least English (`en`) translations
- `year`: Year configuration including epoch and display format
- `months`: Array of month definitions
- `weekdays`: Array of weekday definitions
- `time`: Time structure configuration

### Optional Fields

- `intercalary`: Special days outside the normal calendar structure
- `leapYear`: Leap year rules (defaults to 'none')
- `compatibility`: System-specific compatibility settings
- `variants`: Inline calendar variants

### Field Details

#### Year Configuration

```json
"year": {
  "epoch": 1,           // Starting year for calculations
  "currentYear": 2024,  // Default current year
  "prefix": "",         // Text before year number
  "suffix": " CE",      // Text after year number
  "startDay": 6         // Which weekday the epoch starts on (0-6)
}
```

#### Month Definitions

```json
"months": [
  {
    "name": "January",
    "length": 31,
    "description": "First month of the year",
    "abbreviation": "Jan"  // Optional short form
  }
]
```

#### Weekday Definitions

```json
"weekdays": [
  {
    "name": "Sunday",
    "description": "Day of rest",
    "abbreviation": "Sun"  // Optional short form
  }
]
```

#### Leap Year Rules

```json
"leapYear": {
  "rule": "gregorian",     // 'none', 'gregorian', or 'custom'
  "interval": 4,           // For custom rules
  "month": "February",     // Which month gets extra days
  "extraDays": 1          // How many extra days
}
```

## External Calendar Loading

Seasons & Stars supports loading calendars from multiple external sources using a universal protocol system.

### Supported Protocols

#### HTTPS Protocol

Load calendars from any HTTPS URL:

```
https://example.com/calendar.json
https://example.com/calendars/medieval.json
```

**Features:**

- Automatic CORS handling
- ETag-based caching
- Timeout protection
- Automatic `.json` extension normalization

#### GitHub Protocol

Load calendars from GitHub repositories:

```
github:user/repository/path/calendar.json
github:organization/calendar-repo/calendars/fantasy.json
```

**Features:**

- Uses GitHub's raw file API
- Supports public repositories
- Automatic rate limiting
- Branch specification support (defaults to main/master)

#### Module Protocol

Load calendars from other Foundry modules:

```
module:other-module/calendars/calendar.json
module:calendar-pack/historical/roman.json
```

**Features:**

- Access to other module's calendar files
- Respects module enablement status
- Automatic path resolution
- Development-friendly cache skipping

#### Local Protocol

Load calendars from local file paths:

```
local:Data/calendars/custom.json
local:worlds/my-world/calendars/campaign.json
```

**Features:**

- Access to local file system
- Relative path support
- Development mode integration

### External Calendar Usage

```javascript
// Basic external calendar loading
const calendar = await game.seasonsStars.api.loadExternalCalendar('github:user/repo/calendar.json');

// Load with options
const calendar = await game.seasonsStars.api.loadExternalCalendar(
  'https://example.com/calendar.json',
  {
    forceRefresh: true,
    timeout: 30000,
  }
);
```

### Load Options

```typescript
interface LoadCalendarOptions {
  useCache?: boolean; // Use cached data if available (default: true)
  forceRefresh?: boolean; // Force refresh even if cached (default: false)
  skipModuleCache?: boolean; // Skip caching for module calendars (default: false)
  timeout?: number; // Request timeout in milliseconds (default: 30000)
  headers?: Record<string, string>; // Additional headers
}
```

## Calendar Collection Index

For organizing multiple calendars, use the universal collection index format.

### Index Structure

```json
{
  "name": "Fantasy Calendar Collection",
  "description": "A collection of fantasy calendars for RPG campaigns",
  "version": "1.0.0",
  "calendars": [
    {
      "id": "medieval-calendar",
      "name": "Medieval Calendar",
      "description": "Historical medieval dating system",
      "file": "medieval.json",
      "tags": ["historical", "medieval", "europe"],
      "author": "Calendar Author",
      "version": "1.0.0",
      "metadata": {
        "systems": ["dnd5e", "pf2e"],
        "language": "en",
        "minimumFoundryVersion": "13"
      }
    }
  ],
  "metadata": {
    "lastUpdated": "2024-12-01T00:00:00Z",
    "source": "https://github.com/user/calendars",
    "license": "MIT",
    "author": "Collection Author"
  }
}
```

### Index Loading

When you reference a directory or index:

```
https://example.com/calendars/          # Automatically loads index.json
github:user/repo/calendars/             # Automatically loads index.json
module:calendar-pack/                   # Automatically loads index.json
```

The system automatically:

1. Appends `index.json` to directory paths
2. Validates the index structure
3. Makes individual calendars available for loading

## Fragment Selection

Use fragment syntax (`#calendar-id`) to select specific calendars from collections:

### Fragment Examples

```
# Select specific calendar from index
github:user/repo/calendars/#medieval-calendar

# Select calendar from HTTPS collection
https://example.com/calendars/#fantasy-calendar

# Fragment with module protocol
module:calendar-pack/#historical-roman
```

### Fragment Processing

1. **Parse Location**: Extract base path and fragment
2. **Load Index**: Load the collection index from base path
3. **Validate Fragment**: Check if the requested calendar exists
4. **Load Calendar**: Load the specific calendar file
5. **Return Result**: Return the selected calendar

### Multiple Calendar Selection

When no fragment is specified:

- Single calendar files load directly
- Index files with one calendar load that calendar
- Index files with multiple calendars require fragment selection
- Error is thrown for ambiguous cases

## Calendar Variants

Seasons & Stars supports two types of calendar variants:

### Inline Variants

Defined within the same calendar file:

```json
{
  "id": "base-calendar",
  "variants": {
    "historical": {
      "name": "Historical Variant",
      "default": false,
      "overrides": {
        "year": {
          "prefix": "Year ",
          "suffix": " AH"
        }
      }
    }
  }
}
```

### External Variants

Defined in separate files that reference base calendars:

```json
{
  "id": "gregorian-themes",
  "baseCalendar": "gregorian",
  "variants": {
    "star-trek": {
      "name": "Star Trek Stardate",
      "config": {
        "yearOffset": 2323
      },
      "overrides": {
        "year": {
          "prefix": "Stardate ",
          "suffix": ""
        }
      }
    }
  }
}
```

## Validation and Error Handling

### Calendar Validation

All calendars undergo validation:

```typescript
interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}
```

### Common Validation Errors

- Missing required fields (`id`, `translations`, `year`, `months`, `weekdays`)
- Invalid month lengths (must be positive integers)
- Invalid weekday count (must have at least 1 weekday)
- Duplicate month or weekday names
- Invalid leap year configuration
- Circular variant references

### Error Handling

```javascript
try {
  const calendar = await game.seasonsStars.api.loadExternalCalendar(externalId);
} catch (error) {
  if (error.name === 'ValidationError') {
    console.error('Calendar validation failed:', error.message);
  } else if (error.name === 'NetworkError') {
    console.error('Failed to load calendar:', error.message);
  } else if (error.name === 'TimeoutError') {
    console.error('Calendar loading timeout:', error.message);
  }
}
```

### Cache Management

External calendars are cached with configurable duration:

```javascript
// Default cache settings
{
  defaultCacheDuration: 7 * 24 * 60 * 60 * 1000, // 1 week
  maxCacheSize: 100,
  requestTimeout: 30000,
  autoUpdate: false,
  updateInterval: 24 * 60 * 60 * 1000 // 24 hours
}
```

#### Development Mode Cache Skipping

Cache is automatically skipped when:

- `game.data.world.flags['seasons-and-stars']?.devMode` is true
- URL contains 'foundrytest'
- Module protocol with `skipModuleCache: true`

## Best Practices

### Calendar Design

1. **Unique IDs**: Use descriptive, unique identifiers
2. **Complete Translations**: Provide comprehensive localization
3. **Logical Structure**: Design months and weekdays logically
4. **Validation**: Test calendars thoroughly before distribution

### External Calendar Hosting

1. **HTTPS Only**: Always use HTTPS for security
2. **CORS Headers**: Configure proper CORS headers for web hosting
3. **Stable URLs**: Use stable, long-term URLs for calendar hosting
4. **Version Control**: Use GitHub or similar for version control

### Performance Optimization

1. **Cache Strategy**: Use appropriate cache durations
2. **Compression**: Compress JSON files for faster loading
3. **CDN**: Use CDN for better global performance
4. **Index Organization**: Organize large collections with clear indexes

### Security Considerations

1. **Trusted Sources**: Only load calendars from trusted sources
2. **Input Validation**: Always validate external calendar data
3. **Error Handling**: Implement robust error handling
4. **Rate Limiting**: Respect API rate limits for external services

### Module Integration

```javascript
// Register external calendar sources in your module
Hooks.on('seasons-stars:ready', async () => {
  if (game.seasonsStars.manager?.externalRegistry) {
    await game.seasonsStars.manager.externalRegistry.addExternalSource({
      protocol: 'module',
      location: 'my-module/calendars/special.json',
      label: 'My Module Calendar',
      trusted: true,
    });
  }
});
```

### Distribution Guidelines

1. **Documentation**: Include clear documentation with your calendars
2. **Attribution**: Properly attribute sources and inspirations
3. **Licensing**: Use appropriate licenses (MIT recommended)
4. **Community**: Share calendars with the community via GitHub

---

**Need help?** Check the [Developer Guide](./DEVELOPER-GUIDE.md) for API integration or visit our [GitHub Discussions](https://github.com/rayners/fvtt-seasons-and-stars/discussions) for calendar format support.
