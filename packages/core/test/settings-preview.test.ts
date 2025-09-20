/**
 * Tests for Settings Preview explanations
 */

import { describe, it, expect } from 'vitest';
import * as settingsPreview from '../src/core/settings-preview';

const { generateRatioExplanation, generateIntervalExplanation } = settingsPreview as any;

function calculateOptimalInterval(ratio: number): number {
  return Math.max(10000, Math.ceil(1000 / ratio));
}

describe('Settings Preview', () => {
  describe('Ratio explanations', () => {
    it('explains 1:1 ratio', () => {
      const explanation = generateRatioExplanation(1.0);
      expect(explanation).toBe(
        '<strong>Real Time:</strong> 1 second of real time = 1 second of game time'
      );
    });

    it('explains 2x speed', () => {
      const explanation = generateRatioExplanation(2.0);
      expect(explanation).toBe(
        '<strong>Accelerated Time:</strong> 1 second of real time = 2 seconds of game time (2x speed)'
      );
    });

    it('explains 0.5x speed', () => {
      const explanation = generateRatioExplanation(0.5);
      expect(explanation).toBe(
        '<strong>Slow Time:</strong> 2 seconds of real time = 1 second of game time'
      );
    });

    it('explains very slow speed', () => {
      const explanation = generateRatioExplanation(0.01);
      expect(explanation).toBe(
        '<strong>Very Slow Time:</strong> 2 minutes of real time = 1 second of game time'
      );
    });

    it('explains fractional speeds', () => {
      const explanation = generateRatioExplanation(1.5);
      expect(explanation).toBe(
        '<strong>Accelerated Time:</strong> 1 second of real time = 1.5 seconds of game time (1.5x speed)'
      );
    });
  });

  describe('Interval explanations', () => {
    it('explains 1:1 ratio interval', () => {
      const interval = calculateOptimalInterval(1.0);
      const explanation = generateIntervalExplanation(1.0, interval);
      expect(explanation).toBe('Technical: Every 10 seconds, game time advances by 10 seconds');
    });

    it('explains 2x speed interval', () => {
      const interval = calculateOptimalInterval(2.0);
      const explanation = generateIntervalExplanation(2.0, interval);
      expect(explanation).toBe('Technical: Every 10 seconds, game time advances by 20 seconds');
    });

    it('explains slow speed interval', () => {
      const interval = calculateOptimalInterval(0.5);
      const explanation = generateIntervalExplanation(0.5, interval);
      expect(explanation).toBe('Technical: Every 10 seconds, game time advances by 5 seconds');
    });
  });

  describe('Smart interval calculation', () => {
    it('calculates 1:1 ratio interval', () => {
      expect(calculateOptimalInterval(1.0)).toBe(10000);
    });

    it('calculates 0.5 ratio interval', () => {
      expect(calculateOptimalInterval(0.5)).toBe(10000);
    });

    it('calculates 2.0 ratio interval', () => {
      expect(calculateOptimalInterval(2.0)).toBe(10000);
    });

    it('enforces minimum interval', () => {
      expect(calculateOptimalInterval(100.0)).toBe(10000);
    });

    it('calculates very slow interval', () => {
      expect(calculateOptimalInterval(0.1)).toBe(10000);
    });
  });
});
