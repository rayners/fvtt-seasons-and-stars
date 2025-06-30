/**
 * Year Calculation Investigation Script
 *
 * Run this in Foundry console to systematically investigate
 * the year calculation discrepancy between S&S and PF2e.
 *
 * Usage: Copy and paste sections into Foundry console
 */

console.log('='.repeat(60));
console.log('SEASONS & STARS YEAR CALCULATION INVESTIGATION');
console.log('='.repeat(60));

// SECTION 1: BASIC SYSTEM INFORMATION
console.log('\n📋 SECTION 1: BASIC SYSTEM INFORMATION');
console.log('-'.repeat(40));

console.log('Game System:', game.system.id);
console.log('Foundry Version:', game.version);
console.log('Current World Time:', game.time.worldTime);

// Check S&S availability
const seasonsStars = game.seasonsStars || game.modules.get('seasons-and-stars')?.api;
console.log('S&S Available:', !!seasonsStars);

// Check PF2e availability
const pf2eSystem = game.system.id === 'pf2e';
const pf2eWorldClock = game.pf2e?.worldClock;
console.log('PF2e System:', pf2eSystem);
console.log('PF2e WorldClock:', !!pf2eWorldClock);

// SECTION 2: S&S CORE ENGINE TESTING
console.log('\n🔧 SECTION 2: S&S CORE ENGINE TESTING');
console.log('-'.repeat(40));

if (seasonsStars) {
  const manager = seasonsStars.manager;
  const engine = manager?.getActiveEngine?.();

  console.log('S&S Manager Available:', !!manager);
  console.log('S&S Engine Available:', !!engine);

  if (engine) {
    const activeCalendar = engine.calendar;
    console.log('Active Calendar ID:', activeCalendar?.id);
    console.log('Active Calendar Name:', activeCalendar?.name);
    console.log('Calendar Epoch:', activeCalendar?.year?.epoch);
    console.log('Calendar Year Suffix:', activeCalendar?.year?.suffix);

    // Test current date calculation
    const currentDate = manager.getCurrentDate?.();
    console.log('S&S Current Date:', currentDate);

    // Test worldTime to date conversion
    const currentWorldTime = game.time.worldTime;
    const convertedDate = engine.worldTimeToDate?.(currentWorldTime);
    console.log('WorldTime to Date Conversion:', convertedDate);

    // Test specific worldTime values
    console.log('\n📊 WorldTime Conversion Tests:');
    const testTimes = [
      0, // Epoch
      86400, // 1 day
      31536000, // ~1 year
      currentWorldTime, // Current time
    ];

    testTimes.forEach((time, index) => {
      const date = engine.worldTimeToDate?.(time);
      console.log(`  Test ${index + 1} - worldTime ${time}:`, date);
    });

    // Test round-trip conversion
    console.log('\n🔄 Round-trip Conversion Test:');
    const testDate = { year: 4725, month: 1, day: 1 }; // Expected PF2e year
    const worldTime = engine.dateToWorldTime?.(testDate);
    const backToDate = engine.worldTimeToDate?.(worldTime);
    console.log('Original Date:', testDate);
    console.log('Converted to WorldTime:', worldTime);
    console.log('Back to Date:', backToDate);
    console.log(
      'Round-trip Successful:',
      testDate.year === backToDate?.year &&
        testDate.month === backToDate?.month &&
        testDate.day === backToDate?.day
    );
  }
} else {
  console.log('❌ S&S not available - cannot test core engine');
}

// SECTION 3: PF2E SYSTEM ANALYSIS
console.log('\n⚔️ SECTION 3: PF2E SYSTEM ANALYSIS');
console.log('-'.repeat(40));

if (pf2eWorldClock) {
  console.log('PF2e World Clock Properties:');
  console.log('  Date Theme:', pf2eWorldClock.dateTheme);
  console.log('  Current Year:', pf2eWorldClock.year);
  console.log('  World Created On:', pf2eWorldClock.worldCreatedOn);

  // Get the Luxon DateTime
  const luxonTime = pf2eWorldClock.worldTime;
  console.log('  Luxon DateTime Year:', luxonTime?.year);
  console.log('  Luxon DateTime:', luxonTime?.toISO?.());

  // Check year offset configuration
  const currentTheme = pf2eWorldClock.dateTheme;
  const yearOffsetConfig = CONFIG.PF2E?.worldClock?.[currentTheme];
  console.log('  Current Theme Config:', yearOffsetConfig);

  if (yearOffsetConfig) {
    const manualCalculation = luxonTime.year + yearOffsetConfig.yearOffset;
    console.log(
      '  Manual Year Calculation:',
      `${luxonTime.year} + ${yearOffsetConfig.yearOffset} = ${manualCalculation}`
    );
    console.log('  Matches PF2e Year:', manualCalculation === pf2eWorldClock.year);
  }

  // Show all available themes
  console.log('\n📅 All PF2e Date Themes:');
  const allThemes = CONFIG.PF2E?.worldClock || {};
  Object.entries(allThemes).forEach(([theme, config]) => {
    console.log(`  ${theme}:`, config);
  });
} else if (pf2eSystem) {
  console.log('❌ PF2e system detected but WorldClock not available');
  console.log('CONFIG.PF2E available:', !!CONFIG.PF2E);
  console.log('game.pf2e available:', !!game.pf2e);
} else {
  console.log('ℹ️ Not a PF2e system - skipping PF2e analysis');
}

