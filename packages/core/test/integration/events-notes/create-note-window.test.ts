/**
 * Tests for CreateNoteWindow - ApplicationV2-based note creation window
 * Follows TDD principles - tests written before implementation
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { CreateNoteWindow } from '../../../src/ui/create-note-window';
import { NoteCategories } from '../../../src/core/note-categories';
import type { CalendarDate as ICalendarDate } from '../../../src/types/calendar';
import { mockStandardCalendar } from './mocks/calendar-mocks';

let categories: NoteCategories;
let mockGame: any;
let mockUI: any;
let mockFoundry: any;
let mockNotesManager: any;

beforeEach(() => {
  // Mock game.settings for NoteCategories
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

  // Create real NoteCategories instance
  global.game = mockGame;
  categories = new NoteCategories();
  mockGame.seasonsStars.categories = categories;

  // Mock notes manager
  mockNotesManager = {
    createNote: vi.fn().mockResolvedValue({
      id: 'test-note-id',
      name: 'Test Note',
    }),
    storage: {
      getAllNotes: vi.fn().mockReturnValue([
        {
          flags: {
            'seasons-and-stars': {
              tags: ['existing-tag', 'another-tag'],
            },
          },
        },
      ]),
    },
  };

  mockGame.seasonsStars.notes = mockNotesManager;

  // Mock UI notifications
  mockUI = {
    notifications: {
      error: vi.fn(),
      warn: vi.fn(),
      info: vi.fn(),
    },
  };

  // Mock Foundry ApplicationV2
  mockFoundry = {
    applications: {
      api: {
        HandlebarsApplicationMixin: (base: any) => base,
        ApplicationV2: class {
          element: HTMLElement | null = null;
          rendered = false;

          async render() {
            this.rendered = true;
            return this;
          }

          async close() {
            this.rendered = false;
            return this;
          }
        },
      },
    },
    utils: {
      mergeObject: (a: any, b: any) => ({ ...a, ...b }),
    },
  };

  global.ui = mockUI;
  global.foundry = mockFoundry;
  (global as any).Hooks = {
    callAll: vi.fn(),
    on: vi.fn(),
  };

  // Mock document
  global.document = {
    createElement: vi.fn().mockReturnValue({
      addEventListener: vi.fn(),
      querySelector: vi.fn(),
      querySelectorAll: vi.fn().mockReturnValue([]),
      style: {},
    }),
    addEventListener: vi.fn(),
  } as any;
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('CreateNoteWindow - Initialization', () => {
  it('creates window with date and callback options', () => {
    const testDate: ICalendarDate = { year: 2024, month: 3, day: 15 };
    const callback = vi.fn();

    const window = new CreateNoteWindow({
      date: testDate,
      onNoteCreated: callback,
    });

    expect(window).toBeDefined();
    expect((window as any).date).toEqual(testDate);
    expect((window as any).onNoteCreated).toBe(callback);
  });

  it('creates window without callback', () => {
    const testDate: ICalendarDate = { year: 2024, month: 3, day: 15 };

    const window = new CreateNoteWindow({
      date: testDate,
    });

    expect(window).toBeDefined();
    expect((window as any).date).toEqual(testDate);
    expect((window as any).onNoteCreated).toBeUndefined();
  });

  it('has correct DEFAULT_OPTIONS configuration', () => {
    expect(CreateNoteWindow.DEFAULT_OPTIONS).toBeDefined();
    expect(CreateNoteWindow.DEFAULT_OPTIONS.window?.title).toBe('Create Note');
    expect(CreateNoteWindow.DEFAULT_OPTIONS.window?.icon).toBe('fas fa-calendar-plus');
    expect(CreateNoteWindow.DEFAULT_OPTIONS.position?.width).toBe(600);
  });

  it('has correct PARTS configuration for template', () => {
    expect(CreateNoteWindow.PARTS).toBeDefined();
    expect(CreateNoteWindow.PARTS.form).toBeDefined();
    expect(CreateNoteWindow.PARTS.form.template).toBe(
      'modules/seasons-and-stars/templates/create-note-form.hbs'
    );
  });

  it('has actions defined for create, createAnother, and close', () => {
    expect(CreateNoteWindow.DEFAULT_OPTIONS.actions).toBeDefined();
    expect(CreateNoteWindow.DEFAULT_OPTIONS.actions?.create).toBeDefined();
    expect(CreateNoteWindow.DEFAULT_OPTIONS.actions?.createAnother).toBeDefined();
    expect(CreateNoteWindow.DEFAULT_OPTIONS.actions?.close).toBeDefined();
  });
});

describe('CreateNoteWindow - Context Preparation', () => {
  it('prepares context with date display and categories', async () => {
    const testDate: ICalendarDate = { year: 2024, month: 3, day: 15 };
    const window = new CreateNoteWindow({ date: testDate });

    const context = await (window as any)._prepareContext();

    expect(context).toBeDefined();
    expect(context.date).toEqual(testDate);
    expect(context.dateDisplay).toBeDefined();
    expect(context.categories).toBeDefined();
    expect(context.categories.length).toBeGreaterThan(0);
  });

  it('formats date display with calendar information', async () => {
    const testDate: ICalendarDate = { year: 2024, month: 3, day: 15 };
    const window = new CreateNoteWindow({ date: testDate });

    const context = await (window as any)._prepareContext();

    // Should format with calendar name: "15 Reaping, 2024"
    expect(context.dateDisplay).toContain('15');
    expect(context.dateDisplay).toContain('2024');
  });

  it('includes default category in context', async () => {
    const testDate: ICalendarDate = { year: 2024, month: 3, day: 15 };
    const window = new CreateNoteWindow({ date: testDate });

    const context = await (window as any)._prepareContext();

    // Default category is marked with selected: true in categories array
    const selectedCategory = context.categories.find((cat: any) => cat.selected);
    expect(selectedCategory).toBeDefined();
    expect(selectedCategory.isDefault).toBe(true);
  });

  it('includes all available tags in context', async () => {
    const testDate: ICalendarDate = { year: 2024, month: 3, day: 15 };
    const window = new CreateNoteWindow({ date: testDate });

    const context = await (window as any)._prepareContext();

    expect(context.allTags).toBeDefined();
    expect(Array.isArray(context.allTags)).toBe(true);
    expect(context.allTags.length).toBeGreaterThan(0);
  });

  it('handles missing categories system gracefully', async () => {
    mockGame.seasonsStars.categories = undefined;
    const testDate: ICalendarDate = { year: 2024, month: 3, day: 15 };
    const window = new CreateNoteWindow({ date: testDate });

    const context = await (window as any)._prepareContext();

    expect(context.error).toBe('Note categories system not available');
    expect(context.categories).toEqual([]);
  });
});

describe('CreateNoteWindow - Tag Management', () => {
  it('loads existing tags from notes storage', () => {
    const testDate: ICalendarDate = { year: 2024, month: 3, day: 15 };
    const window = new CreateNoteWindow({ date: testDate });

    const existingTags = (window as any)._getExistingTags();

    expect(existingTags).toContain('existing-tag');
    expect(existingTags).toContain('another-tag');
  });

  it('handles missing notes storage gracefully', () => {
    mockNotesManager.storage = undefined;
    const testDate: ICalendarDate = { year: 2024, month: 3, day: 15 };
    const window = new CreateNoteWindow({ date: testDate });

    const existingTags = (window as any)._getExistingTags();

    expect(Array.isArray(existingTags)).toBe(true);
    expect(existingTags.length).toBeGreaterThanOrEqual(0);
  });

  it('deduplicates tags from multiple notes', () => {
    mockNotesManager.storage.getAllNotes = vi
      .fn()
      .mockReturnValue([
        { flags: { 'seasons-and-stars': { tags: ['tag1', 'tag2'] } } },
        { flags: { 'seasons-and-stars': { tags: ['tag2', 'tag3'] } } },
        { flags: { 'seasons-and-stars': { tags: ['tag1', 'tag4'] } } },
      ]);

    const testDate: ICalendarDate = { year: 2024, month: 3, day: 15 };
    const window = new CreateNoteWindow({ date: testDate });

    const existingTags = (window as any)._getExistingTags();

    expect(existingTags).toContain('tag1');
    expect(existingTags).toContain('tag2');
    expect(existingTags).toContain('tag3');
    expect(existingTags).toContain('tag4');
    // Should have exactly 4 unique tags
    expect(new Set(existingTags).size).toBe(4);
  });
});

describe('CreateNoteWindow - Note Creation', () => {
  it('validates and creates note with valid data', async () => {
    const testDate: ICalendarDate = { year: 2024, month: 3, day: 15 };
    const window = new CreateNoteWindow({ date: testDate });

    // Mock FormData (no longer includes tags - they come from string-tags element)
    (global as any).FormData = class {
      data = new Map([
        ['title', 'Test Note'],
        ['content', 'Test content'],
        ['category', 'general'],
      ]);
      get(key: string) {
        return this.data.get(key);
      }
      has(key: string) {
        return key === 'allDay';
      }
    };

    // Mock string-tags element
    const mockStringTags = {
      value: ['tag1', 'tag2'],
    };

    // Mock form element with querySelector
    const mockForm = {
      querySelector: vi.fn((selector: string) => {
        if (selector === 'string-tags') return mockStringTags;
        return null;
      }),
    };

    (window as any).element = {
      querySelector: vi.fn((selector: string) => {
        if (selector === 'form') return mockForm;
        return null;
      }),
    };

    const success = await (window as any)._validateAndCreateNote();

    expect(success).toBe(true);
    expect(mockNotesManager.createNote).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Test Note',
        content: 'Test content',
        startDate: testDate,
        tags: expect.arrayContaining(['tag1', 'tag2']),
        category: 'general',
      })
    );
  });

  it('rejects note creation with empty title', async () => {
    const testDate: ICalendarDate = { year: 2024, month: 3, day: 15 };
    const window = new CreateNoteWindow({ date: testDate });

    (global as any).FormData = class {
      get(key: string) {
        return key === 'title' ? '' : 'value';
      }
      has() {
        return false;
      }
    };

    // Mock string-tags element
    const mockStringTags = {
      value: [],
    };

    // Mock form element with querySelector
    const mockForm = {
      querySelector: vi.fn((selector: string) => {
        if (selector === 'string-tags') return mockStringTags;
        return null;
      }),
    };

    (window as any).element = {
      querySelector: vi.fn((selector: string) => {
        if (selector === 'form') return mockForm;
        return null;
      }),
    };

    const success = await (window as any)._validateAndCreateNote();

    expect(success).toBe(false);
    expect(mockUI.notifications.error).toHaveBeenCalledWith('Note title is required');
    expect(mockNotesManager.createNote).not.toHaveBeenCalled();
  });

  it('shows notification on successful note creation', async () => {
    const testDate: ICalendarDate = { year: 2024, month: 3, day: 15 };
    const window = new CreateNoteWindow({ date: testDate });

    (global as any).FormData = class {
      get(key: string) {
        const values: any = { title: 'Test Note', content: '', category: 'general' };
        return values[key];
      }
      has() {
        return true;
      }
    };

    // Mock string-tags element with empty tags
    const mockStringTags = {
      value: [],
    };

    // Mock form element with querySelector
    const mockForm = {
      querySelector: vi.fn((selector: string) => {
        if (selector === 'string-tags') return mockStringTags;
        return null;
      }),
    };

    (window as any).element = {
      querySelector: vi.fn((selector: string) => {
        if (selector === 'form') return mockForm;
        return null;
      }),
    };

    await (window as any)._validateAndCreateNote();

    expect(mockUI.notifications.info).toHaveBeenCalledWith('Created note: Test Note');
  });

  it('calls onNoteCreated callback when provided', async () => {
    const testDate: ICalendarDate = { year: 2024, month: 3, day: 15 };
    const callback = vi.fn();
    const window = new CreateNoteWindow({ date: testDate, onNoteCreated: callback });

    (global as any).FormData = class {
      get(key: string) {
        const values: any = { title: 'Test Note', content: '', category: 'general' };
        return values[key];
      }
      has() {
        return true;
      }
    };

    // Mock string-tags element with empty tags
    const mockStringTags = {
      value: [],
    };

    // Mock form element with querySelector
    const mockForm = {
      querySelector: vi.fn((selector: string) => {
        if (selector === 'string-tags') return mockStringTags;
        return null;
      }),
    };

    (window as any).element = {
      querySelector: vi.fn((selector: string) => {
        if (selector === 'form') return mockForm;
        return null;
      }),
    };

    await (window as any)._validateAndCreateNote();

    expect(callback).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'test-note-id',
        name: 'Test Note',
      })
    );
  });

  it('emits hook for note creation', async () => {
    const testDate: ICalendarDate = { year: 2024, month: 3, day: 15 };
    const window = new CreateNoteWindow({ date: testDate });

    (global as any).FormData = class {
      get(key: string) {
        const values: any = { title: 'Test Note', content: '', category: 'general' };
        return values[key];
      }
      has() {
        return true;
      }
    };

    // Mock string-tags element with empty tags
    const mockStringTags = {
      value: [],
    };

    // Mock form element with querySelector
    const mockForm = {
      querySelector: vi.fn((selector: string) => {
        if (selector === 'string-tags') return mockStringTags;
        return null;
      }),
    };

    (window as any).element = {
      querySelector: vi.fn((selector: string) => {
        if (selector === 'form') return mockForm;
        return null;
      }),
    };

    await (window as any)._validateAndCreateNote();

    expect(Hooks.callAll).toHaveBeenCalledWith('seasons-stars:noteCreated', expect.any(Object));
  });

  it('handles note creation errors gracefully', async () => {
    mockNotesManager.createNote = vi.fn().mockRejectedValue(new Error('Creation failed'));

    const testDate: ICalendarDate = { year: 2024, month: 3, day: 15 };
    const window = new CreateNoteWindow({ date: testDate });

    (global as any).FormData = class {
      get(key: string) {
        const values: any = { title: 'Test Note', content: '', category: 'general' };
        return values[key];
      }
      has() {
        return true;
      }
    };

    // Mock string-tags element with empty tags
    const mockStringTags = {
      value: [],
    };

    // Mock form element with querySelector
    const mockForm = {
      querySelector: vi.fn((selector: string) => {
        if (selector === 'string-tags') return mockStringTags;
        return null;
      }),
    };

    (window as any).element = {
      querySelector: vi.fn((selector: string) => {
        if (selector === 'form') return mockForm;
        return null;
      }),
    };

    const success = await (window as any)._validateAndCreateNote();

    expect(success).toBe(false);
    expect(mockUI.notifications.error).toHaveBeenCalledWith(
      'Failed to create note. Please try again.'
    );
  });
});

describe('CreateNoteWindow - Form Reset', () => {
  it('resets all form fields to defaults', () => {
    const testDate: ICalendarDate = { year: 2024, month: 3, day: 15 };
    const window = new CreateNoteWindow({ date: testDate });

    // Create mutable field objects that _resetForm will modify
    const fields = {
      title: { value: 'Old Title', focus: vi.fn() },
      content: { value: 'Old Content' },
      tags: { value: ['old-tag'] }, // Changed to array for string-tags element
      allDay: { checked: false },
      category: { selectedIndex: 2, style: {} },
    };

    const mockForm = {
      querySelector: vi.fn((selector: string) => {
        const fieldMap: any = {
          'input[name="title"]': fields.title,
          'textarea[name="content"]': fields.content,
          'string-tags': fields.tags, // Changed selector
          'input[name="allDay"]': fields.allDay,
          'select[name="category"]': fields.category,
        };
        return fieldMap[selector];
      }),
    };

    (window as any).element = { querySelector: vi.fn().mockReturnValue(mockForm) };
    (window as any)._updateCategoryBorder = vi.fn(); // Mock this to prevent errors

    (window as any)._resetForm();

    expect(fields.title.value).toBe('');
    expect(fields.content.value).toBe('');
    expect(fields.tags.value).toEqual([]); // Changed to expect empty array
    expect(fields.allDay.checked).toBe(true);
    expect(fields.title.focus).toHaveBeenCalled();
  });
});

describe('CreateNoteWindow - Actions', () => {
  it('onCreate action creates note and closes window', async () => {
    const testDate: ICalendarDate = { year: 2024, month: 3, day: 15 };
    const window = new CreateNoteWindow({ date: testDate });

    (window as any)._validateAndCreateNote = vi.fn().mockResolvedValue(true);
    (window as any).close = vi.fn();

    await (window as any)._onCreate(new Event('click'), document.createElement('button'));

    expect((window as any)._validateAndCreateNote).toHaveBeenCalled();
    expect((window as any).close).toHaveBeenCalled();
  });

  it('onCreate action does not close window if creation fails', async () => {
    const testDate: ICalendarDate = { year: 2024, month: 3, day: 15 };
    const window = new CreateNoteWindow({ date: testDate });

    (window as any)._validateAndCreateNote = vi.fn().mockResolvedValue(false);
    (window as any).close = vi.fn();

    await (window as any)._onCreate(new Event('click'), document.createElement('button'));

    expect((window as any)._validateAndCreateNote).toHaveBeenCalled();
    expect((window as any).close).not.toHaveBeenCalled();
  });

  it('onCreateAnother action creates note and resets form', async () => {
    const testDate: ICalendarDate = { year: 2024, month: 3, day: 15 };
    const window = new CreateNoteWindow({ date: testDate });

    (window as any)._validateAndCreateNote = vi.fn().mockResolvedValue(true);
    (window as any)._resetForm = vi.fn();

    await (window as any)._onCreateAnother(new Event('click'), document.createElement('button'));

    expect((window as any)._validateAndCreateNote).toHaveBeenCalled();
    expect((window as any)._resetForm).toHaveBeenCalled();
  });

  it('onCreateAnother does not reset form if creation fails', async () => {
    const testDate: ICalendarDate = { year: 2024, month: 3, day: 15 };
    const window = new CreateNoteWindow({ date: testDate });

    (window as any)._validateAndCreateNote = vi.fn().mockResolvedValue(false);
    (window as any)._resetForm = vi.fn();

    await (window as any)._onCreateAnother(new Event('click'), document.createElement('button'));

    expect((window as any)._validateAndCreateNote).toHaveBeenCalled();
    expect((window as any)._resetForm).not.toHaveBeenCalled();
  });

  it('onClose action closes the window', async () => {
    const testDate: ICalendarDate = { year: 2024, month: 3, day: 15 };
    const window = new CreateNoteWindow({ date: testDate });

    (window as any).close = vi.fn();

    await (window as any)._onClose(new Event('click'), document.createElement('button'));

    expect((window as any).close).toHaveBeenCalled();
  });
});

describe('CreateNoteWindow - Static show method', () => {
  it('creates and renders window instance', async () => {
    const testDate: ICalendarDate = { year: 2024, month: 3, day: 15 };

    const window = await CreateNoteWindow.show({ date: testDate });

    expect(window).toBeDefined();
    expect(window).toBeInstanceOf(CreateNoteWindow);
  });

  it('passes options to window constructor', async () => {
    const testDate: ICalendarDate = { year: 2024, month: 3, day: 15 };
    const callback = vi.fn();

    const window = await CreateNoteWindow.show({
      date: testDate,
      onNoteCreated: callback,
    });

    expect((window as any).date).toEqual(testDate);
    expect((window as any).onNoteCreated).toBe(callback);
  });
});

describe('CreateNoteWindow - Tag Validation', () => {
  it('warns about invalid tags', async () => {
    // Configure categories to not allow custom tags
    const restrictedCategories = new NoteCategories();
    mockGame.seasonsStars.categories = restrictedCategories;

    const testDate: ICalendarDate = { year: 2024, month: 3, day: 15 };
    const window = new CreateNoteWindow({ date: testDate });

    (global as any).FormData = class {
      get(key: string) {
        const values: any = {
          title: 'Test Note',
          content: '',
          category: 'general',
        };
        return values[key];
      }
      has() {
        return true;
      }
    };

    // Mock string-tags element with invalid tag
    const mockStringTags = {
      value: ['valid-tag', 'invalid-tag'],
    };

    // Mock form element with querySelector
    const mockForm = {
      querySelector: vi.fn((selector: string) => {
        if (selector === 'string-tags') return mockStringTags;
        return null;
      }),
    };

    (window as any).element = {
      querySelector: vi.fn((selector: string) => {
        if (selector === 'form') return mockForm;
        return null;
      }),
    };

    // Mock validateTags to return some invalid tags
    restrictedCategories.validateTags = vi.fn((tags: string[]) => {
      // Simulate some tags being invalid
      const valid = tags.filter(t => !t.includes('invalid'));
      const invalid = tags.filter(t => t.includes('invalid'));
      return { valid, invalid };
    });

    await (window as any)._validateAndCreateNote();

    expect(mockUI.notifications.warn).toHaveBeenCalledWith(expect.stringContaining('invalid-tag'));
  });

  it('accepts all valid tags without warning', async () => {
    const testDate: ICalendarDate = { year: 2024, month: 3, day: 15 };
    const window = new CreateNoteWindow({ date: testDate });

    (global as any).FormData = class {
      get(key: string) {
        const values: any = {
          title: 'Test Note',
          content: '',
          category: 'general',
        };
        return values[key];
      }
      has() {
        return true;
      }
    };

    // Mock string-tags element with valid tags
    const mockStringTags = {
      value: ['important', 'urgent'],
    };

    // Mock form element with querySelector
    const mockForm = {
      querySelector: vi.fn((selector: string) => {
        if (selector === 'string-tags') return mockStringTags;
        return null;
      }),
    };

    (window as any).element = {
      querySelector: vi.fn((selector: string) => {
        if (selector === 'form') return mockForm;
        return null;
      }),
    };

    await (window as any)._validateAndCreateNote();

    expect(mockUI.notifications.warn).not.toHaveBeenCalled();
  });
});
