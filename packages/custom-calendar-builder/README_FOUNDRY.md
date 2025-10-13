# Seasons & Stars - Calendar Builder

A companion tool for the Seasons & Stars module that provides a user-friendly interface for creating and editing custom calendar definitions.

## Overview

The Calendar Builder is a standalone FoundryVTT module that provides a graphical interface for creating, editing, and validating custom calendar JSON definitions for use with the Seasons & Stars module. It simplifies the process of defining complex calendar systems without requiring manual JSON editing.

## Features

- **JSON Editor**: Create and modify calendar definitions with syntax highlighting
- **JSON Import/Export**: Import existing calendar definitions and export your creations
- **Real-time Validation**: Automatic validation against the Seasons & Stars calendar schema
- **Schema Compliance**: Ensures all created calendars are compatible with Seasons & Stars
- **Edit Existing Calendars**: Load and modify existing calendar JSON files

## Installation

### Requirements

- FoundryVTT v13 or later
- Seasons & Stars module v0.17.0 or later

### Installation Steps

1. Install the Seasons & Stars module if not already installed
2. Install this Calendar Builder module through the FoundryVTT module manager
3. Enable both modules in your world

## Usage

### Opening the Calendar Builder

Look for the Calendar Builder button (hammer icon) in the Seasons & Stars widget toolbar. Click the button to open the Calendar Builder interface.

### Creating a New Calendar

1. Click "New Calendar" to start with a blank calendar template
2. Edit the calendar JSON directly in the editor with syntax highlighting
3. Use "Validate JSON" to check your calendar definition as you work
4. Export the validated JSON for use with Seasons & Stars

### Editing Existing Calendars

1. Click "Open Calendar" to browse for a calendar JSON file
2. Navigate to your calendar file location (e.g., `modules/seasons-and-stars/calendars/`)
3. Select the calendar JSON file to load it into the editor
4. Make your modifications in the JSON editor
5. Validate and export the updated definition

### Importing Calendar Definitions

1. Click "Import JSON" to load a calendar from a file
2. Select your calendar JSON file
3. The editor will load the definition for editing
4. Validate to ensure compatibility

### Exporting Calendar Definitions

1. Create or edit your calendar definition
2. Click "Export JSON" when ready
3. Save the file to your desired location
4. Use the exported file with Seasons & Stars

## Validation

The Calendar Builder validates your calendar definitions against the Seasons & Stars schema, checking:

- Required fields are present
- Data types are correct
- Month and day counts are valid
- Intercalary day definitions are properly formatted
- Era and epoch configurations are valid

Validation errors will be displayed in the interface with specific guidance on what needs to be corrected.

## Calendar Format Reference

For detailed information about creating calendar definitions, see the main Seasons & Stars documentation:

- **[Calendar Pack Development Guide](https://github.com/rayners/fvtt-seasons-and-stars/blob/main/docs/CALENDAR-PACK-GUIDE.md)** - Complete guide to calendar JSON format with examples
- **[JSON Schema Documentation](https://github.com/rayners/fvtt-seasons-and-stars/blob/main/shared/schemas/README.md)** - Detailed schema validation rules and structure
- **Example Calendars** - See the core module's `calendars/` directory for working examples

## 💬 Community & Support

- **Discord**: Join the Seasons & Stars community on [discord.gg/tqZnxAdEqE](https://discord.gg/tqZnxAdEqE) for questions, feedback, and support
- **GitHub Issues**: https://github.com/rayners/fvtt-seasons-and-stars/issues
- **GitHub Discussions**: https://github.com/rayners/fvtt-seasons-and-stars/discussions

## 🤖 Development Transparency

### AI-Assisted Development

This module is developed with the help of AI tools, particularly Claude (Anthropic's large language model). As a solo developer juggling planning, coding, documentation, and testing, AI helps me:

- **Move faster**: Generate boilerplate code and tests so I can focus on design decisions
- **Debug efficiently**: Work through edge cases without getting stuck for hours
- **Write better docs**: Create clear user guides and API documentation
- **Test thoroughly**: Generate regression tests to prevent bugs from creeping back
- **Respond quicker**: Faster turnarounds on updates and community feedback

**What this means for you**: More frequent updates, better documentation, and faster responses to issues and feature requests.

**What it doesn't mean**: I don't just ship whatever AI generates. Every line of code is reviewed, tested, and refined. Think of AI as a very helpful assistant, not an autopilot - I'm often correcting and redirecting it throughout the development process.

You'll see Claude credited as a co-author in commits because it genuinely contributes to the development process. Transparency matters, and I want to be open about the tools that help make this module possible.

**Learn more**: [How and Why I Use AI in Development](https://www.patreon.com/posts/how-and-why-i-ai-132316710)

Curious about the broader workflow, guardrails, and review process? The companion repository [rayners/dev-context](https://github.com/rayners/dev-context) documents the standards and practices that guide this AI-assisted development approach.

## License

MIT License - See LICENSE file for details

## Credits

**Author**: David Raynes (rayners)

Part of the Seasons & Stars project for FoundryVTT.
