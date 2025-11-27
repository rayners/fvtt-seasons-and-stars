# Seasons & Stars - D&D 5e Pack

Integration pack for Seasons & Stars that provides seamless calendar coordination with the D&D 5th Edition game system.

## Features

- **Calendar Integration**: Registers Seasons & Stars calendars with the dnd5e system calendar API
- **Date/Time Formatting**: Provides custom formatters for date and time display
- **Bidirectional Sync**: Calendar changes in Seasons & Stars are reflected in dnd5e displays
- **Sunrise/Sunset Support**: Integrates with dnd5e's sunrise/sunset event system

## Requirements

- Foundry VTT v13+
- D&D 5th Edition System v4.0.0+
- Seasons & Stars Core Module v0.8.0+

## Installation

1. Install the Seasons & Stars core module
2. Install this integration pack
3. Enable both modules in your world

## How It Works

This module integrates with the dnd5e system's calendar API introduced in version 4.0. It:

1. Listens to the `dnd5e.setupCalendar` hook during initialization
2. Registers Seasons & Stars as a calendar provider
3. Provides custom date/time formatters based on the active S&S calendar
4. Synchronizes calendar changes between S&S and the dnd5e system

## API Integration

The module hooks into the following dnd5e calendar APIs:

- `CONFIG.DND5E.calendar.calendars` - Calendar registration
- `CONFIG.DND5E.calendar.formatters` - Date/time formatting
- `dnd5e.setupCalendar` hook - Initialization
- `updateWorldTime` hook enhancements - Time change events

## Seasons & Stars Hooks

This module listens to core Seasons & Stars hooks:

- `seasons-stars:dnd5e:systemDetected` - System initialization
- `seasons-stars:calendarChanged` - Calendar selection changes
- `seasons-stars:dateChanged` - Time/date updates
- `seasons-stars:ready` - Module ready state

## License

MIT License - See LICENSE file for details.
