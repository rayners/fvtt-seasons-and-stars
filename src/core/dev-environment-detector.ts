/**
 * Development Environment Detection Utilities
 * Provides comprehensive detection of localhost and development environments
 * for enabling special development behaviors in the external calendar system
 */

import { DEV_CONSTANTS } from './constants';
import { Logger } from './logger';

export interface DevEnvironmentInfo {
  isLocalhost: boolean;
  isDevelopment: boolean;
  hostname: string;
  port: number | null;
  protocol: string;
  indicators: string[];
  confidence: 'low' | 'medium' | 'high';
}

export class DevEnvironmentDetector {
  private static _instance: DevEnvironmentDetector;
  private _cachedInfo: DevEnvironmentInfo | null = null;

  private constructor() {}

  static getInstance(): DevEnvironmentDetector {
    if (!this._instance) {
      this._instance = new DevEnvironmentDetector();
    }
    return this._instance;
  }

  /**
   * Detect if running in a localhost environment
   */
  isLocalhost(): boolean {
    const info = this.getEnvironmentInfo();
    return info.isLocalhost;
  }

  /**
   * Detect if running in any development environment (broader than localhost)
   */
  isDevelopment(): boolean {
    const info = this.getEnvironmentInfo();
    return info.isDevelopment;
  }

  /**
   * Get comprehensive environment information
   */
  getEnvironmentInfo(): DevEnvironmentInfo {
    if (this._cachedInfo) {
      return this._cachedInfo;
    }

    this._cachedInfo = this._detectEnvironment();
    Logger.debug('Development environment detected:', this._cachedInfo);
    return this._cachedInfo;
  }

  /**
   * Check if external calendar loading should use dev mode behaviors
   */
  shouldUseDevMode(): boolean {
    const info = this.getEnvironmentInfo();
    // Use dev mode for localhost or high-confidence development environments
    return info.isLocalhost || (info.isDevelopment && info.confidence === 'high');
  }

  /**
   * Check if caching should be disabled for development
   */
  shouldDisableCaching(): boolean {
    const info = this.getEnvironmentInfo();
    // Disable caching for localhost to support rapid development iteration
    return info.isLocalhost;
  }

  /**
   * Check if enhanced debugging should be enabled
   */
  shouldEnableDebugLogging(): boolean {
    const info = this.getEnvironmentInfo();
    return info.isDevelopment;
  }

  /**
   * Get development-friendly timeout values (longer timeouts for debugging)
   */
  getDevTimeout(defaultTimeout: number): number {
    if (this.isDevelopment()) {
      // Increase timeout by 3x for development to allow for debugging
      return defaultTimeout * 3;
    }
    return defaultTimeout;
  }

  /**
   * Clear cached environment detection (useful for testing)
   */
  clearCache(): void {
    this._cachedInfo = null;
  }

  /**
   * Core environment detection logic
   */
  private _detectEnvironment(): DevEnvironmentInfo {
    const indicators: string[] = [];
    let isLocalhost = false;
    let isDevelopment = false;
    let confidence: 'low' | 'medium' | 'high' = 'low';

    // Get current location information
    const location = this._getCurrentLocation();
    const hostname = location.hostname.toLowerCase();
    const port = location.port ? parseInt(location.port, 10) : null;
    const protocol = location.protocol;

    // Check for localhost patterns
    if (this._isLocalhostHostname(hostname)) {
      isLocalhost = true;
      isDevelopment = true;
      confidence = 'high';
      indicators.push('localhost-hostname');
    }

    // Check for development ports
    if (port && this._isDevPort(port)) {
      isDevelopment = true;
      indicators.push('dev-port');
      if (confidence === 'low') confidence = 'medium';
    }

    // Check for development hostname patterns
    if (this._hasDevHostnamePattern(hostname)) {
      isDevelopment = true;
      indicators.push('dev-hostname-pattern');
      if (confidence === 'low') confidence = 'medium';
    }

    // Check URL parameters for dev indicators
    const urlParams = this._getUrlParameters();
    if (this._hasDevUrlParameters(urlParams)) {
      isDevelopment = true;
      indicators.push('dev-url-params');
      if (confidence === 'low') confidence = 'medium';
    }

    // Check for Foundry-specific development indicators
    const foundryDevIndicators = this._detectFoundryDevMode();
    if (foundryDevIndicators.length > 0) {
      isDevelopment = true;
      indicators.push(...foundryDevIndicators);
      if (confidence === 'low') confidence = 'medium';
    }

    // Special case: if on localhost with Foundry's default port, high confidence dev
    if (isLocalhost && port === 30000) {
      confidence = 'high';
      indicators.push('foundry-default-port');
    }

    return {
      isLocalhost,
      isDevelopment,
      hostname,
      port,
      protocol,
      indicators,
      confidence,
    };
  }

