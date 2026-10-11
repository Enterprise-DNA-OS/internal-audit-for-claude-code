# Internal Audit for Claude Code

The demo firm is fictional Harbour Assurance. Read actual records before advising. Never present demo findings as client evidence.

- Read the matching .claude/commands recipe. All runtimes use npm run audit -- <command>.
- Stay on main. Commit authorised changes. Never alter repository visibility.
- Every write requires --actor. This records attribution, not identity proof. Resolve ambiguity by listing candidates and using a full ID.
- Never send, publish, delete records, contact anyone or spend money. Reports and letters remain private drafts.
- Read docs/compliance.md before explaining flags. This is scoped record checking, not full IIA conformance or legal certification.
- Never substitute an implementation claim for auditor verification. Never review your own workpaper. Retesting clears its prior review.
- Closing an engagement records approval only after workpapers are reviewed and evidence requests received. Management actions continue after engagement close.
- Import only documented findings CSV, map custom columns explicitly and dry-run first. Source Closed is not local approval. Do not infer missing attachments, dates, reviewers or action owners.
- Keep exports, evidence and credentials private. No real data in git. Do not run concurrent embedded writers.
- Back up before migrations. Never edit an applied migration. Use /customise and npm test on disposable data.
- TEST_DATABASE_URL must name a fresh empty disposable database. Normal tests ignore DATABASE_URL and use temporary PGlite.

## Files

scripts/audit.mjs is the domain CLI. supabase/migrations holds schema changes. scripts/lib/db.mjs selects PostgreSQL or PGlite. views.json, documents.json and brand.json define private output. AGENTS.md routes all runtimes to this guide.

## Commands

- /plan: Read engagement scope, risk and workload
- /workpapers: Read testing and reviewer records
- /requests: Read evidence requests
- /findings: Read findings and recommended actions
- /actions: Read all action records
- /evidence-chase: Find outstanding evidence requests
- /review-queue: Find workpapers awaiting independent review
- /follow-up: Review overdue and unverified actions
- /high-risk: Find high-risk findings still needing action
- /unassigned-actions: Find findings without action plans
- /owner-load: Compare unresolved action workload
- /coverage: Compare evidence and review gaps by engagement
- /stale: Find engagements untouched for 30 days
- /history: Read the most recent 100 local operations
- /attention: Read the weekly attention list
- /compliance: Read scoped documentation and follow-up checks
- /engagement: --engagement=...
- /search: --text=...
- /add: --type=engagement|workpaper|request|finding|action --name=... plus required fields (see help)
- /stage: --engagement=... --status=planned|fieldwork|reporting
- /scope: --engagement=... --objective=... --scope=...
- /receive: --request=... --evidence=...
- /test: --workpaper=... --result=pass|fail --evidence=... --conclusion=...
- /review: --workpaper=... (actor is the independent reviewer)
- /implement: --action=... --evidence=...
- /verify: --action=... --evidence=... (actor is the independent verifier)
- /delay: --action=... --reason=... (preserves original due date)
- /close: --engagement=... --conclusion=... (records approval after checking workpapers)
- /log: --engagement=... --note=...
- /import: auditboard --file=... --engagement=... [--mapping=...] [--dry-run]
- /export: --out=exports/backup.json
- /weekly-review: Write a private draft from plan, attention, review-queue and compliance
- /draft-report: --engagement=...
- /help: All commands support --json

/customise: Back up, add the next migration, update queries and tests, test on disposable data, then apply within the authorised change.
/new-view: Add a read-only query to views.json, render it, inspect escaping and confidential data. No server or action buttons.
