/**
 * Tests to ensure DialogV2 button callbacks receive the correct parameters.
 * This prevents regression of issue #414 where the callback might incorrectly
 * treat the third parameter as HTMLElement instead of DialogV2.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { CalendarGridWidget } from '../src/ui/calendar-grid-widget';
import { NoteCategories } from '../src/core/note-categories';
import type { ICalendarDate } from '../src/types/calendar-date';
import { mockStandardCalendar } from './mocks/calendar-mocks';

let mockGame: any;
let mockUI: any;
let mockFoundry: any;
let categories: NoteCategories;
let capturedCallback: any;

beforeEach(() => {
  mockGame = {
    settings: {
      get: vi.fn().mockReturnValue(null),
      set: vi.fn().mockResolvedValue(undefined),
    },
    seasonsStars: {
      manager: {
        getActiveCalendar: vi.fn().mockReturnValue(mockStandardCalendar),
      },
    },
    user: {
      isGM: true,
    },
  };

  global.game = mockGame;
  categories = new NoteCategories();
  mockGame.seasonsStars.categories = categories;
  mockGame.seasonsStars.notes = {
    storage: {
      getAllNotes: vi.fn().mockReturnValue([]),
    },
  };

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
        DialogV2: vi.fn().mockImplementation(function (this: any, config: any) {
          this.config = config;
          capturedCallback = config.buttons?.[0]?.callback;

          const form = document.createElement('form');
          form.innerHTML = `
            <input type="text" name="title" value="Test Title" />
            <textarea name="content">Test Content</textarea>
            <input type="text" name="tags" value="tag1, tag2" />
            <input type="checkbox" name="allDay" checked />
            <select name="category">
              <option value="general" selected>General</option>
            </select>
          `;

          const container = document.createElement('div');
          container.appendChild(form);
          this.element = container;

          this.render = vi.fn().mockReturnValue(this);
          this.close = vi.fn();
          return this;
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
    utils: {
      mergeObject: (a: any, b: any) => ({ ...a, ...b }),
    },
  };

  global.foundry = mockFoundry;
  (global as any).Hooks = {
    callAll: vi.fn(),
    on: vi.fn(),
  };
});

describe('DialogV2 Button Callback Parameters', () => {
  it('callback receives DialogV2 instance as third parameter', async () => {
    const widget = new CalendarGridWidget(mockStandardCalendar);
    const testDate: ICalendarDate = { year: 2024, month: 1, day: 15 };

    const resultPromise = (widget as any).showCreateNoteDialog(testDate);

    expect(capturedCallback).toBeDefined();
    expect(typeof capturedCallback).toBe('function');

    const mockEvent = new Event('click');
    const mockButton = document.createElement('button');

    const form = document.createElement('form');
    form.innerHTML = `
      <input type="text" name="title" value="Test Title" />
      <textarea name="content">Test Content</textarea>
      <input type="text" name="tags" value="tag1, tag2" />
      <input type="checkbox" name="allDay" checked />
      <select name="category">
        <option value="general" selected>General</option>
      </select>
    `;
    const container = document.createElement('div');
    container.appendChild(form);

    const mockDialogInstance = {
      element: container,
    };

    await capturedCallback(mockEvent, mockButton, mockDialogInstance);
    const result = await resultPromise;

    expect(result).not.toBeNull();
    expect(result?.title).toBe('Test Title');
  });

  it('callback can access dialog.element to query form', async () => {
    const widget = new CalendarGridWidget(mockStandardCalendar);
    const testDate: ICalendarDate = { year: 2024, month: 1, day: 15 };

    const resultPromise = (widget as any).showCreateNoteDialog(testDate);

    const mockEvent = new Event('click');
    const mockButton = document.createElement('button');

    const form = document.createElement('form');
    form.innerHTML = `
      <input type="text" name="title" value="Test Title" />
      <textarea name="content">Test Content</textarea>
      <input type="text" name="tags" value="tag1, tag2" />
      <input type="checkbox" name="allDay" checked />
      <select name="category">
        <option value="general" selected>General</option>
      </select>
    `;
    const container = document.createElement('div');
    container.appendChild(form);

    const mockDialogInstance = {
      element: container,
    };

    expect(mockDialogInstance.element).toBeDefined();
    expect(mockDialogInstance.element.querySelector('form')).toBeDefined();

    await capturedCallback(mockEvent, mockButton, mockDialogInstance);
    const result = await resultPromise;

    expect(result).toBeDefined();
    expect(result?.title).toBe('Test Title');
    expect(result?.content).toBe('Test Content');
    expect(result?.tags).toEqual(['tag1', 'tag2']);
  });

  it('callback fails validation when title is empty', async () => {
    const widget = new CalendarGridWidget(mockStandardCalendar);
    const testDate: ICalendarDate = { year: 2024, month: 1, day: 15 };

    const resultPromise = (widget as any).showCreateNoteDialog(testDate);

    const mockEvent = new Event('click');
    const mockButton = document.createElement('button');

    const form = document.createElement('form');
    form.innerHTML = `
      <input type="text" name="title" value="" />
      <textarea name="content">Content</textarea>
    `;
    const container = document.createElement('div');
    container.appendChild(form);

    const mockDialogInstance = {
      element: container,
    };

    await capturedCallback(mockEvent, mockButton, mockDialogInstance);
    const result = await resultPromise;

    expect(mockUI.notifications.error).toHaveBeenCalledWith('Note title is required');
    expect(result).toBeNull();
  });
});
