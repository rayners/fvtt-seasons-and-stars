# Year Calculation Investigation Plan

## Objective

Systematically investigate the year calculation discrepancy between S&S (showing 6749) and PF2e (showing 4725) to determine the actual scope and root cause before implementing fixes.

## Investigation Areas

### 1. Core Calendar Engine Testing (Independent)

**Goal**: Verify if S&S calendar engine has universal year calculation issues

**Test Scenarios**:

```javascript
// Test S&S calendar engine directly (no PF2e integration)
// In non-PF2e system or with PF2e disabled

// Test 1: Epoch calculation
const engine = game.seasonsStars?.manager?.getActiveEngine();
console.log('Active Calendar:', engine.calendar.id);
console.log('Calendar Epoch:', engine.calendar.year?.epoch);

// Test 2: WorldTime to Date conversion
const currentWorldTime = game.time.worldTime;
console.log('Current worldTime:', currentWorldTime);

const currentDate = engine.worldTimeToDate(currentWorldTime);
console.log('S&S Current Date:', currentDate);

// Test 3: Specific worldTime values
const testTimes = [0, 86400, 31536000]; // 0, 1 day, 1 year in seconds
testTimes.forEach(time => {
  const date = engine.worldTimeToDate(time);
  console.log(`worldTime ${time} → S&S Date:`, date);
});

// Test 4: Date to WorldTime round-trip
const testDate = { year: 4725, month: 1, day: 1 };
const worldTime = engine.dateToWorldTime(testDate);
const backToDate = engine.worldTimeToDate(worldTime);
console.log('Round-trip test:', testDate, '→', worldTime, '→', backToDate);
```

### 2. PF2e System Year Calculation Analysis

**Goal**: Understand exactly how PF2e calculates its year display

**Test Scenarios**:

```javascript
// Test PF2e's year calculation (in PF2e system)

// Test 1: PF2e WorldClock analysis
const worldClock = game.pf2e?.worldClock;
if (worldClock) {
  console.log('PF2e WorldClock exists:', !!worldClock);
  console.log('PF2e Current Year:', worldClock.year);
  console.log('PF2e Date Theme:', worldClock.dateTheme);
  console.log('PF2e World Time:', worldClock.worldTime);
  console.log('PF2e World Created On:', worldClock.worldCreatedOn);

  // Check year offset for current theme
  const config = CONFIG.PF2E?.worldClock?.[worldClock.dateTheme];
  console.log('PF2e Year Offset Config:', config);
}

// Test 2: PF2e year calculation breakdown
const currentTime = game.time.worldTime;
console.log('game.time.worldTime:', currentTime);

if (worldClock) {
  const luxonTime = worldClock.worldTime; // This is the Luxon DateTime
  console.log('PF2e Luxon Year:', luxonTime.year);
  console.log('PF2e Final Year (with offset):', worldClock.year);

  // Calculate the offset manually
  const yearOffset = CONFIG.PF2E?.worldClock?.[worldClock.dateTheme]?.yearOffset || 0;
  const manualYear = luxonTime.year + yearOffset;
  console.log('Manual calculation:', luxonTime.year, '+', yearOffset, '=', manualYear);
}

// Test 3: Compare S&S and PF2e for same worldTime
const ssDate = game.seasonsStars?.manager?.getCurrentDate();
console.log('S&S Current Date:', ssDate);
console.log('PF2e Current Year:', worldClock?.year);
console.log('Year Difference:', ssDate?.year - (worldClock?.year || 0));
```

### 3. Calendar Definition Analysis

**Goal**: Verify calendar definition and epoch settings

**Test Scenarios**:

```javascript
// Test calendar definition loading and epoch handling

// Test 1: Active calendar examination
const manager = game.seasonsStars?.manager;
const activeCalendar = manager?.getActiveCalendar();
console.log('Active Calendar Full Definition:', activeCalendar);
console.log('Calendar ID:', activeCalendar?.id);
console.log('Calendar Epoch:', activeCalendar?.year?.epoch);
console.log('Calendar Year Suffix:', activeCalendar?.year?.suffix);

// Test 2: Golarion calendar specific check
if (activeCalendar?.id === 'golarion-pf2e') {
  console.log('Using Golarion calendar');
  console.log('Expected Epoch (should be 2700):', activeCalendar.year?.epoch);

  // Check if this matches PF2e expectations
  const pf2eOffset = CONFIG.PF2E?.worldClock?.['AR']?.yearOffset;
  console.log('PF2e AR Offset:', pf2eOffset);
  console.log('Calendar/PF2e Offset Match:', activeCalendar.year?.epoch === pf2eOffset);
}

// Test 3: Calendar loading verification
const allCalendars = manager?.getAvailableCalendars();
console.log(
  'Available Calendars:',
  allCalendars?.map(c => ({ id: c.id, name: c.name, epoch: c.year?.epoch }))
);
```

