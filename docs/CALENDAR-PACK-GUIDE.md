# Calendar Pack Development Guide

A comprehensive guide for creating and distributing calendar pack modules for Seasons & Stars.

## 🎯 What are Calendar Packs?

Calendar packs are **pure data modules** that provide additional calendars for Seasons & Stars. They require:

- ✅ **No JavaScript** - Just JSON configuration files
- ✅ **Auto-Detection** - Automatically discovered and loaded
- ✅ **Standard Layout** - Simple, consistent file structure
- ✅ **Rich Metadata** - Preview text, tags, and descriptions

## 🚀 Quick Start

### 1. Create Module Structure

```bash
mkdir seasons-and-stars-mypack
cd seasons-and-stars-mypack
mkdir calendars

# Your structure should look like:
# seasons-and-stars-mypack/
# ├── module.json
# └── calendars/
#     ├── index.json
#     └── my-calendar.json
```

### 2. Module Definition (`module.json`)

```json
{
  "id": "seasons-and-stars-mypack",
  "title": "Seasons & Stars: My Calendar Pack",
  "description": "Custom calendars for my campaign setting",
  "version": "1.0.0",
  "authors": [
    {
      "name": "Your Name",
      "discord": "yourname#1234",
      "url": "https://your-website.com"
    }
  ],
  "compatibility": {
    "minimum": "13",
    "verified": "13"
  },
  "relationships": {
    "requires": [
      {
        "id": "seasons-and-stars",
        "type": "module",
        "compatibility": {
          "minimum": "0.7.0"
        }
      }
    ]
  },
  "url": "https://github.com/yourname/seasons-and-stars-mypack",
  "manifest": "https://github.com/yourname/seasons-and-stars-mypack/releases/latest/download/module.json",
  "download": "https://github.com/yourname/seasons-and-stars-mypack/releases/latest/download/module.zip"
}
```

### 3. Collection Index (`calendars/index.json`)

```json
{
  "$schema": "https://raw.githubusercontent.com/rayners/fvtt-seasons-and-stars/main/schemas/calendar-collection-v1.0.0.json",
  "name": "My Calendar Pack",
  "description": "Custom calendars for fantasy and sci-fi campaigns",
  "version": "1.0.0",
  "author": "Your Name",
  "calendars": [
    {
      "id": "my-fantasy",
      "name": "My Fantasy Calendar",
      "description": "A custom calendar for my fantasy world",
      "file": "my-fantasy.json",
      "preview": "15th of Goldmoon, 1024 AR",
      "tags": ["fantasy", "homebrew"],
      "author": "Your Name"
    },
    {
      "id": "my-scifi",
      "name": "Stellar Republic Calendar",
      "description": "Galactic standard calendar for my sci-fi setting",
      "file": "my-scifi.json",
      "preview": "Sol.Day 2847.156, Cycle 12",
      "tags": ["sci-fi", "space", "homebrew"]
    }
  ]
}
```

### 4. Calendar Files (`calendars/*.json`)

Create individual calendar files following the [Calendar Format Guide](../CALENDAR-FORMAT.md):

**`calendars/my-fantasy.json`:**

```json
{
  "id": "my-fantasy",
  "translations": {
    "en": {
      "label": "My Fantasy Calendar",
      "description": "Custom calendar for the Kingdom of Aethermoor",
      "setting": "Aethermoor"
    }
  },
  "year": {
    "epoch": 0,
    "currentYear": 1024,
    "prefix": "",
    "suffix": " AR",
    "startDay": 1
  },
  "leapYear": {
    "rule": "gregorian"
  },
  "months": [
    {
      "name": "Goldmoon",
      "abbreviation": "Gld",
      "days": 30,
      "description": "The golden month of harvest"
    },
    {
      "name": "Silvermoon",
      "abbreviation": "Slv",
      "days": 30,
      "description": "The silver month of reflection"
    }
    // ... more months
  ],
  "weekdays": [
    {
      "name": "Lightday",
      "abbreviation": "Lt",
      "description": "Day of illumination and new beginnings"
    },
    {
      "name": "Workday",
      "abbreviation": "Wk",
      "description": "Day of labor and craftsmanship"
    }
    // ... more weekdays
  ],
  "dateFormats": {
    "default": "{{ss-day format=\"ordinal\"}} {{ss-month format=\"name\"}}, {{year}} AR",
    "short": "{{ss-day}}/{{ss-month}}/{{year}}",
    "long": "{{ss-weekday format=\"name\"}}, {{ss-day format=\"ordinal\"}} {{ss-month format=\"name\"}}, {{year}} AR"
  }
}
```

