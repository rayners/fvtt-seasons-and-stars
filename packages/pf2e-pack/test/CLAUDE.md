# Test Suite Guidelines

- Each test file targets a single source module or workflow.
- No conditional logic (`if`, `switch`, ternary operations, or optional chaining for control flow`).
- Use deterministic data; avoid random values or relative dates.
- Assertions must be explicit and exact (`expect(x).toBe(2)`).
- Prefer exercising real functionality and data over mocks whenever feasible.
- Unit tests isolate one source file; integration and regression tests cover complete workflows with separate scenarios per test.
- Keep tests self-contained with no external state.
- Before committing, run `npm run lint`, `npm run typecheck`, `npm run test:run`, and `npm run build`.
