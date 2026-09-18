# PJUM Package Store Metadata

## Scope

Enriched PJUM package recap row source data with store metadata needed by the
store type breakdown flow.

Outside scope: PDF renderer changes, schema changes, canonical documentation
changes, and PJUM approval workflow changes.

## Context and Sources

- `.superpowers/sdd/task-2-brief.md`
- `AI_RULES.md`
- `docs/project/04-workflows.md`
- `docs/project/06-database.md`
- `.superpowers/sdd/task-1-report.md`
- `docs/agent-notes/2026-09-16-1117-pjum-store-type-grouping-helper.md`
- `docs/agent-notes/2026-09-16-1125-pjum-category-contract-docs.md`
- `lib/pdf/generate-pjum-package-pdf.ts`
- `lib/pdf/pjum-store-type-breakdown.ts`

## Changed Files

- `lib/pdf/generate-pjum-package-pdf.ts`: selects `store.brand` and
  `store.ownershipType` in the first PJUM package report query and forwards
  them into `recapRows`.
- `lib/pdf/generate-pjum-package-pdf.spec.ts`: adds source-level regression
  checks for the query selection and recap row mapping.
- `docs/agent-notes/2026-09-16-1131-pjum-package-store-metadata.md`: this
  required task note.
- `.superpowers/sdd/task-2-report.md`: execution report for Task 2.

## Decisions

- Kept the change limited to package data enrichment; renderer code remains
  untouched for later tasks.
- Used source-level tests exactly matching the Task 2 brief to verify the
  expected package query and mapper contract.
- Added this note because the project requires dated notes for file-changing
  tasks and the local commit hook enforces that rule.

## Verification

- RED: `node_modules\.bin\tsx.cmd "lib/pdf/generate-pjum-package-pdf.spec.ts"`
  failed before loading tests due to the known local Windows `tsx`
  `uv_os_get_passwd returned ENOMEM` issue.
- RED workaround:
  `node -e "process.geteuid=()=>'codex'; require('./node_modules/tsx/dist/cjs/api/index.cjs').register(); require('./lib/pdf/generate-pjum-package-pdf.spec.ts')"`
  failed for the expected missing query selection and recap row mapping.
- GREEN: the exact `tsx.cmd` command still failed before loading tests with the
  same ENOMEM issue.
- GREEN workaround:
  `node -e "process.geteuid=()=>'codex'; require('./node_modules/tsx/dist/cjs/api/index.cjs').register(); require('./lib/pdf/generate-pjum-package-pdf.spec.ts')"`
  passed with 2/2 tests.

## Remaining Work and Risks

- The exact `tsx.cmd` command remains blocked in this Windows environment by the
  known startup issue; the documented shim verifies the spec itself.
