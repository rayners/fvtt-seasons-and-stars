# External Calendar Variants System

The Seasons & Stars calendar system supports two types of calendar variants:

1. **Inline Variants**: Defined within the same file as the base calendar (like Golarion PF2e variants)
2. **External Variants**: Defined in separate files that reference existing base calendars

## External Variant Files

External variant files allow you to create themed calendar variants that build on existing calendars without modifying the original calendar definitions. This is particularly useful for:

- Genre-specific variants (e.g., Star Trek, Star Wars, fantasy themes)
- Historical variants (e.g., different historical dating systems)
- Campaign-specific calendars (e.g., custom world variations)

### File Format

External variant files follow this structure:

```json
{
  "id": "unique-identifier-variants",
  "baseCalendar": "target-calendar-id",
  "name": "Display Name for Variant Collection",
  "description": "Description of the variant collection",
  "author": "Your Name",
  "version": "1.0.0",
  "translations": {
    "en": {
      "label": "English Label",
      "description": "English description"
    }
  },
  "variants": {
    "variant-id": {
      "name": "Variant Display Name",
      "description": "Variant description",
      "default": true,
      "config": {
        "yearOffset": 2323
      },
      "overrides": {
        "year": {
          "prefix": "Stardate ",
          "suffix": ""
        },
        "months": {
          "January": {
            "name": "New Name",
            "description": "New description"
          }
        },
        "weekdays": {
          "Sunday": {
            "name": "New Day Name",
            "description": "New day description"
          }
        }
      }
    }
  }
}
```

### Required Fields

- `id`: Unique identifier for the variant file (should end with `-variants`)
- `baseCalendar`: ID of the existing calendar to build variants from
- `variants`: Object containing variant definitions

### Variant Properties

Each variant can include:

- `name`: Display name for the variant
- `description`: Description of the variant
- `default`: Boolean indicating if this is the default variant when selecting the base calendar
- `config`: Configuration options (like year offsets)
- `overrides`: Selective property overrides for the base calendar

### Override System

The override system allows you to selectively replace properties from the base calendar:

#### Year Overrides

```json
"overrides": {
  "year": {
    "prefix": "Stardate ",
    "suffix": " F.S.",
    "epoch": 2161
  }
}
```

#### Month Overrides

```json
"overrides": {
  "months": {
    "January": {
      "name": "T'Keth",
      "description": "First month in Vulcan calendar"
    },
    "February": {
      "name": "T'Ket"
    }
  }
}
```

#### Weekday Overrides

```json
"overrides": {
  "weekdays": {
    "Sunday": {
      "name": "jup",
      "description": "Day of the warrior"
    },
    "Monday": {
      "name": "ghItlh",
      "description": "Day of writing"
    }
  }
}
```

## Example: Star Trek Variants

The included `gregorian-star-trek-variants.json` demonstrates external variants with:

1. **Earth Stardate System** (default) - Uses stardate prefixes
2. **Vulcan Calendar** - Replaces month names with Vulcan terms
3. **Klingon Calendar** - Warrior-themed month and day names
4. **Federation Standard** - Federation dating system

## Creating Your Own External Variants

1. **Choose a Base Calendar**: Identify which existing calendar to build from (e.g., `gregorian`, `golarion-pf2e`)

2. **Create the Variant File**: Name it `[base-calendar]-[theme]-variants.json`

3. **Define Variants**: Create variant objects with appropriate overrides

4. **Place in Calendar Directory**: Put the file in the `calendars/` directory

5. **Test**: The variant file will be automatically detected and loaded

## Usage in Game

Once loaded, external variants appear in the calendar selection dialog alongside inline variants:

- Base calendars group with their variants
- Variant indicators show the relationship
- Default variants are automatically selected when choosing the base calendar
- Specific variants can be selected directly

## Calendar Selection Behavior

- Selecting `gregorian` resolves to `gregorian(earth-stardate)` (if marked as default)
- Selecting `gregorian(vulcan-calendar)` uses that specific variant
- All variants inherit from the base calendar with selective overrides applied

## Benefits

- **Modularity**: Theme-specific variants separate from core calendars
- **Flexibility**: Easy to add/remove themed variants without affecting base calendars
- **Maintainability**: Updates to base calendars automatically apply to variants
- **Community**: Users can create and share themed variant collections
