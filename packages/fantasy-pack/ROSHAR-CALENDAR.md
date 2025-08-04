# Roshar Calendar (Stormlight Archive)

_Documentation for the Vorin calendar system from Brandon Sanderson's Stormlight Archive series_

**Last Updated**: August 3, 2025  
**Calendar Version**: Added in v0.17.0

## Overview

The Roshar calendar brings the unique timekeeping system from Brandon Sanderson's Stormlight Archive series to your FoundryVTT campaigns. This implementation is based on official worldbuilding materials and provides an authentic Vorin calendar experience for campaigns set on Roshar.

### Key Features

- **500-day year**: Ten months of fifty days each
- **5-day weeks**: Ten weeks per month (Vorin week structure)
- **Authentic date format**: Year.Month.Week.Day notation (e.g., 1173.8.4.3)
- **The Weeping**: 28-day intercalary period with constant rain
- **20-hour days**: 100-minute hours with 100-second minutes
- **Vorin naming**: Official month and weekday names from the source material

## Calendar Structure

### Months (Ten months, 50 days each)

1. **Jesnan** (Jes) - First month
2. **Nanan** (Nan) - Second month
3. **Chach** (Cha) - Third month
4. **Vev** (Vev) - Fourth month
5. **Palah** (Pal) - Fifth month
6. **Shash** (Sha) - Sixth month
7. **Betab** (Bet) - Seventh month
8. **Kak** (Kak) - Eighth month
9. **Tanat** (Tan) - Ninth month
10. **Ishev** (Ish) - Tenth month

_Note: Month names correspond to Vorin numerical system (Jesnan = one, Nanan = two, etc.)_

### Weekdays (Five-day week)

1. **Jesdes** (Je) - First day
2. **Nandes** (Na) - Second day
3. **Chachel** (Ch) - Third day
4. **Vevod** (Ve) - Fourth day
5. **Palah** (Pa) - Fifth day

### The Weeping

**The Weeping** is a 28-day intercalary period occurring after Ishev (the tenth month). During this time:

- Constant rain falls across Roshar
- No highstorms occur
- Gemstones cannot be infused with Stormlight
- **Lightday** occurs in the middle - a single clear day
- Marks the transition between years

## Date Format System

### Primary Format: Year.Month.Week.Day

The Roshar calendar uses a distinctive four-part date notation:

- **1173.8.4.3** = Year 1173, Month 8 (Kak), Week 4, Day 3 of week
- **1174.1.1.1** = Year 1174, Month 1 (Jesnan), Week 1, Day 1 of week

### Available Formats

The calendar provides multiple date formatting options:

- **roshar-simple**: `1173.8.4.3` (Standard Alethi notation)
- **vorin**: `17th day of 4th week, Kak, 1173` (Formal Vorin style)
- **long**: `Chachel, 17th Kak 1173` (Traditional long format)
- **time**: `15:75` (20-hour format with 100-minute hours)

### Cultural Variants

- **Alethi**: Prefers numerical notation (Year.Month.Week.Day)
- **Thaylen**: Uses more descriptive formats with month names

## Time System

Roshar uses a unique time structure different from Earth:

