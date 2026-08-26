# Preventive Matrix Export Plan

## Scope

Created an implementation plan for the new admin Checklist Preventif annual matrix XLSX export. No feature implementation code was changed.

## Context and Sources

- `AI_RULES.md`
- `.agents/skills/writing-plans/SKILL.md`
- `docs/superpowers/specs/2026-08-25-preventive-annual-matrix-export-design.md`
- `app/dashboard/preventive/actions.ts`
- `app/dashboard/preventive/_components/admin-preventive-table.tsx`
- `app/dashboard/preventive/_components/export-preventive-dialog.tsx`
- `app/dashboard/preventive/preventive-dashboard.ts`
- `app/api/admin/export/route.ts`
- `app/admin/export/queries.ts`
- `package.json`

## Changed Files

- `docs/superpowers/plans/2026-08-25-preventive-annual-matrix-export.md`: Task-by-task implementation plan for the matrix export.
- `docs/agent-notes/2026-08-25-2018-preventive-matrix-export-plan.md`: Task note for the plan-writing step.

## Decisions

- Plan uses a dedicated data module, dedicated API route, and dedicated matrix-tab dialog.
- Plan keeps existing dashboard matrix behavior and existing top-level export untouched.
- Plan tests data shaping separately from the UI because the key risk is matching dashboard semantics while adding nominal totals.

## Verification

- Reviewed existing export API, existing preventive export dialog, dashboard matrix component, dashboard helper tests, and package dependencies.
- No runtime verification was performed because this task only writes the implementation plan.

## Remaining Work and Risks

- Implementation still needs to execute the plan.
- The implementer must verify the XLSX file manually because workbook formatting is partly visual.
