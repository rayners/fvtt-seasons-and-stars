import { describe, it, expect, vi, beforeEach } from 'vitest';
import { APIWrapper } from '../src/core/api-wrapper';
import { Logger } from '../src/core/logger';

// Mock the logger module with simple vi.fn() mocks
vi.mock('../src/core/logger', () => ({
  Logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    api: vi.fn(),
    integration: vi.fn(),
    critical: vi.fn(),
    timing: vi.fn((label, fn) => fn()),
  },
}));

describe('APIWrapper', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('wrapAPIMethod', () => {
    it('should execute successful API method and log correctly', async () => {
      const mockImplementation = vi.fn().mockResolvedValue('success result');
      const mockValidator = vi.fn();

      const result = await APIWrapper.wrapAPIMethod(
        'testMethod',
        { param: 'value' },
        mockValidator,
        mockImplementation
      );

      expect(result).toBe('success result');
      expect(Logger.api).toHaveBeenCalledWith('testMethod', { param: 'value' });
      expect(Logger.api).toHaveBeenCalledWith('testMethod', { param: 'value' }, 'success result');
      expect(mockValidator).toHaveBeenCalledWith({ param: 'value' });
      expect(mockImplementation).toHaveBeenCalled();
    });

    it('should handle undefined result correctly', async () => {
      const mockImplementation = vi.fn().mockResolvedValue(undefined);
      const mockValidator = vi.fn();

      const result = await APIWrapper.wrapAPIMethod(
        'testMethod',
        { param: 'value' },
        mockValidator,
        mockImplementation
      );

      expect(result).toBeUndefined();
      expect(Logger.api).toHaveBeenCalledWith('testMethod', { param: 'value' }, 'success');
    });

    it('should handle validation errors and log them', async () => {
      const validationError = new Error('Validation failed');
      const mockValidator = vi.fn().mockImplementation(() => {
        throw validationError;
      });
      const mockImplementation = vi.fn();

      await expect(
        APIWrapper.wrapAPIMethod(
          'testMethod',
          { param: 'invalid' },
          mockValidator,
          mockImplementation
        )
      ).rejects.toThrow('Validation failed');

      expect(Logger.error).toHaveBeenCalledWith('Failed to testMethod', validationError);
      expect(mockImplementation).not.toHaveBeenCalled();
    });

    it('should handle implementation errors and log them', async () => {
      const implementationError = new Error('Implementation failed');
      const mockValidator = vi.fn();
      const mockImplementation = vi.fn().mockRejectedValue(implementationError);

      await expect(
        APIWrapper.wrapAPIMethod(
          'testMethod',
          { param: 'value' },
          mockValidator,
          mockImplementation
        )
      ).rejects.toThrow('Implementation failed');

      expect(Logger.error).toHaveBeenCalledWith('Failed to testMethod', implementationError);
    });

    it('should convert non-Error exceptions to Error objects', async () => {
      const mockValidator = vi.fn().mockImplementation(() => {
        throw 'string error';
      });
      const mockImplementation = vi.fn();

      await expect(
        APIWrapper.wrapAPIMethod(
          'testMethod',
          { param: 'value' },
          mockValidator,
          mockImplementation
        )
      ).rejects.toThrow('string error');

      expect(Logger.error).toHaveBeenCalledWith('Failed to testMethod', new Error('string error'));
    });

    it('should work with synchronous implementations', async () => {
      const mockImplementation = vi.fn().mockReturnValue('sync result');
      const mockValidator = vi.fn();

      const result = await APIWrapper.wrapAPIMethod(
        'testMethod',
        { param: 'value' },
        mockValidator,
        mockImplementation
      );

      expect(result).toBe('sync result');
    });
  });

  describe('validateNumber', () => {
    it('should pass for valid finite numbers', () => {
      expect(() => APIWrapper.validateNumber(42, 'Test Number')).not.toThrow();
      expect(() => APIWrapper.validateNumber(0, 'Zero')).not.toThrow();
      expect(() => APIWrapper.validateNumber(-100, 'Negative')).not.toThrow();
      expect(() => APIWrapper.validateNumber(3.14, 'Float')).not.toThrow();
    });

    it('should throw for non-numbers', () => {
      expect(() => APIWrapper.validateNumber('42', 'String Number')).toThrow(
        'String Number must be a finite number'
      );
      expect(() => APIWrapper.validateNumber(null, 'Null')).toThrow('Null must be a finite number');
      expect(() => APIWrapper.validateNumber(undefined, 'Undefined')).toThrow(
        'Undefined must be a finite number'
      );
      expect(() => APIWrapper.validateNumber({}, 'Object')).toThrow(
        'Object must be a finite number'
      );
    });

    it('should throw for infinite numbers', () => {
      expect(() => APIWrapper.validateNumber(Infinity, 'Infinity')).toThrow(
        'Infinity must be a finite number'
      );
      expect(() => APIWrapper.validateNumber(-Infinity, 'Negative Infinity')).toThrow(
        'Negative Infinity must be a finite number'
      );
      expect(() => APIWrapper.validateNumber(NaN, 'NaN')).toThrow('NaN must be a finite number');
    });
  });

  describe('validateString', () => {
    it('should pass for valid strings', () => {
      expect(() => APIWrapper.validateString('hello', 'Test String')).not.toThrow();
      expect(() => APIWrapper.validateString('', 'Empty String', true)).not.toThrow();
    });

    it('should throw for non-strings', () => {
      expect(() => APIWrapper.validateString(42, 'Number')).toThrow('Number must be a string');
      expect(() => APIWrapper.validateString(null, 'Null')).toThrow('Null must be a string');
      expect(() => APIWrapper.validateString(undefined, 'Undefined')).toThrow(
        'Undefined must be a string'
      );
    });

    it('should handle empty string validation', () => {
      expect(() => APIWrapper.validateString('', 'Empty String', false)).toThrow(
        'Empty String must not be empty'
      );
      expect(() => APIWrapper.validateString('   ', 'Whitespace String', false)).toThrow(
        'Whitespace String must not be empty'
      );
    });

    it('should default to not allowing empty strings', () => {
      expect(() => APIWrapper.validateString('', 'Default Empty')).toThrow(
        'Default Empty must not be empty'
      );
    });
  });

  describe('validateOptionalString', () => {
    it('should pass for valid strings', () => {
      expect(() => APIWrapper.validateOptionalString('hello', 'Test String')).not.toThrow();
      expect(() => APIWrapper.validateOptionalString('', 'Empty String')).not.toThrow();
    });

    it('should pass for undefined', () => {
      expect(() => APIWrapper.validateOptionalString(undefined, 'Undefined')).not.toThrow();
    });

    it('should throw for non-string non-undefined values', () => {
      expect(() => APIWrapper.validateOptionalString(42, 'Number')).toThrow(
        'Number must be a string if provided'
      );
      expect(() => APIWrapper.validateOptionalString(null, 'Null')).toThrow(
        'Null must be a string if provided'
      );
    });
  });

  describe('validateCalendarId', () => {
    it('should throw for non-empty calendar IDs with feature not implemented', () => {
      expect(() => APIWrapper.validateCalendarId('gregorian')).toThrow(
        'Calendar-specific operations not yet implemented'
      );
      expect(() => APIWrapper.validateCalendarId('custom-calendar')).toThrow(
        'Calendar-specific operations not yet implemented'
      );
    });

    it('should pass for undefined', () => {
      expect(() => APIWrapper.validateCalendarId(undefined)).not.toThrow();
    });

    it('should throw for invalid types', () => {
      expect(() => APIWrapper.validateCalendarId(42 as any)).toThrow(
        'Calendar ID must be a string'
      );
    });

    it('should handle empty strings', () => {
      expect(() => APIWrapper.validateCalendarId('')).toThrow('Calendar ID must not be empty');
    });
  });

  describe('validateCalendarDate', () => {
    it('should pass for valid calendar date objects', () => {
      const validDate = { year: 2024, month: 6, day: 15 };
      expect(() => APIWrapper.validateCalendarDate(validDate, 'Valid Date')).not.toThrow();
    });

    it('should throw for non-object dates', () => {
      expect(() => APIWrapper.validateCalendarDate(null, 'Null Date')).toThrow(
        'Null Date must be a valid calendar date object'
      );
      expect(() => APIWrapper.validateCalendarDate(undefined, 'Undefined Date')).toThrow(
        'Undefined Date must be a valid calendar date object'
      );
      expect(() => APIWrapper.validateCalendarDate('2024-06-15', 'String Date')).toThrow(
        'String Date must be a valid calendar date object'
      );
    });

    it('should throw for objects missing required properties', () => {
      expect(() => APIWrapper.validateCalendarDate({}, 'Empty Object')).toThrow(
        'Empty Object must have valid year, month, and day numbers'
      );
      expect(() => APIWrapper.validateCalendarDate({ year: 2024 }, 'Missing Month/Day')).toThrow(
        'Missing Month/Day must have valid year, month, and day numbers'
      );
      expect(() =>
        APIWrapper.validateCalendarDate({ year: 2024, month: 6 }, 'Missing Day')
      ).toThrow('Missing Day must have valid year, month, and day numbers');
    });

    it('should throw for objects with invalid property types', () => {
      expect(() =>
        APIWrapper.validateCalendarDate({ year: '2024', month: 6, day: 15 }, 'String Year')
      ).toThrow('String Year must have valid year, month, and day numbers');
      expect(() =>
        APIWrapper.validateCalendarDate({ year: 2024, month: '6', day: 15 }, 'String Month')
      ).toThrow('String Month must have valid year, month, and day numbers');
      expect(() =>
        APIWrapper.validateCalendarDate({ year: 2024, month: 6, day: '15' }, 'String Day')
      ).toThrow('String Day must have valid year, month, and day numbers');
    });

    it('should use default parameter name', () => {
      expect(() => APIWrapper.validateCalendarDate(null)).toThrow(
        'Date must be a valid calendar date object'
      );
    });
  });

  describe('validation integration', () => {
    it('should work together in a complex validation scenario', async () => {
      const mockValidator = (params: any) => {
        APIWrapper.validateNumber(params.count, 'Count');
        APIWrapper.validateString(params.name, 'Name', false);
        APIWrapper.validateOptionalString(params.description, 'Description');
        APIWrapper.validateCalendarDate(params.date, 'Date');
      };

      const mockImplementation = vi.fn().mockResolvedValue('complex result');

      const validParams = {
        count: 5,
        name: 'test',
        description: 'optional desc',
        date: { year: 2024, month: 6, day: 15 },
      };

      const result = await APIWrapper.wrapAPIMethod(
        'complexMethod',
        validParams,
        mockValidator,
        mockImplementation
      );

      expect(result).toBe('complex result');
      expect(mockImplementation).toHaveBeenCalled();
    });

    it('should fail early on first validation error', async () => {
      const mockValidator = (params: any) => {
        APIWrapper.validateNumber(params.count, 'Count'); // This will fail
        APIWrapper.validateString(params.name, 'Name'); // This won't be reached
      };

      const mockImplementation = vi.fn();

      const invalidParams = {
        count: 'not a number',
        name: 'test',
      };

      await expect(
        APIWrapper.wrapAPIMethod('complexMethod', invalidParams, mockValidator, mockImplementation)
      ).rejects.toThrow('Count must be a finite number');

      expect(mockImplementation).not.toHaveBeenCalled();
    });
  });
});
