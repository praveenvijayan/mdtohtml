<!--
MEMORY.md — distilled project knowledge. A CACHE, NOT A LOG.

Rules:
- The agent PROPOSES entries here as part of a PR; a human approves them on merge.
  Never write to this file silently.
- An entry earns its place only if it saves a future agent from re-reading
  history. Raw detail lives in issues/PRs/commits — link to them, don't copy them.
- Each entry is 1–2 lines and cites its source: (#123) or (PR #456).
- Keep it small and current. Prune obsolete entries with /ratchet-memory — the
  full history in closed issues/PRs/git means pruning never loses information.
- Group by area. If this file outgrows ~300 lines, that's a signal to compact.
-->

# Project memory

- highlight.js themes style `.hljs`, but markdown-it only emits `language-<lang>` on the `<code>` element; server.js overrides the fence render rule to join `hljs` onto the class so the theme's block rules apply. (#5)
- Document stats (chars in editor header `#char-count`; words/lines/read-time in footer `#word-count`/`#line-count`/`#read-time`) are computed client-side in app.js `computeStats()`, updated synchronously on every `input` event; read time = `max(1, ceil(words / 200))` WPM. (#14)
