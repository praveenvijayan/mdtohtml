---
title: E-ink refresh flash and render-activity status on edit
priority: low
labels: [frontend]
blocked_by: [0003-editor-preview-live-ui, 0006-eink-visual-theme]
---

Reproduce the design's e-ink refresh cue: on each edit the preview briefly
inverts (mimicking an e-ink panel refresh) and the header status readout shows
DRAW while rendering, settling back to READY. An ink-fill bar in the header
reflects document length. This activity status is separate from the error
status indicator in `0003-editor-preview-live-ui`; they share the header status
region but signal different things.

## Acceptance criteria
- [ ] On each edit the preview briefly flashes (inverts then settles) and the status readout reads DRAW during the flash, returning to READY after
- [ ] The flash is time-bounded (under ~200ms) and rapid consecutive keystrokes never leave the preview stuck inverted or the status stuck on DRAW
- [ ] A refresh-flash toggle disables the effect; when off, edits update the preview and status with no flash
- [ ] The header ink-fill bar grows with document length and stays within its track (never overflows past 100%)
