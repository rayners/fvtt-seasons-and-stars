# Seasons & Stars Development Roadmap

> **A calendar and timekeeping solution for Foundry VTT v13+**

This roadmap outlines planned features and development priorities for Seasons & Stars. As an alpha project, timelines are estimates based on community feedback and development capacity.

## 🎯 Project Vision

Seasons & Stars aims to provide a **reliable and extensible** calendar solution for Foundry VTT v13+ with:

- Clean, intuitive user interface built for Foundry v13+
- Comprehensive Simple Calendar compatibility for existing modules
- Rich calendar format supporting diverse fantasy settings
- Performance-optimized architecture for large campaigns

## 📋 Current Status: v0.2.7 Alpha Release

**What's Working Now:**

- ✅ **Core Calendar System**: Date calculations, multiple calendars, Foundry time integration
- ✅ **Foundry v13+ UI**: Calendar widget, mini widget, grid view, calendar selection
- ✅ **15 Built-in Calendars**: Gregorian, D&D settings, PF2e Golarion, Critical Role, Warhammer, and more
- ✅ **Simple Calendar Compatibility**: API compatibility via separate bridge module
- ✅ **SmallTime Integration**: Auto-positioning and visual consistency
- ✅ **Notes System**: Backend API complete with full creation UI (categories, tags, recurring events)
- ⚠️ **Notes Editing**: Limited to basic Foundry journal interface - calendar metadata cannot be modified after creation
- 🧪 **Error Reporting**: Optional Errors and Echoes integration (when module available)
- 🧪 **Memory Integration**: Optional Memory Mage integration (pre-release development module)

**Testing Status:**

- 🧪 **Alpha Quality**: Core calendar features tested and functional
- ⚠️ **Notes System**: Creation UI functional, but editing requires calendar-aware interface for metadata management
- 📊 **Test Coverage**: 72 automated tests passing (10.66% code coverage - primarily calendar engine and basic widget functionality)
- 🔍 **Seeking Feedback**: User testing and bug reports welcome, especially for notes system
- ⚠️ **Known Limitations**: See [Known Issues](KNOWN-ISSUES.md) for current limitations

## 🚀 Planned Development

## 🔄 **Ongoing Foundation Work** (Cross-Release Priorities)

These high-priority initiatives span multiple releases and provide foundational capabilities for the entire ecosystem:

### **🔗 Simple Calendar Feature Parity** ([#52](https://github.com/rayners/fvtt-seasons-and-stars/issues/52)) - **HIGH PRIORITY**

**Status**: Ongoing across multiple releases  
**Goal**: Complete API and feature compatibility with Simple Calendar for seamless migration

**Phase 1 (v0.5.0-v0.6.0)**: Core API compatibility, basic migration tools  
**Phase 2 (v0.7.0-v0.8.0)**: Advanced features, data migration, comprehensive testing  
**Phase 3 (v1.0.0)**: Full parity validation, performance optimization, production readiness

_This foundational work enables the entire Simple Calendar migration strategy and receives high priority across all releases. While final completion targets v1.0.0, incremental compatibility improvements happen in every release._

---

### **v0.5.0 - Calendar Validation and Quality Assurance** (Next Release - **PRIORITY BUMPED**)

**Focus**: Preventing calendar definition bugs that cause runtime errors