## 📚 Detailed Reference

### Module Naming Convention

**Required Pattern**: `seasons-and-stars-{pack-name}`

**✅ Good Examples:**

- `seasons-and-stars-fantasy`
- `seasons-and-stars-scifi`
- `seasons-and-stars-homebrew`
- `seasons-and-stars-real-world`
- `seasons-and-stars-lovecraft`

**❌ Bad Examples:**

- `my-calendar-pack` (missing prefix)
- `seasons-stars-fantasy` (missing dash)
- `seasons-and-stars` (conflicts with core module)

### Collection Properties

| Property      | Required | Description                     |
| ------------- | -------- | ------------------------------- |
| `name`        | ✅       | Display name for the collection |
| `description` | ❌       | Brief description of the pack   |
| `version`     | ❌       | Semantic version of the pack    |
| `author`      | ❌       | Pack creator name               |
| `calendars`   | ✅       | Array of calendar entries       |

### Calendar Entry Properties

| Property      | Required | Description                      |
| ------------- | -------- | -------------------------------- |
| `id`          | ✅       | Unique identifier (used in API)  |
| `name`        | ✅       | Display name in selection dialog |
| `description` | ❌       | Detailed description             |
| `file`        | ✅\*     | Relative path to calendar JSON   |
| `url`         | ✅\*     | Full URL to calendar JSON        |
| `preview`     | ❌       | Sample date text (max 200 chars) |
| `tags`        | ❌       | Array of category tags           |
| `author`      | ❌       | Calendar creator name            |
| `version`     | ❌       | Calendar version                 |

\*Either `file` OR `url` is required

### Tags for Organization

Use tags to help users find relevant calendars:

**Genre Tags:**

- `fantasy`, `sci-fi`, `modern`, `historical`, `horror`, `steampunk`

**System Tags:**

- `dnd5e`, `pathfinder`, `starfinder`, `traveller`, `shadowrun`

**Setting Tags:**

- `forgotten-realms`, `golarion`, `eberron`, `dragonlance`, `star-trek`

**Type Tags:**

- `homebrew`, `official`, `variant`, `real-world`, `lunar`, `seasonal`

## 🛠️ Development Workflow

### Local Development

1. **Create in Foundry modules directory:**

   ```bash
   cd /path/to/foundry/Data/modules
   mkdir seasons-and-stars-mypack
   ```

2. **Test auto-detection:**
   - Enable module in Foundry
   - Check console for: `[S&S] Found X calendar pack modules`
   - Look for: `[S&S] Successfully loaded X calendars from module`

3. **Verify in calendar selection:**
   - Open Seasons & Stars settings
   - Click "Choose Calendar"
   - Look for your calendars with "Module" badge

### Schema Validation

Use the JSON schema for real-time validation:

```json
{
  "$schema": "https://raw.githubusercontent.com/rayners/fvtt-seasons-and-stars/main/schemas/calendar-collection-v1.0.0.json"
}
```

**VS Code Setup:**

1. Install "JSON" extension
2. Add schema to `index.json`
3. Get real-time validation and autocomplete

### Error Debugging

**Check Browser Console:**

```javascript
// Enable debug logging
game.settings.set('seasons-and-stars', 'debugMode', true);

// Manually trigger module loading
await game.seasonsStars.api.loadModuleCalendars('seasons-and-stars-mypack');
```

