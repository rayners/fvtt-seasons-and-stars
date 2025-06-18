# User Guide - Seasons & Stars

A comprehensive guide to using Seasons & Stars for calendar and time management in Foundry VTT.

## 📚 Table of Contents

- [Getting Started](#getting-started)
- [Calendar Views](#calendar-views)
- [Time Management](#time-management)
- [Calendar Selection](#calendar-selection)
- [Settings & Configuration](#settings--configuration)
- [SmallTime Integration](#smalltime-integration)
- [Troubleshooting](#troubleshooting)

## 🚀 Getting Started

### Installation

#### Option 1: Foundry Module Browser (Recommended)
1. Open Foundry VTT and navigate to **Add-on Modules**
2. Search for "Seasons & Stars" in the module browser
3. Click **Install** and enable the module in your world
4. Refresh your browser and the calendar will be available

#### Option 2: Manual Installation via Manifest URL
If the module is not yet available in the browser (during initial release):
1. Open Foundry VTT and navigate to **Add-on Modules**
2. Click **Install Module** at the bottom
3. Paste this manifest URL: `https://github.com/rayners/fvtt-seasons-and-stars/releases/latest/download/module.json`
4. Click **Install** and enable the module in your world
5. Refresh your browser and the calendar will be available

### First Launch
When you first enable Seasons & Stars:
- The module defaults to the **Gregorian calendar**
- If starting a new world, it automatically sets to today's real-world date
- The time widget appears in the UI (can be disabled in settings)

### Permissions
- **Players**: Can view calendar and current date/time
- **GMs**: Can change dates, advance time, and configure calendars
- **Assistant GMs**: Same permissions as GMs

## 📅 Calendar Views

Seasons & Stars provides multiple ways to view and interact with your calendar:

### 1. Full Calendar Widget
The main calendar interface with complete controls.

**Features:**
- Current date display with formatted text
- Quick time advancement buttons (minutes, hours, days, weeks, months)
- Calendar selection dropdown
- "Today" button to jump to current date
- Seasonal and time-of-day indicators

**How to Access:**
- Click the **calendar icon** in Scene Controls (left sidebar)
- Or use the macro: `SeasonsStars.CalendarWidget.show()`

### 2. Mini Widget (SmallTime Integration)
A compact calendar companion that works alongside SmallTime.

**Features:**
- Displays current date in compact format
- Click to open full calendar widget
- Automatically positions relative to SmallTime
- Minimal screen space usage

**Positioning:**
- **With SmallTime**: Appears above SmallTime automatically
- **Without SmallTime**: Positions near player list
- **Responsive**: Adapts to UI changes and window resizing

### 3. Monthly Grid View
Traditional calendar grid for date selection and navigation.

**Features:**
- Full month view with clickable dates
- Previous/next month navigation
- **Year input**: Click the year to jump to any year instantly
- Today indicator with clear "TODAY" label
- Visual distinction for current, selected, and regular dates

**How to Access:**
- Click **"Month Grid"** button in the full calendar widget
- Or use the macro: `SeasonsStars.CalendarGridWidget.show()`

### 4. Calendar Selection Dialog
Browse and switch between available calendars.

**Features:**
- Preview sample dates for each calendar
- Calendar structure information (months, weekdays, leap years)
- Cultural descriptions and settings information
- Easy switching between calendar systems

## ⏰ Time Management

### Advancing Time (GM Only)

#### Quick Time Buttons
Seasons & Stars provides configurable quick time advancement buttons that appear in all calendar widgets.

**Default Button Set:**
- **-1d**: Go back 1 day (rewind)
- **+15m**: Advance 15 minutes 
- **+30m**: Advance 30 minutes
- **+1h**: Advance 1 hour

**Button Types:**
- **Advance Buttons**: Green gradient styling for forward time movement
- **Rewind Buttons**: Red gradient styling for backward time movement  
- **Smart Selection**: Mini widget automatically shows the 3 most relevant buttons

**Where They Appear:**
- **Full Calendar Widget**: Shows all configured buttons
- **Mini Widget**: Shows 3 automatically selected buttons (1 largest negative + 2 smallest positives)
- **Settings Preview**: Live preview when configuring buttons

#### Direct Date Setting
1. Open the **Monthly Grid View**
2. Click on any date to set the world time to that date
3. Confirmation notification shows the new date

#### Year Navigation
1. In Monthly Grid View, click on the **year display**
2. Enter the desired year in the dialog
3. Calendar jumps immediately to that year

### Time Display Formats
Seasons & Stars shows time in multiple formats:
- **Short**: "25 Dec 2024"
- **Long**: "Wednesday, December 25th, 2024 CE at 2:30 PM"
- **Custom**: Based on calendar configuration

### Real-World Date Initialization
For new worlds using the Gregorian calendar:
- Automatically sets to current real-world date and time
- Only applies to worlds with worldTime = 0 (new worlds)
- Only affects Gregorian calendar (not fantasy calendars)

## 🗓️ Calendar Selection

### Built-in Calendars (15 Available)

#### Universal Calendars
- **Gregorian Calendar**: Standard Earth calendar (365/366 days, 12 months, 7-day weeks)
- **Traditional Fantasy Epoch**: Generic fantasy calendar for custom settings

#### D&D Campaign Settings
- **Forgotten Realms**: Harptos calendar with intercalary days
- **Greyhawk**: Common Year calendar with festivals
- **Eberron**: Eberron calendar system
- **Dark Sun**: Athasian calendar
- **D&D 5e Sword Coast**: Variant Harptos calendar

#### Other Fantasy Settings
- **Exandrian**: Critical Role's calendar system
- **Golarion PF2e**: Pathfinder 2e Absalom Reckoning
- **Vale Reckoning**: Generic fantasy calendar
- **Symbaroum**: Symbaroum RPG calendar
- **Forbidden Lands**: Forbidden Lands RPG calendar
- **Warhammer**: Warhammer Fantasy calendar

#### Science Fiction
- **Traveller Imperial**: Traveller RPG Imperial Calendar
- **Starfinder Absalom Station**: Starfinder RPG calendar

### Calendar Information & Status

The calendar systems in Seasons & Stars are designed for practical gameplay use with popular RPG settings. These implementations focus on functionality and may be simplified from official sources. See the [Calendar Information](#calendar-information) section for current status and how to contribute improvements.

### Switching Calendars
1. Click **"Select Calendar"** in the full calendar widget
2. Browse available calendars with previews
3. Click **"Select"** to switch immediately
4. All existing world time is preserved and converted

### Custom Calendars
*(Coming in Phase 2)*
- Import custom calendar JSON files
- Create calendars with the in-app editor
- Share calendars with your community

## ⚙️ Settings & Configuration

### Module Settings
Access via **Game Settings → Module Settings → Seasons & Stars**:

#### Client Settings
- **Show Time Widget**: Toggle mini widget visibility
- **Widget Position**: Control automatic positioning behavior

#### World Settings (GM Only)
- **Active Calendar**: Choose which calendar system to use
- **Default View**: Set preferred calendar view
- **Time Format**: Configure date/time display options
- **Quick Time Buttons**: Configure time advancement buttons (see [Quick Time Button Configuration](#quick-time-button-configuration))

### Calendar Configuration
Each calendar includes:
- **Year Settings**: Epoch, naming conventions, starting weekday
- **Month Configuration**: Names, lengths, descriptions
- **Weekday Setup**: Names and cultural significance
- **Leap Year Rules**: Gregorian, custom intervals, or none
- **Time Structure**: Hours per day, minutes per hour, seconds per minute

### Quick Time Button Configuration

Customize the time advancement buttons that appear in all calendar widgets.

#### Accessing Button Settings
1. Navigate to **Game Settings → Module Settings → Seasons & Stars**
2. Find the **Quick Time Buttons** setting
3. Enter your desired button configuration in the text field
4. View the live preview below the setting
5. Save settings to apply changes

#### Button Format
Enter time values as a comma-separated list. Supports:
- **Days**: `1d`, `7d`, `-1d` (positive advances, negative rewinds)
- **Weeks**: `1w`, `2w`, `-1w` 
- **Hours**: `1h`, `8h`, `-2h`
- **Minutes**: `15m`, `30m`, `-15m`

#### Examples
```
Default: -1d, 15m, 30m, 1h
Rest-focused: -8h, 1h, 8h, 1d
Travel campaign: -1d, 6h, 1d, 1w
Quick sessions: 10m, 30m, 1h, 4h
```

#### Mini Widget Selection
The mini widget automatically selects the 3 most relevant buttons:
- **1 rewind button**: Largest negative value (e.g., `-1d` from `-1d, -1h`)
- **2 advance buttons**: Smallest positive values (e.g., `15m, 30m` from `15m, 30m, 1h, 1d`)
- **Smart filtering**: Ensures the most useful buttons for compact display

#### Visual Styling
- **Advance buttons**: Green gradient background with fa-clock icon
- **Rewind buttons**: Red gradient background with fa-backward icon  
- **Consistent appearance**: Same styling across all widgets and settings preview
- **Theme integration**: Uses Foundry CSS variables for automatic theme compatibility

## 🕐 SmallTime Integration

Seasons & Stars works seamlessly with the SmallTime module:

### Automatic Features
- **Smart Positioning**: Mini widget appears above SmallTime
- **Visual Consistency**: Matches SmallTime's styling
- **Responsive Layout**: Adapts to SmallTime movement
- **No Conflicts**: Both modules work together perfectly

### Manual Configuration
If automatic positioning doesn't work:
1. Disable auto-positioning in settings
2. Use CSS to manually position the mini widget
3. Or disable the mini widget and use only the full calendar

### Without SmallTime
- Mini widget positions near the player list
- Standalone mode with consistent styling
- All features work normally

## 💖 Support This Project

Enjoying Seasons & Stars? Consider supporting continued development:

[![Patreon](https://img.shields.io/badge/Patreon-Support%20Development-ff424d?style=for-the-badge&logo=patreon)](https://patreon.com/rayners)

Your support helps fund new features, bug fixes, and comprehensive documentation.

## 🛠️ Troubleshooting

### Common Issues

#### Calendar Not Appearing
**Solution:**
1. Check that the module is enabled
2. Verify you're using Foundry v13 or higher
3. Try refreshing the browser
4. Check browser console for errors

#### Date Changes Not Working
**Possible Causes:**
- User lacks GM permissions
- Simple Calendar is conflicting
- Time is paused in Foundry

**Solution:**
1. Ensure you have GM rights
2. Disable conflicting calendar modules
3. Check Foundry's time controls

#### Mini Widget Positioning Issues
**Solution:**
1. Try refreshing the page
2. Toggle the widget off and on in settings
3. Check for UI module conflicts
4. Use manual positioning if needed

#### SmallTime Integration Problems
**Solution:**
1. Ensure both modules are up to date
2. Check module load order (Seasons & Stars should load after SmallTime)
3. Try disabling other UI modules temporarily

### Performance Tips
- **Large Years**: Using very large year numbers may slow calculations
- **Multiple Widgets**: Only keep necessary widgets open
- **Browser Cache**: Clear cache if experiencing strange behavior

#### Bridge Integration Issues
If you're using compatibility bridges (e.g., Simple Weather with Simple Calendar Compatibility Bridge):

**Notes Not Highlighting in Calendar:**
- Some external modules may create notes that don't immediately appear as highlighted dates
- **Theoretical Fix** (⚠️ **UNTESTED**): Run in browser console (F12):
  ```javascript
  // WARNING: This workaround is untested and may not work
  game.seasonsStars.notes.storage.rebuildIndex();
  window.SeasonsStars.CalendarGridWidget.getInstance()?.render();
  ```
- **Better Approach**: Run diagnostic script first (see Known Issues)
- **Details**: See [Known Issues](../KNOWN-ISSUES.md) for full explanation

**Simple Weather Integration:**
- Weather data may appear in journal but not show date highlighting
- Try the untested console fix above after advancing time (no guarantee it works)
- This is a known limitation during beta testing - proper fix requires bridge enhancement

### Getting Help
1. **Check Console**: F12 → Console for error messages
2. **Module Conflicts**: Temporarily disable other modules to test
3. **Known Issues**: Review [Known Issues](../KNOWN-ISSUES.md) for documented limitations
4. **Report Issues**: Use GitHub Issues with error details and module list
5. **Community Support**: Ask in Foundry Discord #modules channel

## 📋 Keyboard Shortcuts

### Widget Switching
- **Alt + S**: Toggle default widget (configurable in settings)
- **Alt + Shift + S**: Toggle mini widget
- **Alt + Ctrl + S**: Toggle grid widget
- **Alt + Shift + Ctrl + S**: Toggle main widget
- **Escape**: Close open calendar dialogs

*(Note: Additional keyboard shortcuts for time advancement planned for future updates)*

## 🎯 Best Practices

### For GMs
1. **Set Expectations**: Tell players which calendar system you're using
2. **Document Important Dates**: Use notes system (when available) for events
3. **Regular Updates**: Advance time consistently during sessions
4. **Calendar Context**: Share calendar descriptions with players

### For Players
1. **Track Time**: Pay attention to date changes during gameplay
2. **Plan Ahead**: Use calendar for scheduling character activities
3. **Seasonal Awareness**: Consider how seasons affect your character
4. **Time-Sensitive Activities**: Remember spell durations and rest requirements

### For Module Developers
1. **Hook Integration**: Use `seasons-stars:dateChanged` for time-sensitive features
2. **API Usage**: Prefer Seasons & Stars API over direct time manipulation
3. **Compatibility**: Test with both Seasons & Stars and Simple Calendar
4. **Error Handling**: Gracefully handle calendar system changes

## 📚 Calendar Information

### Current Implementation Status

The calendar systems in Seasons & Stars are designed to provide functional timekeeping for popular RPG settings. These implementations were created to support gameplay and may be simplified from official sources.

⚠️ **Current Status**: Calendar implementations focus on gameplay functionality and may not be fully verified against official sources. We plan to add proper source verification and citations soon.

### Available Calendar Systems

#### D&D Campaign Settings
- **Forgotten Realms**: Calendar of Harptos with twelve 30-day months and festival days
- **D&D 5e Sword Coast**: Variant of Calendar of Harptos for current era
- **Greyhawk**: Common Year calendar system
- **Eberron**: Galifar Calendar with dragonmark-themed months
- **Dark Sun**: Athasian Calendar system

#### Other Fantasy Settings
- **Exandrian**: Critical Role campaign calendar
- **Golarion**: Pathfinder Absalom Reckoning calendar
- **Symbaroum**: Free League Publishing setting calendar
- **Forbidden Lands**: Free League Publishing setting calendar
- **Warhammer Fantasy**: Imperial Calendar system
- **Vale Reckoning**: Original fantasy calendar design

#### Science Fiction Settings
- **Traveller**: Imperial Calendar for the Third Imperium
- **Starfinder**: Absalom Station Calendar system

#### Universal Calendars
- **Gregorian**: Standard Earth calendar
- **Traditional Fantasy Epoch**: Generic fantasy calendar

### Source Verification Plan

📋 **Upcoming Improvements**:
1. **Official Source Verification**: Cross-reference calendar details with official publications
2. **Citation Addition**: Add proper source citations to calendar files
3. **Community Validation**: Work with community to verify accuracy
4. **Documentation Updates**: Provide links to official sources where available

🤝 **Community Help Welcome**: If you have access to official RPG publications and notice calendar discrepancies, please report them via GitHub issues with source references.

---

**Need more help?** Check the [Developer Guide](./DEVELOPER-GUIDE.md) for technical details or visit our [GitHub Discussions](https://github.com/your-username/seasons-and-stars/discussions) for community support.