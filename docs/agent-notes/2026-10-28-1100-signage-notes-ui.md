# Signage note examples and optional AHO field (UI)

## Scope

Task 5 of `docs/superpowers/plans/2026-10-28-signage-revisions.md`: the BMS
checklist UI for signage notes and AHO, the repair-mode info copy, and passing
the `SIGNAGE_AHO_REQUIRED` flag from the server pages to the form.

## Context and Sources

- Spec section "Revisi 2026-10-28" (R1, R2, R3).

## Changed Files

- `local-notes-textarea.tsx`: optional `placeholder` and `alwaysOpen` props.
- `checklist-damage-fields.tsx`: split into `ChecklistNotesField` and
  `ChecklistAhoField`; `ChecklistDamageFields` composes them unchanged.
- `signage-checklist-item.tsx`: Kotor/Pudar/Rusak show a required, always-open
  notes textarea with per-condition placeholder; Pudar/Rusak show the AHO field,
  required only when the flag is on.
- `checklist-step.tsx`: passes the flag; repair-mode info mentions pending
  signage items.
- `create-form.tsx`, `components/types.ts`, `create/page.tsx`,
  `edit/[id]/page.tsx`, `revisi/[reportNumber]/page.tsx`: flag wiring.

## Decisions

- Regular (non-signage) items keep the collapsed "Tambah Catatan" button and a
  required AHO field.

## Verification

- `npx tsc --noEmit`: no errors outside `.next/`.
- ESLint on create/edit/revisi: only pre-existing findings
  (`set-state-in-effect` in local-aho-input, store-step, use-checklist; unused
  imports in create-form and review-step).

## Remaining Work and Risks

- Browser check of the signage card and repair mode is pending.
