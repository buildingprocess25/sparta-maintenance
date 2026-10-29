# Preventive skip UI

## Scope

Adds the "Lewati Preventif" action to the checklist mode banner in the BMS report form, with a confirmation dialog, a skipped-state banner, and an undo button.

## Context and Sources

- `docs/superpowers/specs/2026-10-29-skip-preventive-first-month-design.md`
- `docs/superpowers/plans/2026-10-29-skip-preventive-first-month.md` (Task 5)

## Changed Files

- `app/reports/(bms)/create/components/checklist-step.tsx`: props `canSkipPreventive`, `isPreventiveSkipped`, `onSkipPreventiveChange`; shadcn `AlertDialog` confirmation; banner title/text for the skipped state; "Batalkan, isi checklist lengkap" button; pending-signage text suppressed while skipped.
- `app/reports/(bms)/create/create-form.tsx`: passes the new props.

## Decisions

- No reason field (user decision). The dialog states the limits: first month only, once per store per quarter, preventive still required on the next visit.
- Undo is offered only while the skip option is available, so it never appears in revision mode.

## Verification

- `npx tsc --noEmit` → only `preventiveSkipped` Prisma errors.
- `npx eslint` on changed form files → only pre-existing findings (`react-hooks/set-state-in-effect` in `use-checklist.ts` initial-store effect and unused imports in `create-form.tsx`), confirmed by linting the `main` versions.

## Remaining Work and Risks

Reviewer badge (Task 6), developer-run Prisma migration, manual browser check.
