# Seasons & Stars Development Roadmap

> **A calendar and timekeeping solution for Foundry VTT v13+**

This roadmap outlines planned features and development priorities for Seasons & Stars. As an alpha project, timelines are estimates based on community feedback and development capacity.

## 🎯 Project Vision

Seasons & Stars aims to provide a **reliable and extensible** calendar solution for Foundry VTT v13+ with:

- Clean, intuitive user interface built for Foundry v13+
- Comprehensive Simple Calendar compatibility for existing modules
- Rich calendar format supporting diverse fantasy settings
- Performance-optimized architecture for large campaigns

## 📋 Current Status: v0.2.3 Alpha Release

**What's Working Now:**

- ✅ **Core Calendar System**: Date calculations, multiple calendars, Foundry time integration
- ✅ **Modern UI**: Calendar widget, mini widget, grid view, calendar selection
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

### **v0.3.0 - Calendar Creation and Import System** (Next Release - High Priority)

**Focus**: Calendar creation and migration tools

- **Calendar Editor**: In-app tool for creating custom calendars
- **Simple Calendar Import**: Tools for migrating Simple Calendar configurations and data
- **Calendar Validation**: Built-in validation for custom calendar definitions
- **Migration Wizard**: Step-by-step guide for Simple Calendar users

### **v0.4.0 - Notes System Enhancement** (Future)

**Focus**: Complete the calendar-aware notes editing system

- **Calendar-Aware Note Editor**: Custom editing dialog that preserves calendar metadata (categories, tags, dates)
- **Note Metadata Management**: Interface for changing categories, tags, and date associations after creation
- **Note Management UI**: Proper calendar-integrated editing and deletion interface
- **Enhanced Note Browser**: Dedicated interface for browsing and searching calendar notes with metadata filtering
- **Advanced Notes Features**: Enhanced search, bulk operations, and note templates

### **v0.5.0 - Enhanced Module Integration** (Future)

**Focus**: Deeper integration with the Foundry ecosystem

- **Weather Module Support**: Enhanced integration with weather systems
- **Advanced Event Management**: Improved recurring events and reminders
- **API Expansion**: More comprehensive developer APIs
- **Module Templates**: Examples for module developers
- **UI/UX Improvements**: Enhanced widget interfaces and user experience refinements ([#35](https://github.com/rayners/fvtt-seasons-and-stars/issues/35))
- **Date Context Menus**: Right-click context menus for calendar dates with additional actions and information

### **v1.0.0 - Stable Release** (Future)

**Focus**: Production stability and feature completeness

- **Feature Parity**: Complete Simple Calendar compatibility
- **Comprehensive Testing**: Full compatibility validation
- **Performance Optimization**: Memory and speed improvements
- **Community Features**: Calendar sharing and collaboration tools

## 🎮 Game System Support

### **Current Support**

All features work with any Foundry VTT game system, with built-in calendars for:

- **Universal**: Gregorian calendar for modern/sci-fi campaigns
- **D&D Settings**: Forgotten Realms (Harptos), Greyhawk, Eberron, Dark Sun
- **Pathfinder**: Golarion (Absalom Reckoning)
- **Other Systems**: Exandrian (Critical Role), Symbaroum, Warhammer, Forbidden Lands
- **Generic Fantasy**: Vale Reckoning calendar

### **Planned Support**

Future releases may include enhanced system-specific features and additional calendar formats based on community requests.

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

## 📈 Success Metrics

**Current Alpha Status:**

- ✅ Core functionality stable and usable
- ✅ Basic Simple Calendar compatibility working
- ⚠️ **Test Coverage**: Limited coverage (10.66%) - calendar engine well-tested, UI and notes systems need expansion
- 🔍 Community feedback and bug reports
- ⚠️ **Migration Barrier**: Calendar import tools needed for Simple Calendar adoption

**Success Goals by Phase:**

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
