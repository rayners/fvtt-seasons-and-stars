# System Integration Guide

Seasons & Stars provides comprehensive integration capabilities for game systems, including time source registration and worldTime transformation functions. This guide covers both basic time source integration and advanced worldTime synchronization for systems with custom time interpretations.

## Quick Start

```typescript
// Listen for your system's detection hook
Hooks.on('seasons-stars:pf2e:systemDetected', compatibilityManager => {
  // Register your time source function
  const timeSourceFunction = () => {
    return game.pf2e?.worldClock?.currentTime || null;
  };

  compatibilityManager.registerTimeSource('pf2e', timeSourceFunction);
});
```

## System Support

S&S works with **any Foundry VTT system** through two approaches:

1. **Calendar Definitions**: Most systems work perfectly with custom calendar JSON files
2. **System Integration**: Advanced integration for systems requiring special compatibility

## Current System Status

### Pathfinder 2e - Full Integration

**PF2e is the only system with dedicated integration code**:

```typescript
// PF2e has special hooks for advanced time source integration
Hooks.on('seasons-stars:pf2e:systemDetected', compatibilityManager => {
  // Registers PF2e world clock time sources
  // Handles weekday calculation compatibility
  // Provides time sync monitoring
});
```

**Features**:

- Time source integration (`game.pf2e.worldClock.currentTime`)
- Weekday calculation compatibility fixes
- Time synchronization monitoring
- Calendar-specific compatibility settings

### All Other Systems - Calendar Definitions

**Systems supported through calendar JSON files**:

- D&D 5th Edition, Forbidden Lands, Dragonbane, Dark Sun, Eberron, etc.
- Work automatically with S&S core functionality
- No special integration code needed
- Custom calendars available in the `calendars/` directory

```typescript
// Universal pattern for adding system integration
Hooks.on('seasons-stars:{systemId}:systemDetected', compatibilityManager => {
  // Your integration code here
});
```

## Time Source Registration

For systems that need custom time sources:

```typescript
// Example: Custom time source integration
Hooks.on('seasons-stars:your-system:systemDetected', compatibilityManager => {
  const customTimeSource = () => {
    // Return time in seconds, or null if unavailable
    const systemTime = game.yourSystem?.customTime?.worldTime;
    return typeof systemTime === 'number' ? systemTime : null;
  };

  compatibilityManager.registerTimeSource('your-system', customTimeSource);
});
```

**Time source requirements:**

- Must return a number (time in seconds) or `null`
- Called periodically to check for time updates
- Should handle errors gracefully

## Integration Examples

### Custom Module Integration

```typescript
// Example: Module providing time sources
Hooks.on('seasons-stars:any-system:systemDetected', compatibilityManager => {
  console.log('Integrating My Time Module with S&S');

  // Register time source from your module
  const myModuleTimeSource = () => {
    return game.modules.get('my-time-module')?.api?.getCurrentTime() || null;
  };

  compatibilityManager.registerTimeSource('my-time-module', myModuleTimeSource);
});
```

## Benefits

- **Automatic activation** - Only runs when your target system is present
- **Zero overhead** - No performance impact in other systems
- **Clean separation** - System integrations don't interfere with each other
- **Simple API** - Register once, works automatically

## Best Practices

1. **Handle errors gracefully** - Time sources should never throw uncaught exceptions
2. **Return null for unavailable time** - Don't return 0 or invalid values
3. **Use optional chaining** - Game objects may not always be available
4. **Test with multiple systems** - Ensure your integration doesn't break other systems

## WorldTime Transformation System

For systems that interpret `game.time.worldTime` differently than S&S's epoch-based approach, the compatibility manager provides worldTime transformation functions.

### The PF2e Problem Case

PF2e integration demonstrates this capability by solving a critical synchronization issue:

1. **S&S Interpretation**: worldTime=0 represents the calendar's epoch year (e.g., 2700 AR for Golarion)
2. **PF2e Interpretation**: worldTime=0 represents the real-world date when the world was created + 0 seconds elapsed
3. **Result**: Without transformation, clicking calendar dates in S&S caused PF2e to jump 2000+ years

### WorldTime Transform Registration

Register transformation functions using the compatibility manager:

```typescript
// Register a worldTime transformation function
compatibilityManager.registerDataProvider('your-system-id', 'worldTimeTransform', () => {
  return (worldTime: number, defaultOffset?: number): [number, number | undefined] => {
    // Transform worldTime and return system-specific offset
    const transformedWorldTime = worldTime;
    const systemTimeOffset = getYourSystemTimeOffset();
    return [transformedWorldTime, systemTimeOffset];
  };
});

// Optional: Register world creation timestamp for calendar engine
compatibilityManager.registerDataProvider('your-system-id', 'worldCreationTimestamp', () => {
  return getWorldCreationTimestamp();
});
```

### Integration Points

S&S applies system transformations at three key points:

