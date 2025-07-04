/**
 * GitHub Protocol Handler for External Calendar Loading
 * Handles loading calendars from GitHub repositories via GitHub API
 * Supports both repository indexes and direct file access
 */

import type {
  ProtocolHandler,
  LoadCalendarOptions,
  CalendarProtocol,
  CalendarLocation,
  CalendarCollectionIndex,
} from '../../types/external-calendar';
import type { SeasonsStarsCalendar } from '../../types/calendar';
import { Logger } from '../logger';
import {
  normalizeCalendarLocation,
  parseLocationWithCalendarId,
  validateCalendarCollectionIndex,
  selectCalendarFromIndex,
} from './utils';

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
    // GitHub paths should be in format:
    // - user/repo (repository index)
    // - user/repo/path/to/file.json (direct file)
    // - user/repo#calendar-id (specific calendar from index)
    const parts = location.split('#')[0].split('/'); // Remove fragment for validation

    // Exclude obvious HTTPS URLs
    if (location.startsWith('https://') || location.startsWith('http://')) {
      return false;
    }

    // Must have at least 2 parts (user, repo)
    if (parts.length < 2) {
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

    // If there are more parts, last part should be a file (we'll add .json if needed)
    if (parts.length > 2) {
      const filename = parts[parts.length - 1];
      // Allow files without extension (will be normalized to .json)
      return !filename.includes('?') && !filename.includes('&');
    }

    return true; // Repository index format
  }

  /**
   * Load a calendar from a GitHub repository
   */
  async loadCalendar(
    location: CalendarLocation,
    options: LoadCalendarOptions = {}
  ): Promise<SeasonsStarsCalendar> {
    try {
      // Parse location for fragments (calendar IDs)
      const { basePath, calendarId } = parseLocationWithCalendarId(location);
      const normalizedLocation = normalizeCalendarLocation(basePath);

      // Parse GitHub path - handle both index.json and direct paths
      const parts = normalizedLocation.split('/');
      if (parts.length < 2) {
        throw new Error(
          `Invalid GitHub path format: ${normalizedLocation}. Expected: user/repo or user/repo/path/to/file.json`
        );
      }

      const owner = parts[0];
      const repo = parts[1];

      // Check if this is an index.json file (directory loading)
      if (parts.length === 3 && parts[2] === 'index.json') {
        // Repository index access
        return await this.loadFromRepositoryIndex(owner, repo, calendarId, options);
      } else if (parts.length === 2) {
        // This shouldn't happen with new normalization, but handle gracefully
        throw new Error(`Unexpected path format after normalization: ${normalizedLocation}`);
      } else {
        // Direct file access
        const filePath = parts.slice(2).join('/');
        return await this.loadDirectFile(owner, repo, filePath, options);
      }
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
   * Load calendar from repository index
   */
  private async loadFromRepositoryIndex(
    owner: string,
    repo: string,
    calendarId?: string,
    options: LoadCalendarOptions = {}
  ): Promise<SeasonsStarsCalendar> {
    // Load the repository index
    const index = await this.loadRepositoryIndex(owner, repo, options);

    // Use universal selection logic
    const selectionResult = selectCalendarFromIndex(
      index,
      calendarId,
      `Repository ${owner}/${repo}`
    );

    if (selectionResult.error) {
      throw new Error(selectionResult.error);
    }

    if (selectionResult.selectedEntry) {
      Logger.debug(
        `Loading calendar from index entry: ${selectionResult.selectedEntry.id} -> ${selectionResult.selectedEntry.file}`
      );
      return await this.loadDirectFile(owner, repo, selectionResult.selectedEntry.file, options);
    }

    throw new Error(`Unexpected error in calendar selection from index`);
  }

  /**
   * Load repository index file
   */
  private async loadRepositoryIndex(
    owner: string,
    repo: string,
    options: LoadCalendarOptions = {}
  ): Promise<CalendarCollectionIndex> {
    const apiUrl = `https://api.github.com/repos/${owner}/${repo}/contents/index.json`;

    Logger.debug(`Loading repository index from GitHub: ${apiUrl}`);

    const fetchOptions: RequestInit = {
      method: 'GET',
      headers: {
        Accept: 'application/vnd.github.v3+json',
        'User-Agent': 'FoundryVTT/Seasons-and-Stars',
        ...options.headers,
      },
    };

    if (options.timeout) {
      const controller = new AbortController();
      setTimeout(() => controller.abort(), options.timeout);
      fetchOptions.signal = controller.signal;
    }

    const response = await fetch(apiUrl, fetchOptions);

    if (!response.ok) {
      if (response.status === 404) {
        throw new Error(
          `Repository index not found: ${owner}/${repo}/index.json. Repository may not have a calendar index or may not exist.`
        );
      } else if (response.status === 403) {
        const rateLimitRemaining = response.headers.get('x-ratelimit-remaining');
        if (rateLimitRemaining === '0') {
          const resetTime = response.headers.get('x-ratelimit-reset');
          const resetDate = resetTime ? new Date(parseInt(resetTime) * 1000) : new Date();
          throw new Error(`GitHub rate limit exceeded. Resets at ${resetDate.toISOString()}`);
        } else {
          throw new Error(
            `Access forbidden to repository index (private repository?): ${response.status} ${response.statusText}`
          );
        }
      } else {
        throw new Error(
          `GitHub API error loading repository index: ${response.status} ${response.statusText}`
        );
      }
    }

    const apiData: GitHubApiResponse = await response.json();

    if (!apiData.content || !apiData.encoding) {
      throw new Error(
        'Invalid GitHub API response for repository index: missing content or encoding'
      );
    }

    // Decode base64 content
    let indexJson: string;
    if (apiData.encoding === 'base64') {
      try {
        indexJson = atob(apiData.content);
      } catch {
        throw new Error('Failed to decode base64 content from GitHub repository index');
      }
    } else {
      throw new Error(
        `Unsupported GitHub content encoding for repository index: ${apiData.encoding}`
      );
    }

    // Parse the index JSON
    let indexData: CalendarCollectionIndex;
    try {
      indexData = JSON.parse(indexJson);
    } catch {
      throw new Error('Invalid JSON content in GitHub repository index');
    }

    // Validate index structure
    validateCalendarCollectionIndex(indexData);

    Logger.info(
      `Successfully loaded repository index: ${indexData.name} (${indexData.calendars.length} calendars)`
    );
    return indexData;
  }

  /**
   * Load specific file from repository
   */
  private async loadDirectFile(
    owner: string,
    repo: string,
    filePath: string,
    options: LoadCalendarOptions = {}
  ): Promise<SeasonsStarsCalendar> {
    const apiUrl = `https://api.github.com/repos/${owner}/${repo}/contents/${filePath}`;

    Logger.debug(`Loading calendar file from GitHub: ${apiUrl}`);

    const fetchOptions: RequestInit = {
      method: 'GET',
      headers: {
        Accept: 'application/vnd.github.v3+json',
        'User-Agent': 'FoundryVTT/Seasons-and-Stars',
        ...options.headers,
      },
    };

    if (options.timeout) {
      const controller = new AbortController();
      setTimeout(() => controller.abort(), options.timeout);
      fetchOptions.signal = controller.signal;
    }

    const response = await fetch(apiUrl, fetchOptions);

    if (!response.ok) {
      if (response.status === 404) {
        throw new Error(`Calendar file not found: ${owner}/${repo}/${filePath}`);
      } else if (response.status === 403) {
        const rateLimitRemaining = response.headers.get('x-ratelimit-remaining');
        if (rateLimitRemaining === '0') {
          const resetTime = response.headers.get('x-ratelimit-reset');
          const resetDate = resetTime ? new Date(parseInt(resetTime) * 1000) : new Date();
          throw new Error(`GitHub rate limit exceeded. Resets at ${resetDate.toISOString()}`);
        } else {
          throw new Error(
            `Access forbidden to calendar file (private repository?): ${response.status} ${response.statusText}`
          );
        }
      } else {
        throw new Error(
          `GitHub API error loading calendar file: ${response.status} ${response.statusText}`
        );
      }
    }

    const apiData: GitHubApiResponse = await response.json();

    if (!apiData.content || !apiData.encoding) {
      throw new Error('Invalid GitHub API response for calendar file: missing content or encoding');
    }

    // Decode base64 content
    let calendarJson: string;
    if (apiData.encoding === 'base64') {
      try {
        calendarJson = atob(apiData.content);
      } catch {
        throw new Error('Failed to decode base64 content from GitHub calendar file');
      }
    } else {
      throw new Error(`Unsupported GitHub content encoding for calendar file: ${apiData.encoding}`);
    }

    // Parse the calendar JSON
    let calendarData: SeasonsStarsCalendar;
    try {
      calendarData = JSON.parse(calendarJson);
    } catch {
      throw new Error('Invalid JSON content in GitHub calendar file');
    }

    // Validate calendar data
    if (!calendarData || typeof calendarData !== 'object') {
      throw new Error('Invalid calendar data: not a valid JSON object');
    }

    if (!calendarData.id || !calendarData.months || !calendarData.weekdays) {
      throw new Error('Invalid calendar data: missing required fields (id, months, weekdays)');
    }

    Logger.info(
      `Successfully loaded calendar from GitHub file: ${calendarData.id} (SHA: ${apiData.sha})`
    );
    return calendarData;
  }

  /**
   * Check if a calendar at the GitHub location has been updated
   */
  async checkForUpdates(location: CalendarLocation, lastSha?: string): Promise<boolean> {
    try {
      // Parse location
      const [basePath] = location.split('#');
      const parts = basePath.split('/');

      if (parts.length < 2) {
        Logger.warn(`Invalid GitHub path for update check: ${location}`);
        return false;
      }

      const owner = parts[0];
      const repo = parts[1];

      let filePath: string;
      if (parts.length === 2) {
        // Repository index
        filePath = 'index.json';
      } else {
        // Direct file
        filePath = parts.slice(2).join('/');
      }

      const apiUrl = `https://api.github.com/repos/${owner}/${repo}/contents/${filePath}`;

      Logger.debug(`Checking for updates at GitHub: ${apiUrl}`);

      const response = await fetch(apiUrl, {
        method: 'GET',
        headers: {
          Accept: 'application/vnd.github.v3+json',
          'User-Agent': 'FoundryVTT/Seasons-and-Stars',
        },
      });

      if (!response.ok) {
        Logger.warn(
          `Failed to check for updates at GitHub ${location}: ${response.status} ${response.statusText}`
        );
        return false;
      }

      const apiData: GitHubApiResponse = await response.json();

      if (!apiData.sha) {
        Logger.warn(`No SHA available for GitHub file: ${location}`);
        return true; // Assume potential update
      }

      const hasUpdates = apiData.sha !== lastSha;
      Logger.debug(
        `SHA comparison for GitHub ${location}: ${lastSha} -> ${apiData.sha} (updated: ${hasUpdates})`
      );

      return hasUpdates;
    } catch (error) {
      Logger.error(`Error checking for updates at GitHub ${location}:`, error as Error);
      // On error, assume no updates to avoid unnecessary re-downloads
      return false;
    }
  }
}
