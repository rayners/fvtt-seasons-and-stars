# GitHub Project Board Enhancement Guide

This guide documents the enhancements made to [@rayners's Foundry Modules](https://github.com/users/rayners/projects/3) project board to better support the Seasons & Stars module split structure.

## New Custom Fields Added

### 1. Calendar System (Single Select)

**Purpose**: Track which calendar system an issue affects
**Options**:

- `gregorian` - Standard Gregorian calendar issues
- `vale-reckoning` - D&D Vale of Elden calendar issues
- `dark-sun` - Dark Sun campaign calendar issues
- `traveller` - Traveller Imperial Calendar issues
- `custom` - Custom calendar definition issues
- `n/a` - Not calendar-specific

### 2. Release Coordination (Single Select)

**Purpose**: Track dependencies between S&S modules for coordinated releases
**Options**:

- `independent` - Can be released independently
- `coordinated` - Requires coordination with other modules
- `blocked-by-core` - Blocked until core module changes
- `blocking-others` - Other modules depend on this change

## Module Field Updates Needed

The existing `Module` field should be updated to include these S&S split options:

**Current**: "Seasons & Stars" (single entry)
**New Structure**:

- `Seasons & Stars (Core)` - Core calendar engine and widgets
- `Seasons & Stars (PF2e Pack)` - PF2e-specific calendars and integration
- `Seasons & Stars (Fantasy Pack)` - Fantasy calendar collection
- `Seasons & Stars (Sci-Fi Pack)` - Science fiction calendar collection
- `Seasons & Stars (Editor)` - Calendar editor application
- `Seasons & Stars (Meta)` - Cross-module issues and coordination

## Recommended Project Views

### 1. "S&S Core Contributors" View

**Purpose**: Focus on core module development
**Filters**:

- `Module = "Seasons & Stars (Core)" OR "Seasons & Stars (Meta)"`
  **Layout**: Board view with Status columns
  **Sort**: Priority (High → Low)

### 2. "Calendar Pack Contributors" View

**Purpose**: Focus on calendar pack development
**Filters**:

- `Module contains "Pack"`
  **Group By**: Module, then Calendar System
  **Fields**: Priority, Size, Type, Calendar System
  **Layout**: Table view for detailed information

### 3. "S&S Release Coordination" View

**Purpose**: Track cross-module dependencies for releases
**Filters**:

- `Release Coordination != "independent" AND Module contains "Seasons & Stars"`
  **Group By**: Release Coordination
  **Sort**: Priority (Critical → Low)
  **Layout**: Board view with Release Coordination columns

### 4. "External Contributors Welcome" View

**Purpose**: Show good entry points for new contributors
**Filters**:

- `Labels contains "good-first-issue" OR "help-wanted" AND Module contains "Seasons & Stars"`
  **Fields**: Title, Module, Priority, Size, Labels
  **Sort**: Size (XS first), then Priority
  **Layout**: Table view for easy scanning

### 5. "Calendar System Issues" View

**Purpose**: Focus on specific calendar system problems
**Filters**:

- `Calendar System != "n/a" AND Module contains "Seasons & Stars"`
  **Group By**: Calendar System
  **Fields**: Title, Module, Type, Priority
  **Layout**: Board view grouped by calendar system

## Type Field Enhancements

Consider adding these S&S-specific types to the existing Type field:

- `calendar-definition` - JSON calendar structure work
- `system-integration` - Game system compatibility issues
- `cross-module` - Issues affecting multiple S&S modules
- `pack-coordination` - Work requiring alignment across calendar packs

## Usage Guidelines

### For Issue Creation:

1. **Module Assignment**: Always assign to the most specific applicable module
2. **Calendar System**: Set if the issue affects specific calendar definitions
3. **Release Coordination**: Mark dependencies early to avoid coordination problems
4. **Labels**: Use GitHub labels in conjunction with project fields for maximum filtering power

### For Contributors:

1. **New Contributors**: Start with "External Contributors Welcome" view
2. **Calendar Work**: Use "Calendar Pack Contributors" view for pack-specific work
3. **Core Development**: Use "S&S Core Contributors" view for engine work
4. **Release Planning**: Use "S&S Release Coordination" view before releases

### For Project Management:

1. **Sprint Planning**: Use Release Coordination field to identify blocking relationships
2. **Triage**: Start with Status = "Backlog", then assign Module and other fields
3. **Release Readiness**: Check "S&S Release Coordination" view before any release
4. **Community Engagement**: Regularly review "External Contributors Welcome" view

## Implementation Checklist

- [x] Create "Calendar System" custom field
- [x] Create "Release Coordination" custom field
- [ ] Update Module field options (manual via GitHub UI)
- [ ] Create saved project views (manual via GitHub UI)
- [ ] Add Type field options (manual via GitHub UI)
- [ ] Update project README with contributor guidelines
- [ ] Test views with existing S&S issues

## Manual Setup Instructions

Since GitHub CLI doesn't support all project board operations, some setup must be done manually:

### Update Module Field:

1. Go to [Project Settings](https://github.com/users/rayners/projects/3/settings)
2. Click on "Module" field
3. Add the new S&S split options listed above
4. Update existing "Seasons & Stars" items to use specific module tags

### Create Project Views:

1. In the project board, click "New view"
2. Configure filters and layout as specified above
3. Save each view with the recommended names
4. Set appropriate permissions for contributor access

### Update Field Options:

1. Go to Project Settings → Fields
2. Select "Type" field
3. Add the S&S-specific type options listed above

This enhanced structure provides centralized project management while enabling module-specific contributor workflows and clear release coordination tracking.
