# Play/Pause Time Advancement Implementation Plan

**Date Created**: August 5, 2025  
**Module**: Seasons & Stars (fvtt-seasons-and-stars)  
**Feature**: Play/Pause Time Advancement with Combat Auto-Pause  
**Approach**: Test-Driven Development (TDD) with Expert Review  

## Overview

This plan implements play/pause functionality for automatic time advancement in the Seasons & Stars module. Time advances based on a configurable ratio (default 1:1 real time to game time) and automatically pauses when combat starts.

### Key Requirements
- Play/pause button in mini widget (right-aligned with date)
- Play/pause controls in main widget (dedicated section)
- Configurable time advancement ratio with smart interval calculation
- Automatic pause on combat start
- Optional turning clock widget showing advancement
- Configuration interface with detailed ratio explanations

## Expert Review Findings

### Foundry Hook Corrections
- ✅ **`combatStart`**: `(combat: Combat, updateData: { round: number; turn: number }) => void` - Use for pause
- ✅ **`deleteCombat`**: `(combat: Combat, options: object, userId: string) => void` - Use for resume (NOT `combatEnd` which doesn't exist)
- ❌ **`preCreateCombat`**: Wrong timing for pause functionality
- ✅ **System-agnostic**: Works across all game systems

### TypeScript Improvements Required
- Proper interval typing: `ReturnType<typeof setInterval>`
- Hook lifecycle management with cleanup
- Comprehensive error boundaries around Foundry API calls
- Safe settings access with fallback values
- Proper async/await patterns with error handling

### Smart Interval Calculation
```typescript
private calculateOptimalInterval(ratio: number): number {
  // Examples:
  // ratio = 1.0 → interval = 1000ms (1:1 real time)
  // ratio = 0.5 → interval = 2000ms (2s real = 1s game)
  // ratio = 2.0 → interval = 1000ms (1s real = 2s game)
  // ratio = 10.0 → interval = 1000ms (1s real = 10s game)
  // ratio = 0.1 → interval = 10000ms (10s real = 1s game)
  return Math.max(1000, Math.ceil(1000 / ratio));
}
```

## Implementation Status

### ✅ COMPLETED PHASES

#### Phase 1: Core Time Advancement Service (TDD) - **COMPLETE**
- ✅ All 32 tests passing
- ✅ TimeAdvancementService fully implemented with singleton pattern
- ✅ Smart interval calculation working correctly
- ✅ Combat hook integration simplified (hooks registered in constructor)
- ✅ Module settings registration complete
- ✅ Runtime error fixed - added missing `advanceSeconds` methods to CalendarManager and TimeConverter

#### Phase 2: Widget UI Integration (TDD) - **COMPLETE**
- ✅ Mini widget template updated with play/pause button
- ✅ Main widget template updated with advancement controls
- ✅ Action handlers implemented with error handling
- ✅ Context preparation includes advancement state
- ✅ CSS styling added for both widgets

#### Runtime Fix Applied
- ✅ **Critical Fix**: Added `advanceSeconds` method to `CalendarManager` (line 406-412)
- ✅ **Critical Fix**: Added `advanceSeconds` method to `TimeConverter` (line 236-242)
- ✅ All tests now pass, build succeeds, runtime error resolved

### 🚧 PENDING PHASES

#### Phase 3: Turning Clock Widget (Optional) - **REMOVED**
- ❌ Widget removed per user request - too complex for current needs
- ❌ Animation complications and positioning issues
- ❌ SVG-based animated clock face
- ❌ Auto-positioning with collision detection

#### Phase 4: Advanced Configuration Interface - **PENDING**
- ⏳ Settings dialog tests
- ⏳ Time advancement settings dialog implementation
- ⏳ Ratio calculation with live updates
- ⏳ Preset ratios and input validation

#### Phase 5: Integration & Performance Testing - **PENDING**
- ⏳ Integration tests with existing S&S functionality
- ⏳ Performance tests with various advancement ratios
- ⏳ Error boundary testing
- ⏳ Memory usage and cleanup validation

## Implementation Phases (Archive)

### Phase 1: Core Time Advancement Service (TDD) - ✅ COMPLETE

#### Step 1.1: Create Tests First - ✅ COMPLETE
**File**: `test/time-advancement-service.test.ts`

Test Coverage Requirements:
- Singleton pattern with proper lifecycle management
- Play/pause functionality with hook firing validation
- Smart interval calculation algorithm
- Combat hook integration with proper cleanup
- Error handling and state recovery scenarios
- Settings integration with type safety
- Resource cleanup and memory management

#### Step 1.2: Implement Service
**File**: `src/core/time-advancement-service.ts`

Core Architecture:
```typescript
export class TimeAdvancementService {
  private static instance: TimeAdvancementService | null = null;
  private isActive: boolean = false;
  private intervalId: ReturnType<typeof setInterval> | null = null;
  private advancementRatio: number = 1;
  private lastAdvancement: number = 0;
  private hookIds: number[] = [];

  private constructor() {} // Prevent external instantiation

  static getInstance(): TimeAdvancementService {
    if (!TimeAdvancementService.instance) {
      TimeAdvancementService.instance = new TimeAdvancementService();
    }
    return TimeAdvancementService.instance;
  }

  // Smart interval calculation: Math.max(1000, Math.ceil(1000 / ratio))
  private calculateOptimalInterval(ratio: number): number {
    return Math.max(1000, Math.ceil(1000 / ratio));
  }

  async play(): Promise<void> {
    if (!this.validateState() || this.isActive) return;
    
    try {
      this.isActive = true;
      await this.startAdvancement();
      this.callHookSafely('seasons-stars:timeAdvancementStarted', this.advancementRatio);
    } catch (error) {
      this.isActive = false;
      ui.notifications?.error('Failed to start time advancement');
      throw error;
    }
  }

  pause(): void {
    if (!this.isActive) return;
    
    this.isActive = false;
    this.stopAdvancement();
    this.callHookSafely('seasons-stars:timeAdvancementPaused');
  }

  initialize(): void {
    this.hookIds.push(
      Hooks.on('combatStart', this.handleCombatStart.bind(this))
    );
    this.hookIds.push(
      Hooks.on('deleteCombat', this.handleCombatEnd.bind(this))
    );
  }

  destroy(): void {
    this.hookIds.forEach(id => Hooks.off(id));
    this.hookIds = [];
    this.stopAdvancement();
  }
}
```

Key Features:
- Type-safe singleton with proper resource cleanup
- Comprehensive error handling for all Foundry API calls
- Smart interval calculation (no user setting needed)
- Proper hook lifecycle management
- Safe settings access with fallbacks

#### Step 1.3: Combat Hook Integration
```typescript
private handleCombatStart = (combat: Combat, updateData?: any): void => {
  if (!this.shouldPauseOnCombat()) return;
  this.pause();
  ui.notifications?.info('Time advancement paused for combat');
};

private handleCombatEnd = (combat: Combat, options?: any, userId?: string): void => {
  if (!this.shouldResumeAfterCombat()) return;
  this.play().catch(error => {
    console.error('seasons-and-stars | Failed to resume after combat:', error);
  });
};

private shouldPauseOnCombat(): boolean {
  return this.isActive && this.getSettingValue('pauseOnCombat', false);
}

private shouldResumeAfterCombat(): boolean {
  return !this.isActive && this.getSettingValue('resumeAfterCombat', false);
}
```

#### Step 1.4: Module Settings
**File**: `src/module.ts` (settings registration)

Required Settings:
- `timeAdvancementRatio` (number, default 1.0, min 0.1, max 100)
- `pauseOnCombat` (boolean, default true)
- `resumeAfterCombat` (boolean, default false)

**No** `timeAdvancementInterval` setting (calculated automatically)

### Phase 2: Widget UI Integration (TDD)

#### Step 2.1: Widget Integration Tests
**Files**: 
- `test/mini-widget-time-advancement.test.ts`
- `test/main-widget-time-advancement.test.ts`

Test Coverage:
- Action handler integration with proper error handling
- Context preparation with advancement state
- Button state updates on play/pause
- UI responsiveness to service state changes
- Async action handling and error states

#### Step 2.2: Mini Widget Updates
**Template**: `templates/calendar-mini-widget.hbs`
```handlebars
<div class="calendar-mini-content">
  {{#if error}}
    <div class="mini-error">{{error}}</div>
  {{else}}
    <div class="mini-header-row">
      <div class="mini-date" data-action="openCalendarSelection" title="{{shortDate}} (Click to change calendar, Double-click for larger view)">
        {{shortDate}}{{#if showTime}}<span class="mini-time"> {{timeString}}</span>{{/if}}
      </div>
      {{#if isGM}}
        <div class="mini-play-pause-controls">
          <button data-action="toggleTimeAdvancement" 
                  class="play-pause-btn {{#if timeAdvancementActive}}active{{/if}}"
                  title="{{#if timeAdvancementActive}}Pause{{else}}Play{{/if}} time advancement ({{advancementRatioDisplay}})">
            <i class="fas fa-{{#if timeAdvancementActive}}pause{{else}}play{{/if}}"></i>
          </button>
        </div>
      {{/if}}
    </div>
    {{#if showTimeControls}}
      <div class="mini-time-controls">
        {{#each (getQuickTimeButtons true)}}
          <button data-action="advanceTime" 
                  data-amount="{{this.amount}}" 
                  data-unit="{{this.unit}}"
                  class="{{#if (lt this.amount 0)}}rewind{{/if}}"
                  title="{{#if (lt this.amount 0)}}Go back{{else}}Advance{{/if}} {{this.label}}">
            <i class="fas fa-{{#if (lt this.amount 0)}}backward{{else}}clock{{/if}}"></i> {{#if (lt this.amount 0)}}{{this.label}}{{else}}+{{this.label}}{{/if}}
          </button>
        {{/each}}
      </div>
    {{/if}}
  {{/if}}
</div>
```

**Component**: `src/ui/calendar-mini-widget.ts`
```typescript
interface WidgetActionHandler {
  (event: Event, target?: HTMLElement): Promise<void> | void;
}

// Add to actions in DEFAULT_OPTIONS
actions: {
  advanceTime: CalendarMiniWidget.prototype._onAdvanceTime,
  openCalendarSelection: CalendarMiniWidget.prototype._onOpenCalendarSelection,
  openLargerView: CalendarMiniWidget.prototype._onOpenLargerView,
  toggleTimeAdvancement: CalendarMiniWidget.prototype._onToggleTimeAdvancement,
}

// Implementation with proper error handling
private async _onToggleTimeAdvancement(event: Event, target?: HTMLElement): Promise<void> {
  event.preventDefault();
  
  try {
    const service = TimeAdvancementService.getInstance();
    if (service.isActive) {
      service.pause();
    } else {
      await service.play();
    }
    
    // Re-render to update button state
    this.render();
  } catch (error) {
    ui.notifications?.error('Failed to toggle time advancement');
    Logger.error('Widget time advancement toggle failed', error as Error);
  }
}
```

#### Step 2.3: Main Widget Updates
**Template**: `templates/calendar-widget.hbs`
```handlebars
{{#if canAdvanceTime}}
  <div class="calendar-controls">
    {{!-- Time Advancement Controls Section --}}
    <div class="time-advancement-section">
      <div class="control-group horizontal">
        <label>Time Advancement:</label>
        <div class="advancement-controls">
          <button data-action="toggleTimeAdvancement" 
                  class="play-pause-btn {{#if timeAdvancementActive}}active{{/if}}"
                  title="{{#if timeAdvancementActive}}Pause{{else}}Play{{/if}} automatic time advancement">
            <i class="fas fa-{{#if timeAdvancementActive}}pause{{else}}play{{/if}}"></i>
            {{#if timeAdvancementActive}}Pause{{else}}Play{{/if}}
          </button>
          <button data-action="openAdvancementSettings" 
                  class="settings-btn"
                  title="Configure time advancement settings">
            <i class="fas fa-cog"></i>
          </button>
          {{#if timeAdvancementActive}}
            <span class="advancement-indicator">
              <i class="fas fa-clock spinning"></i>
              {{advancementRatioDisplay}}
            </span>
          {{/if}}
        </div>
      </div>
    </div>
    
    {{!-- Existing time controls continue below --}}
    {{#if showTimeControls}}
      <div class="time-advance-section">
        <!-- existing quick time buttons -->
      </div>
    {{/if}}
  </div>
{{/if}}
```

**Component**: `src/ui/calendar-widget.ts` - Same pattern as mini widget

#### Step 2.4: CSS Styling
**File**: `src/styles/calendar-mini-widget.scss`
```scss
.mini-header-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  
  .mini-date {
    flex: 1;
    cursor: pointer;
  }
  
  .mini-play-pause-controls {
    .play-pause-btn {
      background: var(--color-bg-btn);
      border: 1px solid var(--color-border-dark);
      border-radius: 3px;
      padding: 2px 4px;
      cursor: pointer;
      font-size: 10px;
      
      &.active {
        background: var(--color-bg-option);
        color: var(--color-text-highlight);
      }
      
      &:hover {
        background: var(--color-bg-btn-hover);
      }
    }
  }
}
```

**File**: `src/styles/calendar-widget.scss`
```scss
.time-advancement-section {
  border-bottom: 1px solid var(--color-border-light-tertiary);
  padding-bottom: 8px;
  margin-bottom: 8px;
  
  .advancement-controls {
    display: flex;
    align-items: center;
    gap: 8px;
    
    .advancement-indicator {
      color: var(--color-text-light-primary);
      font-size: 0.9em;
      
      .spinning {
        animation: spin 2s linear infinite;
      }
    }
  }
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}
```

### Phase 3: Turning Clock Widget (Optional)

#### Step 3.1: Tests
**File**: `test/turning-clock-widget.test.ts`
- Widget rendering and positioning
- Animation state management with proper cleanup
- Click handlers and settings integration
- Memory management during long animations

#### Step 3.2: Implementation
**File**: `src/ui/turning-clock-widget.ts`
**Template**: `templates/turning-clock-widget.hbs`
- Separate ApplicationV2 widget with proper lifecycle management
- SVG-based animated clock face showing advancement ratio
- Auto-positioning with collision detection
- Comprehensive error handling for animation loops

### Phase 4: Advanced Configuration Interface

#### Step 4.1: Settings Dialog Tests
**File**: `test/time-advancement-settings-dialog.test.ts`
- Ratio calculation and live updates
- Preset button functionality with validation
- Input validation and error states
- Settings persistence and retrieval

#### Step 4.2: Settings Dialog Implementation
**File**: `src/ui/time-advancement-settings-dialog.ts`
**Template**: `templates/time-advancement-settings.hbs`
- Type-safe form handling with validation
- Live calculation showing exact advancement rates
- Preset ratios: 1:1 (Real Time), 1:10 (Accelerated), 1:60 (Fast), 2:1 (Cinematic)
- Input validation preventing invalid ratios (0.1 min, 100 max)

### Phase 5: Integration & Performance Testing

#### Step 5.1: Integration Tests
**File**: `test/time-advancement-integration.test.ts`
- Test with existing S&S widgets and functionality
- Test combat hook integration end-to-end
- Test cross-system behavior
- Test performance with various advancement ratios
- Test memory usage and cleanup after extended operation

#### Step 5.2: Error Boundary Testing
**File**: `test/time-advancement-error-handling.test.ts`
- Test service recovery from hook failures
- Test widget state recovery from action errors
- Test settings validation and fallback behavior
- Test cleanup on module disable/reload scenarios

## TDD Implementation Workflow

### Test-First Development Steps
1. **Red Phase**: Write comprehensive failing tests for each component
2. **Green Phase**: Implement minimal code to pass tests with proper error handling
3. **Refactor Phase**: Improve code quality while maintaining 100% test coverage
4. **Expert Review**: Validate against TypeScript and Foundry best practices

## File Listing

### New Files to Create
- `test/time-advancement-service.test.ts`
- `test/mini-widget-time-advancement.test.ts`  
- `test/main-widget-time-advancement.test.ts`
- `test/turning-clock-widget.test.ts` (optional)
- `test/time-advancement-settings-dialog.test.ts`
- `test/time-advancement-integration.test.ts`
- `test/time-advancement-error-handling.test.ts`
- `src/core/time-advancement-service.ts`
- `src/ui/turning-clock-widget.ts` (optional)
- `src/ui/time-advancement-settings-dialog.ts`
- `templates/turning-clock-widget.hbs` (optional)
- `templates/time-advancement-settings.hbs`

### Files to Modify
- `templates/calendar-mini-widget.hbs`
- `templates/calendar-widget.hbs`
- `src/ui/calendar-mini-widget.ts`
- `src/ui/calendar-widget.ts`
- `src/ui/widget-manager.ts`
- `src/module.ts`
- `src/styles/calendar-mini-widget.scss`
- `src/styles/calendar-widget.scss`

## Implementation Notes

### Critical Requirements
- Use TDD approach throughout
- Implement comprehensive error handling
- Follow TypeScript strict patterns
- Use correct Foundry hooks (`combatStart`, `deleteCombat`)
- Ensure proper resource cleanup and memory management
- Maintain 100% test coverage for core functionality

### Testing Strategy
- Unit tests for all service methods
- Integration tests for widget interactions
- Performance tests for long-running scenarios
- Error handling tests for all failure modes
- Mock Foundry APIs appropriately while testing actual behavior

### Quality Gates
- All tests must pass before implementation continues to next phase
- TypeScript strict mode compliance required
- No memory leaks in extended operation scenarios
- Proper cleanup on module disable/reload
- Cross-browser compatibility (Chrome, Firefox, Safari)

This plan provides comprehensive guidance for implementing the play/pause time advancement feature with expert-validated patterns and thorough testing coverage.