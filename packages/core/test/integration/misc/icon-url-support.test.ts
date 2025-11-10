import { describe, it, expect, beforeEach } from 'vitest';
import { renderIconHtml } from '../../../src/core/constants';
import { DateFormatter } from '../../../src/core/date-formatter';
import type { SeasonsStarsCalendar } from '../../../src/types/calendar';

// Use REAL Handlebars for helper testing
import Handlebars from 'handlebars';
global.Handlebars = Handlebars;

describe('Icon URL Support', () => {
  describe('renderIconHtml - Basic Functionality', () => {
    it('should render image tag when local iconUrl is provided', () => {
      const result = renderIconHtml('/modules/my-module/icons/moon.png', undefined, 24, 24);
      expect(result).toBe(
        '<img src="/modules/my-module/icons/moon.png" width="24" height="24" alt="" />'
      );
    });

    it('should render FontAwesome icon when only icon is provided', () => {
      const result = renderIconHtml(undefined, 'fas fa-calendar', 16, 16);
      expect(result).toBe('<i class="fas fa-calendar" aria-hidden="true"></i>');
    });

    it('should use default width and height when not specified', () => {
      const result = renderIconHtml('/icons/icon.png', undefined);
      expect(result).toContain('width="16"');
      expect(result).toContain('height="16"');
    });

    it('should apply additional classes to image when provided', () => {
      const result = renderIconHtml(
        '/modules/seasons-and-stars/icons/moon.png',
        undefined,
        16,
        16,
        'moon-phase-full'
      );
      expect(result).toContain('class="moon-phase-full"');
    });

    it('should apply additional classes to FontAwesome icon when provided', () => {
      const result = renderIconHtml(undefined, 'fas fa-moon', 16, 16, 'moon-phase-new');
      expect(result).toBe('<i class="fas fa-moon moon-phase-new" aria-hidden="true"></i>');
    });

    it('should return empty string when neither iconUrl nor icon is provided', () => {
      const result = renderIconHtml(undefined, undefined);
      expect(result).toBe('');
    });
  });

  describe('renderIconHtml - Local Path Validation', () => {
    it('should accept absolute local paths starting with /', () => {
      const result = renderIconHtml('/modules/my-module/icons/icon.gif', undefined);
      expect(result).toContain('<img');
      expect(result).toContain('/modules/my-module/icons/icon.gif');
    });

    it('should accept relative paths starting with ./', () => {
      const result = renderIconHtml('./icons/icon.png', undefined);
      expect(result).toContain('<img');
      expect(result).toContain('./icons/icon.png');
    });

    it('should accept relative paths starting with ../', () => {
      const result = renderIconHtml('../shared/icons/icon.svg', undefined);
      expect(result).toContain('<img');
      expect(result).toContain('../shared/icons/icon.svg');
    });

    it('should accept paths without leading slashes (relative)', () => {
      const result = renderIconHtml('icons/moon.png', undefined);
      expect(result).toContain('<img');
      expect(result).toContain('icons/moon.png');
    });
  });

  describe('renderIconHtml - Security: Remote URL Rejection', () => {
    it('should reject http:// URLs', () => {
      const result = renderIconHtml('http://example.com/icon.png', undefined);
      expect(result).toBe('');
    });

    it('should reject https:// URLs', () => {
      const result = renderIconHtml('https://example.com/icon.png', undefined);
      expect(result).toBe('');
    });

    it('should reject ftp:// URLs', () => {
      const result = renderIconHtml('ftp://example.com/icon.png', undefined);
      expect(result).toBe('');
    });

    it('should reject protocol-relative URLs (//example.com)', () => {
      const result = renderIconHtml('//example.com/icon.png', undefined);
      expect(result).toBe('');
    });

    it('should fallback to icon when iconUrl is remote', () => {
      const result = renderIconHtml('https://evil.com/icon.png', 'fas fa-shield', 16, 16);
      expect(result).toContain('fas fa-shield');
      expect(result).not.toContain('https://evil.com');
    });
  });

  describe('renderIconHtml - Security: XSS Prevention', () => {
    it('should reject javascript: protocol URLs', () => {
      const result = renderIconHtml('javascript:alert(1)', undefined);
      expect(result).toBe('');
    });

    it('should reject data: URIs', () => {
      const result = renderIconHtml('data:text/html,<script>alert(1)</script>', undefined);
      expect(result).toBe('');
    });

    it('should reject data: SVG with script', () => {
      const result = renderIconHtml('data:image/svg+xml,<svg onload=alert(1)>', undefined);
      expect(result).toBe('');
    });

    it('should escape HTML characters in local iconUrl paths', () => {
      const result = renderIconHtml('/icons/icon"><script>alert(1)</script>.png', undefined);
      expect(result).not.toContain('<script>');
      expect(result).toContain('&quot;');
      expect(result).toContain('&gt;');
      expect(result).toContain('&lt;');
    });

    it('should escape quotes in additionalClasses parameter', () => {
      const result = renderIconHtml('/icons/icon.png', undefined, 16, 16, '" onload="alert(1)');
      // Should not contain unescaped onload attribute that could execute
      expect(result).not.toContain(' onload="alert');
      expect(result).not.toMatch(/\sonload="[^&]/);
      // Should contain escaped quotes
      expect(result).toContain('&quot;');
      expect(result).toContain('onload=&quot;');
    });

    it('should escape HTML in FontAwesome icon class', () => {
      const result = renderIconHtml(undefined, 'fas fa-star"><script>alert(1)</script>', 16, 16);
      expect(result).not.toContain('<script>');
      expect(result).toContain('&quot;');
      expect(result).toContain('&gt;');
    });

    it('should handle empty string iconUrl', () => {
      const result = renderIconHtml('', undefined);
      expect(result).toBe('');
    });

    it('should handle whitespace-only iconUrl', () => {
      const result = renderIconHtml('   ', undefined);
      expect(result).toBe('');
    });
  });

  describe('Calendar Type Support', () => {
    it('should support iconUrl in MoonPhase interface', () => {
      const moonPhase = {
        name: 'Full Moon',
        length: 1,
        singleDay: true,
        icon: 'full',
        iconUrl: '/modules/my-calendar/icons/full-moon.png',
      };

      expect(moonPhase.iconUrl).toBe('/modules/my-calendar/icons/full-moon.png');
      expect(moonPhase.icon).toBe('full');
    });

    it('should support iconUrl in CalendarSeason interface', () => {
      const season = {
        name: 'Summer',
        startMonth: 6,
        endMonth: 8,
        icon: 'summer',
        iconUrl: '/modules/my-calendar/icons/summer-icon.png',
      };

      expect(season.iconUrl).toBe('/modules/my-calendar/icons/summer-icon.png');
      expect(season.icon).toBe('summer');
    });

    it('should support iconUrl in CalendarEvent interface', () => {
      const event = {
        id: 'test-event',
        name: 'Test Event',
        recurrence: { type: 'fixed' as const, month: 1, day: 1 },
        icon: 'fas fa-star',
        iconUrl: '/modules/my-calendar/icons/event-icon.png',
      };

      expect(event.iconUrl).toBe('/modules/my-calendar/icons/event-icon.png');
      expect(event.icon).toBe('fas fa-star');
    });
  });

  describe('Handlebars Helper Integration', () => {
    beforeEach(() => {
      // Reset helpers and create a DateFormatter instance to register the helper
      DateFormatter.resetHelpersForTesting();
      const mockCalendar: SeasonsStarsCalendar = {
        id: 'test-calendar',
        name: 'Test Calendar',
        months: [{ name: 'Test Month', abbreviation: 'TM', days: 30 }],
        weekdays: [{ name: 'Test Day', abbreviation: 'TD' }],
        year: { prefix: '', suffix: '' },
        time: { hoursInDay: 24, minutesInHour: 60, secondsInMinute: 60 },
      } as SeasonsStarsCalendar;
      new DateFormatter(mockCalendar); // This registers the helpers
    });

    it('should render local iconUrl through ss-render-icon helper', () => {
      const helper = Handlebars.helpers['ss-render-icon'];
      expect(helper).toBeDefined();

      const result = helper.call(
        {},
        {
          hash: {
            iconUrl: '/modules/test/icon.png',
            width: 24,
            height: 24,
          },
        }
      );

      expect(result.string).toContain('<img');
      expect(result.string).toContain('/modules/test/icon.png');
      expect(result.string).toContain('width="24"');
      expect(result.string).toContain('height="24"');
    });

    it('should render FontAwesome icon through ss-render-icon helper', () => {
      const helper = Handlebars.helpers['ss-render-icon'];
      const result = helper.call(
        {},
        {
          hash: {
            icon: 'fas fa-moon',
            width: 16,
            height: 16,
          },
        }
      );

      expect(result.string).toContain('<i class="fas fa-moon"');
      expect(result.string).toContain('aria-hidden="true"');
    });

    it('should prioritize iconUrl over icon in ss-render-icon helper', () => {
      const helper = Handlebars.helpers['ss-render-icon'];
      const result = helper.call(
        {},
        {
          hash: {
            icon: 'fas fa-star',
            iconUrl: '/modules/test/custom.png',
            width: 16,
            height: 16,
          },
        }
      );

      expect(result.string).toContain('<img');
      expect(result.string).toContain('/modules/test/custom.png');
      expect(result.string).not.toContain('fas fa-star');
    });

    it('should reject remote URLs through ss-render-icon helper', () => {
      const helper = Handlebars.helpers['ss-render-icon'];
      const result = helper.call(
        {},
        {
          hash: {
            iconUrl: 'https://evil.com/malware.png',
            icon: 'fas fa-shield',
            width: 16,
            height: 16,
          },
        }
      );

      expect(result.string).toContain('<i class="fas fa-shield"');
      expect(result.string).not.toContain('https://evil.com');
    });

    it('should escape malicious HTML in iconUrl through helper', () => {
      const helper = Handlebars.helpers['ss-render-icon'];
      const result = helper.call(
        {},
        {
          hash: {
            iconUrl: '/icon"><script>alert(1)</script>.png',
            width: 16,
            height: 16,
          },
        }
      );

      expect(result.string).not.toContain('<script>');
      expect(result.string).toContain('&quot;');
      expect(result.string).toContain('&gt;');
      expect(result.string).toContain('&lt;');
    });

    it('should apply additional classes through ss-render-icon helper', () => {
      const helper = Handlebars.helpers['ss-render-icon'];
      const result = helper.call(
        {},
        {
          hash: {
            iconUrl: '/modules/test/icon.png',
            class: 'custom-class',
            width: 16,
            height: 16,
          },
        }
      );

      expect(result.string).toContain('class="custom-class"');
    });

    it('should use default dimensions when not specified in helper', () => {
      const helper = Handlebars.helpers['ss-render-icon'];
      const result = helper.call(
        {},
        {
          hash: {
            iconUrl: '/modules/test/icon.png',
          },
        }
      );

      expect(result.string).toContain('width="16"');
      expect(result.string).toContain('height="16"');
    });
  });
});
