# External Protocol Handler Examples

This directory contains example implementations of external protocol handlers for the Seasons & Stars calendar system. These examples demonstrate how module authors can register their own custom calendar loading protocols via the `seasons-stars:registerCalendarLoaders` hook.

## Overview

The Seasons & Stars module provides a hook system that allows external modules to register custom protocol handlers for loading calendars from various sources. This enables users to enter calendar locations using custom protocols in the calendar loading interface.

### Hook System

The hook `seasons-stars:registerCalendarLoaders` is fired during module initialization and provides:

```typescript
Hooks.on('seasons-stars:registerCalendarLoaders', ({ registerHandler }) => {
  // registerHandler accepts either:
  // 1. Full ProtocolHandler class instance
  // 2. Simple function-based handler object
});
```

## Example Files

### 1. `github-calendar-loader.ts`

**Full ProtocolHandler Example**

This is a complete implementation of the GitHub protocol handler that was moved from the core module. It demonstrates:

- Full `ProtocolHandler` interface implementation
- Complex location validation and parsing
- Repository index support
- Error handling and update checking
- GitHub API integration

**Usage:**
```typescript
import { GitHubCalendarLoader } from './github-calendar-loader';

Hooks.on('seasons-stars:registerCalendarLoaders', ({ registerHandler }) => {
  registerHandler(new GitHubCalendarLoader());
});
```

**Supported locations:**
- `github:user/repo` - Load from repository index
- `github:user/repo#calendar-id` - Load specific calendar from index
- `github:user/repo/path/to/calendar.json` - Load direct file

### 2. `local-calendar-loader.ts`

**Full ProtocolHandler Example**

Complete implementation of the local file system protocol handler. It demonstrates:

- Local file path validation
- Cross-platform path handling (Windows/Unix)
- Directory index support
- File system access patterns

**Usage:**
```typescript
import { LocalCalendarLoader } from './local-calendar-loader';

Hooks.on('seasons-stars:registerCalendarLoaders', ({ registerHandler }) => {
  registerHandler(new LocalCalendarLoader());
});
```

**Supported locations:**
- `local:/path/to/calendar.json` - Absolute path
- `local:./relative/path/calendar.json` - Relative path
- `local:C:\Windows\path\calendar.json` - Windows path

### 3. `minimal-protocol-handlers.ts`

**Minimal Function-Based Examples**

Multiple examples of minimal protocol handlers that only implement the basic interface:

```typescript
interface SimpleProtocolHandler {
  protocol: string;
  loadCalendar: (location: string) => Promise<SeasonsStarsCalendar>;
}
```

**Examples included:**
- **HTTP Protocol** - Basic HTTP calendar loading
- **Demo Protocol** - Generates demo calendars for testing
- **Database Protocol** - Mock database calendar loading

**Usage:**
```typescript
import { createHttpCalendarLoader, createDemoProtocolLoader } from './minimal-protocol-handlers';

Hooks.on('seasons-stars:registerCalendarLoaders', ({ registerHandler }) => {
  registerHandler(createHttpCalendarLoader());
  registerHandler(createDemoProtocolLoader());
});
```

### 4. `register-core-handlers.ts`

**Registration Example for Core Handlers**

This file demonstrates how to register the GitHub and Local protocol handlers that were moved from the core module. It shows practical patterns for:

- Basic registration of multiple handlers
- Conditional registration (checking if already registered)
- Module integration with settings
- Error handling during registration

**Usage:**
```typescript
import { registerCoreProtocolHandlers } from './register-core-handlers';

// In your module's init hook
Hooks.once('init', () => {
  registerCoreProtocolHandlers();
});
```

## Implementation Approaches

### Full ProtocolHandler Interface

Use this approach when you need:
- Complex location validation
- Update checking functionality
- Sophisticated error handling
- Multiple loading patterns (indexes, direct files)

```typescript
class MyProtocolHandler implements ProtocolHandler {
  readonly protocol: string = 'myprotocol';
  
  canHandle(location: string): boolean {
    // Custom validation logic
  }
  
  async loadCalendar(location: string, options?: LoadCalendarOptions): Promise<SeasonsStarsCalendar> {
    // Calendar loading logic
  }
  
  async checkForUpdates?(location: string, lastEtag?: string): Promise<boolean> {
    // Optional update checking
  }
}
```

