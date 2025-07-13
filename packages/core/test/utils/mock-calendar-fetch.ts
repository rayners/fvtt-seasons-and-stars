import { vi } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Mock fetch to read actual calendar files from disk
 * Translates module URLs like 'modules/seasons-and-stars/calendars/index.json'
 * to actual file paths in the calendars directory
 */
export function mockCalendarFetch() {
  return vi.mocked(fetch).mockImplementation(async (input: string | URL | Request) => {
    const url = typeof input === 'string' ? input : input.toString();
    // Translate module URLs to actual file paths
    if (url.startsWith('modules/seasons-and-stars/calendars/')) {
      const filename = url.replace('modules/seasons-and-stars/calendars/', '');
      const filePath = path.join(__dirname, '../../calendars', filename);

      try {
        const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(data),
        } as Response);
      } catch {
        return Promise.resolve({
          ok: false,
          status: 404,
        } as Response);
      }
    }

    // File not found for other URLs
    return Promise.resolve({
      ok: false,
      status: 404,
    } as Response);
  });
}
