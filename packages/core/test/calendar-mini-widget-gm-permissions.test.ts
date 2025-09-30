/**
 * Tests for CalendarMiniWidget GM-specific behaviors
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { CalendarMiniWidget } from '../src/ui/calendar-mini-widget';
import { CalendarDate } from '../src/core/calendar-date';
import type { SeasonsStarsCalendar } from '../src/types/calendar';
import { setupFoundryEnvironment } from './setup';

vi.mock('../src/core/time-advancement-service', () => ({
  TimeAdvancementService: {
    getInstance: vi.fn(() => ({ isActive: false })),
  },
}));

describe('CalendarMiniWidget GM permissions', () => {
  let widget: CalendarMiniWidget;
  let mockCalendar: SeasonsStarsCalendar;
  let mockDate: CalendarDate;

  beforeEach(() => {
    setupFoundryEnvironment();
    vi.restoreAllMocks();

    mockCalendar = {
      id: 'test',
      name: 'Test Calendar',
      label: 'Test Calendar',
      months: [{ name: 'January', days: 31 }],
      weekdays: [{ name: 'Monday', abbreviation: 'Mon' }],
      yearLength: 365,
      weekLength: 7,
      epoch: { year: 1, month: 1, day: 1 },
      translations: {
        en: {
          label: 'Test Calendar',
          description: 'A test calendar',
          setting: 'Test setting',
        },
      },
    } as SeasonsStarsCalendar;

    mockDate = new CalendarDate(
      {
        year: 2024,
        month: 1,
        day: 1,
        weekday: 0,
        time: { hour: 12, minute: 0, second: 0 },
      },
      mockCalendar
    );

    game.seasonsStars = {
      manager: {
        getActiveCalendar: vi.fn(() => mockCalendar),
        getCurrentDate: vi.fn(() => mockDate),
      },
    } as any;

    (game.settings.get as any) = vi.fn((module: string, key: string) => {
      if (key === 'timeAdvancementRatio') return 1.0;
      if (key === 'miniWidgetShowTime') return false;
      if (key === 'miniWidgetShowDayOfWeek') return false;
      if (key === 'alwaysShowQuickTimeButtons') return false;
      return undefined;
    });

    widget = new CalendarMiniWidget();
  });

  it('prevents non-GMs from advancing time via _onAdvanceTime', async () => {
    game.user = { isGM: false } as any;
    const manager = game.seasonsStars.manager as any;
    manager.advanceHours = vi.fn();

    const target = document.createElement('div');
    target.dataset.amount = '1';
    target.dataset.unit = 'hours';

    const event = new Event('click');
    await widget._onAdvanceTime(event, target);

    expect(manager.advanceHours).not.toHaveBeenCalled();
  });

  it('allows GMs to advance time via _onAdvanceTime', async () => {
    game.user = { isGM: true } as any;
    const manager = game.seasonsStars.manager as any;
    manager.advanceHours = vi.fn();

    const target = document.createElement('div');
    target.dataset.amount = '1';
    target.dataset.unit = 'hours';

    const event = new Event('click');
    await widget._onAdvanceTime(event, target);

    expect(manager.advanceHours).toHaveBeenCalledWith(1);
  });

  it('prevents non-GMs from toggling time advancement', async () => {
    game.user = { isGM: false } as any;
    const TimeAdvancementService = await import('../src/core/time-advancement-service');
    const mockService = { isActive: false, play: vi.fn(), pause: vi.fn() };
    vi.spyOn(TimeAdvancementService.TimeAdvancementService, 'getInstance').mockReturnValue(
      mockService as any
    );

    const event = new Event('click');
    await widget._onToggleTimeAdvancement(event);

    expect(mockService.play).not.toHaveBeenCalled();
    expect(mockService.pause).not.toHaveBeenCalled();
  });

  it('allows GMs to toggle time advancement', async () => {
    game.user = { isGM: true } as any;
    const TimeAdvancementService = await import('../src/core/time-advancement-service');
    const mockService = { isActive: false, play: vi.fn(), pause: vi.fn() };
    vi.spyOn(TimeAdvancementService.TimeAdvancementService, 'getInstance').mockReturnValue(
      mockService as any
    );

    const event = new Event('click');
    await widget._onToggleTimeAdvancement(event);

    expect(mockService.play).toHaveBeenCalled();
  });

  it('prevents non-GMs from opening calendar selection dialog', async () => {
    game.user = { isGM: false } as any;
    const manager = game.seasonsStars.manager as any;
    manager.getAllCalendars = vi.fn(() => [mockCalendar]);

    const event = new Event('click');
    const target = document.createElement('div');

    await widget._onOpenCalendarSelection(event, target);

    expect(manager.getAllCalendars).not.toHaveBeenCalled();
  });

  it('allows GMs to open calendar selection dialog', async () => {
    game.user = { isGM: true } as any;
    const manager = game.seasonsStars.manager as any;
    manager.getAllCalendars = vi.fn(() => [mockCalendar]);

    const mockDialog = vi.fn();
    vi.doMock('../src/ui/calendar-selection-dialog', () => ({
      CalendarSelectionDialog: mockDialog,
    }));

    const event = new Event('click');
    const target = document.createElement('div');

    await widget._onOpenCalendarSelection(event, target);

    expect(manager.getAllCalendars).toHaveBeenCalled();
  });
});
