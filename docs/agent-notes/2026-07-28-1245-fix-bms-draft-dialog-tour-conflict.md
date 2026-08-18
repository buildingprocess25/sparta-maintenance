# Fix BMS draft-dialog tour conflict

## Scope

Prevent the BMS report guide from appearing while the saved-draft choice
dialog is open. Draft restoration and deletion behavior are unchanged.

## Context and Sources

- `app/reports/(bms)/create/create-form.tsx`
- `app/reports/(bms)/create/components/bms-report-tour.tsx`
- `app/reports/(bms)/create/draft-dialog.tsx`
- `docs/agent-notes/2026-07-28-1159-implement-bms-report-tour.md`

## Changed Files

- `app/reports/(bms)/create/create-form.tsx`: renders the BMS tour only after
  the draft dialog closes.
- `app/reports/(bms)/create/create-form.draft-dialog.spec.ts`: asserts the
  dialog-tour rendering guard.

## Decisions

- Resolve the modal conflict at the form composition boundary instead of
  changing either modal's z-index or focus behavior.

## Verification

- The new assertion failed before the guard, then passed after it.

## Remaining Work and Risks

- Browser verification with a real local draft remains recommended.
