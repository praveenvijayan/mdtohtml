<!-- MEMORY.md — distilled project knowledge. CACHE, NOT A LOG. -->

# Project memory

- `server.js` joins `.hljs` onto fenced-code output because markdown-it otherwise emits only `language-<lang>`; the local preview CSS relies on that class for code-block theming, including the e-ink skin. (#5, #13)
- Document stats live in `app.js`: `#char-count` in the editor header plus `#word-count`, `#line-count`, and `#read-time` in the footer update on every `input`, with read time clamped to a minimum 1 minute at 200 WPM. (#14)