  /**
   * Get current window location safely
   */
  private _getCurrentLocation(): Location {
    if (typeof window !== 'undefined' && window.location) {
      return window.location;
    }

    // Fallback for testing environments
    return {
      hostname: 'localhost',
      port: '30000',
      protocol: 'http:',
      href: 'http://localhost:30000',
      search: '',
    } as Location;
  }

  /**
   * Check if hostname matches localhost patterns
   */
  private _isLocalhostHostname(hostname: string): boolean {
    return DEV_CONSTANTS.LOCALHOST_PATTERNS.some(
      pattern => hostname === pattern || hostname.includes(pattern)
    );
  }

  /**
   * Check if port is commonly used for development
   */
  private _isDevPort(port: number): boolean {
    return DEV_CONSTANTS.DEV_PORTS.includes(port);
  }

  /**
   * Check if hostname has development patterns
   */
  private _hasDevHostnamePattern(hostname: string): boolean {
    return DEV_CONSTANTS.DEV_HOSTNAMES.some(pattern => {
      if (pattern.startsWith('.')) {
        return hostname.endsWith(pattern);
      } else if (pattern.endsWith('.')) {
        return hostname.startsWith(pattern);
      } else {
        return hostname.includes(pattern);
      }
    });
  }

  /**
   * Get URL parameters
   */
  private _getUrlParameters(): URLSearchParams {
    if (typeof window !== 'undefined' && window.location) {
      return new URLSearchParams(window.location.search);
    }
    return new URLSearchParams();
  }

  /**
   * Check URL parameters for development indicators
   */
  private _hasDevUrlParameters(params: URLSearchParams): boolean {
    const paramString = params.toString().toLowerCase();
    return DEV_CONSTANTS.DEV_INDICATORS.some(indicator => paramString.includes(indicator));
  }

  /**
   * Detect Foundry-specific development indicators
   */
  private _detectFoundryDevMode(): string[] {
    const indicators: string[] = [];

    try {
      // Check if we're in Foundry and can access game object
      if (typeof game !== 'undefined') {
        // Check for debug mode
        if ((game as any).debug) {
          indicators.push('foundry-debug-mode');
        }

        // Check for development system or modules
        if (game.modules) {
          // Look for development modules (modules with dev versions)
          const devModules = Array.from(game.modules.values()).filter(module => {
            const version = module.version || '';
            return (
              version.includes('dev') ||
              version.includes('alpha') ||
              version.includes('beta') ||
              version.startsWith('0.0.')
            );
          });

          if (devModules.length > 0) {
            indicators.push('foundry-dev-modules');
          }
        }

        // Check for development data path indicators
        if ((game as any).data?.options?.dataPath) {
          const dataPath = (game as any).data.options.dataPath.toLowerCase();
          if (dataPath.includes('dev') || dataPath.includes('test') || dataPath.includes('local')) {
            indicators.push('foundry-dev-datapath');
          }
        }
      }
    } catch (error) {
      // Ignore errors in development detection
      Logger.debug('Error detecting Foundry dev mode:', error);
    }

    return indicators;
  }

  /**
   * Check if a URL appears to be a development/localhost URL
   */
  static isDevUrl(url: string): boolean {
    try {
      const urlObj = new URL(url);
      const instance = DevEnvironmentDetector.getInstance();

      // Create a temporary info object for this URL
      const hostname = urlObj.hostname.toLowerCase();
      const port = urlObj.port ? parseInt(urlObj.port, 10) : null;

      const isLocalhost = instance._isLocalhostHostname(hostname);
      const hasDevPort = port ? instance._isDevPort(port) : false;
      const hasDevHostname = instance._hasDevHostnamePattern(hostname);

      return isLocalhost || hasDevPort || hasDevHostname;
    } catch {
      return false;
    }
  }

  /**
   * Get development-appropriate headers for external requests
   */
  getDevHeaders(): Record<string, string> {
    const headers: Record<string, string> = {};

    if (this.isDevelopment()) {
      // Add headers that might be useful for development
      headers['X-Development-Mode'] = 'true';

      // Add cache control for development
      if (this.shouldDisableCaching()) {
        headers['Cache-Control'] = 'no-cache, no-store, must-revalidate';
        headers['Pragma'] = 'no-cache';
        headers['Expires'] = '0';
      }
    }

    return headers;
  }
}

// Export singleton instance
export const devEnvironment = DevEnvironmentDetector.getInstance();
