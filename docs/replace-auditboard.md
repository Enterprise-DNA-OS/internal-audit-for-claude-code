# Replace the internal audit records you keep in AuditBoard

AuditBoard renamed itself Optro in March 2026. This project handles engagement records and action follow-up, not every Optro module.

## Export and map

The vendor documents CSV and XLSX export from [Analytics Tool Preview](https://docs.auditboardanalytics.com/introductions/build-a-workflow). Open the relevant Analytics workflow, select the findings result and use Export in Tool Preview. Choose CSV. This is an Analytics findings-result import, not a claimed universal OpsAudit backup. Access and available columns depend on your account and workflow. If your account has no suitable export, request one from its administrator before scheduling migration.

The example is a fictional fixture in the documented CSV transport. Its column names are our accepted mapping, not a vendor-certified standard. The command accepts Finding ID / Issue ID / ID, Finding Title / Issue Name / Name, Severity / Rating, Condition / Description, Root Cause / Cause and Recommendation / Action Plan. Required: stable ID, title, severity and condition. Severity must be low, medium, high or critical. Normalize custom ratings after an auditor agrees the mapping. Dates and owners are not guessed.

```bash
npm run migrate
npm run audit -- add --type=engagement --name="Imported supplier review" --entity="Your business" --owner="Audit lead" --due=2027-01-31 --actor="Migration operator"
npm run audit -- import auditboard --file=examples/auditboard-findings.csv --engagement="Imported supplier review" --actor="Migration operator" --dry-run
```

Check the preview, then remove --dry-run. For custom headings add --mapping=examples/column-mapping.json to the same command. Map each source engagement separately; a findings export alone does not establish an engagement boundary. Use a fresh database, not the fictional demo, for real imports.

## Reconcile before switching

Check source IDs, finding count, conditions and ratings against the original. Inspect the saved source_snapshot for unmapped columns, including source status. No source Closed status is promoted into a verified action. Attachments, source audit trails, approvals, links to controls, workpaper files, user permissions and integration jobs do not transfer through this findings-only CSV. Export and retain those separately, and agree any extended migration with Enterprise DNA.

Identical source IDs and content are skipped on repeat import. Changed content fails the entire batch for explicit reconciliation instead of replacing local work. Duplicate IDs in one file, missing fields and invalid ratings also roll back every row. A dry run rolls back findings and history together.

Run export to write a full JSON backup of local engagements, workpapers, requests, findings, actions, notes and history. This backup format is for archival and reviewed recovery; the AuditBoard importer is not a JSON restore command. Keep both systems until record reconciliation, access, evidence storage and recovery checks pass. One import command handles mapped findings; moving a whole audit function also needs review of everything outside that export.

Sources checked 11 October 2026: [vendor export guide](https://docs.auditboardanalytics.com/introductions/build-a-workflow), [vendor rebrand announcement](https://optro.ai/blog/meet-optro-auditboard-unveils-new-identity-as-ai-transforms-grc).
