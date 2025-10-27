import { describe, it, expect } from 'vitest';
import { renderIconHtml } from '../src/core/constants';

describe('Icon URL Support', () => {
  describe('renderIconHtml', () => {
    it('should prioritize iconUrl over icon when both are provided', () => {
      const result = renderIconHtml('https://example.com/icon.png', 'fas fa-star', 16, 16);
      expect(result).toContain('<img');
      expect(result).toContain('https://example.com/icon.png');
      expect(result).not.toContain('fas fa-star');
    });

    it('should render image tag when iconUrl is provided', () => {
      const result = renderIconHtml('https://example.com/moon.png', undefined, 24, 24);
      expect(result).toBe(
        '<img src="https://example.com/moon.png" width="24" height="24" alt="" />'
      );
    });

    it('should render FontAwesome icon when only icon is provided', () => {
      const result = renderIconHtml(undefined, 'fas fa-calendar', 16, 16);
      expect(result).toBe('<i class="fas fa-calendar" aria-hidden="true"></i>');
    });

    it('should use default width and height when not specified', () => {
      const result = renderIconHtml('https://example.com/icon.png', undefined);
      expect(result).toContain('width="16"');
      expect(result).toContain('height="16"');
    });

    it('should apply additional classes to image when provided', () => {
      const result = renderIconHtml(
        'https://example.com/icon.png',
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

  describe('Calendar Type Support', () => {
    it('should support iconUrl in MoonPhase interface', () => {
      const moonPhase = {
        name: 'Full Moon',
        length: 1,
        singleDay: true,
        icon: 'full',
        iconUrl: 'https://example.com/full-moon.png',
      };

      // Type check - should compile without errors
      expect(moonPhase.iconUrl).toBe('https://example.com/full-moon.png');
      expect(moonPhase.icon).toBe('full');
    });

    it('should support iconUrl in CalendarSeason interface', () => {
      const season = {
        name: 'Summer',
        startMonth: 6,
        endMonth: 8,
        icon: 'summer',
        iconUrl: 'https://example.com/summer-icon.png',
      };

      // Type check - should compile without errors
      expect(season.iconUrl).toBe('https://example.com/summer-icon.png');
      expect(season.icon).toBe('summer');
    });

    it('should support iconUrl in CalendarEvent interface', () => {
      const event = {
        id: 'test-event',
        name: 'Test Event',
        recurrence: { type: 'fixed' as const, month: 1, day: 1 },
        icon: 'fas fa-star',
        iconUrl: 'https://example.com/event-icon.png',
      };

      // Type check - should compile without errors
      expect(event.iconUrl).toBe('https://example.com/event-icon.png');
      expect(event.icon).toBe('fas fa-star');
    });
  });
});
