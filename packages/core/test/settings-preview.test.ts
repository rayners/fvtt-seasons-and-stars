/**
 * Tests for Settings Preview functionality
 */

import { describe, it, expect } from 'vitest';

function calculateOptimalInterval(ratio: number, minIntervalSeconds: number = 10): number {
  const minIntervalMs = minIntervalSeconds * 1000;
  return Math.max(minIntervalMs, Math.ceil(1000 / ratio));
}

describe('Settings Preview', () => {
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

    it('respects custom minimum intervals', () => {
      // With 5 second minimum
      expect(calculateOptimalInterval(100.0, 5)).toBe(5000);
      expect(calculateOptimalInterval(1.0, 5)).toBe(5000);

      // With 30 second minimum
      expect(calculateOptimalInterval(100.0, 30)).toBe(30000);
      expect(calculateOptimalInterval(1.0, 30)).toBe(30000);

      // With 1 second minimum
      expect(calculateOptimalInterval(100.0, 1)).toBe(1000);
      expect(calculateOptimalInterval(1.0, 1)).toBe(1000);
    });
  });
});
