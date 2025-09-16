/**
 * Tests for mini widget pinned positioning
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { CalendarMiniWidget } from '../src/ui/calendar-mini-widget';

const mockSettings = new Map();

// Mock foundry.utils for mergeObject
(global as any).foundry = {
  utils: {
    mergeObject: (original: any, other: any) => ({ ...original, ...other }),
  },
  applications: {
    ux: {
      Draggable: vi.fn().mockImplementation(() => ({
        _onDragMouseDown: vi.fn(),
        _onDragMouseUp: vi.fn(),
      })),
    },
  },
};

global.game = {
  settings: {
    get: vi.fn((module: string, key: string) => mockSettings.get(`${module}.${key}`)),
    set: vi.fn((module: string, key: string, value: unknown) => {
      mockSettings.set(`${module}.${key}`, value);
      return Promise.resolve();
    }),
  },
  user: { isGM: true },
  seasonsStars: {} as any,
} as any;

vi.mock('../src/ui/base-widget-manager', () => ({
  SmallTimeUtils: {
    isSmallTimeAvailable: () => false,
    getSmallTimeElement: () => null,
  },
}));

describe('Mini Widget Pinned Positioning', () => {
  let widget: CalendarMiniWidget;

  beforeEach(() => {
    vi.clearAllMocks();
    mockSettings.clear();
    mockSettings.set('seasons-and-stars.miniWidgetPinned', true);
    mockSettings.set('seasons-and-stars.miniWidgetPosition', { top: 100, left: 50 });

    widget = new CalendarMiniWidget();
    (widget as any).element = document.createElement('div');
  });

  it('applies stored position when pinned', () => {
    // Set up ApplicationV2 position property (mock)
    (widget as any).position = { top: 100, left: 50 };

    (widget as any).applyPinnedPosition();
    const element = widget.element as HTMLElement;
    expect(element.style.top).toBe('100px');
    expect(element.style.left).toBe('50px');
    expect(element.style.position).toBe('fixed');
    expect(element.classList.contains('standalone-mode')).toBe(true);
  });

  it('sets up dragging with Foundry Draggable class', () => {
    const element = widget.element as HTMLElement;

    // Verify setupDragging method completes without errors
    expect(() => {
      (widget as any).setupDragging();
    }).not.toThrow();

    // Verify Draggable constructor was called
    expect((global as any).foundry.applications.ux.Draggable).toHaveBeenCalledWith(
      widget, // app
      element, // element
      element, // handle
      false // resizable
    );
  });

  it('skips positioning when ApplicationV2 position is undefined', () => {
    // Set up ApplicationV2 position property as undefined (no stored position)
    (widget as any).position = { top: undefined, left: undefined };
    const element = widget.element as HTMLElement;

    (widget as any).applyPinnedPosition();

    // Should not set position styles when position is undefined
    expect(element.style.top).toBe('');
    expect(element.style.left).toBe('');
    expect(element.style.position).toBe('');
    // But should still apply the styling classes
    expect(element.classList.contains('standalone-mode')).toBe(true);
  });
});
