# Migration Guide - Simple Calendar to Seasons & Stars

A comprehensive guide for migrating from Simple Calendar to Seasons & Stars, covering users, GMs, and module developers.

## 📚 Table of Contents

- [Why Migrate?](#why-migrate)
- [For Users & GMs](#for-users--gms)
- [For Module Developers](#for-module-developers)
- [Data Migration](#data-migration)
- [Compatibility Matrix](#compatibility-matrix)
- [Troubleshooting](#troubleshooting)
- [Rollback Plan](#rollback-plan)

## 🎯 Why Migrate?

### Benefits of Seasons & Stars

#### ✅ **Modern Architecture**

- **Foundry v13+ Native**: Built specifically for latest Foundry versions
- **ApplicationV2**: Modern UI framework with better performance
- **TypeScript**: Better code quality and developer experience
- **Clean Codebase**: Easier to maintain and extend

#### ✅ **Better User Experience**

- **Intuitive Interface**: Cleaner, more responsive UI
- **Smart Navigation**: Click year to jump instantly (no more 1000+ clicks)
- **SmallTime Integration**: Seamless positioning and visual consistency
- **Real-World Initialization**: Gregorian calendars start with today's date

#### ✅ **Enhanced Compatibility**

- **Automatic Detection**: Works alongside existing modules without conflicts
- **Backward Compatibility**: Existing Simple Calendar integrations work immediately
- **Future-Proof**: Active development with modern best practices

#### ✅ **Performance Improvements**

- **Faster Calculations**: Optimized calendar math and caching
- **Responsive UI**: Better handling of large date ranges
- **Memory Efficient**: Cleaner resource management

### Migration Timeline

#### **Phase 1** ✅ _Available Now_

- Core calendar functionality
- Simple Calendar API compatibility
- Basic weather module support

#### **Phase 2** 🚧 _Q1 2025_

- Complete notes system
- Full weather module compatibility
- Advanced configuration options

#### **Phase 3** 📅 _Q2 2025_

- Automated migration tools
- Calendar editor
- Enhanced theming

## 👥 For Users & GMs

### Pre-Migration Checklist

#### 1. **Backup Your World**

```bash
# Always backup before major changes
# Foundry automatically creates backups, but manual backup recommended
```

#### 2. **Document Current Setup**

- Note your current calendar system (Gregorian, Harptos, etc.)
- Export any critical calendar events/notes
- List weather modules and other calendar integrations
- Screenshot current calendar settings

#### 3. **Check Module Compatibility**

Review your modules for calendar dependencies:

- Weather modules (Simple Weather, etc.)
- Time-tracking modules
- Custom calendar modules

### Migration Steps

#### Step 1: Install Seasons & Stars

1. **Install Module**: Search for "Seasons & Stars" in Foundry module browser
2. **Keep Simple Calendar**: Don't disable it yet - they can coexist during testing
3. **Enable S&S**: Activate Seasons & Stars in your world
4. **Test Basic Functions**: Verify calendar appears and works

#### Step 1.5: Install Simple Calendar Compatibility Bridge (If Needed)

**Required if you use:**

- Weather modules (Simple Weather, etc.)
- Other modules that depend on Simple Calendar API
- Custom modules that call `window.SimpleCalendar` methods

**Installation:**

1. **Install Bridge Module**: Search for "Simple Calendar Compatibility Bridge" in Foundry module browser
2. **Enable Bridge**: Activate the compatibility bridge in your world
3. **Verify Compatibility**: Check that dependent modules continue working
4. **Important**: Do NOT run both the bridge and Simple Calendar together

#### Step 2: Configure Calendar System

1. **Select Calendar**: Choose matching calendar type (Gregorian → Gregorian, Harptos → Vale Reckoning)
2. **Set Current Date**: Use grid view to set correct current date
3. **Verify Time Display**: Check that dates and times display correctly
4. **Test Time Advancement**: Try advancing time with quick buttons

#### Step 3: Test Module Compatibility

1. **Weather Modules**: Verify weather updates work with date changes
2. **Custom Modules**: Test any modules that use calendar functions
3. **Player Experience**: Have players test calendar visibility and interaction

#### Step 4: Gradual Transition

1. **Parallel Operation**: Run both systems for a few sessions
2. **Monitor Issues**: Watch for any problems or conflicts
3. **Player Feedback**: Get input from your table
4. **Feature Comparison**: Note any missing features you need

#### Step 5: Complete Migration

1. **Disable Simple Calendar**: Once confident, disable the old module
2. **Clean Up**: Remove Simple Calendar if no longer needed
3. **Update Documentation**: Inform players about the change
4. **Configure Widgets**: Set up mini widget and positioning preferences. The mini widget now supports drag-and-drop positioning with automatic save/restore.

### Calendar System Mapping

#### **Simple Calendar → Seasons & Stars**

| Simple Calendar  | Seasons & Stars | Notes                      |
| ---------------- | --------------- | -------------------------- |
| Gregorian        | Gregorian       | Direct match               |
| Harptos          | Vale Reckoning  | Similar fantasy calendar   |
| Golarian (PF)    | Custom calendar | Import JSON when available |
| Exandrian        | Custom calendar | Import JSON when available |
| Eberron          | Custom calendar | Import JSON when available |
| Custom calendars | Custom import   | Phase 3 feature            |

#### **Date Format Changes**

```javascript
// Simple Calendar uses 0-based months/days
const scDate = { year: 2024, month: 11, day: 24 }; // December 25th

// Seasons & Stars uses 1-based (more intuitive)
const ssDate = { year: 2024, month: 12, day: 25 }; // December 25th
```

### Feature Comparison

#### ✅ **Available in Seasons & Stars**

- ✅ Multiple calendar systems
- ✅ Time advancement controls
- ✅ Date/time display
- ✅ Calendar switching
- ✅ Basic weather module support
- ✅ SmallTime integration
- ✅ Year navigation (improved!)

#### 🚧 **Coming Soon (Phase 2)**

- 🚧 Notes/events system
- 🚧 Complete weather module support
- 🚧 Calendar configuration UI
- 🚧 Import/export tools

#### ❌ **Not Planned**

- ❌ Built-in weather generation
- ❌ Combat time integration
- ❌ PF2E world clock sync

### Settings Migration

#### **Simple Calendar Settings**

```javascript
// Export your current settings before migration
console.log(game.settings.get('foundryvtt-simple-calendar', 'calendar-configuration'));
```

#### **Seasons & Stars Settings**

- **Active Calendar**: Choose calendar system
- **Show Time Widget**: Toggle mini widget
- **Time Format**: Configure display options

## 🔧 For Module Developers

### Compatibility Assessment

#### **Immediate Compatibility** ✅

Your module likely works immediately if it uses:

- `SimpleCalendar.api.currentDateTime()`
- `SimpleCalendar.api.timestampToDate()`
- `SimpleCalendar.Hooks.DateTimeChange`
- Basic calendar data access

#### **Needs Updates** 🔄

Your module needs changes if it uses:

- Simple Calendar's notes system (Phase 2)
- Advanced configuration APIs
- Calendar creation functions
- Internal Simple Calendar structures

#### **Testing Your Module**

```javascript
// Test compatibility detection
function testCalendarCompatibility() {
  console.log('=== Calendar System Detection ===');

  // Check for Seasons & Stars
  if (game.seasonsStars) {
    console.log('✅ Seasons & Stars detected');
    console.log('API available:', !!game.seasonsStars.api);
  }

  // Check for Simple Calendar compatibility
  if (window.SimpleCalendar) {
    console.log('✅ SimpleCalendar API available');
    console.log('Is compatibility layer:', !!window.SimpleCalendar._isSeasonsStarsCompatibility);
  }

  // Test critical functions
  try {
    const currentDate = SimpleCalendar.api.currentDateTime();
    console.log('✅ currentDateTime() works:', currentDate);
  } catch (e) {
    console.error('❌ currentDateTime() failed:', e);
  }

  try {
    const timestampDate = SimpleCalendar.api.timestampToDate(game.time.worldTime);
    console.log('✅ timestampToDate() works:', timestampDate);
    console.log('Has display object:', !!timestampDate.display);
  } catch (e) {
    console.error('❌ timestampToDate() failed:', e);
  }
}
```

### Migration Strategies

#### Strategy 1: Universal Adapter (Recommended)

Create an adapter that works with multiple calendar systems:

```javascript
class CalendarAdapter {
  constructor() {
    this.type = this.detectCalendarType();
    this.setupHooks();
  }

  detectCalendarType() {
    if (game.seasonsStars && !window.SimpleCalendar._isSeasonsStarsCompatibility) {
      return 'seasons-stars';
    } else if (window.SimpleCalendar && !window.SimpleCalendar._isSeasonsStarsCompatibility) {
      return 'simple-calendar';
    } else if (window.SimpleCalendar && window.SimpleCalendar._isSeasonsStarsCompatibility) {
      return 'seasons-stars-compat';
    } else {
      return 'none';
    }
  }

  getCurrentDate() {
    switch (this.type) {
      case 'seasons-stars':
        return game.seasonsStars.api.getCurrentDate();
      case 'simple-calendar':
      case 'seasons-stars-compat':
        return SimpleCalendar.api.currentDateTime();
      default:
        return null;
    }
  }

  setupHooks() {
    switch (this.type) {
      case 'seasons-stars':
        Hooks.on('seasons-stars:dateChanged', this.onDateChange.bind(this));
        break;
      case 'simple-calendar':
      case 'seasons-stars-compat':
        Hooks.on(SimpleCalendar.Hooks.DateTimeChange, this.onDateChange.bind(this));
        break;
    }
  }
}
```

#### Strategy 2: Gradual Migration

Migrate in phases as features become available:

```javascript
// Phase 1: Use compatibility layer
class WeatherManager {
  constructor() {
    this.useCompatibilityAPI();
  }

  useCompatibilityAPI() {
    // Current approach - works with both systems
    if (window.SimpleCalendar) {
      this.api = SimpleCalendar.api;
      Hooks.on(SimpleCalendar.Hooks.DateTimeChange, this.onDateChange.bind(this));
    }
  }

  // Phase 2: Migrate to native API when notes system available
  migrateToNativeAPI() {
    if (game.seasonsStars) {
      this.api = game.seasonsStars.api;
      Hooks.on('seasons-stars:dateChanged', this.onDateChange.bind(this));
      // Enhanced features available
    }
  }
}
```

#### Strategy 3: Feature Detection

Use feature detection instead of system detection:

```javascript
class AdvancedCalendarIntegration {
  constructor() {
    this.features = this.detectFeatures();
    this.setupBasedOnFeatures();
  }

  detectFeatures() {
    return {
      hasDateTimeAPI: typeof SimpleCalendar?.api?.currentDateTime === 'function',
      hasNotesAPI: typeof SimpleCalendar?.api?.addNote === 'function',
      hasAdvancedFormatting: typeof game.seasonsStars?.api?.formatDate === 'function',
      hasNativeHooks: !!game.seasonsStars,
    };
  }

  setupBasedOnFeatures() {
    if (this.features.hasNativeHooks) {
      // Use native Seasons & Stars hooks for better performance
      Hooks.on('seasons-stars:dateChanged', this.onDateChange.bind(this));
    } else if (this.features.hasDateTimeAPI) {
      // Fall back to Simple Calendar compatibility
      Hooks.on(SimpleCalendar.Hooks.DateTimeChange, this.onDateChange.bind(this));
    }
  }
}
```

### Testing Your Migration

#### Unit Tests

```javascript
// Test calendar API compatibility
describe('Calendar Integration', () => {
  it('should get current date from any calendar system', () => {
    const adapter = new CalendarAdapter();
    const currentDate = adapter.getCurrentDate();

    expect(currentDate).toBeDefined();
    expect(currentDate.year).toBeGreaterThan(0);
    expect(currentDate.month).toBeGreaterThan(0);
  });

  it('should handle date changes', done => {
    const adapter = new CalendarAdapter();

    adapter.onDateChange = data => {
      expect(data).toBeDefined();
      done();
    };

    // Trigger a date change
    if (game.seasonsStars) {
      game.seasonsStars.api.advanceDays(1);
    } else if (SimpleCalendar) {
      SimpleCalendar.api.changeDate({
        year: 2024,
        month: 11,
        day: 25,
      });
    }
  });
});
```

#### Integration Tests

```javascript
// Test with real calendar systems
async function testRealIntegration() {
  console.log('=== Real Integration Test ===');

  // Test getting current weather
  const currentDate = SimpleCalendar.api.currentDateTime();
  const weather = generateWeatherForDate(currentDate);
  console.log('Current weather:', weather);

  // Test advancing time
  const originalTime = game.time.worldTime;
  await SimpleCalendar.api.changeDate({
    year: 2024,
    month: 11,
    day: 25,
    hour: 12,
    minute: 0,
    second: 0,
  });

  const newDate = SimpleCalendar.api.currentDateTime();
  console.log('Date change successful:', newDate);

  // Restore original time
  await game.time.advance(originalTime - game.time.worldTime);
}
```

## 📊 Data Migration

### Exporting Simple Calendar Data

#### Configuration Export

```javascript
// Export Simple Calendar settings
function exportSimpleCalendarConfig() {
  const config = game.settings.get('foundryvtt-simple-calendar', 'calendar-configuration');
  const notes = game.settings.get('foundryvtt-simple-calendar', 'notes');

  const exportData = {
    timestamp: Date.now(),
    foundryVersion: game.version,
    simpleCalendarVersion: game.modules.get('foundryvtt-simple-calendar')?.version,
    config: config,
    notes: notes,
  };

  const dataStr = JSON.stringify(exportData, null, 2);
  const blob = new Blob([dataStr], { type: 'application/json' });
  const url = URL.createObjectURL(blob);

  const a = document.createElement('a');
  a.href = url;
  a.download = `simple-calendar-export-${Date.now()}.json`;
  a.click();

  URL.revokeObjectURL(url);
}
```

#### Notes Export

```javascript
// Export calendar notes/events
function exportCalendarNotes() {
  const notes = SimpleCalendar.api.getNotes();
  const exportData = {
    timestamp: Date.now(),
    totalNotes: notes.length,
    notes: notes.map(note => ({
      title: note.title,
      content: note.content,
      date: note.date,
      categories: note.categories,
      author: note.author,
      playerVisible: note.playerVisible,
    })),
  };

  // Save to file
  const dataStr = JSON.stringify(exportData, null, 2);
  const blob = new Blob([dataStr], { type: 'application/json' });
  // ... download logic
}
```

### Importing to Seasons & Stars

#### Phase 1: Manual Import

```javascript
// Convert Simple Calendar date format to Seasons & Stars format
function convertDateFormat(scDate) {
  return {
    year: scDate.year,
    month: scDate.month + 1, // Convert from 0-based to 1-based
    day: scDate.day + 1, // Convert from 0-based to 1-based
    weekday: scDate.weekday,
    time: {
      hour: scDate.hour || 0,
      minute: scDate.minute || 0,
      second: scDate.second || 0,
    },
  };
}
```

#### Phase 2: Automated Import (Future)

```javascript
// Automated migration tool (Phase 3)
class MigrationTool {
  async migrateFromSimpleCalendar() {
    const scData = this.exportSimpleCalendarData();
    const ssData = this.convertToSeasonsStarsFormat(scData);
    await this.importToSeasonsStars(ssData);
  }

  convertCalendarConfiguration(scConfig) {
    // Convert calendar definitions
    // Map notes and events
    // Preserve time settings
  }
}
```

## ✅ Compatibility Matrix

### Module Compatibility Status

| Module                   | Status           | Notes                                     |
| ------------------------ | ---------------- | ----------------------------------------- |
| **Simple Weather**       | ✅ Compatible    | Works with compatibility layer            |
| **Calendar/Weather**     | ✅ Compatible    | Basic functions work                      |
| **About Time**           | ⚠️ Partial       | Time controls work, advanced features TBD |
| **SmallTime**            | ✅ Enhanced      | Better integration than SC                |
| **Monks Little Details** | ✅ Compatible    | Time display works                        |
| **Custom Weather**       | ⚠️ Needs Testing | Depends on implementation                 |

### API Compatibility

| Simple Calendar API | Status     | Notes                      |
| ------------------- | ---------- | -------------------------- |
| `currentDateTime()` | ✅ Full    | Direct compatibility       |
| `timestampToDate()` | ✅ Full    | Includes display object    |
| `changeDate()`      | ✅ Full    | Format conversion included |
| `getAllMonths()`    | ✅ Full    | Calendar data access       |
| `getAllWeekdays()`  | ✅ Full    | Calendar data access       |
| `addNote()`         | 🚧 Phase 2 | Placeholder returns false  |
| `getNotes()`        | 🚧 Phase 2 | Returns empty array        |
| `formatDateTime()`  | ✅ Basic   | Limited formatting options |

### Hook Compatibility

| Simple Calendar Hook | Seasons & Stars Equivalent  | Status             |
| -------------------- | --------------------------- | ------------------ |
| `DateTimeChange`     | `seasons-stars:dateChanged` | ✅ Mapped          |
| `Ready`              | `seasons-stars:ready`       | ✅ Mapped          |
| `ClockStartStop`     | Not applicable              | ❌ Not implemented |
| `PrimaryGM`          | Not applicable              | ❌ Not needed      |

## 🔧 Troubleshooting

### Common Issues

#### **Calendar Not Appearing**

```javascript
// Debug checklist
console.log('Seasons & Stars loaded:', !!game.seasonsStars);
console.log('Module enabled:', game.modules.get('seasons-and-stars')?.active);
console.log('Settings registered:', !!game.settings.get('seasons-and-stars', 'activeCalendar'));
```

**Solutions:**

1. Refresh browser after enabling module
2. Check for JavaScript errors in console
3. Verify Foundry v13+ requirement
4. Disable conflicting UI modules temporarily

#### **Weather Module Not Working**

```javascript
// Test compatibility layer
console.log('SimpleCalendar available:', !!window.SimpleCalendar);
console.log('Is compatibility layer:', window.SimpleCalendar?._isSeasonsStarsCompatibility);
console.log('timestampToDate test:', SimpleCalendar.api.timestampToDate(game.time.worldTime));
```

**Solutions:**

1. Ensure Simple Calendar is disabled (conflict)
2. Check that weather module is loading after Seasons & Stars
3. Verify weather module uses standard SC API
4. Test with compatibility test page

#### **Date Format Issues**

```javascript
// Check date format conversion
const scDate = SimpleCalendar.api.currentDateTime();
const ssDate = game.seasonsStars.api.getCurrentDate();

console.log('SC format (0-based):', scDate);
console.log('SS format (1-based):', ssDate);
```

**Solutions:**

1. Module may be using internal SC format - needs update
2. Check if module handles date format conversion
3. Use compatibility layer instead of direct access

#### **Performance Issues**

**Symptoms:**

- Slow date calculations
- UI lag when changing dates
- Memory usage increases

**Solutions:**

1. Disable Simple Calendar if both are running
2. Clear browser cache and restart Foundry
3. Check for infinite loops in date change handlers
4. Reduce frequency of date change hooks

### Debugging Tools

#### **Compatibility Test Console Commands**

```javascript
// Test API availability
game.seasonsStars ? console.log('✅ Seasons & Stars') : console.log('❌ Seasons & Stars');
window.SimpleCalendar ? console.log('✅ SimpleCalendar API') : console.log('❌ SimpleCalendar API');

// Test basic functions
try {
  const date = SimpleCalendar.api.currentDateTime();
  console.log('✅ currentDateTime:', date);
} catch (e) {
  console.log('❌ currentDateTime failed:', e.message);
}

// Test date formatting
try {
  const formatted = SimpleCalendar.api.timestampToDate(game.time.worldTime);
  console.log('✅ Formatted date:', formatted.display);
} catch (e) {
  console.log('❌ timestampToDate failed:', e.message);
}
```

#### **Hook Testing**

```javascript
// Test hook system
let hookReceived = false;

Hooks.once(SimpleCalendar.Hooks.DateTimeChange, () => {
  hookReceived = true;
  console.log('✅ DateTimeChange hook working');
});

// Trigger a small time change
game.seasonsStars.api.advanceMinutes(1).then(() => {
  setTimeout(() => {
    if (!hookReceived) {
      console.log('❌ DateTimeChange hook not received');
    }
  }, 1000);
});
```

## 💖 Support This Project

Enjoying Seasons & Stars? Consider supporting continued development:

[![Patreon](https://img.shields.io/badge/Patreon-Support%20Development-ff424d?style=for-the-badge&logo=patreon)](https://patreon.com/rayners)

Your support helps fund new features, bug fixes, and comprehensive documentation.

## 🔙 Rollback Plan

### If Migration Fails

#### **Immediate Rollback**

1. **Disable Seasons & Stars**: Turn off in module management
2. **Re-enable Simple Calendar**: Activate previous module
3. **Restore Settings**: Simple Calendar settings should be preserved
4. **Check World Time**: Verify current date/time is correct
5. **Test Modules**: Ensure weather modules work again

#### **Data Recovery**

```javascript
// Check if Simple Calendar data is intact
const scConfig = game.settings.get('foundryvtt-simple-calendar', 'calendar-configuration');
const scNotes = game.settings.get('foundryvtt-simple-calendar', 'notes');

console.log('SC Config preserved:', !!scConfig);
console.log('SC Notes preserved:', !!scNotes);
```

#### **Reporting Issues**

If you need to rollback, please report:

1. **Error Messages**: Console errors and warnings
2. **Module List**: All active modules and versions
3. **Use Case**: What you were trying to accomplish
4. **Steps**: Exact migration steps taken
5. **Data**: Export calendar configuration for analysis

### Coexistence Mode

You can run both modules simultaneously for testing:

```javascript
// Check which system is handling calendar functions
function checkCalendarPriority() {
  console.log('=== Calendar System Priority ===');
  console.log('Seasons & Stars active:', !!game.seasonsStars);
  console.log('Simple Calendar active:', !!game.modules.get('foundryvtt-simple-calendar')?.active);
  console.log(
    'SimpleCalendar API source:',
    window.SimpleCalendar?._isSeasonsStarsCompatibility ? 'Seasons & Stars' : 'Simple Calendar'
  );
}
```

**Best Practices for Coexistence:**

1. Test with low-stakes world first
2. Keep detailed notes of any issues
3. Have players test basic calendar functions
4. Monitor performance and memory usage
5. Plan specific timeframe for decision

---

**Need Migration Help?** Join our [GitHub Discussions](https://github.com/your-username/seasons-and-stars/discussions) or ask in the Foundry Discord `#modules` channel with the tag `@seasons-and-stars`.
