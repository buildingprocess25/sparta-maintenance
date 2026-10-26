# Signage checklist hook wiring

## Scope

Wire signage helpers into `useChecklist`: `updateSignageItem`, group AHO ticket propagation/fill, material-required validation, dev autofill. UI is out of scope (next task).

## Context and Sources

`.superpowers/sdd/signage-task-6-brief.md`; `signage-checklist.ts`, `lib/signage.ts`.

## Changed Files

- `app/reports/(bms)/create/hooks/use-checklist.ts`: new updater, AHO propagation, material validation (cooldown and quarterly branches), autofill, return value.

## Decisions

Brief code used verbatim. Pure logic already covered by existing spec.

## Verification

`npx tsc --noEmit` (no errors outside .next/dev/types); signage-checklist.spec.ts passes; eslint reports one pre-existing react-hooks/set-state-in-effect error at the initialStoreCode effect (not touched).

## Remaining Work and Risks

Browser/manual check pending; UI caller comes in the next task.
