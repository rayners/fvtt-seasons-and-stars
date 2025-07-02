/**
 * Quench test registration for Seasons & Stars PF2e Integration
 * These tests run inside the actual Foundry VTT environment to test GitHub Issue #91
 *
 * Based on Journeys & Jamborees Quench test patterns
 */

import type * as Quench from '@ethaks/fvtt-quench';

declare global {
  interface Window {
    quench: Quench.Quench;
  }
}

/**
 * Register Quench test batches
 */
function registerSeasonsStarsQuenchTests(): void {
  if (!window.quench) return;

  const quench = window.quench;

  // Register PF2e Integration tests
  quench.registerBatch(
    'seasons-stars.pf2e-integration',
    context => {
      const { describe, it, assert, beforeEach, afterEach } = context;

      describe('PF2e Integration - GitHub Issue #91', function () {
        let initialDate: any;

        beforeEach(function () {
          // Store initial date for restoration
          const seasonsStars = (game as any).seasonsStars;
          if (seasonsStars?.api?.getCurrentDate) {
            initialDate = seasonsStars.api.getCurrentDate();
          }
        });

        afterEach(async function () {
          // Restore initial date using S&S API
          const seasonsStars = (game as any).seasonsStars;
          if (initialDate && seasonsStars?.api?.setCurrentDate) {
            try {
              await seasonsStars.api.setCurrentDate(initialDate);
            } catch (error) {
              console.warn('Failed to restore initial date:', error);
            }
          }
        });

        it('should not be stuck at epoch year', function () {
          // The main issue: widgets stuck at year 2700 (epoch)
          const seasonsStars = (game as any).seasonsStars;
          if (!seasonsStars?.api?.getCurrentDate) {
            assert.ok(false, 'Seasons & Stars API not available');
            return;
          }

          const currentDate = seasonsStars.api.getCurrentDate();
          console.log('Current S&S Date:', currentDate);

          assert.ok(
            currentDate.year !== 2700,
            `Year should not be stuck at epoch 2700, got ${currentDate.year}`
          );
          assert.ok(
            currentDate.year > 4000,
            `Year should be reasonable for PF2e (>4000), got ${currentDate.year}`
          );
        });

        it('should advance dates correctly', async function () {
          const seasonsStars = (game as any).seasonsStars;
          if (!seasonsStars?.api?.getCurrentDate || !seasonsStars?.api?.advanceDays) {
            assert.ok(false, 'Seasons & Stars API not available');
            return;
          }

          const initialDate = seasonsStars.api.getCurrentDate();

          // Advance 1 day using S&S API
          await seasonsStars.api.advanceDays(1);
          const advancedDate = seasonsStars.api.getCurrentDate();

          console.log('Date advancement test:', {
            initial: initialDate,
            advanced: advancedDate,
            method: 'advanceDays(1)',
          });

          // Either day should advance, or month should change if end of month
          const dateChanged =
            advancedDate.day !== initialDate.day ||
            advancedDate.month !== initialDate.month ||
            advancedDate.year !== initialDate.year;

          assert.ok(dateChanged, 'Date should change when advancing 1 day');
        });

        it('should sync with PF2e if available', function () {
          if ((game as any).system?.id !== 'pf2e') {
            console.log('Skipping PF2e sync test - not running PF2e system');
            return;
          }

          const seasonsStars = (game as any).seasonsStars;
          if (!seasonsStars?.api?.getCurrentDate) {
            assert.ok(false, 'Seasons & Stars API not available');
            return;
          }

          const ssDate = seasonsStars.api.getCurrentDate();
          const pf2eWorldClock = (game as any).pf2e?.worldClock;

          if (pf2eWorldClock) {
            console.log('PF2e sync test:', {
              ssYear: ssDate.year,
              pf2eYear: pf2eWorldClock.year,
              difference: Math.abs(ssDate.year - pf2eWorldClock.year),
            });

            // Should be same or differ by expected offset (2025 based on observed behavior)
            const diff = Math.abs(ssDate.year - pf2eWorldClock.year);
            assert.ok(
              diff === 0 || diff === 2025,
              `Year difference should be 0 or 2025, got ${diff}`
            );
          } else {
            console.log('PF2e WorldClock not available');
          }
        });
      });
    },
    {
      displayName: 'Seasons & Stars: GitHub Issue #91',
      preSelected: true,
    }
  );
}

// Register the tests with Quench when ready
Hooks.on('quenchReady', () => {
  registerSeasonsStarsQuenchTests();
});

console.log('✅ S&S GitHub Issue #91 test loaded. Open Quench UI to run.');
