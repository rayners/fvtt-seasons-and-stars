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

## Supported Systems

S&S automatically detects these systems and provides integration hooks:

- **Pathfinder 2e** (`pf2e`) - Enhanced calendar compatibility and time sources
- **D&D 5th Edition** (`dnd5e`) - Standard time integration
- **Forbidden Lands** (`forbidden-lands`) - System-specific time handling
- **Dragonbane** (`dragonbane`) - Compatible time sources

## System Detection Hooks

When S&S detects a supported system, it emits a system-specific hook:

```typescript
Hooks.on('seasons-stars:{systemId}:systemDetected', compatibilityManager => {
  // Your integration code here
});
```

**Available hooks:**

- `seasons-stars:pf2e:systemDetected`
- `seasons-stars:dnd5e:systemDetected`
- `seasons-stars:forbidden-lands:systemDetected`
- `seasons-stars:dragonbane:systemDetected`

## Time Source Registration

Time sources allow S&S to read time from your system or module:

```typescript
// Example: Register a custom time source
Hooks.on('seasons-stars:dnd5e:systemDetected', compatibilityManager => {
  const dnd5eTimeSource = () => {
    // Return time in seconds, or null if unavailable
    const customTime = game.dnd5e?.time?.worldTime;
    return typeof customTime === 'number' ? customTime : null;
  };

  compatibilityManager.registerTimeSource('dnd5e', dnd5eTimeSource);
});
```

**Time source requirements:**

- Must return a number (time in seconds) or `null`
- Called periodically to check for time updates
- Should handle errors gracefully

## Integration Examples

### Custom Module Integration

```typescript
// integrations/my-module-integration.ts
Hooks.on('seasons-stars:dnd5e:systemDetected', compatibilityManager => {
  console.log('Integrating My Module with S&S');

  // Register time source from your module
  const myModuleTimeSource = () => {
    return game.modules.get('my-module')?.api?.getCurrentTime() || null;
  };

  compatibilityManager.registerTimeSource('my-module', myModuleTimeSource);
});
```

### System-Specific Enhancements

```typescript
// Add PF2e-specific calendar features
Hooks.on('seasons-stars:pf2e:systemDetected', compatibilityManager => {
  // Register enhanced PF2e time source
  const pf2eTimeSource = () => {
    // Try multiple PF2e time sources
    const sources = [
      () => game.pf2e?.worldClock?.currentTime,
      () => game.worldClock?.currentTime,
      () => game.settings.get('pf2e', 'worldTime'),
    ];

    for (const source of sources) {
      try {
        const time = source();
        if (typeof time === 'number') return time;
      } catch (error) {
        // Continue to next source
      }
    }

    return null;
  };

  compatibilityManager.registerTimeSource('pf2e', pf2eTimeSource);
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
