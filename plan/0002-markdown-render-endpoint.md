---
title: Convert Markdown to HTML via POST /api/render
priority: high
labels: [backend]
blocked_by: [0001-express-server-shell]
---

Add the server-side render endpoint that turns pasted Markdown into HTML using
markdown-it. Pasted Markdown is untrusted, so raw HTML must be escaped, not
executed.

## Acceptance criteria
- [ ] POST /api/render with a JSON body {markdown} returns {html} with headings, lists, links, and tables converted
- [ ] Raw HTML in the input is escaped, not executed — an input `<script>` appears as literal text in the output
- [ ] A missing or non-string markdown field returns {html:""} with status 200, not a 500
- [ ] A request body over the configured size limit returns a JSON error with status 413, not a stack trace

## Test notes
- exercise a Markdown table and a blockquote to confirm block-level conversion
