# PJUM Render Breakdown After Signature

## Scope

Render optional PJUM recap breakdown tables by store type after the `Dibuat Oleh`
/ `Disetujui Oleh` signature section.

Outside scope: PJUM package query changes, smoke scripts, canonical docs, schema
changes, and approval workflow changes.

## Context and Sources

- `.superpowers/sdd/task-3-brief.md`
- `AI_RULES.md`
- `docs/superpowers/plans/2026-09-16-pjum-store-type-breakdown.md`
- `docs/agent-notes/2026-09-16-1117-pjum-store-type-grouping-helper.md`
- `docs/agent-notes/2026-09-16-1131-pjum-package-store-metadata.md`
- `docs/project/09-testing-and-verification.md`
- `lib/pdf/generate-pjum-pdf.ts`
- `lib/pdf/pjum-store-type-breakdown.ts`

## Changed Files

- `lib/pdf/generate-pjum-pdf.ts`: imports the PJUM store type breakdown helper,
  extends `PjumPdfRow` with store metadata, renders a mixed-category combined
  title, and renders breakdown groups after the signature section.
- `lib/pdf/generate-pjum-pdf-breakdown.spec.ts`: adds source-level regression
  coverage for the renderer contract and verifies render order using signature
  and breakdown text markers.
- `docs/agent-notes/2026-09-16-1139-pjum-render-breakdown-after-signature.md`:
  this required task note.
- `.superpowers/sdd/task-3-report.md`: execution report for Task 3.

## Decisions

- Defined `renderTableHeader` and `renderTableRow` before `tableRows` so the
  mapper does not reference helpers before initialization.
- Kept the breakdown conditional on `breakdown.shouldRenderBreakdown` so
  single-category PJUM exports keep the existing one-table layout.
- Placed the breakdown render block after the signature `View` and before the
  fixed footer.
- Used rendered text markers in the source-level order test instead of style
  definition positions.

## Verification

- RED exact command:
  `node_modules\.bin\tsx.cmd "lib/pdf/generate-pjum-pdf-breakdown.spec.ts"`
  failed before loading tests with `uv_os_get_passwd returned ENOMEM`.
- RED workaround:
  `node -e "process.geteuid=()=>'codex'; require('./node_modules/tsx/dist/cjs/api/index.cjs').register(); require('./lib/pdf/generate-pjum-pdf-breakdown.spec.ts')"`
  failed for the expected missing renderer metadata and breakdown render
  markers.
- GREEN exact renderer command still failed before loading tests with the same
  ENOMEM issue.
- GREEN workaround renderer spec passed with 4/4 tests.
- Exact helper and package spec commands also failed before loading tests with
  the same ENOMEM issue.
- Workaround helper spec passed with 5/5 tests.
- Workaround package spec passed with 2/2 tests.
- TypeScript check
  `$env:NODE_OPTIONS='--max-old-space-size=8192'; node_modules\.bin\tsc.cmd --noEmit --incremental false`
  failed on existing/out-of-scope issues:
  `.next/dev/types/validator.ts` cannot find
  `../../../app/v/pjum/[token]/page.js`, and
  `lib/pdf/generate-pjum-package-pdf.spec.ts` uses the `/s` regex flag under a
  target below ES2018.

## Remaining Work and Risks

- Direct `tsx.cmd` remains blocked by the known Windows ENOMEM startup issue;
  focused specs were verified with the documented shim.
- Full TypeScript verification remains blocked by the out-of-scope `.next/dev`
  stale type reference and Task 2 package spec regex target issue.