- **JSON Schema Validation Tool**: Comprehensive calendar format validation to prevent bugs like Issue #83 ([#81](https://github.com/rayners/fvtt-seasons-and-stars/issues/81)) - **HIGH PRIORITY**
- **Build-time Calendar Validation**: Catch incomplete calendar definitions before release
- **Calendar Format Documentation**: Complete schema specification for calendar creators
- **Lazy Calendar Loading**: Only load required calendars to improve startup performance and reduce errors ([#25](https://github.com/rayners/fvtt-seasons-and-stars/issues/25))
- **Moon Phase Tracking**: Basic lunar cycle tracking for lycantropy, curses, and celestial events ([#17](https://github.com/rayners/fvtt-seasons-and-stars/issues/17))
- **Performance Optimization**: Reduced memory usage and faster module initialization

### **v0.6.0 - Notes System Enhancement** (High Priority)

**Focus**: Complete the calendar-aware notes editing system

- **Enable Custom Note Editor**: Activate the existing `NoteEditingDialog` for calendar notes ([#42](https://github.com/rayners/fvtt-seasons-and-stars/issues/42))
- **Enhanced Note Browser**: Dedicated interface for browsing and searching calendar notes with metadata filtering ([#43](https://github.com/rayners/fvtt-seasons-and-stars/issues/43))
- **Note Metadata Management**: Interface for changing categories, tags, and date associations after creation
- **Advanced Notes Features**: Enhanced search UI, bulk operations, and note templates

### **v0.7.0 - Calendar Creation and Import System** (Community Priority)

**Focus**: Calendar creation and migration tools - **HIGHEST COMMUNITY DEMAND**

- **Calendar Editor**: In-app tool for creating custom calendars ([#44](https://github.com/rayners/fvtt-seasons-and-stars/issues/44))
- **Calendar Validation System**: Built-in validation for custom calendar definitions ([#45](https://github.com/rayners/fvtt-seasons-and-stars/issues/45))
- **Migration Wizard**: Step-by-step guide for Simple Calendar users ([#46](https://github.com/rayners/fvtt-seasons-and-stars/issues/46))
- **Simple Calendar Import**: Tools for migrating Simple Calendar configurations and data ([#3](https://github.com/rayners/fvtt-seasons-and-stars/issues/3))
- **Bridge Migration System**: Pre-existing Simple Calendar notes migration ([#2](https://github.com/rayners/fvtt-seasons-and-stars/issues/2))
- **Note Highlighting Sync**: Fix bridge-created notes display issues ([#1](https://github.com/rayners/fvtt-seasons-and-stars/issues/1))

### **v0.8.0 - Enhanced Module Integration** (Future)

**Focus**: Deeper integration with the Foundry ecosystem

- **Enhanced Weather Module Integration**: Deep integration with weather systems ([#47](https://github.com/rayners/fvtt-seasons-and-stars/issues/47))
- **Advanced Event Management System**: Improved recurring events and reminders ([#48](https://github.com/rayners/fvtt-seasons-and-stars/issues/48))
- **Date Context Menus**: Right-click context menus for calendar dates ([#49](https://github.com/rayners/fvtt-seasons-and-stars/issues/49))
- **Module Developer Templates**: Examples for module developers ([#50](https://github.com/rayners/fvtt-seasons-and-stars/issues/50))
- **Comprehensive Developer API Expansion**: More comprehensive developer APIs ([#51](https://github.com/rayners/fvtt-seasons-and-stars/issues/51))

### **v1.0.0 - Stable Release** (Long-term Goal)

**Focus**: Production stability and feature completeness

- **Simple Calendar Parity Completion**: Final validation and production readiness ([#52](https://github.com/rayners/fvtt-seasons-and-stars/issues/52) - _Phase 3_)
- **Comprehensive Testing**: Full compatibility validation ([#53](https://github.com/rayners/fvtt-seasons-and-stars/issues/53))
- **Community Features**: Calendar sharing and collaboration tools ([#54](https://github.com/rayners/fvtt-seasons-and-stars/issues/54))
- **UI/UX Improvements**: Enhanced widget interfaces and user experience refinements ([#35](https://github.com/rayners/fvtt-seasons-and-stars/issues/35))

## 🎮 Game System Support

### **Current Support**

Designed to work with any Foundry VTT game system through two approaches:

**Built-in Calendar Support:**

- **Universal**: Gregorian calendar for modern/sci-fi campaigns
- **D&D Settings**: Intended for Forgotten Realms (Harptos), Greyhawk, Eberron, Dark Sun
- **Pathfinder**: Intended for Golarion (Absalom Reckoning)
- **Other Systems**: Intended for Exandrian (Critical Role), Symbaroum, Warhammer, Forbidden Lands
- **Generic Fantasy**: Vale Reckoning calendar

**System Integration Support:**

- **Pathfinder 2e**: Full integration with PF2e World Clock system, automatic time synchronization, and weekday compatibility fixes
- **Universal Hook Architecture**: `seasons-stars:{system}:systemDetected` hooks for any system to register custom time sources

### **Planned Support**

The extensible system compatibility architecture enables easy addition of new system integrations based on community requests and developer contributions.

## 🐛 Known Limitations

**Current Alpha Limitations:**

- Limited testing with all possible module combinations
- Calendar creation requires JSON editing (editor planned for future)
- Some advanced Simple Calendar features not yet implemented
- Error handling could be more user-friendly

**Compatibility Notes:**

- Designed for Foundry VTT v13+ (may work with v12 but not officially supported)
- Not compatible with Simple Calendar running simultaneously
- Some weather modules may need updates for full compatibility

## 📈 Development Goals

**Current Alpha Status:**

- ✅ Core functionality stable and usable
- ✅ Basic Simple Calendar compatibility working
- ⚠️ **Test Coverage**: Limited coverage (10.66%) - calendar engine well-tested, UI and notes systems need expansion
- 🔍 Community feedback and bug reports
- ⚠️ **Migration Barrier**: Calendar import tools needed for Simple Calendar adoption

**Development Goals by Phase:**

**Phase 2 (Calendar Tools):**

- Successful Simple Calendar migration workflow
- Community calendar creation and sharing
- Reduced migration friction for existing users

**Phase 3+ (Future):**

- Positive community reception and adoption
- Active module developer ecosystem
- Self-sustaining community contributions

## 🤝 How to Contribute

### **For Users**

- **Test and Report**: Try the module and report any issues you find
- **Provide Feedback**: Share your use cases and feature needs
- **Documentation**: Help improve user guides with your experiences
- **Community Support**: Help other users in GitHub discussions

### **For Module Developers**

- **Integration Testing**: Test your modules with Seasons & Stars
- **API Feedback**: Report missing Simple Calendar compatibility features
- **Code Contributions**: Submit bug fixes and improvements
- **Documentation**: Create integration examples and guides

### **For Content Creators**

- **Calendar Design**: Create calendars for different fantasy settings
- **Testing**: Validate calendar accuracy and cultural authenticity
- **Tutorials**: Create video guides and documentation
- **Community Building**: Share with your gaming communities

## 💖 Support Development

Your Patreon support directly helps prioritize roadmap features and accelerate development:

[![Patreon](https://img.shields.io/badge/Patreon-Support%20Development-ff424d?style=for-the-badge&logo=patreon)](https://patreon.com/rayners)

**How Patreon support helps:**

- 🚀 **Feature Prioritization**: Patron requests get priority in the roadmap
- ⚡ **Faster Development**: More time dedicated to module development
- 🔧 **Better Testing**: Resources for comprehensive compatibility testing
- 📚 **Enhanced Documentation**: Professional guides and video tutorials

## 📞 Getting Involved

### **Feedback & Support**

- **GitHub Issues**: Bug reports and feature requests
- **GitHub Discussions**: General questions and community chat
- **Documentation**: [User Guide](docs/USER-GUIDE.md) and [Developer Guide](docs/DEVELOPER-GUIDE.md)

### **Development**

- **Contributing**: See [CONTRIBUTING.md](CONTRIBUTING.md) for development setup
- **Code of Conduct**: Respectful, inclusive community participation
- **License**: MIT license for open source collaboration

## ⚠️ Alpha Software Notice

**Important**: Seasons & Stars is currently in alpha development. While functional for testing and feedback:

- Features and APIs may change before v1.0
- Backup your world data before testing
- Report issues to help improve stability
- Not recommended for production campaigns yet

**Migration Path**: When ready for production use, migration tools will help transition from Simple Calendar with minimal disruption to existing campaigns.

---

**Ready to help shape Foundry VTT calendar development?** Install the alpha, try it with your campaigns, and let us know how it works for you!
