# PJUM Store Type Breakdown

## Scope

Add optional PJUM recap breakdown tables by store type after the `Dibuat Oleh` /
`Disetujui Oleh` section. Outside scope: changing PJUM approval workflow,
database schema, Google Drive upload behavior, and store enrichment sync rules.

## Context and Sources

- `AI_RULES.md`
- `.superpowers/sdd/task-5-brief.md`
- `docs/project/04-workflows.md`
- `docs/project/06-database.md`
- `docs/superpowers/plans/2026-09-16-pjum-store-type-breakdown.md`
- `docs/agent-notes/2026-09-16-1117-pjum-store-type-grouping-helper.md`
- `docs/agent-notes/2026-09-16-1125-pjum-category-contract-docs.md`
- `docs/agent-notes/2026-09-16-1131-pjum-package-store-metadata.md`
- `docs/agent-notes/2026-09-16-1139-pjum-render-breakdown-after-signature.md`
- `docs/agent-notes/2026-09-16-1146-pjum-package-spec-target.md`
- `docs/agent-notes/2026-09-16-1152-pjum-recap-breakdown-smoke.md`
- `lib/pdf/generate-pjum-package-pdf.ts`
- `lib/pdf/generate-pjum-pdf.ts`
- `lib/store-ownership.ts`
- `prisma/schema.prisma`

## Changed Files

- `lib/pdf/pjum-store-type-breakdown.ts`: added pure PJUM store type grouping
  helper.
- `lib/pdf/pjum-store-type-breakdown.spec.ts`: added helper coverage for known
  categories, unknown fallbacks, ordering, totals, and single-category
  suppression.
- `lib/pdf/generate-pjum-package-pdf.ts`: passed store brand and ownership
  metadata into recap rows.
- `lib/pdf/generate-pjum-package-pdf.spec.ts`: added source-level query and row
  mapping checks, then kept the regex compatible with the current TypeScript
  target.
- `lib/pdf/generate-pjum-pdf.ts`: rendered optional combined title and
  breakdown tables after the signature section.
- `lib/pdf/generate-pjum-pdf-breakdown.spec.ts`: added source-level renderer
  contract and render-order checks.
- `scripts/test-pjum-recap-breakdown.ts`: added React PDF smoke fixture.
- `docs/project/04-workflows.md`: documented PJUM recap breakdown behavior and
  same-page/next-page flow.
- `docs/project/06-database.md`: documented PJUM store type classification.
- `docs/agent-notes/2026-09-16-1200-pjum-store-type-breakdown.md`: records the
  final implementation task note.
- `.superpowers/sdd/task-5-report.md`: records the Task 5 execution report.

## Decisions

- Single-category PJUM exports keep the current one-table recap format.
- Mixed-category PJUM exports show a combined table first, then breakdown
  sections after signatures.
- Alfamart `UNKNOWN` remains explicit as
  `Alfamart - Tipe Toko Belum Diketahui`.
- Missing, empty, or unrecognized store metadata is treated as unknown Alfamart
  for display instead of being guessed as regular.
- The existing database documentation already matched the classification source
  behavior, so Task 5 did not duplicate that section.

## Verification

- Direct `node_modules\.bin\tsx.cmd` attempts for focused PJUM specs and the
  smoke script were blocked by the known Windows `uv_os_get_passwd returned
  ENOMEM` startup issue before tests loaded.
- Shim command
  `node -e "process.geteuid=()=>'codex'; require('./node_modules/tsx/dist/cjs/api/index.cjs').register(); require('./lib/pdf/pjum-store-type-breakdown.spec.ts')"`
  passed with 5/5 helper tests.
- Shim command
  `node -e "process.geteuid=()=>'codex'; require('./node_modules/tsx/dist/cjs/api/index.cjs').register(); require('./lib/pdf/generate-pjum-package-pdf.spec.ts')"`
  passed with 2/2 package tests.
- Shim command
  `node -e "process.geteuid=()=>'codex'; require('./node_modules/tsx/dist/cjs/api/index.cjs').register(); require('./lib/pdf/generate-pjum-pdf-breakdown.spec.ts')"`
  passed with 4/4 renderer tests.
- Shim command
  `node -e "process.geteuid=()=>'codex'; require('./node_modules/tsx/dist/cjs/api/index.cjs').register(); require('./scripts/test-pjum-recap-breakdown.ts')"`
  passed and wrote `scratch\pjum-recap-breakdown-smoke.pdf`.
- `Get-Item scratch/pjum-recap-breakdown-smoke.pdf` reported a 5,175 byte PDF.
- `$env:NODE_OPTIONS='--max-old-space-size=8192'; node_modules\.bin\tsc.cmd --noEmit --incremental false`
  remained blocked by the existing out-of-scope stale `.next/dev/types/validator.ts`
  reference to `../../../app/v/pjum/[token]/page.js`.

## Remaining Work and Risks

- Direct `tsx.cmd` remains blocked by the known Windows ENOMEM startup issue in
  this environment; PJUM specs and smoke were verified through the documented
  shim.
- Full TypeScript verification remains blocked by the stale `.next/dev`
  generated type reference.
- Manual visual review of `scratch\pjum-recap-breakdown-smoke.pdf` is
  recommended before production deployment.
