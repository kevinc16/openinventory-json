# JSON import implementation plan

Goal: complete the user's separate JSON-only OpenInventory project.
Architecture: native Node/SQLite server plus the existing React UI; normalized imported ItemView rows replace Steam gateways.
Spec: ../specs/2026-11-13-json-import.md

- [x] Parser: failing tests then validated paginated imports, no fabricated metadata or unbounded quantity expansion.
- [x] Persistence/API: named portfolio manager, restart/replacement/rejection tests; no Steam imports or live-action endpoints.
- [x] UI: replace login card in initial and add/replace dialogs, disable live inventory controls, explain export limitations and timestamps.
- [x] Verification: complete tests, typecheck, production build, dependency/runtime checks, browser import/restart/error checks, malformed-request regression, independent review, local commit.

Review focus: incomplete pages cannot overwrite a saved portfolio; raw private session material is never persisted; quantities affect totals correctly; same-name replacement and multiple names stay separate; failed imports preserve current UI/data.

Verified 2026-11-13: 303 tests pass; TypeScript project build and production Vite build pass (upstream chunk-size warning remains). Browser file import rendered the dashboard with the expected expanded quantities. The synthetic portfolio survived a real API process restart. HTTP smoke checks confirmed live actions return 409, foreign Origin returns 403, an incomplete import returns 400 without changing the saved portfolio, and a malformed absolute URL returns 400 while the server stays available. Production dependency audit reported zero advisories; this does not cover all development dependencies. Independent source review found no important actionable issues.

QA uses isolated .cache/qa-data. The user-facing instance starts empty at http://127.0.0.1:4174 with data in ~/.openinventory-json. No real user inventory or Steam session was imported during verification. Local fork branch: codex/json-import. Upstream automatic desktop updates are disabled to preserve JSON-only behavior.
