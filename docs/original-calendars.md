# Seasons & Stars Original Calendars

Some Seasons & Stars calendar definitions are original creations by the project maintainers. This document records the authoritative specifications for those calendars so that their JSON data can be verified against a publicly available source.

## Traditional Fantasy Epoch

_Epoch-based high fantasy calendar used by default in the Seasons & Stars core module._

- **Year structure:** 12 months totaling 365 days, with a leap day inserted every fourth year in **Frost-moon**.
- **Months:**
  1. Dawn-moon — 31 days
  2. Green-moon — 30 days
  3. Flower-moon — 31 days
  4. Sun-moon — 30 days
  5. Fire-moon — 31 days
  6. Thunder-moon — 30 days
  7. Harvest-moon — 31 days
  8. Wine-moon — 31 days
  9. Dying-moon — 30 days
  10. Frost-moon — 31 days (32 in leap years)
  11. Snow-moon — 30 days
  12. Dark-moon — 28 days
- **Weekdays (7-day week):** Godsday, Kingsday, Workday, Marketday, Warday, Restday, Moonday.
- **Festival days:** Spring Awakening (after Flower-moon), Summer Solstice (after Thunder-moon), Autumn Gathering (after Dying-moon), Winter's Heart (after Dark-moon).
- **Primary moon:** Luna with a 30-day cycle.

## Vale Reckoning

_Mythic alpine calendar designed for narrative-focused campaigns._

- **Year structure:** 8 months of 45 days each (360 days total) plus four festival observances that track the seasons.
- **Months:** Frostwane, Thawmarch, Greenspire, Embertide, Highsun, Harvestwane, Gravecall, Deepfrost.
- **Weekdays (6-day week):** Brightday, Graftday, Stoneday, Bitterday, Wyrdday, Graveday.
- **Festival days:** Hearthmoor (after Frostwane), Stormrest (after Greenspire), Suncrest (after Highsun), Ashfall (after Gravecall).
- **Moons:** Máni (29-day cycle) and Nótt (37-day cycle).

This document should be updated whenever the original calendar designs change so downstream users can confirm the canonical data.
