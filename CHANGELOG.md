# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

💖 **Love this module?** Consider [supporting development on Patreon](https://patreon.com/rayners) to help fund new features and faster updates!

## [0.4.1](https://github.com/rayners/fvtt-seasons-and-stars/compare/v0.4.0...v0.4.1) (2025-06-24)


### Bug Fixes

* register widget factories to resolve 'No factory registered' error ([89b121a](https://github.com/rayners/fvtt-seasons-and-stars/commit/89b121a19b6121000ec8e0ce38af3b45a38d0738))

## [0.4.0](https://github.com/rayners/fvtt-seasons-and-stars/compare/v0.3.4...v0.4.0) (2025-06-24)


### Features

* implement extensible system compatibility architecture with PF2e integration ([47654e5](https://github.com/rayners/fvtt-seasons-and-stars/commit/47654e533eb73c4073d3619436910fb03bf13c2c))


### Documentation

* accuracy review and roadmap alignment with GitHub milestones ([4c7c2cc](https://github.com/rayners/fvtt-seasons-and-stars/commit/4c7c2cce88dba221832a642f6445a8b1060df461))

## [0.3.4](https://github.com/rayners/fvtt-seasons-and-stars/compare/v0.3.3...v0.3.4) (2025-06-20)


### Bug Fixes

* Dark Sun intercalary days should not count for weekdays ([fd99869](https://github.com/rayners/fvtt-seasons-and-stars/commit/fd998695419437d00de7c913bd9cb3bfcc31ce47))

## [0.3.3](https://github.com/rayners/fvtt-seasons-and-stars/compare/v0.3.2...v0.3.3) (2025-06-19)


### Bug Fixes

* consolidate repeated date/time calculations into CalendarTimeUtils ([1d65de8](https://github.com/rayners/fvtt-seasons-and-stars/commit/1d65de83066f7800044b9f2f5d6839c2d7892430)), closes [#66](https://github.com/rayners/fvtt-seasons-and-stars/issues/66)

## [0.3.2](https://github.com/rayners/fvtt-seasons-and-stars/compare/v0.3.1...v0.3.2) (2025-06-18)


### Bug Fixes

* apply journal permissions to calendar note display ([faa0710](https://github.com/rayners/fvtt-seasons-and-stars/commit/faa071055ee38da057c7adc20ee50215aee31a8b)), closes [#61](https://github.com/rayners/fvtt-seasons-and-stars/issues/61)


### Documentation

* clean up roadmap - remove install metrics and focus on development ([f66b8d6](https://github.com/rayners/fvtt-seasons-and-stars/commit/f66b8d6789b23fc3abf73c1b74c32985f4727b8c))
* update documentation with latest features and improvements ([1a90da8](https://github.com/rayners/fvtt-seasons-and-stars/commit/1a90da839b30254a3816d2b8c9bb61d827cd580f))

## [0.3.1](https://github.com/rayners/fvtt-seasons-and-stars/compare/v0.3.0...v0.3.1) (2025-06-17)


### Bug Fixes

* correct Gregorian calendar weekday calculations ([#58](https://github.com/rayners/fvtt-seasons-and-stars/issues/58)) ([22e9bcc](https://github.com/rayners/fvtt-seasons-and-stars/commit/22e9bcc8afb95e2bfb75cd37c080e7545d23b081))

## [0.3.0](https://github.com/rayners/fvtt-seasons-and-stars/compare/v0.2.6...v0.3.0) (2025-06-16)


### Features

* Add configurable calendar click behavior with modifier key support ([0a731d2](https://github.com/rayners/fvtt-seasons-and-stars/commit/0a731d2941f5b7f09fc60ca0ac4de725863dbf9c))
* enable module.zip size analysis in bundle analysis workflow ([a9a290e](https://github.com/rayners/fvtt-seasons-and-stars/commit/a9a290eb6e29b7a66f16cf05ec1a1f31ac38b23d))
* implement configurable quick time buttons ([8452899](https://github.com/rayners/fvtt-seasons-and-stars/commit/84528999f1b50621136ec56b57d1589ebf39c638))
* implement single Sentry sourcemap upload system ([cde4085](https://github.com/rayners/fvtt-seasons-and-stars/commit/cde408512830e6c8aa4be2fd8a7a08606da19a73))


### Bug Fixes

* Prettier formatting - remove trailing whitespace in DialogV2 render callback ([7d26df9](https://github.com/rayners/fvtt-seasons-and-stars/commit/7d26df99500b200487773af0b6f5ee1a8f21e01e))
* resolve dependency conflicts after foundry-dev-tools update ([b2398e9](https://github.com/rayners/fvtt-seasons-and-stars/commit/b2398e93cfae8b0c041c89b2bee88fcb3806c360))
* update package-lock.json for foundry-dev-tools v1.2.0 ([b082111](https://github.com/rayners/fvtt-seasons-and-stars/commit/b082111807badd0b595da609a3b7ad56c1982724))


### Documentation

* add consistent Patreon badge to README_FOUNDRY.md ([69e54b2](https://github.com/rayners/fvtt-seasons-and-stars/commit/69e54b296d584840b6861f9a83b8fb11d8b2476d))
* add issue [#35](https://github.com/rayners/fvtt-seasons-and-stars/issues/35) UI improvements to roadmap ([1fee106](https://github.com/rayners/fvtt-seasons-and-stars/commit/1fee106ca5e9d8f19d0704516bfca4309228e0cf))
* add star emoji to README_FOUNDRY.md title ([4182716](https://github.com/rayners/fvtt-seasons-and-stars/commit/418271663a3d33ed811af5e5653a2a9abf76ffb0))
* align ROADMAP with 0.4.0 milestone and fix documentation standards ([fda2d58](https://github.com/rayners/fvtt-seasons-and-stars/commit/fda2d58ecca14bbddd059d8e8325473c7b96ce61))

## [Unreleased]

### Next Priority Features

- **Calendar Import/Creation Tools**: In-app calendar editor and Simple Calendar migration utilities
- **Enhanced Notes System**: Complete note editing interface for calendar-specific metadata
- **Performance Optimizations**: Lazy calendar loading and memory improvements

## [0.2.6](https://github.com/rayners/fvtt-seasons-and-stars/compare/seasons-and-stars-v0.2.5...seasons-and-stars-v0.2.6) (2025-06-09)


### Bug Fixes

* also exclude module.json from prettier to prevent release-please conflicts ([d562730](https://github.com/rayners/fvtt-seasons-and-stars/commit/d5627303d2ca9391c4cf6e07edb39d00b4b9fca7))

## [0.2.5](https://github.com/rayners/fvtt-seasons-and-stars/compare/seasons-and-stars-v0.2.4...seasons-and-stars-v0.2.5) (2025-06-09)


### Bug Fixes

* exclude CHANGELOG.md from prettier to prevent release-please conflicts ([a589c53](https://github.com/rayners/fvtt-seasons-and-stars/commit/a589c53df746116c162aa108450fedb8c45d6a94))

## [0.2.4](https://github.com/rayners/fvtt-seasons-and-stars/compare/seasons-and-stars-v0.2.3...seasons-and-stars-v0.2.4) (2025-06-09)


### Features

* add comprehensive Patreon and GitHub Sponsors support ([5c4d0e8](https://github.com/rayners/fvtt-seasons-and-stars/commit/5c4d0e864c9983dfebc1a6bcd5b55dc0fe0483fa))
* add manual trigger to release workflow ([45064ba](https://github.com/rayners/fvtt-seasons-and-stars/commit/45064ba5590cb477fae52245696cb58bcfa6b755))
* **automation:** add comprehensive workflow automation suite ([7bb8738](https://github.com/rayners/fvtt-seasons-and-stars/commit/7bb8738c5a60e39c2246da113bece7bac508d90f))
* **ci:** add comprehensive CI/CD pipeline and code quality tools ([3de9ae8](https://github.com/rayners/fvtt-seasons-and-stars/commit/3de9ae8d0450448f1c4f11d00280d5082cf9fa09))
* complete Phase 1 Day 5 - Release Infrastructure for public release ([fb82682](https://github.com/rayners/fvtt-seasons-and-stars/commit/fb82682cd860fdcf5e13361c0271ab4349b5a5f8))
* complete Phase 2 Beta Testing Program infrastructure setup ([09d5f0f](https://github.com/rayners/fvtt-seasons-and-stars/commit/09d5f0f0c0a0278f78d2893d8bad77b245e3b017))
* implement comprehensive widget switching UI controls ([d5a0738](https://github.com/rayners/fvtt-seasons-and-stars/commit/d5a073808a7e502d3995c0f0fa0d5f93d40c5cfb))
* implement intercalary day display support for WFRP calendar ([6cef541](https://github.com/rayners/fvtt-seasons-and-stars/commit/6cef5410299e2588e33c8480dad1633ab23ede0b))
* **repo:** add comprehensive GitHub collaboration infrastructure ([7510165](https://github.com/rayners/fvtt-seasons-and-stars/commit/7510165cda12ad371c78b1291934e7132f63ef6a))
* update to foundry-module-actions@v2 with modern version extraction ([d242d05](https://github.com/rayners/fvtt-seasons-and-stars/commit/d242d051aa1b234206488c5a2fde92000b6b5e81))


### Bug Fixes

* add api property to Module interface for TypeScript compatibility ([5551ec2](https://github.com/rayners/fvtt-seasons-and-stars/commit/5551ec2cf8943846c1b48afc1c598c839cabfcac))
* calendar macro now respects default widget setting ([7bd7b29](https://github.com/rayners/fvtt-seasons-and-stars/commit/7bd7b29ac44e189ea16c777aa3c76662cc50d012))
* **ci:** add explicit config file paths to release-please action ([98b920a](https://github.com/rayners/fvtt-seasons-and-stars/commit/98b920a3989c817d14bb42051ed073d67072185c))
* **ci:** add issues write permission to release-please workflow ([ce29072](https://github.com/rayners/fvtt-seasons-and-stars/commit/ce29072e011a9bb2f08171421c0ab50caf840d12))
* complete API implementation and fix TypeScript compilation ([fa4e2a6](https://github.com/rayners/fvtt-seasons-and-stars/commit/fa4e2a6aeea542f98f630cdd9c68c07216875d6c))
* correct foundry-module-actions path in release workflow ([e4597b2](https://github.com/rayners/fvtt-seasons-and-stars/commit/e4597b239a6b69777c0f31f6929d0ffb16e35392))
* deleted journals now properly removed from calendar display ([0a3baec](https://github.com/rayners/fvtt-seasons-and-stars/commit/0a3baec47987ef8ddb0f0fdc6bcbee417c969556))
* migrate to foundry-dev-tools ESLint configuration ([996e2cc](https://github.com/rayners/fvtt-seasons-and-stars/commit/996e2cc3e026bae11506c97ef64f4fcde43e7439))
* replace globalThis usage with standard Foundry module integration patterns ([a548887](https://github.com/rayners/fvtt-seasons-and-stars/commit/a548887be65b2eb9ef6ba3912363924c6eb4b22b))
* resolve D&D 5e calendar leap year validation error and add comprehensive testing ([8746daf](https://github.com/rayners/fvtt-seasons-and-stars/commit/8746daf0b5a034a44600caaa3183e202d441697e))
* resolve test failures in comprehensive regression suite ([588e99b](https://github.com/rayners/fvtt-seasons-and-stars/commit/588e99bc0d7cf33931425dade989aa6a8dac79b1))
* **tests:** resolve year boundary test failures with intercalary day handling ([7b3a6be](https://github.com/rayners/fvtt-seasons-and-stars/commit/7b3a6be510ab98fc8a56548d5c288c4df9ad54a2))
* **ui:** comprehensive intercalary day handling improvements ([5a10ee7](https://github.com/rayners/fvtt-seasons-and-stars/commit/5a10ee7d0a6cbff798333296cda93b1c41b652e9))
* **ui:** prevent duplicate TODAY indicators for intercalary and regular days ([00b54d5](https://github.com/rayners/fvtt-seasons-and-stars/commit/00b54d542c8e50f8fc6f32e5742bb8f97510656c))


### Documentation

* accuracy review and note editing system prep for v0.2.2 ([dad12b0](https://github.com/rayners/fvtt-seasons-and-stars/commit/dad12b03e5b55d52a5e1758024ea3a6a8e7480c5))
* add Foundry package listing description ([38426d5](https://github.com/rayners/fvtt-seasons-and-stars/commit/38426d5610b2430e9959e89872086c772a08ae8b))
* complete Phase 2 Day 1 - Documentation Verification for public release ([f8bf69e](https://github.com/rayners/fvtt-seasons-and-stars/commit/f8bf69e3a992690d3c87854add21dc4c4f9cdb73))
* update changelog for v0.2.2 widget switching implementation ([be038d4](https://github.com/rayners/fvtt-seasons-and-stars/commit/be038d41d69ff3d1548df750441ec9e31812fe2c))
* Update development notes and preserve TypeScript compilation fix artifacts ([4ba685f](https://github.com/rayners/fvtt-seasons-and-stars/commit/4ba685febe1c309476d24252f49a9cb1788ccaa9))
* update ROADMAP to accurately reflect v0.2.1 current state ([81e0c5f](https://github.com/rayners/fvtt-seasons-and-stars/commit/81e0c5fb438af0e4b680e5a2af6544d1f98191df))


### Miscellaneous

* release 0.2.4 ([cace1c8](https://github.com/rayners/fvtt-seasons-and-stars/commit/cace1c835a06a66ac75e7211005a0d02e1a32a32))


### Code Refactoring

* modernize E&E registration and clean up development artifacts ([61b6ca7](https://github.com/rayners/fvtt-seasons-and-stars/commit/61b6ca71902430e8edad6b0faa852c2622c7aae3))

## [0.2.3] - 2025-06-07

### Added

- **Enhanced Note Creation UI**: Better note creation interface with tag support
  - **Tag Autocompletion**: Autocomplete for note categories when typing tags
  - **Visual Tag Indicators**: Color-coded tag chips with category icons
  - **Helpful Tooltips**: Hover tooltips showing category descriptions
  - **Real-time Validation**: Validation with clear error messages
  - **Category Integration**: Works with existing note categories and custom tags

### Enhanced

- **Scene Control Integration**: Scene control button for widget management
  - **GM-Only Controls**: Scene control button shows only for GameMasters
  - **Default Widget Setting**: Choose which widget opens with scene control
  - **Keyboard Integration**: Scene control works with keyboard shortcuts
- **Documentation Updates**: Updated docs to match actual implementation
  - **Honest Limitations**: Clear documentation of note editing limitations
  - **Timeline Updates**: Updated roadmap from Q1/Q2 to Q3/Q4 2025
  - **Test Coverage**: Fixed test coverage reporting (10.66% actual coverage)
- **Build System**: Updated GitHub Actions to fix deprecation warnings
  - **Modern Actions**: Replaced deprecated version extraction action
  - **Clean Builds**: Fixed TypeScript linting issues

### Fixed

- **TypeScript Compliance**: Fixed linting error in base-widget-manager.ts
- **Build Pipeline**: Clean builds with zero errors
- **Documentation Accuracy**: Docs now match actual feature capabilities

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
- **Comprehensive Testing**: 72 automated tests with 100% pass rate covering calendar engine and basic widget functionality (10.66% code coverage)
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
