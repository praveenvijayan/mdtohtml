---
title: Show live document stats (chars, words, lines, read time)
priority: low
labels: [frontend]
blocked_by: [0003-editor-preview-live-ui]
---

Add the instrument readouts from the design: a character count on the editor
header and word count, line count, and estimated reading time in the footer bar,
all computed from the current Markdown and updating as the user types.

## Acceptance criteria
- [ ] The editor header shows a character count and the footer shows word count, line count, and an estimated read time for the current Markdown
- [ ] All four readouts update live as the user edits the document
- [ ] An empty document shows 0 characters, 0 words, 1 line, and the minimum read time — never blank or NaN
- [ ] Read time is derived from word count (a words-per-minute estimate) and is at least the minimum for any non-empty document
