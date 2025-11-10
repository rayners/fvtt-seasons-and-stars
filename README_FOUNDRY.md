# 🌟 Seasons & Stars

_Calendar and Timekeeping for Foundry VTT v13+_

[![Support on Patreon](https://img.shields.io/badge/Patreon-Support%20Development-ff424d?style=flat-square&logo=patreon)](https://patreon.com/rayners)

![Main Calendar Widget](docs/Main%20widget.png)

## Calendar Management for Your Campaigns

Seasons & Stars provides calendar and timekeeping functionality for Foundry VTT games. Built for Foundry v13+, it offers date tracking, seasonal awareness, and time management tools for your campaigns.

## Designed For

- **GMs** who need time tracking in their campaigns
- **Players** who want to see current dates and plan activities
- **Campaigns** with travel, downtime, or seasonal storytelling
- **Users** migrating from Simple Calendar

## Features

### **Calendar Interface**

![Mini Widget with Configuration Menu](docs/Mini%20widget%20with%20configuration%20menu.png)

- **Main Calendar**: Monthly view with navigation controls and note indicators
- **Customizable Mini Widget**: Compact display with right-click context menu for toggling display options (time, weekday, moon phases, time controls, extension buttons), plus drag-and-drop positioning with pin/unpin functionality
- **Real-Time Time Advancement**: Automatic time progression with pause/resume controls synced to game pause
- **Clean Design**: Minimal interface that integrates with Foundry themes

### **Calendar Systems**

![Calendar Builder](docs/Calendar%20builder.png)

- **16+ Available Calendars**: Core module includes Gregorian and basic calendars
- **Fantasy Calendar Pack**: D&D settings (Forgotten Realms, Greyhawk, Eberron, Dark Sun), Critical Role (Exandrian), Warhammer, and more
- **Sci-Fi Calendar Pack**: Star Trek, Starfinder, Traveller, and other science fiction settings
- **Pathfinder 2e Pack**: Golarion calendar variants with PF2e system integration
- **Calendar Builder**: Visual JSON editor for creating and editing custom calendars (separate module)
- **Calendar Switching**: Switch between calendar systems anytime without world restart
- **Moon Phase Tracking**: Multi-moon support with accurate phase calculations

### **Time Management**

![Mini Widget with Extensions](docs/Mini%20widget%20with%20weather%20and%20builder.png)

- **Foundry Integration**: Uses Foundry's native `game.time.worldTime`
- **Configurable Quick Time Buttons**: Customizable time advancement with live preview
- **Real-Time Mode**: Toggle automatic time progression with intuitive play/pause controls
- **Game Pause Sync**: Automatically pauses time advancement when game is paused
- **Season Display**: Shows current season based on calendar configuration
- **Notes System**: Create calendar notes with categories and tags (editing limited to basic journal interface)

### **Migration Support**

- **Simple Calendar Transition**: Designed to work alongside existing Simple Calendar setups
- **Compatibility Bridge**: Separate [Simple Calendar Compatibility Bridge](https://foundryvtt.com/packages/foundryvtt-simple-calendar-compat) module maintains backward compatibility
- **Migration Tools**: Calendar builder and import utilities help transition existing calendar data

## Getting Started

### Installation

1. **Install Core Module**: Search for "Seasons & Stars" in the Foundry package manager
2. **Optional Packs**: Install calendar packs for your game setting:
   - **Fantasy Calendar Pack** - D&D, Pathfinder, Critical Role calendars
   - **Sci-Fi Calendar Pack** - Star Trek, Starfinder, Traveller calendars
   - **Pathfinder 2e Pack** - PF2e system integration
   - **Calendar Builder** - Visual calendar editor
3. **Enable in World**: Activate the modules in your world settings
4. **Select Calendar**: Choose a calendar system from module settings

### Basic Usage

1. Click the calendar button in the journal notes controls (left sidebar)
2. GMs can click dates to set world time, or use quick time buttons
3. Toggle real-time mode with the play/pause button for automatic time progression
4. Right-click the mini widget to customize display options
5. Create notes by clicking the + button on calendar dates (GM only)

_Note: If migrating from Simple Calendar, install the [Simple Calendar Compatibility Bridge](https://foundryvtt.com/packages/foundryvtt-simple-calendar-compat) module._

## Game System Compatibility

Designed to work with most game systems, including:

- D&D 5th Edition
- Pathfinder 2e
- Dragonbane
- Forbidden Lands
- Simple Worldbuilding

_Note: This is an alpha release. Testing has been focused on D&D 5e, Pathfinder 2e, and selected other systems listed above._

## Module Integration

### **SmallTime**

The mini widget automatically positions alongside SmallTime with drag-and-drop support and persistent storage. Time display intelligently hides when SmallTime is present (configurable).

### **Simple Weather**

Compatible with Simple Weather through the [Simple Calendar Compatibility Bridge](https://foundryvtt.com/packages/foundryvtt-simple-calendar-compat) module.

### **Developer API**

Provides clean integration APIs for other modules:

```javascript
// Access current date
const date = game.seasonsStars.api.getCurrentDate();

// Advance time
await game.seasonsStars.api.advanceDays(1);

// Listen for changes
Hooks.on('seasons-stars:dateChanged', data => {
  console.log('Date changed:', data.newDate);
});
```

See the [Developer Guide](https://github.com/rayners/fvtt-seasons-and-stars/blob/main/docs/DEVELOPER-GUIDE.md) for complete API reference.

## Documentation

- **User Guide**: [docs.rayners.dev/seasons-and-stars](https://docs.rayners.dev/seasons-and-stars/intro)
- **Migration Guide**: Documentation for transitioning from Simple Calendar
- **API Documentation**: Reference for module developers
- **Support**: GitHub Discussions for questions and feedback

## Community & Support

- **Discord**: Chat with the development team and other GMs in the [Seasons & Stars server](https://discord.gg/tqZnxAdEqE).
- **GitHub**: File bug reports or feature requests via [Issues](https://github.com/rayners/fvtt-seasons-and-stars/issues) and [Discussions](https://github.com/rayners/fvtt-seasons-and-stars/discussions).

## Available Modules

| Module                    | Description                          |
| ------------------------- | ------------------------------------ |
| **Seasons & Stars**       | Core calendar system (required)      |
| **Fantasy Calendar Pack** | Fantasy RPG calendars (optional)     |
| **Sci-Fi Calendar Pack**  | Science fiction calendars (optional) |
| **Pathfinder 2e Pack**    | PF2e integration (optional)          |
| **Calendar Builder**      | Visual calendar editor (optional)    |

All optional packs require the core Seasons & Stars module.

## Development Status

**Active Development**: This module is stable and ready for use. New features are added regularly. Please report issues and provide feedback through GitHub.

## Development Notes

This module is developed with AI assistance (Claude/Anthropic) to help with coding, testing, and documentation. This allows faster development cycles and quicker responses to community feedback. All code is reviewed and tested before release.

**Transparency**: You may see AI credited as co-author in development commits. This reflects the collaborative development process while maintaining human oversight and quality control.

**Learn more**: [Development Process Details](https://www.patreon.com/posts/how-and-why-i-ai-132316710)

Want a deeper look at the standards, prompts, and guardrails involved? Check out the companion documentation repository [rayners/dev-context](https://github.com/rayners/dev-context) for an overview of how AI collaboration fits into development.

## Support Development

Love this module? Consider supporting continued development on **[Patreon](https://patreon.com/rayners)**. Your support helps fund new features, bug fixes, and comprehensive documentation.

---

_A calendar solution for Foundry VTT v13+ games_
