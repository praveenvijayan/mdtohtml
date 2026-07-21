---
title: Style the preview as a clean, readable web page
priority: medium
labels: [frontend]
blocked_by: [0003-editor-preview-live-ui]
---

Style the rendered preview so the output reads as a polished web page — the core
promise of the app. Covers typographic hierarchy and responsive layout.

## Acceptance criteria
- [ ] The preview applies distinct styling to headings, paragraphs, lists, blockquotes, tables, and inline code
- [ ] The content column is width-constrained and readable on a desktop viewport
- [ ] On a narrow viewport (<780px) the editor and preview stack without horizontal overflow

## Non-functional
- all preview styles are self-contained CSS; no external stylesheet CDN
