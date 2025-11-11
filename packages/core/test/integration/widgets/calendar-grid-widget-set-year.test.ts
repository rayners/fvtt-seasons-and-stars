/**
 * Tests for CalendarGridWidget._onSetYear method
 * Ensures DialogV2 migration handles validation, close events, and error cases correctly
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { CalendarGridWidget } from '../../../src/ui/calendar-grid-widget';
import { mockStandardCalendar } from '../../mocks/calendar-mocks';
import type { ICalendarDate } from '../../../src/types/calendar-date';

let mockGame: any;
let mockUI: any;
let mockFoundry: any;
let capturedConfig: any;

beforeEach(() => {
  mockGame = {
    settings: {
      get: vi.fn().mockReturnValue('setDate'),
    },
    seasonsStars: {
      manager: {
        getActiveCalendar: vi.fn().mockReturnValue(mockStandardCalendar),
        getCurrentDate: vi.fn().mockReturnValue({
          year: 2024,
          month: 1,
          day: 1,
          weekday: 0,
          time: { hour: 0, minute: 0, second: 0 },
        }),
        getActiveEngine: vi.fn().mockReturnValue({
          addMonths: vi.fn((date: any, months: number) => ({
            ...date,
            month: date.month + months,
          })),
          addYears: vi.fn((date: any, years: number) => ({
            ...date,
            year: date.year + years,
          })),
        }),
      },
    },
    user: {
      isGM: true,
    },
  };

  global.game = mockGame;

  mockUI = {
    notifications: {
      error: vi.fn(),
      warn: vi.fn(),
      info: vi.fn(),
    },
  };
  global.ui = mockUI;

  mockFoundry = {
    applications: {
      api: {
        DialogV2: vi.fn().mockImplementation(function (config: any) {
          capturedConfig = config;

          const form = document.createElement('form');
          form.innerHTML = `<input type="number" name="year" value="${config.content.match(/value="(\d+)"/)?.[1] || '2024'}" />`;

          const container = document.createElement('div');
          container.appendChild(form);

          const mockDialog = {
            element: container,
            config: config,
            render: vi.fn(),
            close: vi.fn(),
          };
          mockDialog.render.mockReturnValue(mockDialog);

          return mockDialog;
        }),
        HandlebarsApplicationMixin: (base: any) => base,
        ApplicationV2: class {
          async render() {
            return this;
          }
          async close() {
            return this;
          }
        },
      },
    },
  };

  global.foundry = mockFoundry;
  (global as any).Hooks = {
    callAll: vi.fn(),
    on: vi.fn(),
  };
});

describe('CalendarGridWidget._onSetYear', () => {
  it('should set year when valid number is entered', async () => {
    const widget = new CalendarGridWidget({
      year: 2024,
      month: 1,
      day: 1,
      weekday: 0,
      time: { hour: 0, minute: 0, second: 0 },
    } as ICalendarDate);

    widget.render = vi.fn();

    const mockEvent = new Event('click');
    const mockTarget = document.createElement('button');

    const resultPromise = (widget as any)._onSetYear(mockEvent, mockTarget);

    expect(capturedConfig).toBeDefined();
    expect(capturedConfig.buttons).toBeDefined();
    expect(capturedConfig.buttons.length).toBe(2);

    const okButton = capturedConfig.buttons.find((btn: any) => btn.action === 'ok');
    expect(okButton).toBeDefined();
    expect(okButton.callback).toBeDefined();

    const form = document.createElement('form');
    form.innerHTML = '<input type="number" name="year" value="2025" />';
    const container = document.createElement('div');
    container.appendChild(form);

    const mockDialogInstance = {
      element: container,
      close: vi.fn(),
    };

    const mockButtonElement = document.createElement('button');
    await okButton.callback(new Event('click'), mockButtonElement, mockDialogInstance);

    await resultPromise;

    expect((widget as any).viewDate.year).toBe(2025);
    expect(widget.render).toHaveBeenCalled();
  });

  it('should show error and keep dialog open for invalid year (NaN)', async () => {
    const widget = new CalendarGridWidget({
      year: 2024,
      month: 1,
      day: 1,
      weekday: 0,
      time: { hour: 0, minute: 0, second: 0 },
    } as ICalendarDate);

    widget.render = vi.fn();

    const mockEvent = new Event('click');
    const mockTarget = document.createElement('button');

    (widget as any)._onSetYear(mockEvent, mockTarget);

    const okButton = capturedConfig.buttons.find((btn: any) => btn.action === 'ok');

    const form = document.createElement('form');
    form.innerHTML = '<input type="number" name="year" value="abc" />';
    const container = document.createElement('div');
    container.appendChild(form);

    const mockDialogInstance = {
      element: container,
      close: vi.fn(),
    };

    const mockButtonElement = document.createElement('button');
    await okButton.callback(new Event('click'), mockButtonElement, mockDialogInstance);

    expect(mockUI.notifications.error).toHaveBeenCalledWith('Please enter a valid year');
    expect(mockDialogInstance.close).not.toHaveBeenCalled();
    expect(widget.render).not.toHaveBeenCalled();
  });

  it('should show error and keep dialog open for invalid year (zero)', async () => {
    const widget = new CalendarGridWidget({
      year: 2024,
      month: 1,
      day: 1,
      weekday: 0,
      time: { hour: 0, minute: 0, second: 0 },
    } as ICalendarDate);

    widget.render = vi.fn();

    const mockEvent = new Event('click');
    const mockTarget = document.createElement('button');

    (widget as any)._onSetYear(mockEvent, mockTarget);

    const okButton = capturedConfig.buttons.find((btn: any) => btn.action === 'ok');

    const form = document.createElement('form');
    form.innerHTML = '<input type="number" name="year" value="0" />';
    const container = document.createElement('div');
    container.appendChild(form);

    const mockDialogInstance = {
      element: container,
      close: vi.fn(),
    };

    const mockButtonElement = document.createElement('button');
    await okButton.callback(new Event('click'), mockButtonElement, mockDialogInstance);

    expect(mockUI.notifications.error).toHaveBeenCalledWith('Please enter a valid year');
    expect(mockDialogInstance.close).not.toHaveBeenCalled();
    expect(widget.render).not.toHaveBeenCalled();
  });

  it('should show error and keep dialog open for invalid year (negative)', async () => {
    const widget = new CalendarGridWidget({
      year: 2024,
      month: 1,
      day: 1,
      weekday: 0,
      time: { hour: 0, minute: 0, second: 0 },
    } as ICalendarDate);

    widget.render = vi.fn();

    const mockEvent = new Event('click');
    const mockTarget = document.createElement('button');

    (widget as any)._onSetYear(mockEvent, mockTarget);

    const okButton = capturedConfig.buttons.find((btn: any) => btn.action === 'ok');

    const form = document.createElement('form');
    form.innerHTML = '<input type="number" name="year" value="-5" />';
    const container = document.createElement('div');
    container.appendChild(form);

    const mockDialogInstance = {
      element: container,
      close: vi.fn(),
    };

    const mockButtonElement = document.createElement('button');
    await okButton.callback(new Event('click'), mockButtonElement, mockDialogInstance);

    expect(mockUI.notifications.error).toHaveBeenCalledWith('Please enter a valid year');
    expect(mockDialogInstance.close).not.toHaveBeenCalled();
    expect(widget.render).not.toHaveBeenCalled();
  });

  it('should not change year when cancel button is clicked', async () => {
    const widget = new CalendarGridWidget({
      year: 2024,
      month: 1,
      day: 1,
      weekday: 0,
      time: { hour: 0, minute: 0, second: 0 },
    } as ICalendarDate);

    widget.render = vi.fn();

    const mockEvent = new Event('click');
    const mockTarget = document.createElement('button');

    const resultPromise = (widget as any)._onSetYear(mockEvent, mockTarget);

    const cancelButton = capturedConfig.buttons.find((btn: any) => btn.action === 'cancel');
    expect(cancelButton).toBeDefined();

    cancelButton.callback();

    await resultPromise;

    expect((widget as any).viewDate.year).toBe(2024);
    expect(widget.render).not.toHaveBeenCalled();
  });

  it('should not change year when dialog is closed via ESC/X button', async () => {
    const widget = new CalendarGridWidget({
      year: 2024,
      month: 1,
      day: 1,
      weekday: 0,
      time: { hour: 0, minute: 0, second: 0 },
    } as ICalendarDate);

    widget.render = vi.fn();

    const mockEvent = new Event('click');
    const mockTarget = document.createElement('button');

    const resultPromise = (widget as any)._onSetYear(mockEvent, mockTarget);

    expect(capturedConfig.close).toBeDefined();

    capturedConfig.close();

    await resultPromise;

    expect((widget as any).viewDate.year).toBe(2024);
    expect(widget.render).not.toHaveBeenCalled();
  });

  it('should handle form element not found gracefully', async () => {
    const widget = new CalendarGridWidget({
      year: 2024,
      month: 1,
      day: 1,
      weekday: 0,
      time: { hour: 0, minute: 0, second: 0 },
    } as ICalendarDate);

    widget.render = vi.fn();

    const mockEvent = new Event('click');
    const mockTarget = document.createElement('button');

    (widget as any)._onSetYear(mockEvent, mockTarget);

    const okButton = capturedConfig.buttons.find((btn: any) => btn.action === 'ok');

    const container = document.createElement('div');

    const mockDialogInstance = {
      element: container,
      close: vi.fn(),
    };

    const mockButtonElement = document.createElement('button');

    let errorThrown = false;
    try {
      await okButton.callback(new Event('click'), mockButtonElement, mockDialogInstance);
    } catch {
      errorThrown = true;
    }

    expect(errorThrown).toBe(false);
    expect(mockUI.notifications.error).toHaveBeenCalledWith('Dialog form not found');
    expect(mockDialogInstance.close).not.toHaveBeenCalled();
  });

  it('should handle dialog.element being null', async () => {
    const widget = new CalendarGridWidget({
      year: 2024,
      month: 1,
      day: 1,
      weekday: 0,
      time: { hour: 0, minute: 0, second: 0 },
    } as ICalendarDate);

    widget.render = vi.fn();

    const mockEvent = new Event('click');
    const mockTarget = document.createElement('button');

    (widget as any)._onSetYear(mockEvent, mockTarget);

    const okButton = capturedConfig.buttons.find((btn: any) => btn.action === 'ok');

    const mockDialogInstance = {
      element: null,
      close: vi.fn(),
    };

    const mockButtonElement = document.createElement('button');

    let errorThrown = false;
    try {
      await okButton.callback(new Event('click'), mockButtonElement, mockDialogInstance);
    } catch {
      errorThrown = true;
    }

    expect(errorThrown).toBe(false);
    expect(mockUI.notifications.error).toHaveBeenCalledWith('Dialog form not found');
    expect(mockDialogInstance.close).not.toHaveBeenCalled();
  });

  it('should use current viewDate year as default', async () => {
    const widget = new CalendarGridWidget({
      year: 2030,
      month: 6,
      day: 15,
      weekday: 0,
      time: { hour: 12, minute: 30, second: 0 },
    } as ICalendarDate);

    const mockEvent = new Event('click');
    const mockTarget = document.createElement('button');

    (widget as any)._onSetYear(mockEvent, mockTarget);

    expect(capturedConfig.content).toContain('value="2030"');
  });

  it('should prevent default on event', async () => {
    const widget = new CalendarGridWidget({
      year: 2024,
      month: 1,
      day: 1,
      weekday: 0,
      time: { hour: 0, minute: 0, second: 0 },
    } as ICalendarDate);

    const mockEvent = new Event('click');
    mockEvent.preventDefault = vi.fn();
    const mockTarget = document.createElement('button');

    (widget as any)._onSetYear(mockEvent, mockTarget);

    expect(mockEvent.preventDefault).toHaveBeenCalled();
  });

  it('should return early if engine is not available', async () => {
    mockGame.seasonsStars.manager.getActiveEngine = vi.fn().mockReturnValue(null);

    const widget = new CalendarGridWidget({
      year: 2024,
      month: 1,
      day: 1,
      weekday: 0,
      time: { hour: 0, minute: 0, second: 0 },
    } as ICalendarDate);

    const mockEvent = new Event('click');
    const mockTarget = document.createElement('button');

    await (widget as any)._onSetYear(mockEvent, mockTarget);

    expect(mockFoundry.applications.api.DialogV2).not.toHaveBeenCalled();
  });
});
