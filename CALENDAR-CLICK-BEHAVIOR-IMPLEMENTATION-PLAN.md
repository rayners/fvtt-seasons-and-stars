# Calendar Date Click Behavior Implementation Plan (REVISED)

## GitHub Issue #33 - Option 1 Implementation

### Overview

Implement a settings-based toggle to change calendar grid click behavior from "Set Current Date" (current) to "View Date Details" (new option), allowing users to explore calendar dates safely without accidentally changing the world time.

**Key Implementation Strategy**: Use Foundry's native `ContextMenu` class following established patterns from PF2e/Dragonbane systems, and leverage existing notes system infrastructure rather than reimplementing.

**Setting Status**: `calendarClickBehavior` setting exists but has no implemented effect - needs behavior implementation.

---

## Phase 1: Simplified Test-Driven Development Setup (20 minutes)

### 1.1 Focused Test Suite

**File**: `test/calendar-click-behavior.test.ts` (new file)

**Streamlined approach**: Focus on core behavior toggle, leverage existing infrastructure

```typescript
describe('Calendar Date Click Behavior Setting', () => {
  describe('Setting Implementation', () => {
    it('should check calendarClickBehavior setting when clicking calendar day');
    it('should call _onSelectDate in setDate mode (default)');
    it('should call showDateDetails in viewDetails mode');
    it('should respect GM permissions in both modes');
  });

  describe('Context Menu Integration', () => {
    it('should create ContextMenu with correct selector');
    it('should show opposite action in context menu');
    it('should execute correct action from context menu');
    it('should handle intercalary days correctly');
  });

  describe('Date Details Dialog', () => {
    it('should display formatted date information');
    it('should show calendar context (month description, etc)');
    it('should integrate with existing notes display');
    it('should provide "Set Current Date" action for GMs');
  });
});
```

### 1.2 Use Existing Test Infrastructure

- Leverage existing `test/setup.ts` and foundry mocks
- Use existing calendar test data (no need for new mocks)
- Integrate with existing notes system test patterns

---

## Phase 2: Core Implementation Using Foundry Patterns (45 minutes)

### 2.1 Calendar Grid Widget Modifications

**File**: `src/ui/calendar-grid-widget.ts`

**Key Changes** (following Foundry/PF2e patterns):

- [ ] Add ContextMenu instance property and cleanup
- [ ] Modify `_onSelectDate()` to check `calendarClickBehavior` setting
- [ ] Add `showDateDetails()` method using `Dialog.prompt()`
- [ ] Implement `getDateContextOptions()` for context menu items
- [ ] Initialize context menu in `_onRender()` or `_attachPartListeners()`
- [ ] Handle both regular and intercalary days in context menu

**Implementation Pattern**:

```typescript
// Add to class properties
private contextMenu: ContextMenu | null = null;

// In _onRender() or _attachPartListeners()
private initializeContextMenu(): void {
  this.contextMenu?.remove(); // Clean up existing
  this.contextMenu = new ContextMenu(
    this.element,
    '.calendar-day[data-day]:not(.empty)',
    this.getDateContextOptions(),
    { eventName: 'contextmenu' }
  );
}

// Context menu options
private getDateContextOptions(): ContextMenuEntry[] {
  const setting = game.settings.get('seasons-and-stars', 'calendarClickBehavior');
  const isGM = game.user?.isGM;

  return [
    {
      name: setting === 'setDate' ? 'SEASONS_STARS.context_menu.view_details' : 'SEASONS_STARS.context_menu.set_current',
      icon: '<i class="fas fa-calendar-day"></i>',
      condition: () => setting === 'viewDetails' || (setting === 'setDate' && isGM),
      callback: (target) => {
        if (setting === 'setDate') {
          this.showDateDetails(target);
        } else {
          this._onSelectDate(new Event('click'), target);
        }
      }
    }
  ];
}
```

### 2.2 Simple Date Details Dialog

**Method**: `showDateDetails()` in `calendar-grid-widget.ts`

**Simplified Implementation** (leveraging existing infrastructure):

- [ ] Use `Dialog.prompt()` instead of custom ApplicationV2 component
- [ ] Generate HTML content dynamically using existing date formatting methods
- [ ] Integrate with existing notes system display (reuse note viewing logic)
- [ ] Add "Set Current Date" button for GMs using existing `_onSelectDate` method
- [ ] Handle intercalary days using existing intercalary logic

**Implementation Pattern**:

```typescript
private async showDateDetails(target: HTMLElement): Promise<void> {
  const day = parseInt(target.dataset.day || '0');
  const isIntercalary = target.closest('.calendar-day')?.classList.contains('intercalary');
  const date = this.getDateFromTarget(target); // Use existing logic

  // Generate content using existing formatting
  const content = this.generateDateDetailsContent(date, isIntercalary);

  return Dialog.prompt({
    title: game.i18n.localize('SEASONS_STARS.dialogs.date_details.title'),
    content,
    callback: html => {
      // Handle any action button clicks (Set Current Date, etc.)
    },
    rejectClose: false,
    options: { width: 400, height: 'auto' }
  });
}
```

### 2.3 No New Files Required

**Architecture Decision**:

- Leverage existing dialog system and formatting methods
- Reuse existing notes display logic and templates
- Integrate context menu directly into existing widget class
- Use existing language localization system

---

## Phase 3: Integration and Polish (15 minutes)

### 3.1 Language File Updates

**File**: `languages/en.json`

**Minimal Required Additions**:

