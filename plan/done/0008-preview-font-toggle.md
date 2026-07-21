---
title: Toggle the preview font between serif and mono
priority: low
labels: [frontend]
blocked_by: [0006-eink-visual-theme]
---

Add the preview font toggle from the design: a control in the preview header
that switches the rendered preview between the serif reading face and the
monospace face, so the user can pick how the "page" reads.

## Acceptance criteria
- [ ] A control in the preview header switches the preview body font between serif and monospace
- [ ] The control label reflects the currently active font
- [ ] Toggling restyles only the preview content; the editor and app chrome fonts are unchanged
- [ ] On first load, before any toggle, the preview shows the default font rather than an unstyled fallback
