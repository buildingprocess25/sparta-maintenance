# PJUM Store Type Breakdown Plan

## Scope

Created an implementation plan for optional PJUM recap breakdown tables by store type. Outside scope: runtime code changes, schema changes, and PDF rendering changes in this planning task.

## Context and Sources

- `AI_RULES.md`
- `docs/project/04-workflows.md`
- `docs/project/06-database.md`
- `docs/superpowers/specs/2026-09-04-store-ownership-coordinates-design.md`
- `docs/agent-notes/2026-09-14-1142-alfamart-store-ownership-form.md`
- `docs/agent-notes/2026-09-14-1649-skip-missing-store-enrichment-reset.md`
- `lib/pdf/generate-pjum-package-pdf.ts`
- `lib/pdf/generate-pjum-pdf.ts`
- `lib/pdf/generate-pjum-form-pdf.ts`
- `lib/store-ownership.ts`
- `prisma/schema.prisma`

## Changed Files

- `docs/superpowers/plans/2026-09-16-pjum-store-type-breakdown.md`: added task-by-task implementation plan for PJUM store type breakdown.
- `docs/agent-notes/2026-09-16-1104-pjum-store-type-breakdown-plan.md`: records this planning task.

## Decisions

- Plan preserves the existing single-table recap for one-category PJUM exports.
- Plan renders mixed-category breakdowns after the `Dibuat Oleh` / `Disetujui Oleh` signature section and lets React PDF continue naturally to the next page only when content does not fit.
- Plan keeps Alfamart `UNKNOWN` explicit as `Alfamart - Tipe Toko Belum Diketahui` instead of classifying it as regular.
- Plan avoids database migration because `Store.brand` and `Store.ownershipType` already exist.

## Verification

- Reviewed the plan for spec coverage, placeholder wording, and type/interface consistency.
- `git status --short --branch` was checked before creating files.

## Remaining Work and Risks

- Implementation still needs to execute the saved plan task-by-task.