### Minimal Function-Based Handler

Use this approach when you need:
- Basic calendar loading
- Minimal implementation overhead
- Quick prototyping
- Lightweight protocol support

```typescript
const myHandler: SimpleProtocolHandler = {
  protocol: 'myprotocol',
  
  async loadCalendar(location: string): Promise<SeasonsStarsCalendar> {
    // Simple loading logic
  }
};
```

## Registration Patterns

### Single Handler Registration

```typescript
Hooks.on('seasons-stars:registerCalendarLoaders', ({ registerHandler }) => {
  registerHandler(new MyProtocolHandler());
});
```

### Multiple Handler Registration

```typescript
Hooks.on('seasons-stars:registerCalendarLoaders', ({ registerHandler }) => {
  registerHandler(new GitHubCalendarLoader());
  registerHandler(new LocalCalendarLoader());
  registerHandler(createHttpCalendarLoader());
});
```

### Conditional Registration

```typescript
Hooks.on('seasons-stars:registerCalendarLoaders', ({ registerHandler }) => {
  // Only register if certain conditions are met
  if (game.modules.get('my-dependency')?.active) {
    registerHandler(new MyProtocolHandler());
  }
});
```

## Best Practices

### 1. Error Handling

Always provide clear, user-friendly error messages:

```typescript
async loadCalendar(location: string): Promise<SeasonsStarsCalendar> {
  try {
    // Loading logic
  } catch (error) {
    throw new Error(`Failed to load calendar from ${this.protocol}: ${error.message}`);
  }
}
```

### 2. Validation

Validate calendar data before returning:

```typescript
if (!calendar?.id || !calendar?.months || !calendar?.weekdays) {
  throw new Error('Invalid calendar data: missing required fields');
}
```

### 3. Logging

Use console methods for logging (or your module's logger):

```typescript
console.debug(`Loading calendar from ${this.protocol}: ${location}`);
console.info(`Successfully loaded calendar: ${calendar.id}`);
console.error(`Failed to load calendar:`, error);
```

### 4. Protocol Naming

Choose descriptive, unique protocol names that won't conflict:

```typescript
// Good
protocol: 'mymodule-database'
protocol: 'custom-api'
protocol: 'module-calendar-db'

// Avoid
protocol: 'db'     // Too generic
protocol: 'api'    // Too generic
protocol: 'file'   // Conflicts with potential core protocols
```

### 5. Location Format

Design clear, consistent location formats:

```typescript
// Database example
'mydb:table/id'
'mydb:calendars/medieval-calendar'

// API example  
'myapi:server/calendar-id'
'myapi:prod/fantasy-realm'

// File service example
'myfiles:folder/subfolder/calendar'
```

## Testing Your Protocol Handler

### 1. Manual Testing

Test your protocol handler manually in the Seasons & Stars calendar loading interface:

1. Open the external calendar sources dialog
2. Select your protocol from the dropdown
3. Enter test locations
4. Verify loading works correctly

### 2. Error Cases

Test common error scenarios:
- Invalid locations
- Network failures
- Missing files
- Invalid JSON
- Missing calendar fields

### 3. Hook Registration

Verify your hook registration works:

```typescript
// Add debug logging
Hooks.on('seasons-stars:registerCalendarLoaders', ({ registerHandler }) => {
  console.log('Registering my protocol handler');
  const success = registerHandler(myHandler);
  console.log('Registration success:', success);
});
```

## Troubleshooting

### Handler Not Registered

Check that:
- Your module loads before Seasons & Stars ready hook
- The hook listener is properly registered
- No JavaScript errors prevent registration
- Protocol name doesn't conflict with existing handlers

### Loading Failures

Common issues:
- CORS restrictions for HTTP requests
- File path resolution for local files
- Authentication requirements for APIs
- Invalid JSON in calendar files
- Missing required calendar fields

### Protocol Not Appearing

If your protocol doesn't appear in the UI dropdown:
- Check browser console for registration errors
- Verify the handler was successfully registered
- Ensure protocol name is valid (no special characters)

## Support

For questions about implementing protocol handlers:

1. Check existing examples in this directory
2. Review the TypeScript type definitions
3. Test with simple implementations first
4. Use console logging for debugging

These examples should provide a solid foundation for implementing your own custom calendar loading protocols!