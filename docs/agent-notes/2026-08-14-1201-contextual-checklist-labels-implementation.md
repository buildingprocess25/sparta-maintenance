# Contextual Checklist Labels Implementation

## Scope

Updated the report-create review submit guidance to choose its copy from
checklist handler ownership. The task is limited to the review card and its
new pure helper; report flow, database schema, migrations, database data, and
the `Estimasi BMS` card are unchanged.

## Context and Sources

- `AI_RULES.md` and `AGENTS.md`.
- `docs/superpowers/specs/2026-08-14-contextual-checklist-labels-design.md`.
- `docs/agent-notes/2026-08-14-1145-plan-contextual-checklist-labels.md` and
  related pending-checklist implementation notes.
- `app/reports/(bms)/create/components/review-step.tsx` and
  `lib/checklist-data.ts`.

## Changed Files

- `app/reports/(bms)/create/components/review-step-copy.ts`: added pure,
  single-pass after-submit copy selection based on `handler === "BMS"`.
- `app/reports/(bms)/create/components/review-step-copy.spec.ts`: added focused
  regression coverage for empty/Rekanan-only and BMS-containing checklists.
- `app/reports/(bms)/create/components/review-step.tsx`: renders the helper
  result in the existing Setelah Submit card.

## Decisions

- A report is checklist-only when no current checklist item has handler `BMS`.
- The helper accepts an iterable so `checklist.values()` is consumed directly,
  with no component state, effect, or client payload added.

## Verification

- RED: the new focused spec failed with `MODULE_NOT_FOUND` for
  `./review-step-copy` before the helper was created.
- GREEN: the focused spec printed `review step copy tests passed` after the
  helper and component integration.
- Focused ESLint exited 0. It reports one pre-existing warning:
  unused `Image` import in `review-step.tsx`.
- Full-repository lint was intentionally not run: its baseline is known to have
  29 pre-existing errors and to time out in this environment.

## Remaining Work and Risks

- The pre-existing unused `Image` warning remains outside this task's scoped
  change.