// SECTION 4: COMPARISON ANALYSIS
console.log('\n⚖️ SECTION 4: COMPARISON ANALYSIS');
console.log('-'.repeat(40));

if (seasonsStars && pf2eWorldClock) {
  const ssCurrentDate = seasonsStars.manager?.getCurrentDate?.();
  const pf2eCurrentYear = pf2eWorldClock.year;

  console.log('S&S Current Year:', ssCurrentDate?.year);
  console.log('PF2e Current Year:', pf2eCurrentYear);

  if (ssCurrentDate?.year && pf2eCurrentYear) {
    const yearDifference = ssCurrentDate.year - pf2eCurrentYear;
    console.log('Year Difference:', yearDifference);
    console.log('Difference Analysis:');

    if (yearDifference === 2024) {
      console.log('  ✅ Matches reported issue (2024 year difference)');
    } else if (yearDifference === 0) {
      console.log('  ✅ Years match - no discrepancy found');
    } else {
      console.log(`  ⚠️ Unexpected difference: ${yearDifference} years`);
    }
  }
} else {
  console.log('ℹ️ Cannot compare - missing S&S or PF2e data');
}

// SECTION 5: INTEGRATION LAYER TESTING
console.log('\n🔌 SECTION 5: INTEGRATION LAYER TESTING');
console.log('-'.repeat(40));

// Check S&S integration features
const integration = seasonsStars?.integration;
console.log('S&S Integration Object:', !!integration);

if (integration) {
  console.log('Integration Features:', integration.getAvailableFeatures?.());
  console.log('Has PF2e Integration:', integration.hasFeature?.('pf2e-worldclock'));
}

// Check Simple Calendar bridge
const bridgeModule = game.modules.get('simple-calendar-seasons-stars');
console.log('Bridge Module Installed:', !!bridgeModule);
console.log('Bridge Module Active:', bridgeModule?.active);

if (bridgeModule?.active) {
  const bridgeAPI = bridgeModule.api;
  console.log('Bridge API Available:', !!bridgeAPI);

  if (bridgeAPI) {
    console.log('Bridge API Methods:', Object.keys(bridgeAPI));

    // Test bridge date conversion
    try {
      const bridgeDate = bridgeAPI.timestampToDate?.(game.time.worldTime);
      console.log('Bridge Date Conversion Result:', bridgeDate);

      if (bridgeDate?.display) {
        console.log('Bridge Display Format:', bridgeDate.display);
      }
    } catch (error) {
      console.log('Bridge Date Conversion Error:', error.message);
    }
  }
}

// SECTION 6: CALENDAR DEFINITION VERIFICATION
console.log('\n📚 SECTION 6: CALENDAR DEFINITION VERIFICATION');
console.log('-'.repeat(40));

if (seasonsStars?.manager) {
  const allCalendars = seasonsStars.manager.getAvailableCalendars?.();
  console.log('Available Calendars:');

  allCalendars?.forEach(calendar => {
    console.log(`  ${calendar.id}:`, {
      name: calendar.name,
      epoch: calendar.year?.epoch,
      suffix: calendar.year?.suffix,
    });
  });

  // Focus on Golarion calendar if present
  const golarionCalendar = allCalendars?.find(c => c.id === 'golarion-pf2e');
  if (golarionCalendar) {
    console.log('\n🏔️ Golarion Calendar Analysis:');
    console.log('  Epoch:', golarionCalendar.year?.epoch);
    console.log('  Expected for PF2e AR:', 2700);
    console.log('  Epoch Correct:', golarionCalendar.year?.epoch === 2700);

    // Compare with PF2e config
    if (pf2eSystem) {
      const pf2eAROffset = CONFIG.PF2E?.worldClock?.['AR']?.yearOffset;
      console.log('  PF2e AR Offset:', pf2eAROffset);
      console.log('  Matches PF2e Config:', golarionCalendar.year?.epoch === pf2eAROffset);
    }
  }
}

console.log('\n' + '='.repeat(60));
console.log('INVESTIGATION COMPLETE');
console.log('='.repeat(60));
console.log('\nNext Steps:');
console.log('1. Review the output above');
console.log('2. Identify which section shows the discrepancy');
console.log('3. Determine if issue is in Core Engine, Integration, or Calendar Definition');
console.log('4. Plan minimal fix based on findings');
