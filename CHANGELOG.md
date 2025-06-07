# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

💖 **Love this module?** Consider [supporting development on Patreon](https://patreon.com/rayners) to help fund new features and faster updates!

## [0.3.0](https://github.com/rayners/fvtt-seasons-and-stars/compare/v0.2.3...v0.3.0) (2025-06-07)


### Features

* add manual trigger to release workflow ([45064ba](https://github.com/rayners/fvtt-seasons-and-stars/commit/45064ba5590cb477fae52245696cb58bcfa6b755))
* update to foundry-module-actions@v2 with modern version extraction ([d242d05](https://github.com/rayners/fvtt-seasons-and-stars/commit/d242d051aa1b234206488c5a2fde92000b6b5e81))

## [0.2.2] - 2025-06-06

### Added

- **Widget Switching UI Controls**: Comprehensive keyboard shortcuts and UI controls for switching between calendar widgets
  - **Keyboard Shortcuts**: Alt+S (default widget), Alt+Shift+S (mini widget), Alt+Ctrl+S (grid widget), Alt+M (main widget)
  - **Scene Control Button**: Toggle button in journal notes controls for default widget (GM only)
  - **Widget Header Controls**: Switching buttons in all widget headers for easy widget-to-widget navigation
  - **Double-Click Interaction**: Double-click mini widget to open larger view based on default widget setting
  - **Default Widget Setting**: User preference for which widget opens with scene control and default shortcut

### Enhanced

- **Mini Widget Animation**: Smooth fade-out animation using SmallTime's proven approach prevents jarring "drop" effect during close
- **Keybinding System**: Proper Foundry v13 keybinding registration in init hook for reliable keyboard shortcut functionality
- **Widget Switching UX**: Seamless transitions between widgets with automatic closing and opening of target widgets
- **User Interface**: Improved widget headers with switching controls for better workflow integration

### Fixed

- **Keybinding Registration Timing**: Fixed "You cannot register a Keybinding after the init hook" error by moving registration to proper init phase
- **Mini Widget Close Animation**: Eliminated jarring positioning changes during widget close using fade-out animation approach

## [0.2.1] - 2025-06-05

### Added

- **Security Policy**: Added comprehensive SECURITY.md with vulnerability reporting guidelines
- **Repository Infrastructure**: Enhanced repository with proper description, topics, and branch protection

### Changed

- **Memory Management**: Removed memory size checking in favor of dedicated Memory Mage module in development
- **Performance Monitoring**: Simplified note performance optimizer to focus on core functionality

### Enhanced

- **Code Quality**: Improved TypeScript definitions and cleaned up dependencies
- **UI Polish**: Minor styling improvements and template refinements
- **Localization**: Updated language strings for better user experience

### Fixed

- **Performance**: Optimized note storage systems and reduced memory overhead
- **Styling**: Enhanced calendar widget responsive design and visual consistency

## [0.2.0] - 2025-06-05

### Added

- **Multi-Day Intercalary Support**: Calendar format now supports multi-day festivals and intercalary periods
  - Enhanced TypeScript interface with `days?: number` field for intercalary periods
  - Backward compatibility maintained - single-day periods work unchanged
  - Updated calendar engine to handle complex festivals like Greyhawk's 7-day celebrations
  - Added 8 new built-in calendars: Dark Sun, Eberron, Exandrian, Forbidden Lands, Forgotten Realms, Golarion PF2e, Greyhawk, Symbaroum, Traveller Imperial, Warhammer
- **Errors & Echoes Integration**: Optional error reporting module integration
  - Graceful handling when Errors & Echoes not installed
  - Rich context provider with calendar state and system information
  - Smart error filtering for calendar-related issues only
- **Enhanced Documentation Organization**: Professional public/private documentation separation
  - Universal documentation standards for clean repositories
  - Private development documentation moved to local-docs with Obsidian integration
  - Clear public-facing documentation focused on user value

### Enhanced

- **Calendar Format**: Multi-day intercalary periods for complex festival systems
- **Test Coverage**: Expanded to 38 automated tests including multi-day intercalary validation
- **Real Calendar Support**: Comprehensive testing with actual fantasy calendar systems
- **TypeScript Definitions**: Enhanced calendar type definitions with multi-day support

### Fixed

- **Calendar Engine**: Accurate date arithmetic across multi-day intercalary periods
- **Year Length Calculation**: Correct handling of variable-length intercalary periods
- **Date Conversion**: Proper world time conversion with complex calendar structures

## [0.1.0] - 2025-05-30

### Added

- **Complete Calendar System**: Modern calendar interface with native Foundry v13+ integration
- **Calendar Widget**: Main calendar interface with full date navigation and time controls
- **Calendar Mini Widget**: Compact companion widget with SmallTime integration
- **Calendar Selection Dialog**: Multi-calendar support with built-in calendar library
- **Bridge Integration**: Generic integration interface for external module compatibility
- **Time Management**: Comprehensive time advancement with hours, days, weeks, months, years
- **Calendar Engine**: Robust date calculation system with leap year support
- **Built-in Calendars**: Gregorian and Vale Reckoning calendars included
- **JSON Calendar Format**: Human-readable calendar definitions with cultural descriptions
- **Notes System**: Complete calendar notes with CRUD operations, categories, and search
- **Recurring Events**: Advanced recurring note patterns with exception handling
- **Note Categories**: 8 default categories with custom category support
- **Search & Filtering**: Multi-criteria note search with performance optimization
- **Permission System**: Comprehensive GM/player access control for notes
- **Simple Weather Integration**: Flag-based weather data storage compatibility
- **SmallTime Integration**: Enhanced positioning and visual consistency
- **Performance Optimization**: Memory management, caching, and large collection support
- **Production Logging**: Centralized logging system with debug mode toggle
- **Error Handling**: Graceful degradation with user notifications
- **Input Validation**: Comprehensive validation for all public APIs
- **TypeScript Support**: Complete type definitions for Foundry v13
- **Module Settings**: Configurable debug mode, notifications, and note permissions
- **Hook System**: Event handling for module integration and extensibility

### Technical Features

- **ApplicationV2 Architecture**: Modern Foundry v13+ application framework
- **HandlebarsApplicationMixin**: Template-driven UI with proper data binding
- **Semantic Versioning**: Future-proof versioning with compatibility detection
- **Module Flag Support**: Secure storage for external module integration
- **Capability Detection**: Runtime feature probing for robust integration
- **Clean Build System**: Zero TypeScript errors, production-ready compilation
- **Comprehensive Testing**: 63 automated tests with 100% pass rate covering calendar engine, widgets, and UI integration
- **Documentation**: Complete API reference, user guide, and developer documentation

### Migration Support

- **Simple Calendar Compatibility**: Separate compatibility bridge for zero-migration transition
- **API Compatibility**: Complete Simple Calendar API emulation for existing modules
- **Data Format Conversion**: Seamless conversion between calendar formats
- **Bridge Architecture**: Clean separation between core module and compatibility layer

### Performance

- **Sub-100ms Search**: Optimized search performance for large note collections
- **Memory Management**: Intelligent caching with pressure relief mechanisms
- **Efficient Storage**: Date-based indexing for fast note retrieval
- **Lazy Loading**: Calendar definitions loaded on demand
- **Real-time Updates**: Synchronous operations for immediate UI feedback

### Developer Experience

- **Complete API Documentation**: 780-line developer reference guide
- **Integration Examples**: Real-world usage patterns and code samples
- **Error Handling Guide**: Comprehensive error scenarios and recovery strategies
- **Version Compatibility**: Multi-version support documentation
- **TypeScript Definitions**: Full type safety with IntelliSense support

### User Experience

- **Intuitive Interface**: Clean, modern UI following Foundry design patterns
- **Quick Time Controls**: One-click time advancement buttons
- **Visual Feedback**: Clear indicators, animations, and state changes
- **Responsive Design**: Works across different screen sizes and UI configurations
- **Accessibility**: Proper ARIA labels and keyboard navigation support

## [Unreleased]

### Planned Features

- **Calendar Editor**: In-app calendar creation and modification tools
- **Community Calendar Library**: User-submitted calendar collection
- **Advanced Time Zones**: Multi-region time tracking capabilities
- **Enhanced Integrations**: Deep system-specific features and optimizations
- **Import/Export Tools**: Migration utilities for other calendar systems
- **Festival/Event System**: Calendar-based recurring cultural events
- **Weather Integration**: Enhanced seasonal weather pattern support

---

**Note**: This is the initial public release of Seasons & Stars. The module has been extensively tested and optimized for production use in Foundry VTT v13+ environments.
