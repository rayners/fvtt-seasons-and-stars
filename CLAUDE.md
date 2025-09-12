# Seasons & Stars Internal Development Context

## Module Architecture Deep Dive

### Calendar Engine Core (packages/core/src/core/)

**Primary Components**:

- `CalendarEngine`: Core date arithmetic and calendar interpretation
- `DateFormatter`: Human-readable date string generation with cultural context
- `TimeConverter`: Bidirectional worldTime <-> calendar date conversion
- `CalendarValidator`: JSON schema validation and error reporting
- `CalendarManager`: High-level calendar system coordination
- `CalendarLoader`: Dynamic calendar definition loading and caching
- `TimeAdvancementService`: Centralized time progression management

**Critical Implementation Details**:

- Uses `game.time.worldTime` as single source of truth
- JSON calendar definitions with fallback value handling
- Round-trip conversion testing prevents data loss bugs
- Intercalary day support requires special arithmetic handling
- **Monorepo Architecture**: Packages-based structure with core logic in packages/core/
- Notes system with recurring events, categories, and permissions
- Performance-optimized note management with search capabilities

### Widget System Architecture (packages/core/src/ui/)

**Widget Factory Pattern**:

- `WidgetManager`: Registration and lifecycle management
- `CalendarWidget`: Full calendar grid display
- `CalendarMiniWidget`: Compact date display with SmallTime integration
- `CalendarGridWidget`: Main calendar interface
- `QuickTimeButtons`: Time advancement controls (in core/)

**UI Integration Patterns**:

- Element-specific positioning (targets player list for mini widget)
- Automatic fallback positioning for cross-version compatibility
- Event-driven updates with debouncing for performance
- Dialog-based calendar selection and configuration

### System Integration Layer

**Game System Adapters**:

- `BridgeIntegration`: Modern integration approach (packages/core/src/core/)
- `CompatibilityManager`: Feature detection and graceful degradation
- Generic fallback patterns for unsupported systems

**Known Integration Challenges**:

- PF2e worldTime transform requires careful epoch handling
- WFRP calendar weekday calculation needs custom logic
- Cross-system date format consistency requires adaptation
- Bridge integration patterns for complex system interactions

## Development Session Patterns

### Debugging Workflows

**Systematic Bug Investigation**:

1. Reproduce with minimal test case
2. Trace through date conversion pipeline
3. Identify exact failure point in calendar arithmetic
4. Create regression test before fixing
5. Validate fix across all calendar systems

**Common Bug Patterns**:

- Intercalary day conversion issues (round-trip failures)
- Date boundary arithmetic errors (year/month transitions)
- UI synchronization problems (widget update timing)
- System integration conflicts (worldTime interpretation)

### Testing Strategy Details

**Test Organization**:

- Unit tests for individual calendar functions
- Integration tests for system adapters
- UI tests for widget behavior
- Regression tests for known bug patterns

**Critical Test Scenarios**:

- Intercalary day round-trip conversion
- Year boundary transitions (leap years, calendar changes)
- Multi-moon calendar phase calculations
- Cross-system date synchronization

### Quality Assurance Patterns

**Documentation Accuracy Requirements**:

- All calendar system claims verified with actual JSON definitions
- Feature compatibility tested across supported Foundry versions
- API examples verified with actual implementation
- Installation instructions tested in clean environment
- JSDoc examples validated against current code implementation (updated 2025-01-06)
- Hook events documented with accurate data structures and version information

**Release Validation Checklist**:

- 100% test pass rate across all scenarios
- Calendar JSON validation for all included definitions
- Widget positioning tested across different UI configurations
- System integration verified with latest game system versions

## Technical Debt and Improvement Areas

### Current Limitations

**Calendar Format Constraints**:

- Limited support for complex calendar reform scenarios
- Astronomical calculations simplified for performance
- Multi-calendar system support not yet implemented
- Dynamic calendar switching requires world restart

**UI Responsiveness**:

- Widget positioning relies on DOM element detection
- Cross-module UI conflicts possible with aggressive positioning
- Performance impact of frequent date calculations not optimized
- Accessibility features not fully implemented

### Planned Improvements

**Calendar Engine Enhancements**:

- Dynamic calendar switching without restart
- More sophisticated astronomical calculations
- Support for historical calendar reforms
- Multi-calendar system worlds

**Integration Expansion**:

- Additional game system adapters
- Enhanced Simple Calendar compatibility
- Module API for third-party integrations (improved documentation 2025-01-06)
- Weather and season integration hooks
- TimeAdvancementService API with comprehensive JSDoc examples
- Complete hook system documentation with integration patterns

## Notes Management System

### Core Note Features (packages/core/src/core/note-\*)

**Components**:

- `NotesManager`: Central note coordination and lifecycle management
- `NoteDocument`: Foundry Document integration for persistent storage
- `NotePermissions`: User-based access control and visibility rules
- `NoteRecurring`: Automated recurring note generation and management
- `NoteCategories`: Organizational system for note classification
- `NoteSearch`: Full-text search with filtering capabilities
- `NoteStorage`: Efficient data persistence and retrieval
- `NotePerformanceOptimizer`: Large dataset optimization strategies

**Key Features**:

- Calendar-integrated note display with date association
- Recurring notes (daily/weekly/monthly/yearly patterns)
- Category-based organization with custom colors and icons
- Permission-based visibility (GM-only, player-visible, etc.)
- Advanced search and filtering capabilities
- Performance optimization for large note collections

## Session Context Requirements

### Essential Context Sources

**Before Any Session**:

- Review recent session logs in `../sessions/` for similar issues
- Check calendar JSON definitions for affected systems
- Verify current test status and any failing scenarios
- Review integration requirements for target systems

**For Bug Investigation Sessions**:

- Gather exact reproduction steps from users
- Review similar issues from session history
- Check calendar arithmetic edge cases
- Prepare debugging environment with relevant calendars

**For Feature Development Sessions**:

- Review existing patterns for similar functionality
- Plan test cases before implementation
- Consider system integration requirements
- Design UI integration approach

### Development Environment Setup

**Required Tools**:

- `npm test` - Runs full test suite (1300+ tests) in watch mode during TDD
- `npm run test:run` - Runs full test suite once (same as CI)
- `npm run test:coverage` - Full test suite with coverage report
- `npm run test:workspaces` - Workspace-only tests (use for targeted testing)
- `npm run test:ui` - Interactive test UI for development
- Calendar JSON validator for schema verification
- Multiple browser tabs for cross-system testing
- FoundryVTT development instance with test worlds

**CRITICAL**: Always use `npm test` or `npm run test:run` for comprehensive testing. Current test suite runs 1316 tests with full coverage of monorepo packages.

**Context Loading Priority**:

1. Current module state and recent changes
2. Related session logs and debugging patterns
3. Calendar system requirements and edge cases
4. Integration requirements and compatibility constraints

---

**Usage**: This context is automatically loaded by module CLAUDE.md and provides detailed technical context for effective development sessions.
