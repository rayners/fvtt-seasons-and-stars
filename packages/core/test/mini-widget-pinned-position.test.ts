/**
 * Tests for mini widget pinned positioning
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { CalendarMiniWidget } from '../src/ui/calendar-mini-widget';

const mockSettings = new Map();

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
    (widget as any).applyPinnedPosition();
    const element = widget.element as HTMLElement;
    expect(element.style.top).toBe('100px');
    expect(element.style.left).toBe('50px');
  });

  it('does not pin on simple click without movement', async () => {
    mockSettings.set('seasons-and-stars.miniWidgetPinned', false);
    mockSettings.set('seasons-and-stars.miniWidgetPosition', { top: null, left: null });
    const element = widget.element as HTMLElement;
    Object.assign(element, {
      getBoundingClientRect: () =>
        ({
          top: 100,
          left: 100,
          bottom: 150,
          right: 150,
          width: 50,
          height: 50,
          x: 100,
          y: 100,
          toJSON: () => ({}),
        }) as DOMRect,
    });

    (widget as any).enableDrag();

    element.dispatchEvent(new MouseEvent('mousedown', { button: 0, clientX: 110, clientY: 120 }));
    document.dispatchEvent(new MouseEvent('mouseup', { button: 0, clientX: 110, clientY: 120 }));

    await Promise.resolve();

    expect(mockSettings.get('seasons-and-stars.miniWidgetPinned')).toBe(false);
    expect(mockSettings.get('seasons-and-stars.miniWidgetPosition')).toEqual({
      top: null,
      left: null,
    });
  });

  it('pins and stores coordinates after dragging beyond threshold', async () => {
    mockSettings.set('seasons-and-stars.miniWidgetPinned', false);
    mockSettings.set('seasons-and-stars.miniWidgetPosition', { top: null, left: null });
    const element = widget.element as HTMLElement;
    Object.assign(element, {
      getBoundingClientRect: () =>
        ({
          top: 100,
          left: 100,
          bottom: 150,
          right: 150,
          width: 50,
          height: 50,
          x: 100,
          y: 100,
          toJSON: () => ({}),
        }) as DOMRect,
    });

    (widget as any).enableDrag();

    element.dispatchEvent(new MouseEvent('mousedown', { button: 0, clientX: 110, clientY: 120 }));
    document.dispatchEvent(new MouseEvent('mousemove', { clientX: 160, clientY: 190 }));
    document.dispatchEvent(new MouseEvent('mouseup', { button: 0, clientX: 160, clientY: 190 }));

    await Promise.resolve();
    await Promise.resolve();

    expect(mockSettings.get('seasons-and-stars.miniWidgetPinned')).toBe(true);
    expect(mockSettings.get('seasons-and-stars.miniWidgetPosition')).toEqual({
      top: 170,
      left: 150,
    });
    const elementStyles = widget.element as HTMLElement;
    expect(elementStyles.classList.contains('standalone-mode')).toBe(true);
    expect((widget as any).hasBeenPositioned).toBe(true);
  });

  it('falls back to automatic positioning when stored coordinates are invalid', () => {
    mockSettings.set('seasons-and-stars.miniWidgetPosition', { top: Number.NaN, left: Number.NaN });
    const positionSpy = vi.spyOn(widget as any, 'positionWidget').mockImplementation(() => {});

    (widget as any).applyPinnedPosition();

    expect(positionSpy).toHaveBeenCalledTimes(1);
  });
});
