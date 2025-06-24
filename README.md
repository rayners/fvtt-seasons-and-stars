# Seasons & Stars

A calendar and timekeeping module for Foundry VTT v13+ with clean integration APIs and extensible architecture.

## 🌟 Features

### ✅ **Available Now (Alpha)**

- **Modern UI**: Clean, responsive calendar interface with ApplicationV2 architecture
- **Multiple Calendar Views**: Full calendar widget, compact mini widget, and monthly grid view
- **Configurable Quick Time Buttons**: Customizable time advancement buttons with live preview and smart mini widget selection
- **Smart Year Navigation**: Click year to jump instantly instead of clicking arrows repeatedly
- **Convenient Defaults**: Gregorian calendars can initialize with current date/time
- **Module Integration**: Clean APIs for weather modules and other integrations via compatibility bridges
- **SmallTime Integration**: Seamless positioning and visual consistency with enhanced styling
- **15 Built-in Calendars**: Switch between Gregorian, fantasy calendars (D&D, PF2e, Critical Role, etc.), and custom formats based on official game sources

### ✅ **Notes System (Basic Creation)**

- **Note Creation**: Functional note creation interface via calendar grid (GMs only - click plus button)
- **Visual Indicators**: Calendar shows colored borders for days with notes
- **Backend API**: CRUD operations available for module developers (note editing via API, not UI)
- **Simple Calendar Compatibility**: API compatibility via separate compatibility bridge module

⚠️ **Current Limitations**:

- **Note Editing**: While notes can be created with calendar-specific metadata (categories, tags, dates), editing only opens the basic Foundry journal interface which **cannot modify calendar-specific fields**
- **Metadata Management**: Tags, categories, and date associations cannot be changed after creation
- **Limited UI**: No dedicated note management interface - relies on basic Foundry journal sheets

### 🚧 **Coming Soon**

- **Complete Notes UI**: Note viewing, editing, and management interface
- **Calendar Import/Creation**: In-app calendar editor and Simple Calendar migration tools
- **Advanced Configuration**: Enhanced calendar customization and validation
- **Extended Integrations**: Additional module compatibility and hook enhancements

## 🚀 Quick Start

### Installation

**Option 1: Foundry Module Browser**

1. Install from Foundry VTT module browser: "Seasons & Stars"
2. Enable the module in your world
3. Configure your preferred calendar in module settings

**Option 2: Manual Installation (Pre-Registry)**

1. In Foundry VTT, go to Add-on Modules → Install Module
2. Use manifest URL: `https://github.com/rayners/fvtt-seasons-and-stars/releases/latest/download/module.json`
3. Enable the module in your world

### Basic Usage

- **Open Calendar**: Click the calendar button in scene controls
- **Change Date**: GMs can click on calendar dates to set world time
- **Quick Time Controls**: Use the mini widget for rapid time advancement
- **Calendar Selection**: Switch between different calendar systems anytime

## 📖 Documentation

- **[User Guide](./docs/USER-GUIDE.md)** - Complete usage instructions and calendar sources
- **[Developer Guide](./docs/DEVELOPER-GUIDE.md)** - API reference and integration guide
- **[System Integration Guide](./docs/SYSTEM-INTEGRATION.md)** - Game system compatibility and time source integration
- **[Migration Guide](./docs/MIGRATION-GUIDE.md)** - Moving from Simple Calendar
- **[Roadmap](./docs/ROADMAP.md)** - Development timeline and planned features
- **[Known Issues](./KNOWN-ISSUES.md)** - Current limitations and workarounds

## 🎯 Who Should Use This

### **Beta Testers**

- Module developers wanting to integrate calendar functionality
- GMs who need reliable timekeeping with clean UI
- Communities wanting to test cutting-edge calendar features

### **Migration Candidates**

- Users seeking a calendar solution built for Foundry v13+
- Users wanting enhanced SmallTime integration
- Communities needing custom calendar support

