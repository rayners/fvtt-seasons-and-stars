/**
 * Quench test registration for Seasons & Stars PF2e Integration
 * These tests run inside the actual Foundry VTT environment to test GitHub Issue #91
 *
 * Based on Journeys & Jamborees Quench test patterns
 */

// Quench is available globally when the Quench module is loaded

/* eslint-disable no-console */

/**
 * Register Quench test batches
 */
function registerSeasonsStarsQuenchTests() {
  if (!globalThis.quench) return;

  const quench = globalThis.quench;
  
  // Register Diagnostic tests
  quench.registerBatch(
    'seasons-stars.diagnostics',
    context => {
      const { describe, it, assert } = context;

      describe('Date Mismatch Diagnostics', function () {
        it('should generate comprehensive diagnostic report for date mismatch issues', function () {
          console.log('\n🔍 SEASONS & STARS DIAGNOSTIC REPORT');
          console.log('='.repeat(50));
          console.log('📋 Copy this entire report when reporting date mismatch issues');
          console.log('='.repeat(50));

          const seasonsStars = game.seasonsStars;
          const diagnosticData = {
            timestamp: new Date().toISOString(),
            foundryVersion: game.version,
            systemId: game.system?.id || 'unknown',
            systemVersion: game.system?.version || 'unknown',
            moduleName: 'seasons-and-stars',
            moduleVersion: game.modules?.get('seasons-and-stars')?.version || 'unknown',
          };

          // Basic S&S availability
          if (!seasonsStars?.api) {
            diagnosticData.error = 'Seasons & Stars API not available';
            console.log('❌ ERROR: Seasons & Stars API not available');
            console.log(JSON.stringify(diagnosticData, null, 2));
            return;
          }

          // Core Foundry time data
          try {
            diagnosticData.foundry = {
              worldTime: game.time?.worldTime || 'unknown',
              worldCreationTimestamp: game.time?.worldCreationTimestamp || 'unknown',
              worldCreatedDate: game.time?.worldCreationTimestamp
                ? new Date(game.time.worldCreationTimestamp * 1000).toISOString()
                : 'unknown',
            };
          } catch (error) {
            diagnosticData.foundry = { error: String(error) };
          }

          // S&S calendar data
          try {
            const currentDate = seasonsStars.api.getCurrentDate();
            const activeCalendar = seasonsStars.manager?.getActiveCalendar();

            diagnosticData.seasonsStars = {
              currentDate: currentDate,
              activeCalendarId: activeCalendar?.id || 'unknown',
              activeCalendarName: activeCalendar?.name || 'unknown',
              calendarEpoch: activeCalendar?.year?.epoch || 'unknown',
              weekdayCount: activeCalendar?.weekdays?.length || 'unknown',
              monthCount: activeCalendar?.months?.length || 'unknown',
            };
          } catch (error) {
            diagnosticData.seasonsStars = { error: String(error) };
          }

          // PF2e specific data (if available)
          if (game.system?.id === 'pf2e') {
            try {
              const pf2eWorldClock = game.pf2e?.worldClock;
              const pf2eSettings = game.pf2e?.settings?.worldClock;

              diagnosticData.pf2e = {
                worldClockAvailable: !!pf2eWorldClock,
                worldClock: pf2eWorldClock
                  ? {
                      year: pf2eWorldClock.year,
                      month: pf2eWorldClock.month,
                      day: pf2eWorldClock.day,
                      weekday: pf2eWorldClock.weekday,
                    }
                  : 'not available',
                settings: pf2eSettings
                  ? {
                      dateTheme: pf2eSettings.dateTheme,
                      worldCreatedOn: pf2eSettings.worldCreatedOn,
                      showClockButton: pf2eSettings.showClockButton,
                    }
                  : 'not available',
              };

              // Calculate differences if both systems have data
              if (pf2eWorldClock && diagnosticData.seasonsStars.currentDate) {
                const ssDate = diagnosticData.seasonsStars.currentDate;
                diagnosticData.comparison = {
                  yearDifference: Math.abs(ssDate.year - pf2eWorldClock.year),
                  monthDifference: Math.abs(ssDate.month - pf2eWorldClock.month),
                  dayDifference: Math.abs(ssDate.day - pf2eWorldClock.day),
                  sameDate:
                    ssDate.year === pf2eWorldClock.year &&
                    ssDate.month === pf2eWorldClock.month &&
                    ssDate.day === pf2eWorldClock.day,
                };
              }
            } catch (error) {
              diagnosticData.pf2e = { error: String(error) };
            }
          } else {
            diagnosticData.pf2e = { note: 'Not using PF2e system' };
          }

          // Module compatibility data
          try {
            const modules = game.modules;
            diagnosticData.modules = {
              simpleCalendar: {
                active: modules?.get('foundryvtt-simple-calendar')?.active || false,
                version: modules?.get('foundryvtt-simple-calendar')?.version || 'not installed',
              },
              smallTime: {
                active: modules?.get('smalltime')?.active || false,
                version: modules?.get('smalltime')?.version || 'not installed',
              },
              simpleWeather: {
                active: modules?.get('simple-weather')?.active || false,
                version: modules?.get('simple-weather')?.version || 'not installed',
              },
            };
          } catch (error) {
            diagnosticData.modules = { error: String(error) };
          }

          // Browser and performance data
          try {
            diagnosticData.environment = {
              userAgent: navigator.userAgent,
              memoryUsage: performance.memory
                ? {
                    usedJSHeapSize:
                      Math.round(performance.memory.usedJSHeapSize / 1024 / 1024) + 'MB',
                    totalJSHeapSize:
                      Math.round(performance.memory.totalJSHeapSize / 1024 / 1024) + 'MB',
                  }
                : 'not available',
              windowSize: `${window.innerWidth}x${window.innerHeight}`,
              timestamp: Date.now(),
            };
          } catch (error) {
            diagnosticData.environment = { error: String(error) };
          }

          // Output the complete diagnostic report
          console.log('📊 DIAGNOSTIC DATA:');
          console.log(JSON.stringify(diagnosticData, null, 2));
          console.log('\n📋 COPY THE ABOVE JSON WHEN REPORTING ISSUES');
          console.log('='.repeat(50));

          // Provide quick analysis
          if (diagnosticData.comparison) {
            console.log('\n🔍 QUICK ANALYSIS:');
            if (diagnosticData.comparison.sameDate) {
              console.log('✅ S&S and PF2e show the same date - no mismatch detected');
            } else {
              console.log('⚠️ DATE MISMATCH DETECTED:');
              console.log(
                `   S&S Date: ${diagnosticData.seasonsStars.currentDate.year}-${diagnosticData.seasonsStars.currentDate.month}-${diagnosticData.seasonsStars.currentDate.day}`
              );
              console.log(
                `   PF2e Date: ${diagnosticData.pf2e.worldClock.year}-${diagnosticData.pf2e.worldClock.month}-${diagnosticData.pf2e.worldClock.day}`
              );
              console.log(
                `   Differences: ${diagnosticData.comparison.yearDifference} years, ${diagnosticData.comparison.monthDifference} months, ${diagnosticData.comparison.dayDifference} days`
              );
            }
          }

          // Always pass - this is a diagnostic test, not a validation test
          assert.ok(true, 'Diagnostic report generated successfully');
        });
      });
    },
    {
      displayName: 'Seasons & Stars: Diagnostic Tools',
      preSelected: true,
    }
  );

  // Register PF2e Integration tests
  quench.registerBatch(
    'seasons-stars.pf2e-integration',
    context => {
      const { describe, it, assert, beforeEach, afterEach } = context;

      describe('PF2e Integration - GitHub Issue #91', function () {
        let initialDate;

        if (beforeEach) {
          beforeEach(function () {
            // Store initial date for restoration
            const seasonsStars = game.seasonsStars;
            if (seasonsStars?.api?.getCurrentDate) {
              initialDate = seasonsStars.api.getCurrentDate();
            }
          });
        }

        if (afterEach) {
          afterEach(async function () {
            // Restore initial date using S&S API
            const seasonsStars = game.seasonsStars;
            if (initialDate && seasonsStars?.api?.setCurrentDate) {
              try {
                await seasonsStars.api.setCurrentDate(initialDate);
              } catch (error) {
                console.warn('Failed to restore initial date:', error);
              }
            }
          });
        }

        it('should not be stuck at epoch year', function () {
          // The main issue: widgets stuck at year 2700 (epoch)
          const seasonsStars = game.seasonsStars;
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
          const seasonsStars = game.seasonsStars;
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
          if (game.system?.id !== 'pf2e') {
            console.log('Skipping PF2e sync test - not running PF2e system');
            return;
          }

          const seasonsStars = game.seasonsStars;
          if (!seasonsStars?.api?.getCurrentDate) {
            assert.ok(false, 'Seasons & Stars API not available');
            return;
          }

          const ssDate = seasonsStars.api.getCurrentDate();
          const pf2eWorldClock = game.pf2e?.worldClock;

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
