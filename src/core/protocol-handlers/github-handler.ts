/**
 * GitHub Protocol Handler for External Calendar Loading
 * Handles loading calendars from GitHub repositories via GitHub API
 */

import type { 
  ProtocolHandler, 
  LoadCalendarOptions,
  CalendarProtocol,
  CalendarLocation
} from '../../types/external-calendar';
import type { SeasonsStarsCalendar } from '../../types/calendar';
import { Logger } from '../logger';
import { normalizeCalendarLocation } from './utils';

interface GitHubApiResponse {
  content: string;
  sha: string;
  encoding: string;
}

export class GitHubProtocolHandler implements ProtocolHandler {
  readonly protocol: CalendarProtocol = 'github';

  /**
   * Check if this handler can process the given location
   */
  canHandle(location: CalendarLocation): boolean {
    // GitHub paths should be in format: user/repo/path/to/file.json
    // Must have at least user/repo/file pattern
    const parts = location.split('/');
    
    // Exclude obvious HTTPS URLs
    if (location.startsWith('https://') || location.startsWith('http://')) {
      return false;
    }

    // Must have at least 3 parts (user, repo, filename)
    if (parts.length < 3) {
      return false;
    }

    // First part should look like a GitHub username (no special chars except hyphens)
    const userPattern = /^[a-zA-Z0-9-]+$/;
    if (!userPattern.test(parts[0])) {
      return false;
    }

    // Second part should look like a repository name
    const repoPattern = /^[a-zA-Z0-9._-]+$/;
    if (!repoPattern.test(parts[1])) {
      return false;
    }

    // Last part should be a file with JSON extension
    const filename = parts[parts.length - 1];
    return filename.endsWith('.json');
  }

  /**
   * Load a calendar from a GitHub repository
   */
  async loadCalendar(location: CalendarLocation, options: LoadCalendarOptions = {}): Promise<SeasonsStarsCalendar> {
    try {
      // Normalize location - add .json extension if no extension specified
      const normalizedLocation = normalizeCalendarLocation(location);
      
      // Parse GitHub path
      const parts = normalizedLocation.split('/');
      if (parts.length < 3) {
        throw new Error(`Invalid GitHub path format: ${normalizedLocation}. Expected: user/repo/path/to/file.json`);
      }

      const owner = parts[0];
      const repo = parts[1];
      const filePath = parts.slice(2).join('/');

      const apiUrl = `https://api.github.com/repos/${owner}/${repo}/contents/${filePath}`;
      
      Logger.debug(`Loading calendar from GitHub: ${apiUrl}`);

      // Prepare fetch options
      const fetchOptions: RequestInit = {
        method: 'GET',
        headers: {
          'Accept': 'application/vnd.github.v3+json',
          'User-Agent': 'FoundryVTT/Seasons-and-Stars',
          ...options.headers
        }
      };

      // Add timeout if specified
      if (options.timeout) {
        const controller = new AbortController();
        setTimeout(() => controller.abort(), options.timeout);
        fetchOptions.signal = controller.signal;
      }

      // Fetch from GitHub API
      const response = await fetch(apiUrl, fetchOptions);

      if (!response.ok) {
        if (response.status === 404) {
          throw new Error(`Repository or file not found: ${response.status} ${response.statusText}`);
        } else if (response.status === 403) {
          // Check if it's rate limiting
          const rateLimitRemaining = response.headers.get('x-ratelimit-remaining');
          if (rateLimitRemaining === '0') {
            const resetTime = response.headers.get('x-ratelimit-reset');
            const resetDate = resetTime ? new Date(parseInt(resetTime) * 1000) : new Date();
            throw new Error(`GitHub rate limit exceeded. Resets at ${resetDate.toISOString()}`);
          } else {
            throw new Error(`Access forbidden (private repository?): ${response.status} ${response.statusText}`);
          }
        } else if (response.status >= 500) {
          throw new Error(`GitHub server error: ${response.status} ${response.statusText}`);
        } else {
          throw new Error(`GitHub API error: ${response.status} ${response.statusText}`);
        }
      }

      // Parse GitHub API response
      const apiData: GitHubApiResponse = await response.json();

      if (!apiData.content || !apiData.encoding) {
        throw new Error('Invalid GitHub API response: missing content or encoding');
      }

      // Decode base64 content
      let calendarJson: string;
      if (apiData.encoding === 'base64') {
        try {
          calendarJson = atob(apiData.content);
        } catch (_error) {
          throw new Error('Failed to decode base64 content from GitHub');
        }
      } else {
        throw new Error(`Unsupported GitHub content encoding: ${apiData.encoding}`);
      }

      // Parse the calendar JSON
      let calendarData: SeasonsStarsCalendar;
      try {
        calendarData = JSON.parse(calendarJson);
      } catch (_error) {
        throw new Error('Invalid JSON content in GitHub file');
      }

      // Validate calendar data
      if (!calendarData || typeof calendarData !== 'object') {
        throw new Error('Invalid calendar data: not a valid JSON object');
      }

      if (!calendarData.id || !calendarData.months || !calendarData.weekdays) {
        throw new Error('Invalid calendar data: missing required fields (id, months, weekdays)');
      }

      Logger.info(`Successfully loaded calendar from GitHub: ${calendarData.id} (SHA: ${apiData.sha})`);
      return calendarData;

    } catch (error) {
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          throw new Error(`Request timeout: Failed to load calendar from GitHub: ${location}`);
        }
        Logger.error(`Failed to load calendar from GitHub: ${location}`, error);
        throw error;
      } else {
        const errorMessage = `Unknown error loading calendar from GitHub: ${location}`;
        Logger.error(errorMessage);
        throw new Error(errorMessage);
      }
    }
  }

  /**
   * Check if a calendar at the GitHub location has been updated
   */
  async checkForUpdates(location: CalendarLocation, lastSha?: string): Promise<boolean> {
    try {
      // Parse GitHub path
      const parts = location.split('/');
      if (parts.length < 3) {
        Logger.warn(`Invalid GitHub path for update check: ${location}`);
        return false;
      }

      const owner = parts[0];
      const repo = parts[1];
      const filePath = parts.slice(2).join('/');

      const apiUrl = `https://api.github.com/repos/${owner}/${repo}/contents/${filePath}`;
      
      Logger.debug(`Checking for updates at GitHub: ${apiUrl}`);

      // Fetch current file info
      const response = await fetch(apiUrl, {
        method: 'GET',
        headers: {
          'Accept': 'application/vnd.github.v3+json',
          'User-Agent': 'FoundryVTT/Seasons-and-Stars'
        }
      });

      if (!response.ok) {
        Logger.warn(`Failed to check for updates at GitHub ${location}: ${response.status} ${response.statusText}`);
        return false;
      }

      const apiData: GitHubApiResponse = await response.json();
      
      if (!apiData.sha) {
        Logger.warn(`No SHA available for GitHub file: ${location}`);
        return true; // Assume potential update
      }

      const hasUpdates = apiData.sha !== lastSha;
      Logger.debug(`SHA comparison for GitHub ${location}: ${lastSha} -> ${apiData.sha} (updated: ${hasUpdates})`);
      
      return hasUpdates;

    } catch (error) {
      Logger.error(`Error checking for updates at GitHub ${location}:`, error as Error);
      // On error, assume no updates to avoid unnecessary re-downloads
      return false;
    }
  }
}