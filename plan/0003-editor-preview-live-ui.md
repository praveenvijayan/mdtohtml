---
title: Live split-pane editor with paste-to-preview
priority: high
labels: [frontend]
blocked_by: [0001-express-server-shell, 0002-markdown-render-endpoint]
---

Build the single page: a Markdown textarea on the left, a rendered preview on
the right, updating live as the user types by calling /api/render.

## Acceptance criteria
- [ ] The page shows a Markdown textarea and a preview pane side by side
- [ ] Typing in the textarea updates the preview via /api/render, debounced so keystrokes coalesce
- [ ] A failed render request shows a visible status indicator, not a blank or broken preview
- [ ] Overlapping requests apply in order so the preview never shows a stale (out-of-order) response

## Test notes
- simulate a rejected fetch and assert the status indicator reads an error state