**Common Error Messages:**

- `Module not found or not enabled` - Check module ID and activation
- `Calendar entry missing URL or file` - Add `file` property to collection entry
- `Invalid URL format` - Check JSON syntax and file paths
- `Schema validation failed` - Validate JSON against schema

### 🕐 Canonical Hours Support

_Added in v0.8.0_

Calendar packs can include canonical hours for named time periods that replace exact time display.

**Basic Example:**

```json
{
  "id": "fantasy-calendar",
  "canonicalHours": [
    {
      "name": "Strange's Bells",
      "startHour": 3,
      "endHour": 6,
      "description": "The mysterious bells that ring in the early morning"
    },
    {
      "name": "Dawn's Call",
      "startHour": 9,
      "endHour": 11
    }
  ]
}
```

**Advanced Example with Minute Precision:**

```json
{
  "canonicalHours": [
    {
      "name": "High Sun",
      "startHour": 12,
      "endHour": 12,
      "startMinute": 30,
      "endMinute": 45,
      "description": "Brief period when the sun reaches its peak"
    },
    {
      "name": "Night Watch",
      "startHour": 23,
      "endHour": 2,
      "description": "Spans midnight for night guards"
    }
  ]
}
```

**Template Integration:**

Use the `ss-time-display` helper in your calendar templates:

```json
{
  "formats": {
    "widgets": {
      "mini": "{{ss-time-display mode=\"canonical-or-exact\"}}",
      "main": "{{ss-weekday}}, {{ss-month}} {{ss-day}} - {{ss-time-display}}"
    }
  }
}
```

**Canonical Hour Properties:**

| Property      | Required | Description                            |
| ------------- | -------- | -------------------------------------- |
| `name`        | ✅       | Display name (e.g., "Strange's Bells") |
| `startHour`   | ✅       | Start hour (0-23)                      |
| `endHour`     | ✅       | End hour (0-23)                        |
| `startMinute` | ❌       | Start minute (0-59, default: 0)        |
| `endMinute`   | ❌       | End minute (0-59, default: 0)          |
| `description` | ❌       | Optional tooltip text                  |

**Time Range Notes:**

- End time is exclusive (endHour: 6 means "up to but not including 6:00")
- Supports midnight wraparound (startHour: 23, endHour: 2)
- Works with calendars having different `minutesInHour` values
- Users can control display via **Canonical Hours Display Mode** setting

## 📦 Distribution

### GitHub Releases

**1. Create Release Workflow:**

`.github/workflows/release.yml`:

```yaml
name: Release
on:
  push:
    tags: ['v*']
jobs:
  release:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Create module.zip
        run: |
          zip -r module.zip . -x "*.git*" "*.github*" "node_modules/*" "*.md"
      - name: Create Release
        uses: softprops/action-gh-release@v1
        with:
          files: |
            module.json
            module.zip
```

**2. Version Tagging:**

```bash
git tag v1.0.0
git push origin v1.0.0
```

### Foundry Package Registry

