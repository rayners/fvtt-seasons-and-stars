# Inline Calendar Variants System

The Seasons & Stars calendar system supports two types of calendar variants:

1. **Inline Variants**: Defined within the same file as the base calendar (documented here)
2. **External Variants**: Defined in separate files that reference existing calendars ([see External Variants Guide](EXTERNAL-CALENDAR-VARIANTS.md))

## Inline Calendar Variants

Inline variants are defined directly within a calendar's JSON file, allowing for cultural, regional, or historical variations of the same underlying calendar system. This is particularly useful for game settings where different cultures or regions use the same basic calendar structure but with different naming conventions, year numbering, or cultural significance.

### When to Use Inline Variants

Inline variants are ideal for:

- **Cultural Variations**: Different cultures using the same calendar with local names
- **Regional Differences**: Regional naming conventions within the same game world
- **Historical Periods**: Different eras of the same calendar system
- **Political Systems**: Different governmental dating systems (Imperial vs. Republic calendars)
- **Religious Calendars**: Different religious interpretations of the same base calendar

### File Structure

Inline variants are defined within the `variants` section of a calendar JSON file:

```json
{
  "id": "base-calendar-name",
  "translations": {
    /* base calendar translations */
  },
  "months": [
    /* base calendar months */
  ],
  "weekdays": [
    /* base calendar weekdays */
  ],
  "year": {
    /* base calendar year settings */
  },

  "variants": {
    "variant-id": {
      "name": "Variant Display Name",
      "description": "Description of this calendar variant",
      "default": true,
      "config": {
        "yearOffset": 2700
      },
      "overrides": {
        "year": {
          /* year property overrides */
        },
        "months": {
          /* month property overrides */
        },
        "weekdays": {
          /* weekday property overrides */
        }
      }
    }
  }
}
```

### Variant Properties

Each variant can include:

- **`name`**: Display name for the variant
- **`description`**: Detailed description of the variant's cultural/historical context
- **`default`**: Boolean indicating if this is the default variant when selecting the base calendar
- **`config`**: Configuration options like year offsets for different eras
- **`overrides`**: Selective property overrides for the base calendar

### Override System

The override system allows selective replacement of specific properties:

#### Year Overrides

```json
"overrides": {
  "year": {
    "suffix": " AR",
    "prefix": "",
    "epoch": 2700
  }
}
```

#### Month Overrides

```json
"overrides": {
  "months": {
    "Abadius": {
      "name": "First Imperial",
      "description": "The first month of the Imperial calendar"
    },
    "Calistril": {
      "name": "Second Imperial",
      "description": "The second month of the Imperial calendar"
    }
  }
}
```

#### Weekday Overrides

```json
"overrides": {
  "weekdays": {
    "Moonday": {
      "name": "First Day",
      "description": "The first day of the Imperial week"
    }
  }
}
```

## Example: Golarion Calendar Variants

The Golarion (Pathfinder 2e) calendar demonstrates comprehensive inline variants:

### 1. Absalom Reckoning (Default)

- **Usage**: Standard Pathfinder Society calendar throughout Inner Sea region
- **Year Format**: `4725 AR` (Absalom Reckoning)
- **Cultural Context**: Official dating system used by most civilized nations
- **Override Focus**: Year suffix only (`" AR"`)

### 2. Imperial Calendar

- **Usage**: Chelish Imperial dating system in Cheliax and territories
- **Year Format**: `7925 IC` (Imperial Calendar)
- **Cultural Context**: Reflects Cheliax's imperial ambitions and devil worship
- **Override Focus**: Year suffix (`" IC"`) and month names (First Imperial, Second Imperial, etc.)

### 3. Varisian Traditional

- **Usage**: Traditional Varisian calendar with cultural names and seasonal focus
- **Year Format**: `4725 VC` (Varisian Calendar)
- **Cultural Context**: Nomadic Varisian culture with emphasis on travel and nature
- **Override Focus**: Year suffix (`" VC"`) and culturally significant month names

### 4. Earth Historical (AD)

- **Usage**: Earth Anno Domini calendar for modern campaigns
- **Year Format**: `2025 AD` (Anno Domini)
- **Cultural Context**: Real-world synchronization for contemporary campaigns
- **Override Focus**: Year suffix (`" AD"`) and Gregorian month names

## Calendar Selection Behavior

### Default Variant Resolution

When a calendar has variants defined:

- Selecting the base calendar ID (e.g., `golarion-pf2e`) automatically resolves to the default variant
- Default is determined by the `"default": true` property in variant definition
- If no default is specified, the base calendar is used as-is

### Specific Variant Selection

