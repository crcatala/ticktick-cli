---
id: tt-cli-diy
status: open
deps: []
links: []
created: 2025-12-15T16:16:28.758512-08:00
type: feature
priority: 2
---
# Enhanced natural language date parsing

Improve date parsing to support more natural language expressions.

## Current Support
- `today`, `tomorrow`
- `+3d` (relative days)
- `YYYY-MM-DD` format
- `YYYY-MM-DDTHH:mm:ss` format

## Desired Additional Support
```bash
# Day names
--due 'monday'
--due 'next friday'
--due 'this wednesday'

# Relative expressions
--due 'in 2 hours'
--due 'in 30 minutes'
--due 'next week'
--due 'next month'

# Time of day
--due 'tomorrow 3pm'
--due 'monday at 9am'
--due 'friday 14:00'

# End of period
--due 'end of day'
--due 'end of week'
--due 'end of month'
```

## Implementation Options
1. **Use chrono-node library** - Full natural language parsing
2. **Custom parser** - Support subset of common patterns
3. **Hybrid** - Custom for common cases, library for complex

## Timezone Handling
- Default to user's local timezone
- Support explicit timezone: `--due 'monday 9am PST'`
- tick-tick-cli auto-detects PST/PDT based on DST dates

## Examples to Support (Priority Order)
1. Day names: mon, tue, wed, thu, fri, sat, sun (+ full names)
2. 'next X' where X is a day name
3. 'in N hours/minutes/days/weeks'
4. Time suffixes: 'tomorrow 3pm', 'friday 9:00'

## Error Handling
```
Could not parse date: 'sometime next week'
Supported formats:
  - today, tomorrow
  - monday, tuesday, ... (or mon, tue, ...)
  - next monday, next week
  - +3d, +1w (relative)
  - in 2 hours, in 30 minutes
  - 2025-01-15, 2025-01-15T14:30
```