- **20 hours per day** (vs. Earth's 24)
- **100 minutes per hour** (vs. Earth's 60)
- **100 seconds per minute** (vs. Earth's 60)

This creates longer "hours" but maintains familiar minute/second relationships for gameplay.

## Campaign Integration

### Setting Up for Stormlight Archive Games

1. **Calendar Selection**: Choose "Roshar Calendar (Stormlight Archive)" from the fantasy pack
2. **Default Year**: Starts in 1173 (beginning of The Way of Kings timeline)
3. **Highstorm Tracking**: Use the calendar to track highstorm cycles
4. **The Weeping Events**: Plan campaign events during this unique period

### Highstorm Campaigns

The calendar's week structure supports highstorm tracking:

- Highstorms typically follow irregular but trackable patterns
- Use the `highstorm` format for storm-related notation
- Week boundaries help organize storm cycles for gameplay

### The Weeping as Campaign Element

- **Duration**: 28 days (exactly 4 weeks)
- **Atmosphere**: Constant rain, gray skies, no storms
- **Mechanical Impact**: No Stormlight infusion possible
- **Lightday**: Single clear day provides story opportunities

## Technical Implementation

### New Handlebars Helpers

The Roshar calendar introduces specialized helpers:

- `{{ss-week}}` - Calculates week within month (1-10)
- `{{ss-day-in-week}}` - Day position within week (1-5)

These helpers automatically detect the 5-day week structure from the calendar definition.

### Date Format Examples

```handlebars
{{year}}.{{month}}.{{ss-week}}.{{ss-day-in-week}}
```

Produces: `1173.8.4.3`

```handlebars
{{ss-day format='ordinal'}}
day of
{{ss-week format='ordinal'}}
week,
{{ss-month format='name'}},
{{year}}
```

Produces: `17th day of 4th week, Kak, 1173`

## Source Material

This implementation is based on official Brandon Sanderson worldbuilding:

- **Primary Source**: [Brandon Sanderson's Roshar Date System](https://www.brandonsanderson.com/blogs/blog/roshars-date-system)
- **Wiki Reference**: [Stormlight Archive Calendar](https://stormlightarchive.fandom.com/wiki/Calendar)
- **Coppermind**: [Roshar Calendar System](https://coppermind.net/wiki/Roshar#Calendar)

All calendar details, naming conventions, and structural elements are derived from these official materials to ensure authenticity for Stormlight Archive campaigns.

## Installation and Setup

### Prerequisites

- Seasons and Stars (Core) module installed and active
- Seasons and Stars Fantasy Pack installed and active

### Quick Setup

1. Open Calendar Selection dialog in Seasons and Stars
2. Choose "Roshar Calendar (Stormlight Archive)" from the Fantasy Pack section
3. Confirm selection to apply the calendar
4. Calendar will initialize to year 1173 (Way of Kings timeline)

### Customization Options

- **Starting Year**: Adjust for different campaign timelines
- **Date Formats**: Choose between Alethi, Thaylen, or formal Vorin styles
- **Widget Display**: Customize calendar widget appearance

## Troubleshooting

### Common Issues

**Week calculations appear incorrect**

- Verify the calendar has loaded properly
- Check that helpers `{{ss-week}}` and `{{ss-day-in-week}}` are available
- Ensure Fantasy Pack is active and up-to-date

**Date formats not displaying correctly**

- Confirm Roshar calendar is selected (not just loaded)
- Check browser console for template errors
- Verify all format strings use correct helper syntax

**The Weeping not appearing**

- The Weeping appears after Ishev (month 10)
- Ensure intercalary periods are enabled in calendar settings
- Check that you're viewing the correct year transition

### Getting Help

For technical issues or questions about the Roshar calendar implementation:

1. Check the main Seasons and Stars documentation
2. Review the console for error messages
3. Report issues to the module's GitHub repository

## Limitations and Known Issues

### Current Limitations

- **Storm Tracking**: Calendar doesn't automatically track highstorm patterns (manual tracking required)
- **Lightday**: The specific day within The Weeping is not automatically marked
- **Cultural Variants**: Limited to basic Alethi/Thaylen format differences

### Future Enhancements

Planned improvements may include:

- Automated highstorm cycle tracking
- Lightday highlighting within The Weeping
- Additional cultural format variants
- Integration with Stormlight-specific game systems

_Note: All planned features are subject to development priorities and community feedback_

---

**Compatibility**: Designed to work with D&D 5e, Pathfinder 2e, and system-agnostic campaigns. Game system integration follows Seasons and Stars standard compatibility patterns.

**License**: Calendar implementation follows the module's standard open-source licensing. Roshar and Stormlight Archive are trademarks of Brandon Sanderson and Dragonsteel Entertainment.
