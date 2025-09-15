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
});
