# Seasons & Stars Playwright Release Smoke Suite

The release smoke suite provides a fast, high-confidence check of the module's core workflows before shipping a build. It uses Playwright to exercise the same Foundry world configuration used in the existing end-to-end tests.

## Covered Scenarios

- **Module bootstrap** – verify the calendar widget renders for a GM and exposes the public API surface.
- **Quick time advancement** – ensure the one-hour button updates `game.time.worldTime` and the visible clock.
- **Calendar grid access** – open the grid, confirm navigation works, and validate the active day highlight.
- **Mini widget display** – surface the compact widget and verify it shows the current date/time snapshot.
- **Simple Calendar bridge** – ensure `window.SimpleCalendar` exposes the compatibility API, hooks, and fake module registration.
- **Note authoring** – confirm the GM can open the note creation dialog and required fields are present.
- **Player permissions** – validate the player view remains read-only and hides GM-only controls.

Each scenario is tagged with `@release-core`, allowing the suite to stay independent from the broader exploratory tests under `playwright-tests/`.

## Running the Suite

Start a FoundryVTT instance on `http://localhost:30000` with the Seasons & Stars module enabled, then run:

```bash
npm run test:playwright:core
```

The command filters tests using `--grep "@release-core"` so only the smoke scenarios execute and limits execution to the Chromium project in headless mode. Pass `--headed` when invoking the script for interactive debugging if a failure needs investigation.

### Environment Configuration

- `FOUNDRY_ADMIN_PASSWORD` (or `FOUNDRY_ADMIN_KEY`) – populate if your setup page requires a non-default admin password (defaults to `p`).
- `SNS_PLAYWRIGHT_WORLD_NAME` (or `SNS_PLAYWRIGHT_WORLD_ID`) – specify the world to auto-launch; falls back to the first world in the dashboard when unset.
