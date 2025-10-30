/**
 * Direct unit tests for widget-type-resolver module
 *
 * Tests the core widget type resolution logic in isolation,
 * ensuring proper handling of built-in and custom widget types.
 */

import { describe, it, expect } from 'vitest';
import {
  getTargetWidgetType,
  isBuiltInWidgetOption,
  getSafeDefaultWidgetOption,
} from '../src/ui/widget-type-resolver';

describe('Widget Type Resolver', () => {
  describe('getTargetWidgetType', () => {
    describe("'none' widget option", () => {
      it("should return null for 'none' with 'show' operation", () => {
        expect(getTargetWidgetType('none', 'show')).toBeNull();
      });

      it("should return 'main' for 'none' with 'hide' operation", () => {
        expect(getTargetWidgetType('none', 'hide')).toBe('main');
      });

      it("should return 'main' for 'none' with 'toggle' operation", () => {
        expect(getTargetWidgetType('none', 'toggle')).toBe('main');
      });
    });

    describe("'mini' widget option", () => {
      it("should return 'mini' for 'mini' with 'show' operation", () => {
        expect(getTargetWidgetType('mini', 'show')).toBe('mini');
      });

      it("should return 'mini' for 'mini' with 'hide' operation", () => {
        expect(getTargetWidgetType('mini', 'hide')).toBe('mini');
      });

      it("should return 'mini' for 'mini' with 'toggle' operation", () => {
        expect(getTargetWidgetType('mini', 'toggle')).toBe('mini');
      });
    });

    describe("'grid' widget option", () => {
      it("should return 'grid' for 'grid' with 'show' operation", () => {
        expect(getTargetWidgetType('grid', 'show')).toBe('grid');
      });

      it("should return 'grid' for 'grid' with 'hide' operation", () => {
        expect(getTargetWidgetType('grid', 'hide')).toBe('grid');
      });

      it("should return 'grid' for 'grid' with 'toggle' operation", () => {
        expect(getTargetWidgetType('grid', 'toggle')).toBe('grid');
      });
    });

    describe("'main' widget option", () => {
      it("should return 'main' for 'main' with 'show' operation", () => {
        expect(getTargetWidgetType('main', 'show')).toBe('main');
      });

      it("should return 'main' for 'main' with 'hide' operation", () => {
        expect(getTargetWidgetType('main', 'hide')).toBe('main');
      });

      it("should return 'main' for 'main' with 'toggle' operation", () => {
        expect(getTargetWidgetType('main', 'toggle')).toBe('main');
      });
    });

    describe('custom widget types', () => {
      it("should pass through custom widget type for 'show' operation", () => {
        expect(getTargetWidgetType('lunar-calendar', 'show')).toBe('lunar-calendar');
      });

      it("should pass through custom widget type for 'hide' operation", () => {
        expect(getTargetWidgetType('lunar-calendar', 'hide')).toBe('lunar-calendar');
      });

      it("should pass through custom widget type for 'toggle' operation", () => {
        expect(getTargetWidgetType('lunar-calendar', 'toggle')).toBe('lunar-calendar');
      });

      it('should handle multi-word custom widget types', () => {
        expect(getTargetWidgetType('custom-solar-widget', 'show')).toBe('custom-solar-widget');
      });

      it('should handle custom widget types with numbers', () => {
        expect(getTargetWidgetType('widget-v2', 'show')).toBe('widget-v2');
      });
    });
  });

  describe('isBuiltInWidgetOption', () => {
    describe('valid built-in options', () => {
      it("should return true for 'none'", () => {
        expect(isBuiltInWidgetOption('none')).toBe(true);
      });

      it("should return true for 'main'", () => {
        expect(isBuiltInWidgetOption('main')).toBe(true);
      });

      it("should return true for 'mini'", () => {
        expect(isBuiltInWidgetOption('mini')).toBe(true);
      });

      it("should return true for 'grid'", () => {
        expect(isBuiltInWidgetOption('grid')).toBe(true);
      });
    });

    describe('invalid values', () => {
      it('should return false for custom widget type', () => {
        expect(isBuiltInWidgetOption('lunar-calendar')).toBe(false);
      });

      it('should return false for invalid string', () => {
        expect(isBuiltInWidgetOption('invalid')).toBe(false);
      });

      it('should return false for null', () => {
        expect(isBuiltInWidgetOption(null)).toBe(false);
      });

      it('should return false for undefined', () => {
        expect(isBuiltInWidgetOption(undefined)).toBe(false);
      });

      it('should return false for number', () => {
        expect(isBuiltInWidgetOption(123)).toBe(false);
      });

      it('should return false for object', () => {
        expect(isBuiltInWidgetOption({})).toBe(false);
      });

      it('should return false for array', () => {
        expect(isBuiltInWidgetOption([])).toBe(false);
      });

      it('should return false for boolean', () => {
        expect(isBuiltInWidgetOption(true)).toBe(false);
      });
    });
  });

  describe('getSafeDefaultWidgetOption', () => {
    describe('valid string values', () => {
      it("should return 'none' when given 'none'", () => {
        expect(getSafeDefaultWidgetOption('none')).toBe('none');
      });

      it("should return 'main' when given 'main'", () => {
        expect(getSafeDefaultWidgetOption('main')).toBe('main');
      });

      it("should return 'mini' when given 'mini'", () => {
        expect(getSafeDefaultWidgetOption('mini')).toBe('mini');
      });

      it("should return 'grid' when given 'grid'", () => {
        expect(getSafeDefaultWidgetOption('grid')).toBe('grid');
      });

      it('should return custom widget type when given custom string', () => {
        expect(getSafeDefaultWidgetOption('lunar-calendar')).toBe('lunar-calendar');
      });

      it('should return custom widget type with special characters', () => {
        expect(getSafeDefaultWidgetOption('custom-widget-v2')).toBe('custom-widget-v2');
      });
    });

    describe('invalid values that fallback to main', () => {
      it("should return 'main' for null", () => {
        expect(getSafeDefaultWidgetOption(null)).toBe('main');
      });

      it("should return 'main' for undefined", () => {
        expect(getSafeDefaultWidgetOption(undefined)).toBe('main');
      });

      it("should return 'main' for number", () => {
        expect(getSafeDefaultWidgetOption(123)).toBe('main');
      });

      it("should return 'main' for object", () => {
        expect(getSafeDefaultWidgetOption({})).toBe('main');
      });

      it("should return 'main' for array", () => {
        expect(getSafeDefaultWidgetOption([])).toBe('main');
      });

      it("should return 'main' for boolean", () => {
        expect(getSafeDefaultWidgetOption(true)).toBe('main');
      });

      it("should return 'main' for empty string", () => {
        expect(getSafeDefaultWidgetOption('')).toBe('main');
      });

      it("should return 'main' for whitespace-only string", () => {
        expect(getSafeDefaultWidgetOption('   ')).toBe('main');
      });
    });

    describe('edge cases', () => {
      it('should handle string with leading/trailing spaces', () => {
        expect(getSafeDefaultWidgetOption('  mini  ')).toBe('  mini  ');
      });

      it('should handle very long custom widget names', () => {
        const longName = 'very-long-custom-widget-name-that-exceeds-normal-length';
        expect(getSafeDefaultWidgetOption(longName)).toBe(longName);
      });
    });
  });

  describe('Integration scenarios', () => {
    it('should handle workflow: get setting -> validate -> resolve target', () => {
      // Simulate getting a setting value
      const settingValue = 'lunar-calendar';

      // Validate and get safe value
      const safeValue = getSafeDefaultWidgetOption(settingValue);
      expect(safeValue).toBe('lunar-calendar');

      // Resolve target widget for show operation
      const target = getTargetWidgetType(safeValue, 'show');
      expect(target).toBe('lunar-calendar');
    });

    it('should handle workflow with invalid setting value', () => {
      // Simulate getting an invalid setting value
      const settingValue = null;

      // Validate and get safe value (falls back to 'main')
      const safeValue = getSafeDefaultWidgetOption(settingValue);
      expect(safeValue).toBe('main');

      // Resolve target widget for show operation
      const target = getTargetWidgetType(safeValue, 'show');
      expect(target).toBe('main');
    });

    it("should handle workflow with 'none' setting", () => {
      // Simulate getting 'none' setting
      const settingValue = 'none';

      // Validate and get safe value
      const safeValue = getSafeDefaultWidgetOption(settingValue);
      expect(safeValue).toBe('none');

      // Resolve target widget for show operation (should be null)
      const showTarget = getTargetWidgetType(safeValue, 'show');
      expect(showTarget).toBeNull();

      // Resolve target widget for toggle operation (should be 'main')
      const toggleTarget = getTargetWidgetType(safeValue, 'toggle');
      expect(toggleTarget).toBe('main');
    });
  });
});
