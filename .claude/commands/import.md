---
description: "auditboard --file=... --engagement=... [--mapping=...] [--dry-run]"
---

# import

Read CLAUDE.md. Run `npm run audit -- import` with the arguments below.

auditboard --file=... --engagement=... [--mapping=...] [--dry-run]

Use --json for structured output. Read relevant records first. For writes, supply --actor with the operator's name and inspect the returned record. If a name is ambiguous, list the candidates and use a full ID. Dates are YYYY-MM-DD. Unknown flags fail.

Read docs/replace-auditboard.md. Run import auditboard with --dry-run first. Check stable IDs and ratings. Source snapshots do not confer review or approval. No attachment contents transfer.

Do not send, publish or delete. Keep evidence and outputs private. Explain the result from the records, never invent it.
