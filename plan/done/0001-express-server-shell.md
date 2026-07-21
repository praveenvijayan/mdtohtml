---
title: Serve the app shell from an Express server
priority: high
labels: [backend]
blocked_by: []
---

Stand up the Node/Express server that serves the single-page app and static
assets. This is the foundation every other issue builds on.

## Acceptance criteria
- [ ] GET / returns 200 with an HTML document
- [ ] Server listens on process.env.PORT, defaulting to 3000
- [ ] A static file placed in public/ is served with its correct content-type
- [ ] A request to an unknown path returns 404 without leaking a stack trace

## Non-functional
- No backend persistence or database; state lives only in the request/response