1. **Bridge Integration** - `worldTimeToDate()` and `dateToWorldTime()` methods
2. **Time Converter** - `setCurrentDate()` when users click calendar dates
3. **Calendar Engine** - Date calculations use optional system time offset

### Real-World Creation Date Example

For systems that interpret worldTime=0 as a real-world creation date:

```typescript
function registerRealWorldTimeIntegration() {
  compatibilityManager.registerDataProvider(game.system.id, 'worldTimeTransform', () => {
    return (worldTime: number): [number, number | undefined] => {
      // Get when this world was created in real-world time
      const worldCreatedTimestamp = game.settings.get('your-system', 'worldCreatedOn');
      return [worldTime, worldCreatedTimestamp];
    };
  });
}
```

### Custom Epoch Example

For systems with their own epoch calculations:

```typescript
function registerCustomEpochIntegration() {
  compatibilityManager.registerDataProvider(game.system.id, 'worldTimeTransform', () => {
    return (worldTime: number): [number, number | undefined] => {
      // Apply your custom epoch offset
      const customEpochOffset = getCustomEpochOffset();
      const adjustedWorldTime = worldTime + customEpochOffset;
      return [adjustedWorldTime, undefined];
    };
  });
}
```

### Testing Your Integration

Use the browser console to verify worldTime transformation:

```javascript
// Check if your integration is registered
const manager = game.seasonsStars.compatibilityManager;
console.log('Has transform:', manager.hasDataProvider('your-system-id', 'worldTimeTransform'));

// Test the transformation
const transform = manager.getSystemData('your-system-id', 'worldTimeTransform');
if (transform) {
  const [transformedTime, offset] = transform(0);
  console.log('Transform result:', { transformedTime, offset });
}

// Test date synchronization
const ssDate = game.seasonsStars.manager.getCurrentDate();
console.log('S&S Date:', ssDate);
// Compare with your system's date display - they should now be synchronized
```

### Error Handling

S&S automatically handles integration errors gracefully:

```typescript
try {
  const transform = compatibilityManager.getSystemData(game.system.id, 'worldTimeTransform');
  if (transform) {
    [transformedWorldTime, systemTimeOffset] = transform(timestamp);
  }
} catch (error) {
  Logger.warn(`Error applying ${game.system.id} worldTime transformation:`, error);
  // S&S continues with original worldTime
}
```

Your transformation functions should also handle errors:

```typescript
function safeWorldTimeTransform(worldTime: number): [number, number | undefined] {
  try {
    // Your transformation logic
    const result = performComplexTransformation(worldTime);
    return [result.worldTime, result.offset];
  } catch (error) {
    console.warn('System worldTime transformation failed:', error);
    // Return original worldTime as fallback
    return [worldTime, undefined];
  }
}
```

## Migration from Simple Calendar

If your system previously integrated with Simple Calendar, you can access world creation timestamps:

```typescript
function getWorldCreationTimestamp() {
  // For PF2e systems - Simple Calendar reads from game.pf2e.settings.worldClock.worldCreatedOn
  if (game.system?.id === 'pf2e' && game.pf2e?.settings?.worldClock?.worldCreatedOn) {
    return Math.floor(new Date(game.pf2e.settings.worldClock.worldCreatedOn).getTime() / 1000);
  }

  // For other systems, Simple Calendar doesn't store worldCreatedOn directly
  // Check if Simple Calendar has current date to estimate world age
  try {
    const scCurrentDate = game.settings.get('simple-calendar', 'current-date');
    if (scCurrentDate && typeof scCurrentDate === 'object' && scCurrentDate.year) {
      // Note: This would require calendar-specific logic to convert
      // Simple Calendar's current date back to world creation timestamp
      // Implementation depends on your specific calendar system
    }
  } catch (error) {
    console.warn('Simple Calendar current-date setting not available:', error);
  }

  // Fall back to current real-world time for new worlds
  return Math.floor(Date.now() / 1000);
}
```

## API Reference

### compatibilityManager.registerDataProvider()

```typescript
registerDataProvider(
  systemId: string,
  dataKey: string,
  provider: () => any
): void
```

Register a data provider for system-specific functionality.

**Parameters:**

- `systemId`: Your game system's ID (`game.system.id`)
- `dataKey`: Type of data being provided (`'worldTimeTransform'` or `'worldCreationTimestamp'`)
- `provider`: Function that returns the data or transformation function

### compatibilityManager.getSystemData()

```typescript
getSystemData<T>(systemId: string, dataKey: string): T | null
```

Retrieve system-specific data (used internally by S&S).

### compatibilityManager.hasDataProvider()

```typescript
hasDataProvider(systemId: string, dataKey: string): boolean
```

Check if a system has registered a specific data provider.

## Extending Support

To add support for a new system, see the [Developer Guide](DEVELOPER-GUIDE.md) for implementation details.

For comprehensive worldTime transformation examples and advanced patterns, review the PF2e integration implementation in `src/integrations/pf2e-integration.ts`.