Submit to the [Foundry Package Registry](https://foundryvtt.com/packages/submit) for wider distribution.

**Registry Requirements:**

- Public GitHub repository
- Stable release tags
- Working manifest and download URLs
- Clear module description

## 🎨 UI Integration

### Source Badges

Calendar pack calendars show with distinctive badges:

- 🧩 **Module: Pack Name** - Calendar pack modules
- 📅 **Built-in Calendar** - Core S&S calendars
- ☁️ **External Source** - URL-loaded calendars

### Preview Text

Write preview text that shows the calendar's unique formatting:

**✅ Good Previews:**

- `"15th of Goldmoon, 1024 AR"` (shows month names and era)
- `"Stardate 47423.2"` (shows unique date format)
- `"Day 156 of Cycle 12, Sol-Year 2387"` (shows sci-fi structure)

**❌ Poor Previews:**

- `"January 15, 2024"` (generic, doesn't show uniqueness)
- `"Sample date format"` (not an actual date)
- `"Day X of Month Y"` (placeholder text)

## 🔒 Security Considerations

### HTML Sanitization

Preview text is automatically sanitized, but follow these guidelines:

**✅ Safe:**

```json
{
  "preview": "<strong>15th of Goldmoon</strong>, 1024 AR"
}
```

**❌ Dangerous:**

```json
{
  "preview": "<script>alert('xss')</script>15th of Goldmoon"
}
```

### Input Validation

- All collection entries are validated against JSON schema
- Module URLs are verified for existence and activity
- File paths are resolved safely relative to module directory

## 📋 Best Practices

### Calendar Design

**✅ Do:**

- Design calendars that feel authentic to their setting
- Include cultural context in month/day names
- Provide meaningful descriptions and metadata
- Test date calculations thoroughly
- Consider how the calendar affects gameplay

**❌ Don't:**

- Copy existing calendars without permission
- Use offensive or inappropriate names
- Create overly complex calendars that confuse players
- Forget to test leap year behavior

### Pack Organization

**✅ Do:**

- Group related calendars in thematic packs
- Use consistent naming within your pack
- Provide comprehensive pack descriptions
- Tag calendars appropriately for discovery

**❌ Don't:**

- Mix unrelated calendars in one pack
- Create too many small packs for similar content
- Use duplicate IDs across different packs
- Skip version management for updates

## 🤝 Community Guidelines

### Sharing and Attribution

- Credit original sources when adapting calendars
- Use appropriate licenses for your content
- Link to official game system documentation when relevant
- Share your packs with the Foundry community

### Support and Maintenance

- Respond to user issues promptly
- Keep packs updated with S&S releases
- Document any special requirements or dependencies
- Consider community feedback for improvements

## 📖 Examples

### Real-World Calendar Pack

A pack containing historical Earth calendars:

```json
{
  "name": "Historical Earth Calendars",
  "description": "Real-world calendar systems from different cultures",
  "calendars": [
    {
      "id": "roman-republic",
      "name": "Roman Republican Calendar",
      "preview": "15 Martius, 709 AUC",
      "tags": ["historical", "roman", "ancient"]
    },
    {
      "id": "maya-long-count",
      "name": "Maya Long Count",
      "preview": "13.0.7.15.3 4 Ak'bal 1 K'ank'in",
      "tags": ["historical", "maya", "mesoamerican"]
    }
  ]
}
```

### Game System Pack

A pack for a specific RPG system:

```json
{
  "name": "Traveller Calendar Pack",
  "description": "Official and variant calendars for Traveller RPG",
  "calendars": [
    {
      "id": "imperial-calendar",
      "name": "Third Imperium Calendar",
      "preview": "Day 156-1105 Imperial",
      "tags": ["traveller", "official", "sci-fi"]
    },
    {
      "id": "vilani-calendar",
      "name": "Vilani Traditional Calendar",
      "preview": "Ashran 23, Cycle 47 Vilani",
      "tags": ["traveller", "vilani", "cultural"]
    }
  ]
}
```

## 🆘 Support

### Getting Help

- **GitHub Discussions**: Ask questions in the S&S repository
- **Discord**: Join the Foundry VTT Discord for real-time help
- **Documentation**: Check the [Developer Guide](DEVELOPER-GUIDE.md) for API details

### Reporting Issues

When reporting problems:

1. Include your pack's `module.json` and `index.json`
2. Provide browser console error messages
3. Specify Foundry VTT and S&S versions
4. Include steps to reproduce the issue

### Contributing

- Submit bug reports and feature requests via GitHub Issues
- Contribute examples and improvements to this guide
- Share successful calendar packs with the community
- Help other developers in discussions and forums

---

**Ready to create your first calendar pack?** Start with the Quick Start section and build something amazing for the Foundry community! 🚀
