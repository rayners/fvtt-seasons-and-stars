/**
 * Tests for CalendarWidget GM-specific behaviors and template access
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import Handlebars from 'handlebars';
import path from 'path';
import fs from 'fs';
import { CalendarWidget } from '../../../src/ui/calendar-widget';
import { CalendarSelectionDialog } from '../../../src/ui/calendar-selection-dialog';
import { CalendarDate } from '../../../src/core/calendar-date';
import type { SeasonsStarsCalendar } from '../../../src/types/calendar';
import { setupFoundryEnvironment } from './setup';

// Mock TimeAdvancementService to avoid initialization logic
vi.mock('../../../src/core/time-advancement-service', () => ({
  TimeAdvancementService: {
    getInstance: vi.fn(() => ({ shouldShowPauseButton: false })),
  },
}));

// Use real Handlebars for template rendering
(globalThis as any).Handlebars = Handlebars;

describe('CalendarWidget GM permissions', () => {
  let widget: CalendarWidget;
  let template: Handlebars.TemplateDelegate;
  let mockCalendar: SeasonsStarsCalendar;
  let mockDate: CalendarDate;

  beforeEach(() => {
    setupFoundryEnvironment();
    vi.restoreAllMocks();

    // Stub SmallTime detection to disable quick time controls in template
    vi.spyOn(CalendarWidget.prototype as any, 'detectSmallTime').mockReturnValue(true);

    // Load and compile the widget template
    const templatePath = path.join(__dirname, '../templates/calendar-widget.hbs');
    const source = fs.readFileSync(templatePath, 'utf8');
    template = Handlebars.compile(source);

    // Minimal calendar and date setup
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

    // Configure game globals used by the widget
    game.seasonsStars = {
      manager: {
        getActiveCalendar: vi.fn(() => mockCalendar),
        getCurrentDate: vi.fn(() => mockDate),
      },
    } as any;

    (game.settings.get as any) = vi.fn((module: string, key: string) => {
      if (key === 'timeAdvancementRatio') return 1.0;
      if (key === 'pauseOnCombat') return true;
      if (key === 'resumeAfterCombat') return false;
      if (key === 'alwaysShowQuickTimeButtons') return false;
      return undefined;
    });

    widget = new CalendarWidget();
  });

  it('prevents non-GMs from opening the calendar selection dialog', async () => {
    game.user = { isGM: false } as any;
    const showSpy = vi.spyOn(CalendarSelectionDialog, 'show').mockResolvedValue();

    const event = new Event('click');
    await widget._onOpenCalendarSelection(event, document.createElement('div'));

    expect(showSpy).not.toHaveBeenCalled();
  });

  it('renders calendar selector only for GMs', async () => {
    // GM view
    game.user = { isGM: true } as any;
    let context = await widget._prepareContext();
    expect(context.isGM).toBe(true);
    let html = template(context);
    expect(html).toContain('data-action="openCalendarSelection"');

    // Player view
    game.user = { isGM: false } as any;
    context = await widget._prepareContext();
    expect(context.isGM).toBe(false);
    html = template(context);
    expect(html).not.toContain('data-action="openCalendarSelection"');
  });

  it('prevents non-GMs from advancing time via _onAdvanceDate', async () => {
    game.user = { isGM: false } as any;
    const manager = game.seasonsStars.manager as any;
    manager.advanceDays = vi.fn();

    const target = document.createElement('div');
    target.dataset.amount = '1';
    target.dataset.unit = 'days';

    const event = new Event('click');
    await widget._onAdvanceDate(event, target);

    expect(manager.advanceDays).not.toHaveBeenCalled();
  });

  it('allows GMs to advance time via _onAdvanceDate', async () => {
    game.user = { isGM: true } as any;
    const manager = game.seasonsStars.manager as any;
    manager.advanceDays = vi.fn();

    const target = document.createElement('div');
    target.dataset.amount = '1';
    target.dataset.unit = 'days';

    const event = new Event('click');
    await widget._onAdvanceDate(event, target);

    expect(manager.advanceDays).toHaveBeenCalledWith(1);
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
});
