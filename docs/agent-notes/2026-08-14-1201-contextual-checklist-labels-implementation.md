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

## Task 2: Centralized Activity Labels

### Scope

Centralized activity action labels in a pure shared helper and replaced the
dashboard's estimation-specific review filter copy with neutral review labels.
No schema, migration, stored activity action, report transition, badge color,
or client serialization changed.

### Changed Files

- `lib/report-activity-label.ts`: added the base labels, checklist-only
  overrides, and neutral review filter options.
- `lib/report-activity-label.spec.ts`: added focused coverage for checklist and
  BMS wording, unchanged non-review actions, unknown actions, and filters.
- `app/dashboard/activity/activity-format.ts`: delegates action formatting to
  the shared helper and spreads the neutral review options into its filters.

### TDD and Verification

- RED: `node .\\node_modules\\tsx\\dist\\cli.mjs lib\\report-activity-label.spec.ts`
  failed with `MODULE_NOT_FOUND` for `./report-activity-label` before the
  helper existed.
- GREEN: the same command, with the required `NODE_OPTIONS` bootstrap, printed
  `report activity label tests passed` after the minimal helper was added.
- Changed-file ESLint exited 0 for the helper, spec, and dashboard formatter.
- `git diff --check` exited 0 before committing.

### Self-Review and Risks

- The helper is static and side-effect-free; it has no client state, effects,
  or broad barrel import.
- Existing action values and `getActionBadgeClass` behavior are unchanged.
- Later consumers must provide the existing derived `isChecklistOnly` boolean
  to obtain contextual labels; the default preserves BMS wording.
