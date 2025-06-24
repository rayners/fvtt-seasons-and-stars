# System Integration Guide

Seasons & Stars provides a simple hook-based API for integrating with different game systems and modules. This guide shows how to register time sources and extend S&S functionality.

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

## Extending Support

To add support for a new system, see the [Developer Guide](DEVELOPER-GUIDE.md) for implementation details.
