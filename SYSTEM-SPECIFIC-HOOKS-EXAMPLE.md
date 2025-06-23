# System-Specific Hooks Architecture

This document demonstrates the new system-specific hook architecture that eliminates the need for runtime detection in module integrations.

## Architecture Overview

The system now supports both generic and system-specific hooks:

- **Generic hooks**: `seasons-stars:registerTimeSource`, `seasons-stars:extendCalendarEngine`
- **System-specific hooks**: `seasons-stars:pf2e:registerTimeSource`, `seasons-stars:dnd5e:registerTimeSource`, etc.

## How It Works

1. **Core S&S** detects the current system on `ready` hook
2. **Core S&S** emits `seasons-stars:{systemId}:systemDetected` hook
3. **Integration modules** listen for their specific system detection hook
4. **Integration modules** register using system-specific hooks (no runtime detection needed)

## Example: D&D 5e Integration

```typescript
// integrations/dnd5e-integration.ts

// Listen for D&D 5e system detection
Hooks.on('seasons-stars:dnd5e:systemDetected', () => {
  console.log('D&D 5e system detected - registering D&D 5e-specific integrations');

  // Register D&D 5e time source (only called when D&D 5e is detected)
  Hooks.callAll('seasons-stars:dnd5e:registerTimeSource', {
    sourceFunction: () => {
      // D&D 5e specific time logic
      const dndTime = (game as any).dnd5e?.time?.worldTime;
      return dndTime || null;
    },
  });

  // Register D&D 5e calendar compatibility
  Hooks.callAll('seasons-stars:dnd5e:registerCompatibility', {
    calendarId: 'forgotten-realms',
    adjustment: {
      weekdayOffset: 1, // Adjust weekdays for D&D 5e compatibility
      description: 'D&D 5e Forgotten Realms calendar compatibility',
    },
  });
});
```

## Benefits

### 1. **No Runtime Detection**

```typescript
// OLD WAY (runtime detection required)
if (game.system?.id === 'pf2e') {
  // register PF2e hooks
}

// NEW WAY (system-specific hooks)
Hooks.on('seasons-stars:pf2e:systemDetected', () => {
  // register PF2e hooks
});
```

### 2. **Better Performance**

- No conditional checks on every hook call
- System-specific hooks only exist when relevant
- Zero overhead in non-target systems

### 3. **Cleaner Architecture**

- Complete separation between systems
- No cross-system pollution
- Easier to maintain and test

### 4. **Type Safety**

```typescript
// System-specific interfaces can be strongly typed
interface PF2eTimeSource {
  worldClock?: { currentTime: number };
  settings?: { [key: string]: unknown };
}

interface DnD5eTimeSource {
  time?: { worldTime: number };
  calendar?: { currentDate: string };
}
```

## Migration Example

### Before (Generic Hooks)

```typescript
// Integration had to check system manually
Hooks.callAll('seasons-stars:registerTimeSource', {
  systemId: 'pf2e', // Manual system specification
  sourceFunction: pf2eTimeFunction,
});
```

### After (System-Specific Hooks)

```typescript
// Core detects system and calls appropriate hook
Hooks.on('seasons-stars:pf2e:systemDetected', () => {
  Hooks.callAll('seasons-stars:pf2e:registerTimeSource', {
    sourceFunction: pf2eTimeFunction, // No systemId needed
  });
});
```

## Supported Systems

The compatibility manager currently supports system-specific hooks for:

- `pf2e` (Pathfinder 2nd Edition)
- `dnd5e` (D&D 5th Edition)
- `forbidden-lands` (Forbidden Lands)
- `dragonbane` (Dragonbane)

New systems can be easily added to the `knownSystems` array in `compatibility-manager.ts`.

## Implementation Details

### Core S&S System Detection

```typescript
// compatibility-manager.ts
private initializeSystemDetection(): void {
  Hooks.once('ready', () => {
    const currentSystem = game.system?.id;
    if (currentSystem) {
      Logger.debug(`Detected system: ${currentSystem}, triggering system-specific hooks`);
      Hooks.callAll(`seasons-stars:${currentSystem}:systemDetected`);
    }
  });
}
```

### System-Specific Hook Registration

```typescript
// compatibility-manager.ts
for (const systemId of knownSystems) {
  Hooks.on(`seasons-stars:${systemId}:registerTimeSource`, (data: any) => {
    if (data.sourceFunction) {
      this.timeSourceRegistry.set(systemId, data.sourceFunction);
    }
  });
}
```

This architecture provides a clean, efficient, and maintainable approach to system-specific integrations without requiring runtime detection.
