/**
 * Foundry type augmentations for Custom Calendar Editor
 */

import type { CustomCalendarStorage } from '../core/custom-calendar-storage';
import type { CalendarImportExport } from '../core/calendar-import-export';

declare global {
  interface Game {
    customCalendarEditor?: {
      storage: CustomCalendarStorage;
      importExport: CalendarImportExport;
      openCreationWizard: () => void;
      openEditor: (calendarId: string) => void;
      openImportDialog: () => void;
      openExportDialog: (calendarId: string) => void;
      openVariantCreator: (calendarId: string) => void;
    };
    
    seasonsStars?: {
      api?: {
        registerExternalCalendar?: (calendar: any, sourceInfo: any) => Promise<void>;
        validateCalendar?: (calendar: any) => { valid: boolean; errors?: string[] };
      };
    };
  }
  
  interface UI {
    windows?: Record<string, Application>;
  }
  
  // Foundry FilePicker declaration
  class FilePicker {
    constructor(options: any);
    render(force?: boolean): void;
  }
}

export {};