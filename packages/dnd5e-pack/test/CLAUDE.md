# D&D 5e Pack Test Suite Guidelines

## Test Structure

Tests are organized by functionality:

- `setup-dnd5e.ts` - Test environment setup utilities
- `dnd5e-integration.test.ts` - Core integration tests

## Running Tests

```bash
# From package directory
npm test          # Watch mode
npm run test:run  # Single run
npm run test:ui   # Interactive UI

# From root
npm run test:workspaces:run
```

## Test Patterns

### Environment Setup

```typescript
import { setupDnD5eEnvironment, validateDnD5eEnvironment } from './setup-dnd5e';
import { setupFoundryEnvironment } from '../../core/test/setup';

beforeEach(() => {
  setupFoundryEnvironment();
  setupDnD5eEnvironment();
});
```

### Mock Calendar Registration

```typescript
const mockCalendar = {
  id: 'test-calendar',
  translations: { en: { label: 'Test Calendar' } },
  months: [{ name: 'Month1', days: 30 }],
  weekdays: [{ name: 'Day1' }],
};

instance.registerCalendar(mockCalendar);
```

### Hook Testing

```typescript
import { triggerSetupCalendarHook, triggerUpdateWorldTimeHook } from './setup-dnd5e';

// Trigger dnd5e.setupCalendar hook
const result = triggerSetupCalendarHook();

// Trigger updateWorldTime with dnd5e deltas
triggerUpdateWorldTimeHook(86400, { midnights: 1, sunrises: 1 });
```

## Important Notes

- Tests use TDD approach - tests are written before implementation
- One test file per source file
- Use mock classes from setup-dnd5e.ts for dnd5e API simulation
- Reset environment in afterEach to prevent test pollution
