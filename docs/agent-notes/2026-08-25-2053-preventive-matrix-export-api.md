# Preventive Matrix Export API

## Scope

Added a dedicated API route that generates the annual preventive matrix XLSX workbook.

## Context and Sources

- `docs/superpowers/specs/2026-08-25-preventive-annual-matrix-export-design.md`
- `docs/superpowers/plans/2026-08-25-preventive-annual-matrix-export.md`
- `app/api/admin/export/route.ts`
- `app/dashboard/preventive/annual-matrix-export.ts`

## Changed Files

- `app/api/dashboard/preventive/annual-matrix-export/route.ts`: Adds request validation, workbook sheet builders, and XLSX attachment response for the new matrix export.
- `docs/agent-notes/2026-08-25-2053-preventive-matrix-export-api.md`: Task note for this checkpoint.

## Decisions

- Kept the new route separate from `/api/admin/export` so the existing top-level export remains untouched.
- Returned two workbook sheets: `Matriks Tahunan` and `Ringkasan Cabang`.
- Used blank money cells for missing/null `totalReal` and numeric money cells for zero or positive values.

## Verification

- Attempted `.\node_modules\.bin\tsc.cmd --noEmit`; it ran out of memory with the default Node heap.
- Retried with `NODE_OPTIONS=--max-old-space-size=8192`; the run later surfaced an existing project type-check blocker: `lib/utils.spec.ts(1,30): error TS2307: Cannot find module 'vitest' or its corresponding type declarations.`

## Remaining Work and Risks

- UI dialog and final verification remain.
- Full TypeScript verification is currently blocked by the existing missing `vitest` type dependency in a pre-existing spec file.
