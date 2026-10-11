# Internal Audit for Claude Code

Know which evidence is missing, which workpapers need review and which management actions remain unverified. Keep your internal audit records in a database you own.

## Three ways to run it

- **Do it yourself.** Install the MIT-licensed free version, map your AuditBoard findings export and work through Claude Code, Codex, OpenCode or Cursor. Arrange your own database hosting and agent usage.
- **We customise it.** Enterprise DNA brings your records across, adds your risk ratings, review rules and the screens your team needs. One setup fee, then an agreed retainer for ongoing work.
- **We run it for you.** Omni by Enterprise DNA installs, connects, backs up and operates your version. One setup fee, then a monthly retainer. [Book a call](https://enterprisedna.co/omni/book?offer=replace-software&utm_campaign=auditboard&utm_medium=readme).

## Start with fictional data

```bash
npm install
npm run demo
npm run audit -- evidence-chase
npm run audit -- review-queue --json
npm run view
npm run docs
```

Requires Node 20 or newer. With DATABASE_URL unset, PGlite stores records in .data/db. Set DATABASE_URL for PostgreSQL. Both use the same migrations. Keep owner credentials private. Row security is enabled and public access revoked. A hosted installation needs reviewed identities, roles and access rules. The local operator supplies --actor for traceability; it is not authentication. Run one embedded writer at a time.

## The weekly rituals

Plan the audit week, chase agreed evidence, perform and review testing, report findings, then follow up management actions. Requests received, tests performed, independent reviews and verified actions are separate records. A manager saying an action is implemented does not close it. A retest removes the old review. Engagement approval leaves unresolved management actions open for follow-up.

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

Each write requires --actor. Dates use YYYY-MM-DD. Use a full ID when names are ambiguous. /weekly-review and /draft-report write private drafts. /customise changes the system through a migration. /new-view adds a read-only report. No command sends or publishes anything.

## Ten questions your own audit records can answer

These queries run today. Optro also has configurable reporting; we do not claim its platform cannot answer equivalent questions.

- Which overdue actions still lack a management explanation? `compliance`
- Which high-risk findings still have unverified actions? `high-risk`
- Which findings have no action plan at all? `unassigned-actions`
- Which workpapers need independent review before reporting? `review-queue`
- Which evidence requests are furthest past their agreed date? `evidence-chase`
- Which action owners carry the most overdue work? `owner-load`
- Which engagements combine high risk with missing evidence? `coverage`
- Which engagements have had no header update for thirty days? `stale`
- Which implementation claims still await independent verification? `follow-up`
- What changed during our last review and who recorded it? `history`

## Your first hour: ten things to ask for

1. Put our business name and logo on the review documents.
2. Show the overdue evidence requests.
3. Explain which high-risk findings remain unresolved.
4. Record a management explanation without moving the original due date.
5. Show which workpapers still need an independent reviewer.
6. Draft our weekly internal audit review.
7. Show findings that have no management action.
8. Add our branch field through a new migration.
9. Add a report for our audit committee's review priorities.
10. Test our findings export before saving any records.

## Bring your findings across

```bash
npm run audit -- import auditboard --file=examples/auditboard-findings.csv --engagement="Supplier access review" --actor="Migration operator" --dry-run
```

This example uses the fictional demo. Use a fresh migrated database and create your real engagement before a real import. Remove --dry-run after checking. Custom export headings are mapped with --mapping. Read [the switch guide](docs/replace-auditboard.md) for accepted headings and what transfers. The supported input is a findings CSV exported from an Analytics result, not a universal OpsAudit backup. Identical imports skip, changed records require explicit reconciliation, and malformed batches roll back. Imported Closed statuses remain source snapshots, never local approvals. Attachments and historical approvals need separate migration.

## Documents and views

npm run docs renders engagement report drafts and management action letters from your records. npm run view renders the audit week and workpaper review. Set your business name, colours and logo in brand.json. Outputs stay in docs-out/, views/ and drafts/. There is no editing screen, outbound mail or public server. [Why no front end](docs/why-no-front-end.md).

## Scoped documentation checks

The compliance command flags missing scope, workpaper review gaps, overdue actions without explanations and implementation claims awaiting verification. [Sources and limits](docs/compliance.md) cite IIA 13.3, 14.6 and 15.2. These are record prompts, not certification or a generated assurance opinion. People assess evidence sufficiency, judgment, privacy, retention and permissions.

## Validation and backups

npm test uses a disposable directory and exercises every CLI command, idempotent migrations and seeds, approval guards, atomic import, repeats, malformed CSV, mapping, ambiguity, draft generation, backups and escaped reports. The CI workflow runs Linux, Windows and a separate PostgreSQL database. Local PGlite success is distinct from remote CI results.

npm run audit -- export --out=exports/backup.json writes a full JSON backup without overwriting an existing file. Export files include confidential records. They are for archival and reviewed recovery; the vendor CSV importer is not a backup restore tool.

MIT licence. Independent of AuditBoard and Optro. Their names belong to their respective owners. [Research and target scoring](docs/research.md).
