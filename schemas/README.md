# Seasons & Stars JSON Schemas

This directory contains JSON schemas for validating Seasons & Stars calendar formats. These schemas ensure calendar files meet required structure and data validation rules.

## Available Schemas

### Calendar Schema (`calendar-v1.0.0.json`)

**URL**: `https://github.com/rayners/fvtt-seasons-and-stars/schemas/calendar-v1.0.0.json`

Validates individual calendar JSON files including:

- **Core Structure**: Required fields (`id`, `translations`, `months`, `weekdays`)
- **Data Integrity**: Unique names, valid references, proper constraints
- **Extensions**: `worldTime`, `compatibility`, `variants`, `extensions` support
- **Format Validation**: Date format templates, localization structure

**Validation Coverage**: Validates all built-in calendar formats

### Calendar Collection Index Schema (`calendar-collection-v1.0.0.json`)

**URL**: `https://github.com/rayners/fvtt-seasons-and-stars/schemas/calendar-collection-v1.0.0.json`

Validates calendar collection index files (`index.json`) including:

- Collection metadata and versioning
- Calendar entry definitions with proper references
- Tag and category validation

### External Calendar Variants Schema (`calendar-variants-v1.0.0.json`)

**URL**: `https://github.com/rayners/fvtt-seasons-and-stars/schemas/calendar-variants-v1.0.0.json`

Validates external calendar variant files including:

- Base calendar references and inheritance
- Variant override structures and data types
- Translation completeness and format validation

## Development Usage

### Automated Validation

```bash
# Validate all built-in calendars
npm run validate:calendars

# Example output:
# ✅ gregorian.json
# ✅ forgotten-realms.json
# ❌ eberron.json
#    ❌ root: should match exactly one schema in oneOf
```

### Integration with CalendarValidator

The schemas are integrated into the `CalendarValidator` class:

```typescript
// Uses JSON Schema validation with AJV
const result = await CalendarValidator.validate(calendarData);

// Falls back to legacy validation if schema fails
// Provides detailed error messages with field specificity
```

## Quick Validation

### Online Validation

1. Go to [jsonschemavalidator.net](https://www.jsonschemavalidator.net/)
2. Paste schema content in left panel
3. Paste your calendar JSON in right panel
4. Review validation results and error details

### IDE Integration

Add `$schema` property to your JSON files for real-time validation:

```json
{
  "$schema": "https://raw.githubusercontent.com/rayners/fvtt-seasons-and-stars/main/schemas/calendar-v1.0.0.json",
  "id": "my-calendar",
  "translations": {
    "en": {
      "label": "My Custom Calendar"
    }
  }
  // ... rest of calendar definition
}
```

## Schema Features

### Flexible Validation Rules

- **Month Days**: 1-500 (supports unusual calendar systems like Traveller's 364-day "months")
- **Description Lengths**: Up to 500 characters for detailed descriptions
- **ID Format**: Lowercase alphanumeric with hyphens only
- **Intercalary Days**: Uses `after` field referencing month names (not numeric positions)

### System Integration Support

```json
{
  "worldTime": {
    "interpretation": "epoch-based",
    "epochYear": 2700,
    "currentYear": 4725
  },
  "compatibility": {
    "pf2e": {
      "weekdayOffset": 0,
      "description": "PF2e weekday calculation already matches expectations"
    }
  }
}
```

### Extension Architecture

```json
{
  "extensions": {
    "seasons-and-stars": {
      "namedYears": {
        "rule": "repeat",
        "names": ["Ral's Fury", "Friend's Contemplation", ...]
      }
    }
  }
}
```

## Schema Evolution

### Version 1.0.0 (Current)

- Core calendar structure validation
- Cross-reference integrity checking (leap year months, intercalary day references)
- Date format template validation with nested variants
- Extension and compatibility framework support
- Multi-language localization validation

### Implementation Notes

- **Runtime Performance**: Schemas are compiled once and cached for optimal validation speed
- **Bundle Impact**: AJV dependency provides comprehensive validation capabilities
- **Error Messages**: Detailed field-level validation errors with specific failure reasons
- **Backward Compatibility**: Graceful fallback to legacy validation preserves existing behavior

### Planned Schema Enhancements

- Enhanced astronomical calculations validation
- Multi-calendar system support validation
- Dynamic calendar switching validation
- Historical calendar reform pattern support

## Schema Versioning

Schemas follow semantic versioning with these guidelines:

- **Major version** (1.x.x → 2.x.x): Breaking changes to required fields or data types
- **Minor version** (x.1.x → x.2.x): New optional fields or relaxed constraints
- **Patch version** (x.x.1 → x.x.2): Bug fixes or improved error messages

**Current version**: v1.0.0

## Contributing

When updating schemas:

1. **Backward Compatibility**: Maintain compatibility within major versions
2. **Comprehensive Testing**: Validate against all existing calendar files
3. **Documentation**: Update validation rules and examples in this README
4. **Version Management**: Follow semantic versioning for schema changes

Schemas are published via GitHub URLs for stable access to versioned schema files.
