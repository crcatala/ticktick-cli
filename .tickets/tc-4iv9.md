---
id: tc-4iv9
status: closed
deps: []
links: []
created: 2026-07-15T03:18:14Z
type: bug
priority: 1
assignee: cc-vps
---
# Refresh TickTick web login device fingerprint

Update the undocumented V2 login X-Device payload and user agent to match the observed current TickTick web client. Support TICKTICK_WEB_VERSION so the web version can be updated without a release.

## Acceptance Criteria

Login and authenticated request X-Device payloads include the current browser-compatible fields; browser/device identity is consistent; TICKTICK_WEB_VERSION overrides the default safely; automated tests cover payload construction and the environment override.


## Notes

**2026-07-15T03:21:02Z**

Refreshed the undocumented V2 browser fingerprint from observed web-login headers: current Chrome user agent, complete X-Device payload, normal AJAX headers, and default web version 8121. Added validated TICKTICK_WEB_VERSION override, unit tests for default/override behavior, and README documentation. Did not retry the live login while the server-side 429 cooldown may still apply.
