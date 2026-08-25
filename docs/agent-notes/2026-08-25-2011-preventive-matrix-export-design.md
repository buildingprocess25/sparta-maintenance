# Preventive Matrix Export Design

## Scope

Documented the approved design for a new admin Checklist Preventif annual matrix XLSX export. No implementation code was changed.

## Context and Sources

- `AI_RULES.md`
- `app/dashboard/preventive/actions.ts`
- `app/dashboard/preventive/_components/admin-preventive-table.tsx`
- `app/dashboard/preventive/preventive-dashboard.ts`
- `lib/report-preventive-sql.ts`
- `prisma/schema.prisma`
- `docs/superpowers/specs/2026-08-25-preventive-annual-matrix-export-design.md`

## Changed Files

- `docs/superpowers/specs/2026-08-25-preventive-annual-matrix-export-design.md`: Captures the feature design, export filters, workbook sheets, nominal rules, and out-of-scope dashboard constraints.
- `docs/agent-notes/2026-08-25-2011-preventive-matrix-export-design.md`: Task note for the design decision.

## Decisions

- Keep the current dashboard behavior unchanged.
- Add a separate XLSX export for the Matriks Tahunan tab.
- Use the same current dashboard report-selection semantics: latest qualifying preventive report per store and quarter.
- Add export dialog filters for cabang, brand, tahun, triwulan, and status.
- Keep Q1-Q4 visible in the workbook; use selected triwulan only for status filtering and coverage metrics.
- Read nominal values from `Report.totalReal` on the selected matrix report.
- Export per-store rows and a per-branch summary with grand total.

## Verification

- Reviewed the existing server action, matrix table component, preventive dashboard helpers, preventive SQL classifier, and Prisma schema.
- No runtime verification was performed because this task only writes the design spec.

## Remaining Work and Risks

- Implementation plan still needs to be written after user review of the spec.
- The implementation must preserve the existing top-level XLSX export and current dashboard matrix behavior.
