<!--
MEMORY.md — distilled project knowledge. CACHE, NOT A LOG.
Rules:
- agent PROPOSES entries in a PR; human approves them on merge. Never write this file silently.
- An entry earns its place only if it saves future agents from re-reading history.
- Keep entries short and cite the source issue/PR.
-->

# Project memory

- `server.js` joins `.hljs` onto fenced-code output because markdown-it otherwise emits only `language-<lang>`; the local preview CSS relies on that class for code-block theming, including the e-ink skin. (#5, #13)
