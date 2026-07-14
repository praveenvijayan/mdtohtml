---
title: Apply the Markdown E-Ink visual theme to the app
priority: medium
labels: [frontend]
blocked_by: [0003-editor-preview-live-ui, 0005-preview-typography]
---

Reskin the whole app in the imported "Markdown E-Ink" aesthetic: a 1-bit
near-black-on-warm-grey palette, heavy solid borders with an offset drop shadow,
display/mono/serif type, a titled header bar and an instrument-style footer bar
framing the split editor/preview. This is a full aesthetic pass that supersedes
the generic preview styling from `0005-preview-typography` with the e-ink skin.

## Acceptance criteria
- [ ] The app shell renders a titled header bar, the split editor/preview, and a footer bar, all drawn in the e-ink chrome (near-black ink on warm grey, heavy solid borders, an offset drop shadow on the frame)
- [ ] The rendered preview is restyled to the e-ink skin: h1 with a bottom rule, dashed horizontal rules, a left-bar blockquote, dark (inverted) fenced code blocks, and uppercase table headers
- [ ] Display, monospace, and serif typefaces are applied without any runtime CDN dependency (self-hosted or system fallback), honouring the no-external-stylesheet constraint from `0005-preview-typography`
- [ ] On a narrow viewport (<780px) the header, editor, preview, and footer stack without horizontal overflow
- [ ] When the theme fonts are unavailable the UI falls back to system monospace/serif with the layout intact — no invisible text and no broken frame

## Non-functional
- all theme styling is self-contained CSS/assets served by the app; no runtime font or stylesheet CDN
