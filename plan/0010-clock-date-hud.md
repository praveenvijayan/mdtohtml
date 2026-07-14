---
title: Live clock and date HUD in the header
priority: low
labels: [frontend]
blocked_by: [0006-eink-visual-theme]
---

Add the header clock/date HUD from the design: a live HH:MM clock and the
current date in the top-right of the header, with a toggle to hide it.

## Acceptance criteria
- [ ] The header shows a live HH:MM clock and the current date, advancing over time without a reload
- [ ] A toggle hides and shows the clock/date HUD
- [ ] When the HUD is hidden the header reflows without leaving an empty gap or causing overflow
- [ ] The clock's timer is cleared when the component unmounts — no update-after-unmount and no leaked interval
