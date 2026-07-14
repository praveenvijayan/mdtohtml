---
title: Syntax-highlight fenced code blocks
priority: medium
labels: [backend, frontend]
blocked_by: [0002-markdown-render-endpoint]
---

Extend the render pipeline so fenced code blocks are syntax-highlighted with
highlight.js, and ship a theme stylesheet so the highlighting is visible in the
preview.

## Acceptance criteria
- [ ] A fenced code block with a known language renders with per-token highlight markup
- [ ] A fenced code block with an unknown or missing language renders as escaped plain code, with no error
- [ ] A highlight theme stylesheet is served and applies to code blocks in the preview