- Variants can be selected directly using the format: `base-calendar-id(variant-id)`
- Example: `golarion-pf2e(imperial-calendar)` selects the Imperial Calendar variant
- Example: `golarion-pf2e(varisian-traditional)` selects the Varisian Traditional variant

### UI Integration

The calendar selection dialog displays:

- Base calendar with variant indicator
- All available variants grouped under the base calendar
- Clear visual hierarchy showing the relationship between base and variants
- Variant descriptions for context and selection guidance

## Implementation Details

### Calendar Engine Integration

- Each variant gets its own `CalendarEngine` instance
- Variants are stored with compound IDs: `base-calendar-id(variant-id)`
- All calendar operations (date conversion, time advancement) work identically across variants
- Variant calendars inherit all base calendar properties except overridden ones

### Property Inheritance

1. **Base Properties**: All base calendar properties are inherited
2. **Selective Overrides**: Only specified properties in `overrides` are replaced
3. **Deep Merging**: Nested properties (like individual months) are merged, not replaced entirely
4. **Translation Updates**: Variant names are automatically appended to translations

### Year Offset Calculation

The `yearOffset` configuration allows variants to represent different eras:

```json
"config": {
  "yearOffset": 2700  // Adds 2700 to base year calculations
}
```

This enables:

- Historical periods (negative offsets for ancient eras)
- Future periods (positive offsets for advanced eras)
- Alternative numbering systems (different epoch starts)

## Best Practices

### Organizing Variants

1. **Default Variant**: Make the most commonly used variant the default
2. **Logical Grouping**: Group variants by cultural, regional, or temporal themes
3. **Clear Naming**: Use descriptive variant IDs and names
4. **Comprehensive Descriptions**: Provide cultural and historical context

### Override Strategy

1. **Minimal Overrides**: Only override what's truly different
2. **Cultural Relevance**: Ensure overrides reflect genuine cultural differences
3. **Consistency**: Maintain consistent formatting within variant themes
4. **Backwards Compatibility**: Consider impact on existing campaigns

### Documentation Standards

1. **Cultural Context**: Explain why the variant exists and its significance
2. **Usage Guidelines**: Specify when and how the variant should be used
3. **Historical Accuracy**: Ensure variants reflect appropriate cultural/historical details
4. **Game Integration**: Explain how variants integrate with specific game systems

## Migration from Simple Calendar

When migrating from Simple Calendar, inline variants provide:

- **Unified Calendar Management**: Multiple cultural variations in one calendar definition
- **Simplified Selection**: Grouped variants reduce calendar list complexity
- **Cultural Immersion**: Rich descriptions and context for variant selection
- **Backwards Compatibility**: Base calendar remains unchanged for existing campaigns

## Creating Custom Inline Variants

To add variants to an existing calendar:

1. **Identify Base Calendar**: Choose the calendar file to modify
2. **Define Variant Structure**: Add `variants` section if not present
3. **Create Variant Objects**: Add variant definitions with appropriate overrides
4. **Test Integration**: Verify variant selection and display in calendar widgets
5. **Document Usage**: Add descriptions explaining when to use each variant

Example workflow for adding a new variant:

```json
"variants": {
  "your-variant-id": {
    "name": "Your Variant Name",
    "description": "Cultural/historical context for this variant",
    "default": false,
    "config": {
      "yearOffset": 0
    },
    "overrides": {
      "year": {
        "suffix": " YV"
      },
      "months": {
        "ExistingMonth": {
          "name": "New Name",
          "description": "Cultural significance of this month"
        }
      }
    }
  }
}
```

## Technical Considerations

### Performance

- Variants are expanded into separate calendar entries during initialization
- Each variant has its own calendar engine for optimal performance
- Memory usage scales linearly with number of variants
- No runtime performance impact for variant selection

### Compatibility

- Variants work with all existing Seasons & Stars features
- Full integration with notes system, time advancement, and date conversion
- Compatible with Simple Calendar Compatibility Bridge
- Supports all widget types (Calendar, Mini, Grid)

### Limitations

- Variants must share the same basic calendar structure (months, weekdays, leap year rules)
- Complex structural changes require separate calendar definitions
- Large numbers of variants can impact memory usage
- Variant changes require calendar file modification

## Future Enhancements

Potential future improvements to the inline variants system:

- **Dynamic Variant Creation**: In-app variant creation and modification
- **Variant Import/Export**: Sharing variant definitions between calendars
- **Advanced Override Patterns**: More sophisticated property override capabilities
- **Variant Templates**: Pre-built variant templates for common cultural patterns
- **Historical Progression**: Automatic variant switching based on campaign timeline
