/**
 * Tests for localhost detection and development environment functionality
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { DevEnvironmentDetector, devEnvironment } from '../src/core/dev-environment-detector';

// Mock window.location for testing
const mockLocation = (hostname: string, port?: string, protocol = 'http:', search = '') => {
  Object.defineProperty(window, 'location', {
    value: {
      hostname,
      port: port || '',
      protocol,
      href: `${protocol}//${hostname}${port ? `:${port}` : ''}`,
      search,
    },
    writable: true,
  });
};

describe('DevEnvironmentDetector', () => {
  beforeEach(() => {
    // Clear cache before each test
    devEnvironment.clearCache();
  });

  describe('localhost detection', () => {
    it('should detect localhost hostname', () => {
      mockLocation('localhost', '3000');
      expect(devEnvironment.isLocalhost()).toBe(true);
      expect(devEnvironment.isDevelopment()).toBe(true);

      const info = devEnvironment.getEnvironmentInfo();
      expect(info.confidence).toBe('high');
      expect(info.indicators).toContain('localhost-hostname');
    });

    it('should detect 127.0.0.1', () => {
      mockLocation('127.0.0.1', '8080');
      expect(devEnvironment.isLocalhost()).toBe(true);
      expect(devEnvironment.isDevelopment()).toBe(true);
    });

    it('should detect IPv6 localhost', () => {
      mockLocation('::1', '3000');
      expect(devEnvironment.isLocalhost()).toBe(true);
      expect(devEnvironment.isDevelopment()).toBe(true);
    });

    it('should detect 0.0.0.0', () => {
      mockLocation('0.0.0.0', '4000');
      expect(devEnvironment.isLocalhost()).toBe(true);
      expect(devEnvironment.isDevelopment()).toBe(true);
    });
  });

  describe('development port detection', () => {
    it('should detect common dev ports', () => {
      const devPorts = [3000, 4000, 5000, 8000, 8080, 9000, 30000];

      devPorts.forEach(port => {
        devEnvironment.clearCache();
        mockLocation('example.com', port.toString());
        expect(devEnvironment.isDevelopment()).toBe(true);

        const info = devEnvironment.getEnvironmentInfo();
        expect(info.indicators).toContain('dev-port');
      });
    });

    it('should detect Foundry default port', () => {
      mockLocation('localhost', '30000');
      expect(devEnvironment.isLocalhost()).toBe(true);
      expect(devEnvironment.isDevelopment()).toBe(true);

      const info = devEnvironment.getEnvironmentInfo();
      expect(info.confidence).toBe('high');
      expect(info.indicators).toContain('foundry-default-port');
    });
  });

  describe('development hostname patterns', () => {
    it('should detect dev hostname prefixes', () => {
      const devHostnames = [
        'dev.example.com',
        'development.example.com',
        'test.example.com',
        'staging.example.com',
      ];

      devHostnames.forEach(hostname => {
        devEnvironment.clearCache();
        mockLocation(hostname);
        expect(devEnvironment.isDevelopment()).toBe(true);

        const info = devEnvironment.getEnvironmentInfo();
        expect(info.indicators).toContain('dev-hostname-pattern');
      });
    });

    it('should detect dev hostname suffixes', () => {
      const devHostnames = ['myapp.local', 'myapp.test', 'myapp.dev'];

      devHostnames.forEach(hostname => {
        devEnvironment.clearCache();
        mockLocation(hostname);
        expect(devEnvironment.isDevelopment()).toBe(true);

        const info = devEnvironment.getEnvironmentInfo();
        expect(info.indicators).toContain('dev-hostname-pattern');
      });
    });
  });

  describe('URL parameter detection', () => {
    it('should detect dev indicators in URL parameters', () => {
      mockLocation('example.com', '', 'http:', '?debug=true&env=dev');
      expect(devEnvironment.isDevelopment()).toBe(true);

      const info = devEnvironment.getEnvironmentInfo();
      expect(info.indicators).toContain('dev-url-params');
    });
  });

  describe('production environments', () => {
    it('should not detect production hostnames as development', () => {
      const prodHostnames = ['example.com', 'myapp.com', 'api.example.com', 'www.example.com'];

      prodHostnames.forEach(hostname => {
        devEnvironment.clearCache();
        mockLocation(hostname);
        expect(devEnvironment.isLocalhost()).toBe(false);
        expect(devEnvironment.isDevelopment()).toBe(false);
      });
    });

    it('should not detect production ports as development', () => {
      const prodPorts = ['80', '443', '8443'];

      prodPorts.forEach(port => {
        devEnvironment.clearCache();
        mockLocation('example.com', port);
        expect(devEnvironment.isDevelopment()).toBe(false);
      });
    });
  });

  describe('development behaviors', () => {
    it('should use dev mode for localhost', () => {
      mockLocation('localhost', '3000');
      expect(devEnvironment.shouldUseDevMode()).toBe(true);
    });

    it('should disable caching for localhost', () => {
      mockLocation('localhost', '3000');
      expect(devEnvironment.shouldDisableCaching()).toBe(true);
    });

    it('should enable debug logging for development', () => {
      mockLocation('dev.example.com', '8080');
      expect(devEnvironment.shouldEnableDebugLogging()).toBe(true);
    });

    it('should use extended timeouts in development', () => {
      mockLocation('localhost', '3000');
      const defaultTimeout = 1000;
      const devTimeout = devEnvironment.getDevTimeout(defaultTimeout);
      expect(devTimeout).toBe(defaultTimeout * 3);
    });

    it('should use normal timeouts in production', () => {
      mockLocation('example.com', '443');
      const defaultTimeout = 1000;
      const devTimeout = devEnvironment.getDevTimeout(defaultTimeout);
      expect(devTimeout).toBe(defaultTimeout);
    });

    it('should provide development headers', () => {
      mockLocation('localhost', '3000');
      const headers = devEnvironment.getDevHeaders();
      expect(headers['X-Development-Mode']).toBe('true');
      expect(headers['Cache-Control']).toBe('no-cache, no-store, must-revalidate');
    });

    it('should not provide development headers in production', () => {
      mockLocation('example.com', '443');
      const headers = devEnvironment.getDevHeaders();
      expect(Object.keys(headers)).toHaveLength(0);
    });
  });

  describe('static URL checking', () => {
    it('should detect development URLs', () => {
      const devUrls = [
        'http://localhost:3000/calendar.json',
        'https://127.0.0.1:8080/api/calendar',
        'http://dev.example.com/calendar.json',
        'https://myapp.local:4000/calendar',
      ];

      devUrls.forEach(url => {
        expect(DevEnvironmentDetector.isDevUrl(url)).toBe(true);
      });
    });

    it('should not detect production URLs as development', () => {
      const prodUrls = [
        'https://example.com/calendar.json',
        'https://api.example.com/calendar',
        'https://cdn.example.com/calendar.json',
      ];

      prodUrls.forEach(url => {
        expect(DevEnvironmentDetector.isDevUrl(url)).toBe(false);
      });
    });
  });

  describe('cache management', () => {
    it('should cache environment detection results', () => {
      mockLocation('localhost', '3000');

      const info1 = devEnvironment.getEnvironmentInfo();
      const info2 = devEnvironment.getEnvironmentInfo();

      expect(info1).toBe(info2); // Should be the same object reference
    });

    it('should clear cache when requested', () => {
      mockLocation('localhost', '3000');

      const info1 = devEnvironment.getEnvironmentInfo();
      devEnvironment.clearCache();

      mockLocation('example.com', '443');
      const info2 = devEnvironment.getEnvironmentInfo();

      expect(info1.isLocalhost).toBe(true);
      expect(info2.isLocalhost).toBe(false);
    });
  });

  describe('confidence levels', () => {
    it('should have high confidence for localhost with Foundry port', () => {
      mockLocation('localhost', '30000');
      const info = devEnvironment.getEnvironmentInfo();
      expect(info.confidence).toBe('high');
    });

    it('should have medium confidence for dev hostnames', () => {
      mockLocation('dev.example.com');
      const info = devEnvironment.getEnvironmentInfo();
      expect(info.confidence).toBe('medium');
    });

    it('should have low confidence for production environments', () => {
      mockLocation('example.com');
      const info = devEnvironment.getEnvironmentInfo();
      expect(info.confidence).toBe('low');
      expect(info.isDevelopment).toBe(false);
    });
  });
});
