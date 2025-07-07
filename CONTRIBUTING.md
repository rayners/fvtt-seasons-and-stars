# Contributing to Seasons & Stars

Thank you for your interest in contributing to Seasons & Stars! This document provides guidelines for contributing to the project.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Setup](#development-setup)
- [Making Changes](#making-changes)
- [Submitting Changes](#submitting-changes)
- [Coding Standards](#coding-standards)
- [Testing](#testing)
- [Documentation](#documentation)

## Code of Conduct

This project follows the [Contributor Covenant Code of Conduct](CODE_OF_CONDUCT.md). By participating, you are expected to uphold this code.

## Getting Started

### Prerequisites

- Node.js 18+ and npm
- Foundry VTT v13+ for testing
- Git
- TypeScript knowledge recommended

### Development Setup

1. **Fork and Clone**

   ```bash
   git clone https://github.com/your-username/fvtt-seasons-and-stars.git
   cd fvtt-seasons-and-stars
   ```

2. **Install Dependencies**

   ```bash
   npm install
   ```

3. **Build the Module**

   ```bash
   npm run build
   ```

4. **Link to Foundry** (optional)

   ```bash
   ./link-module.sh
   ```

5. **Run Tests**
   ```bash
   npm run test:run
   ```

## Making Changes

### Branch Naming

Use descriptive branch names:

- `feature/calendar-widget-enhancement`
- `fix/smalltime-integration-positioning`
- `docs/api-reference-update`

### Commit Messages

Follow conventional commit format:

```
type(scope): description

feat(calendar): add monthly grid widget
fix(bridge): resolve Simple Weather integration issue
docs(api): update calendar engine documentation
```

Types: `feat`, `fix`, `docs`, `style`, `refactor`, `test`, `chore`

## Submitting Changes

### Pull Request Process

1. **Create Feature Branch**

   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **Make Your Changes**
   - Follow coding standards
   - Add/update tests
   - Update documentation

3. **Test Your Changes**

   ```bash
   npm run validate  # Runs tests, build, and typecheck
   ```

4. **Commit and Push**

   ```bash
   git add .
   git commit -m "feat(scope): description"
   git push origin feature/your-feature-name
   ```

5. **Create Pull Request**
   - Use the PR template
   - Fill out all applicable sections
   - Link related issues

### Pull Request Requirements

- [ ] All tests pass (`npm run test:run`)
- [ ] Build succeeds (`npm run build`)
- [ ] TypeScript compiles cleanly (`npm run typecheck`)
- [ ] Code follows project standards
- [ ] Documentation updated if needed
- [ ] Self-review completed

## Coding Standards

### TypeScript

- Use strict TypeScript configuration
- Prefer interfaces over types for object shapes
- Use proper typing for Foundry VTT APIs
- Avoid `any` types - use proper Foundry type definitions

### Code Style

- Use 2 spaces for indentation
- Prefer `const` over `let` where possible
- Use descriptive variable and function names
- Add JSDoc comments for public APIs

### File Organization

```
src/
  core/        # Business logic and data management
  ui/          # User interface components
  types/       # TypeScript type definitions
  styles/      # SCSS styling
templates/     # Handlebars templates
test/          # Unit tests
```

### Naming Conventions

- **Classes**: PascalCase (`CalendarWidget`)
- **Functions/Variables**: camelCase (`getCurrentDate`)
- **Constants**: UPPER_SNAKE_CASE (`DEFAULT_CALENDAR_ID`)
- **Files**: kebab-case (`calendar-widget.ts`)

## Testing

### Unit Tests

- Write tests for new functionality
- Test edge cases and error conditions
- Use the existing mock framework in `test/setup.ts`
- Aim for >80% coverage on core business logic

### Integration Testing

Test module integration points:

- Simple Calendar Compatibility Bridge
- Simple Weather integration
- SmallTime positioning
- Calendar widget functionality

### Running Tests

```bash
npm run test:run      # Run all tests once
npm run test:watch    # Run tests in watch mode
npm run coverage      # Generate coverage report
```

## Documentation

### Code Documentation

- Add JSDoc comments for all public APIs
- Document complex logic with inline comments
- Include examples in API documentation

### User Documentation

- Update user guides for new features
- Include screenshots for UI changes
- Update migration guides if needed

### Documentation Files

- `README.md` - Overview and quick start
- `docs/USER-GUIDE.md` - Comprehensive user manual
- `docs/DEVELOPER-GUIDE.md` - API and integration documentation
- `docs/MIGRATION-GUIDE.md` - Migration from Simple Calendar

## Issue Guidelines

### Bug Reports

Use the Bug Report template and include:

- Steps to reproduce
- Expected vs actual behavior
- Console errors
- Module versions
- Browser information

### Feature Requests

Use the Feature Request template and include:

- Problem or use case
- Proposed solution
- Alternative approaches considered
- Priority level

### Bridge Integration Issues

Use the Bridge Integration template for:

- Simple Calendar Compatibility Bridge issues
- Simple Weather integration problems
- Module compatibility concerns

## Module Integration

### Simple Calendar Compatibility

- Changes to bridge integration require careful testing
- Bridge module handles all Simple Calendar-specific requirements
- S&S core should remain bridge-agnostic

### Other Module Integration

- Test with SmallTime, Simple Weather, About Time
- Ensure graceful degradation when modules unavailable
- Use feature detection rather than version checking

## Release Process

Releases follow semantic versioning:

- **Major** (v1.0.0): Breaking changes
- **Minor** (v0.1.0): New features, backward compatible
- **Patch** (v0.1.1): Bug fixes, backward compatible

## Getting Help

- **Issues**: Check existing issues first
- **Discussions**: Use GitHub Discussions for questions
- **Discord**: Find @rayners78 on the Foundry VTT Discord
- **Documentation**: Check docs.rayners.dev for comprehensive guides

## License

By contributing, you agree that your contributions will be licensed under the same MIT License that covers this project.

---

Thank you for contributing to Seasons & Stars! Your help makes this module better for the entire Foundry VTT community.
