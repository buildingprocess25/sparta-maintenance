# Preventive Matrix Export Dialog

## Scope

Added the new Matriks Tahunan export dialog and wired it into the Checklist Preventif admin matrix tab.

## Context and Sources

- `docs/superpowers/specs/2026-08-25-preventive-annual-matrix-export-design.md`
- `docs/superpowers/plans/2026-08-25-preventive-annual-matrix-export.md`
- `app/dashboard/preventive/_components/admin-preventive-table.tsx`
- `app/dashboard/preventive/_components/export-preventive-dialog.tsx`
- `components/ui/field.tsx`
- `.agents/skills/shadcn/SKILL.md`

## Changed Files

- `app/dashboard/preventive/_components/export-preventive-matrix-dialog.tsx`: Adds the dedicated matrix export dialog with Cabang, Brand, Tahun, Triwulan, and Status filters.
- `app/dashboard/preventive/_components/admin-preventive-table.tsx`: Renders the new dialog button only inside the Matriks Tahunan tab.
- `docs/agent-notes/2026-08-25-2106-preventive-matrix-export-dialog.md`: Task note for this checkpoint.

## Decisions

- Kept the existing top-level `ExportPreventiveDialog` untouched.
- Used existing shadcn/ui components, including `FieldGroup` and `Field`, for the new dialog form layout.
- Reset dialog defaults from the currently selected dashboard filters each time the dialog opens.

## Verification

- `.\node_modules\.bin\tsx.cmd app/dashboard/preventive/annual-matrix-export.spec.ts` passed.
- `NODE_OPTIONS=--max-old-space-size=8192 .\node_modules\.bin\tsc.cmd --noEmit` no longer reports errors from the new dialog, but still reports the pre-existing `lib/utils.spec.ts(1,30): error TS2307: Cannot find module 'vitest' or its corresponding type declarations.`

## Remaining Work and Risks

- Final focused specs, lint, and manual download verification remain.
- Full TypeScript verification remains blocked by the existing missing `vitest` type dependency.