### 4. Integration Layer Testing

**Goal**: Test S&S PF2e integration specifically

**Test Scenarios**:

```javascript
// Test S&S PF2e integration layer

// Test 1: Integration detection
const integration = game.seasonsStars?.integration;
console.log('S&S Integration Object:', integration);

if (integration) {
  console.log('Integration Features:', integration.getAvailableFeatures?.());
  console.log('Has PF2e Integration:', integration.hasFeature?.('pf2e-worldclock'));
}

// Test 2: Bridge integration check
const bridge = game.modules.get('simple-calendar-seasons-stars')?.api;
console.log('Bridge Module Active:', !!bridge);

if (bridge) {
  console.log('Bridge API Methods:', Object.keys(bridge));

  // Test bridge date conversion
  const bridgeDate = bridge.timestampToDate?.(game.time.worldTime);
  console.log('Bridge Date Conversion:', bridgeDate);
}

// Test 3: Hook testing
Hooks.once('seasons-stars:dateChanged', newDate => {
  console.log('S&S Date Change Hook:', newDate);
});

// Trigger a small time advancement to test hooks
if (game.user?.isGM) {
  console.log('Testing time advancement...');
  game.time.advance(60); // Advance 1 minute
}
```

## Expected Investigation Results

### Scenario A: Core Engine Bug

**If S&S shows wrong year in non-PF2e systems:**

- Problem is in core calendar engine
- Affects all game systems
- Requires fundamental engine fix
- Calendar variants are workaround, not solution

### Scenario B: PF2e Integration Bug

**If S&S shows correct year in non-PF2e, wrong in PF2e:**

- Problem is in PF2e integration layer
- Core engine is working correctly
- Fix should be in integration/compatibility code
- Calendar variants unnecessary for bug fix

### Scenario C: Calendar Definition Issue

**If Golarion calendar has wrong epoch value:**

- Simple calendar file fix
- No engine changes needed
- Calendar variants could provide cultural options

### Scenario D: Bridge Integration Issue

**If problem is in Simple Calendar bridge:**

- S&S core is working correctly
- Issue is in bridge module
- Fix belongs in bridge, not S&S

## Investigation Execution Plan

### Phase 1: Core Engine Testing (1 hour)

1. Test S&S in non-PF2e system (D&D 5e, etc.)
2. Verify epoch calculations and worldTime conversions
3. Test with Golarion calendar specifically

### Phase 2: PF2e Integration Testing (1 hour)

1. Test S&S in PF2e system
2. Compare S&S and PF2e year calculations side-by-side
3. Analyze PF2e's actual date calculation method

### Phase 3: Calendar Definition Verification (30 minutes)

1. Examine Golarion calendar definition
2. Compare with PF2e's expected epoch values
3. Verify calendar loading and parsing

### Phase 4: Integration Layer Analysis (30 minutes)

1. Test bridge module if present
2. Check S&S PF2e integration code
3. Identify where year discrepancy occurs

## Documentation

### Investigation Script Creation

Create `investigate-year-calculations.js` with all test scenarios for easy execution.

### Results Documentation

Document findings in `YEAR-CALCULATION-INVESTIGATION-RESULTS.md` with:

- Test outputs
- Root cause identification
- Recommended fix scope
- Whether calendar variants are needed

## Success Criteria

**Investigation Complete When:**

- ✅ Root cause identified (Engine vs Integration vs Definition vs Bridge)
- ✅ Scope of fix determined (Universal vs PF2e-specific vs Configuration)
- ✅ Calendar variant system necessity evaluated
- ✅ Implementation plan updated based on findings

This investigation will ensure we implement the minimal necessary fix rather than over-engineering a solution for a problem that might be much simpler than anticipated.
