# Seasons & Stars: Custom Calendar Editor

A standalone package for creating, editing, importing, and exporting custom calendars for the Seasons & Stars timekeeping system.

## Features

### Calendar Creation & Editing

- **Wizard-guided creation**: Step-by-step interface for building calendars from scratch
- **Full calendar editor**: Modify all aspects of calendar configuration
- **Calendar variants**: Create themed variations of existing calendars
- **Real-time validation**: Immediate feedback on configuration issues
- **Live preview**: See calendar render as you build it

### Import & Export

- **Format support**: Both Seasons & Stars and Simple Calendar JSON formats
- **Auto-detection**: Automatically identify calendar format during import
- **File management**: Native Foundry FilePicker integration for seamless file handling
- **Export options**: Formatted JSON download for sharing calendars

### Calendar Management

- **Custom storage**: Save and load user-created calendars in world settings
- **Integration**: Seamlessly adds custom calendars to S&S calendar selection
- **Variant creation**: Create multiple themed versions from base calendars
- **Backup & restore**: Export calendar collections for backup purposes

## Installation

This package requires the Seasons & Stars core module to be installed and active.

1. Install Seasons & Stars core module
2. Install this Custom Calendar Editor package
3. Both modules will appear in your module list
4. Enable both modules in your world

## Usage

### Creating a New Calendar

1. Open the Seasons & Stars calendar selection dialog
2. Click "Create Calendar" in the custom calendar toolbar
3. Follow the wizard steps:
   - **Basic Info**: Name and description
   - **Time Config**: Hours, minutes, seconds per day
   - **Months**: Month names and day counts
   - **Weekdays**: Day names and abbreviations
   - **Advanced**: Leap years, intercalary days, seasons, moons
   - **Review**: Preview and save

### Editing Existing Calendars

1. In the calendar selection dialog, custom calendars show edit buttons
2. Click the edit button (pencil icon) on any custom calendar
3. Use the full editor interface to modify any aspect
4. Save changes when complete

### Importing Calendars

1. Click "Import Calendar" in the calendar selection toolbar
2. Use the file picker to select a JSON calendar file
3. The system will auto-detect the format (S&S or Simple Calendar)
4. Preview the imported calendar and adjust the name if needed
5. Confirm import to add it to your calendar collection

### Exporting Calendars

1. Click the export button (download icon) on any custom calendar
2. Choose to copy to clipboard or download as file
3. Share the JSON file with other users or keep as backup

### Creating Calendar Variants

1. Click the variant button (copy icon) on any calendar
2. The editor opens with a copy of the base calendar
3. Modify aspects like name, colors, or seasonal details
4. Save as a new calendar variant

## Technical Details

### Architecture

- **Standalone package**: Independent of core S&S module for separate releases
- **ApplicationV2**: Uses modern Foundry application framework
- **TypeScript**: Full type safety with comprehensive interfaces
- **SCSS styling**: Foundry design language compliance
- **Modular design**: Clean separation of concerns

### File Structure

```
packages/custom-calendar-editor/
├── src/
│   ├── core/           # Core functionality
│   ├── ui/             # User interface components
│   ├── types/          # TypeScript type definitions
│   └── module.ts       # Main entry point
├── templates/          # Handlebars templates
├── styles/            # SCSS stylesheets
├── lang/              # Localization files
└── dist/              # Built module files
```

### Integration Points

- **S&S Calendar Manager**: Registers custom calendars via API
- **Calendar Selection Dialog**: Adds management toolbar and calendar actions
- **World Settings**: Stores custom calendars in world-scoped settings
- **Validation System**: Uses S&S validation engine for calendar verification

## API Reference

The module exposes a global API at `game.customCalendarEditor`:

```javascript
// Storage operations
game.customCalendarEditor.storage.saveCustomCalendar(calendar);
game.customCalendarEditor.storage.getCustomCalendar(id);
game.customCalendarEditor.storage.deleteCustomCalendar(id);

// UI operations
game.customCalendarEditor.openCreationWizard();
game.customCalendarEditor.openEditor(calendarId);
game.customCalendarEditor.openImportDialog();
game.customCalendarEditor.openExportDialog(calendarId);

// Import/export operations
game.customCalendarEditor.importExport.importFromJSON(jsonString);
game.customCalendarEditor.importExport.showExportDialog(calendar);
```

## Compatibility

### Format Support

- **Seasons & Stars**: Full native support for all features
- **Simple Calendar**: Import with automatic conversion and format bridging
- **Conversion notes**: Some advanced Simple Calendar features may be simplified

### System Requirements

- **Foundry VTT**: v13+
- **Seasons & Stars Core**: v0.9.0+
- **Browser**: Modern browsers with ES2020 support

## Development

### Building

```bash
npm run build        # Build the package
npm run watch        # Watch mode for development
npm run typecheck    # TypeScript validation
```

### Architecture Principles

- **Independent releases**: Separate from core S&S versioning
- **Extensible design**: Easy to add new calendar formats
- **User-focused**: Intuitive workflows for calendar creation
- **Integration-friendly**: Clean APIs for external module integration

## Changelog

See [CHANGELOG.md](./CHANGELOG.md) for version history and updates.

## License

MIT License - See [LICENSE](./LICENSE) for details.
