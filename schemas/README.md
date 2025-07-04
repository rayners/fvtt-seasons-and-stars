# Seasons & Stars JSON Schemas

This directory contains JSON schemas for validating Seasons & Stars calendar files and collections.

## Available Schemas

### Calendar Schema (`calendar-v1.0.0.json`)

**URL**: `https://github.com/rayners/fvtt-seasons-and-stars/schemas/calendar-v1.0.0.json`

Validates individual calendar JSON files including:

- Required fields and structure validation
- Data type and constraint validation
- Calendar variant validation
- Leap year rule validation

### Calendar Collection Index Schema (`calendar-collection-v1.0.0.json`)

**URL**: `https://github.com/rayners/fvtt-seasons-and-stars/schemas/calendar-collection-v1.0.0.json`

Validates calendar collection index files (`index.json`) including:

- Collection metadata
- Calendar entry definitions
- Version and tag validation

### External Calendar Variants Schema (`calendar-variants-v1.0.0.json`)

**URL**: `https://github.com/rayners/fvtt-seasons-and-stars/schemas/calendar-variants-v1.0.0.json`

Validates external calendar variant files including:

- Base calendar references
- Variant override structures
- Translation validation

## Quick Validation

### Online Validation (Recommended)

1. Go to [jsonschemavalidator.net](https://www.jsonschemavalidator.net/)
2. Paste your JSON in the left panel
3. Enter schema URL in the schema field
4. Click "Validate"

### IDE Integration

Add `$schema` property to your JSON files:

```json
{
  "$schema": "https://github.com/rayners/fvtt-seasons-and-stars/schemas/calendar-v1.0.0.json",
  "id": "your-calendar-id",
  ...
}
```

## Schema Versioning

Schemas follow semantic versioning:

- **Major version** changes indicate breaking changes to the format
- **Minor version** changes add new optional fields or relaxed constraints
- **Patch version** changes fix validation bugs or improve error messages

Current schema version: **v1.0.0**

## Schema URLs

All schemas are available via stable GitHub URLs:

```
https://github.com/rayners/fvtt-seasons-and-stars/schemas/[schema-name].json
```

These URLs will always point to the latest version of each schema file.