⚠️ **Migration Note**: Simple Calendar users should review [Known Issues](./KNOWN-ISSUES.md) for current migration limitations. Calendar import tools are planned for v0.3.0 to address the primary migration barrier.

## 🤝 Module Integration

Seasons & Stars provides **clean integration APIs** for calendar-aware modules:

```javascript
// Direct API access
const currentDate = game.seasonsStars.api.getCurrentDate();
const worldTime = game.seasonsStars.api.dateToWorldTime(currentDate);
const formatted = game.seasonsStars.api.formatDate(currentDate);

// Hook integration for module updates
Hooks.on('seasons-stars:dateChanged', data => {
  // Respond to date changes in your module
  console.log('Date changed:', data.newDate);
});
```

**Compatibility bridges available** for seamless migration from other calendar systems.

## 📋 Requirements

- **Foundry VTT**: v13 or higher
- **Compatibility**: Intended for all game systems (system-agnostic design)
- **Permissions**: GM required for time changes

## 🔧 Development

### For Module Developers

```javascript
// Access the Seasons & Stars API
const currentDate = game.seasonsStars.api.getCurrentDate();
await game.seasonsStars.api.advanceDays(1);

// Listen for date changes
Hooks.on('seasons-stars:dateChanged', data => {
  console.log('Date changed:', data.newDate);
});
```

See the [Developer Guide](./docs/DEVELOPER-GUIDE.md) for complete API reference.

### Build from Source

```bash
git clone https://github.com/rayners/fvtt-seasons-and-stars
cd fvtt-seasons-and-stars
npm install
npm run build
```

## 🗺️ Roadmap

### **Phase 1: Core Foundation** ✅ _Complete_

- Basic calendar system and UI
- Simple Calendar compatibility layer
- Essential user features

### **Phase 2: Calendar Tools** 🚧 _Next (Q3-Q4 2025)_

- Calendar editor and creation tools
- Simple Calendar import and migration assistant
- Enhanced calendar validation and customization

### **Phase 3: Notes System Enhancement** 📅 _Future_

- Complete notes editing interface
- Advanced note management and search
- Enhanced weather module integration

See the complete [Roadmap](./docs/ROADMAP.md) for detailed timelines.

## 💖 Support This Project

Love using Seasons & Stars? Consider supporting continued development:

[![Patreon](https://img.shields.io/badge/Patreon-Support%20Development-ff424d?style=for-the-badge&logo=patreon)](https://patreon.com/rayners)

Your support helps fund:

- 🚀 **New Features**: Advanced calendar tools and integrations
- 🐛 **Bug Fixes**: Faster resolution of issues and compatibility updates
- 📚 **Documentation**: Comprehensive guides and tutorials
- 🎯 **Community Requests**: Implementation of user-requested features

## 📚 Calendar Information

The 15 built-in calendar systems are designed to work with popular RPG settings including D&D, Pathfinder, Critical Role, and other systems. These implementations focus on practical gameplay functionality and may be simplified from official sources.

⚠️ **Alpha Status**: Calendar data is currently optimized for gameplay functionality. We plan to verify these implementations against official sources soon and add proper citations to the calendar files.

🤝 **Community Contributions Welcome**: We welcome submissions to make calendar configurations more accurate to their official sources. If you have access to official publications and notice discrepancies, please open an issue or submit a pull request with corrections and proper source citations.

## 📄 License

[MIT License](./LICENSE) - Free for personal and commercial use.

## 🐛 Support & Feedback

- **Issues**: [GitHub Issues](https://github.com/rayners/fvtt-seasons-and-stars/issues)
- **Documentation**: [Complete Guides](https://docs.rayners.dev/seasons-and-stars/intro)
- **Discord**: [Foundry VTT Community](https://discord.gg/foundryvtt) - `#modules` channel

---

**Ready to try a calendar system built for Foundry v13+?** Install Seasons & Stars today and help shape its development through feedback and testing!
