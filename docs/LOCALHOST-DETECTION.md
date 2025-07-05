# Localhost Detection for Development Mode

The Seasons & Stars module includes comprehensive localhost detection and development environment handling to improve the development experience when working with external calendars.

## Features

### Automatic Environment Detection

The module automatically detects when it's running in a development environment based on:

- **Localhost hostnames**: `localhost`, `127.0.0.1`, `::1`, `0.0.0.0`
- **Development ports**: Common dev server ports (3000, 4000, 5000, 8000, 8080, 9000, 30000)
- **Development hostname patterns**: `dev.`, `development.`, `test.`, `staging.`, `local.`, `.local`, `.test`, `.dev`
- **URL parameters**: Development indicators in query strings
- **Foundry-specific indicators**: Debug mode, development modules, development data paths

### Development Behaviors

When localhost or development environment is detected:

1. **Cache Bypassing**: External calendar caching is automatically disabled to support rapid development iteration
2. **Extended Timeouts**: Request timeouts are increased by 3x to allow for debugging
3. **Enhanced Headers**: Development-specific headers are added to requests:
   - `X-Development-Mode: true`
   - `Cache-Control: no-cache, no-store, must-revalidate`
4. **Enhanced Logging**: More detailed debug information is provided
5. **Development URL Detection**: URLs containing localhost patterns skip caching even in production environments

### Confidence Levels

The detection system provides confidence levels:

- **High**: Localhost + Foundry default port (30000), or clear localhost indicators
- **Medium**: Development hostname patterns, development ports
- **Low**: Production environments (no development indicators)

## Usage

### Automatic Detection

No configuration required - the module automatically detects development environments and applies appropriate behaviors.

### Manual Control

You can manually enable development mode for specific external calendar requests:

```javascript
// Load external calendar with development mode explicitly enabled
const result = await game.seasonsStars.manager.loadExternalCalendar(
  'https:example.com/calendar.json',
  { enableDevMode: true }
);
```

### Development Environment Information

Access development environment information via the browser console:

```javascript
// Check if currently in development mode
window.SeasonsStars.devEnvironment.isLocalhost();

// Get detailed environment information
window.SeasonsStars.devEnvironment.getInfo();
```

Example output:

```javascript
{
  isLocalhost: true,
  isDevelopment: true,
  hostname: "localhost",
  port: 30000,
  protocol: "http:",
  indicators: ["localhost-hostname", "foundry-default-port"],
  confidence: "high"
}
```

## External Calendar Loading

### Development Workflow Support

The system is designed to support common development workflows:

1. **Local File Development**: Local calendar files never use caching
2. **Localhost Testing**: External URLs on localhost skip caching
3. **Module Development**: Development versions of modules skip caching
4. **Extended Debugging**: Longer timeouts allow for step-through debugging

### Cache Skip Reasons

The system logs clear reasons for cache skipping:

- `local file`: Local file system access
- `localhost/development environment`: Running on localhost
- `module development version`: Development version of a Foundry module
- `development URL`: URL contains development indicators
- `explicitly enabled development mode`: Manual enableDevMode option

### Protocol Handler Integration

All protocol handlers (Local, HTTPS, GitHub, Module) are enhanced with:

- Development-aware timeout handling
- Development headers injection
- Enhanced error messages with timeout information
- Detailed development mode logging

## Testing

The implementation includes comprehensive test coverage:

- Unit tests for environment detection logic
- Integration tests for external calendar loading
- Confidence level validation
- Cache behavior verification
- Header and timeout testing

## Security Considerations

The localhost detection is designed to be safe:

- Only enables development behaviors, never bypasses security
- Development headers are only added in confirmed development environments
- Detection is based on environmental factors, not user input
- No sensitive information is exposed in development mode

## Configuration

### Settings Integration

The external calendar system respects development mode automatically. No manual configuration is needed.

### Protocol Handlers

All protocol handlers automatically use development-aware behaviors:

```typescript
// HTTPS Protocol Handler
const devTimeout = devEnvironment.getDevTimeout(defaultTimeout);
const devHeaders = devEnvironment.getDevHeaders();

// Local Protocol Handler
if (devEnvironment.isDevelopment()) {
  Logger.debug('Loading local calendar file in development mode', {
    devMode: true,
    cacheDisabled: devEnvironment.shouldDisableCaching(),
  });
}
```

## Troubleshooting

### Debug Information

Enable debug logging to see development detection in action:

```javascript
// Check current environment
console.log(window.SeasonsStars.devEnvironment.getInfo());

// Check if development mode is active
console.log(window.SeasonsStars.devEnvironment.isLocalhost());
```

### Common Issues

1. **Development mode not detected**: Check hostname, port, and URL patterns
2. **Caching still active**: Verify localhost detection is working
3. **Timeouts too short**: Development mode should automatically extend timeouts

### Environment Variables

The detection works in various environments:

- **Foundry VTT Development**: Localhost with port 30000
- **External Development Servers**: Common development ports and hostnames
- **Testing Environments**: .test, .local domains
- **Staging Environments**: staging. prefix

## Implementation Details

### Core Classes

- `DevEnvironmentDetector`: Main detection logic
- `ExternalCalendarRegistry`: Development-aware caching and loading
- Protocol handlers: Development-enhanced request handling

### Detection Algorithm

1. Parse current window.location
2. Check hostname against localhost patterns
3. Evaluate port against common development ports
4. Analyze hostname for development patterns
5. Check URL parameters for development indicators
6. Assess Foundry-specific development indicators
7. Calculate confidence level
8. Cache results for performance

This feature significantly improves the development experience when working with external calendars by providing appropriate behaviors for different environments while maintaining security and performance in production.