```json
{
  "SEASONS_STARS": {
    "dialogs": {
      "date_details": {
        "title": "Date Details",
        "set_current_date": "Set Current Date"
      }
    },
    "context_menu": {
      "view_details": "View Date Details",
      "set_current": "Set Current Date"
    }
  }
}
```

### 3.2 Click Behavior Implementation

**File**: `src/ui/calendar-grid-widget.ts` - Modify `_onSelectDate()`

**Key Change**: Add setting check at the beginning:

```typescript
async _onSelectDate(event: Event, target: HTMLElement): Promise<void> {
  event.preventDefault();

  // Check behavior setting first
  const clickBehavior = game.settings.get('seasons-and-stars', 'calendarClickBehavior');
  if (clickBehavior === 'viewDetails') {
    return this.showDateDetails(target);
  }

  // Existing setDate logic continues unchanged...
  if (!game.user?.isGM) {
    ui.notifications?.warn('Only GMs can change the current date');
    return;
  }
  // ... rest of existing method
}
```

### 3.3 Context Menu Cleanup

**File**: `src/ui/calendar-grid-widget.ts` - Add proper lifecycle management

**Implementation**:

```typescript
// In close() method
async close(options = {}): Promise<this> {
  this.contextMenu?.remove();
  this.contextMenu = null;
  return super.close(options);
}
```

---

## Testing Strategy (Simplified)

### Focused Testing Approach

1. **Run focused tests FIRST** - Validate setting check and dialog display
2. **Implement click behavior modification** - Add setting check to `_onSelectDate()`
3. **Implement date details dialog** - Simple `Dialog.prompt()` implementation
4. **Add context menu integration** - Foundry `ContextMenu` class usage
5. **Final verification** - Manual testing of both modes and context menu

### Manual Testing Checklist (Essential)

- [ ] Default behavior (setDate) unchanged for existing users
- [ ] viewDetails mode shows dialog instead of setting date
- [ ] Right-click context menu shows opposite action
- [ ] GM permissions enforced properly (set date only)
- [ ] Setting persists across sessions
- [ ] Intercalary days handled correctly in both modes

### Integration Testing (Core)

- [ ] Test with both calendar types (Gregorian, Vale Reckoning)
- [ ] Test with different user permission levels (GM vs Player)
- [ ] Test with intercalary days (both click and context menu)

---

## Expected Files Created/Modified (Revised)

### New Files

1. `test/calendar-click-behavior.test.ts` - Focused test suite (12 tests instead of 30+)

### Modified Files

1. `src/ui/calendar-grid-widget.ts` - Click behavior, context menu, date details dialog (~100 lines added)
2. `languages/en.json` - Minimal dialog and context menu text (4 new keys)

### Files NOT Required (Simplified Architecture)

- ~~`src/ui/date-details-dialog.ts`~~ - Using `Dialog.prompt()` instead
- ~~`templates/date-details-dialog.hbs`~~ - Dynamic HTML generation
- ~~`src/styles/date-details-dialog.scss`~~ - Foundry default dialog styling
- ~~`test/mocks/calendar-click-mocks.ts`~~ - Using existing test infrastructure

---

## Implementation Notes (Revised)

### Key Architectural Decisions

1. **Use Foundry ContextMenu**: Follow PF2e/Dragonbane patterns for consistency
2. **Leverage Existing Infrastructure**: Reuse notes system, formatting, permission checking
3. **Minimal File Changes**: Single-file implementation in calendar-grid-widget.ts
4. **Simple Dialog System**: Use `Dialog.prompt()` instead of custom ApplicationV2
5. **Backward Compatibility**: Default 'setDate' behavior completely unchanged

### Critical Implementation Requirements

- **Setting Check First**: Always check `calendarClickBehavior` before executing click action
- **Context Menu Lifecycle**: Proper cleanup in widget close() method to prevent memory leaks
- **Intercalary Day Support**: Handle both regular and intercalary days in all implementations
- **Permission Consistency**: Use existing GM checks, don't create new permission logic

### Error Handling (Simplified)

- [ ] Handle missing calendar data gracefully (use existing patterns)
- [ ] Handle invalid date selections (use existing validation)
- [ ] Handle context menu initialization failures (fall back to click-only behavior)

---

## Success Criteria (Realistic)

### Functional Requirements

✅ **Setting Toggle**: Users can choose between setDate and viewDetails behavior
✅ **Date Details Display**: Basic calendar information displayed in dialog
✅ **Permission System**: GM-only date setting properly restricted  
✅ **Context Menu**: Right-click provides opposite action
✅ **Backward Compatibility**: Existing users see no behavior change
✅ **Intercalary Support**: Intercalary days work in both modes

### Quality Requirements

✅ **Focused Test Coverage**: Core functionality covered by 12 essential tests
✅ **No Regressions**: Existing calendar functionality completely unchanged
✅ **Performance**: Simple dialog with minimal overhead
✅ **User Experience**: Clear behavior toggle with helpful context menu
✅ **Maintainability**: Single-file implementation using existing patterns

---

## Time Estimates (Revised)

- **Phase 1 (Focused TDD Setup)**: 20 minutes
- **Phase 2 (Core Implementation)**: 45 minutes
- **Phase 3 (Integration & Polish)**: 15 minutes
- **Total**: ~1.5 hours (reduced from 3 hours)

**Key Simplifications**: Using Foundry patterns, leveraging existing infrastructure, and focusing on core functionality rather than comprehensive feature recreation.
