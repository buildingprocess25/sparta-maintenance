# PJUM Store Type Grouping Helper

## Scope

Added a pure PJUM store type grouping helper and focused unit tests under
`lib/pdf`.

Outside scope: PDF renderer changes, package generation changes, schema changes,
and canonical project documentation changes.

## Context and Sources

- `.superpowers/sdd/task-1-brief.md`
- `AI_RULES.md`
- `docs/project/04-workflows.md`
- `docs/project/06-database.md`
- `docs/agent-notes/2026-09-16-1104-pjum-store-type-breakdown-plan.md`
- `docs/agent-notes/2026-09-14-1142-alfamart-store-ownership-form.md`
- `docs/agent-notes/2026-09-14-1649-skip-missing-store-enrichment-reset.md`
- `prisma/schema.prisma`
- `lib/store-ownership.ts`

## Changed Files

- `lib/pdf/pjum-store-type-breakdown.ts`: added category resolution and grouping
  helper for PJUM recap rows.
- `lib/pdf/pjum-store-type-breakdown.spec.ts`: added node:test coverage for
  category mapping, unknown fallbacks, grouping order, totals, and render flag.
- `docs/agent-notes/2026-09-16-1117-pjum-store-type-grouping-helper.md`: this
  task note.
- `.superpowers/sdd/task-1-report.md`: execution report for Task 1.

## Decisions

- Missing or unrecognized store metadata maps to the explicit
  `ALFAMART_UNKNOWN` category, matching the task test contract.
- `shouldRenderBreakdown` is true only when more than one category has rows.
- Group output follows the fixed order: Alfamart Reguler, Alfamart Franchise,
  Lawson, then Alfamart unknown.

## Verification

- RED: the new spec failed before implementation because
  `./pjum-store-type-breakdown` did not exist when run through the local `tsx`
  registration shim.
- GREEN: the helper spec passed with 5/5 tests using:
  `node -e "process.geteuid=()=>'codex'; require('./node_modules/tsx/dist/cjs/api/index.cjs').register(); require('./lib/pdf/pjum-store-type-breakdown.spec.ts')"`
- The brief's exact command,
  `node_modules\.bin\tsx.cmd "lib/pdf/pjum-store-type-breakdown.spec.ts"`,
  failed before loading tests due to the existing local Windows `tsx`
  `uv_os_get_passwd returned ENOMEM` issue.

## Remaining Work and Risks

- None for the helper behavior. The local `tsx.cmd` startup issue remains an
  environment concern for the exact command from the brief.
