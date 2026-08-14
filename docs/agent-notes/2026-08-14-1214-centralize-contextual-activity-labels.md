# Centralize Contextual Activity Labels

## Scope

Centralized report activity labels in a pure shared helper and changed the
dashboard's three estimation-review filter labels to neutral review wording.
Schema, migrations, stored action values, report transitions, badge colors,
and client serialization are outside this task.

## Context and Sources

- `AI_RULES.md` and `AGENTS.md`.
- `docs/superpowers/specs/2026-08-14-contextual-checklist-labels-design.md`.
- `docs/agent-notes/2026-08-14-1145-plan-contextual-checklist-labels.md` and
  `docs/agent-notes/2026-08-14-1201-contextual-checklist-labels-implementation.md`.
- `app/dashboard/activity/activity-format.ts`.

## Changed Files

- `lib/report-activity-label.ts`: added base labels, checklist-only overrides,
  and neutral review filter options.
- `lib/report-activity-label.spec.ts`: added focused coverage for checklist
  and BMS wording, unchanged actions, unknown actions, and filters.
- `app/dashboard/activity/activity-format.ts`: delegates action formatting to
  the shared helper and spreads the neutral review options into its filters.

## Decisions

- `getReportActivityActionLabel` defaults to BMS wording to preserve all
  existing one-argument callers.
- Only the three historical `ESTIMATION_*` review values receive checklist-only
  overrides; database action values remain unchanged.
- The helper remains static and side-effect-free, with no client state, effect,
  or broad barrel import.

## Verification

- RED: the focused tsx spec failed with `MODULE_NOT_FOUND` for
  `./report-activity-label` before the helper existed.
- GREEN: with the required tsx bootstrap, the focused spec printed
  `report activity label tests passed` after the helper was added.
- Changed-file ESLint exited 0 for the helper, spec, and dashboard formatter.
- Documentation correction: `node scripts/check-agent-task-note.spec.mjs` and
  `git diff --check` exited 0.

## Remaining Work and Risks

- Future activity surfaces must supply their already-derived
  `isChecklistOnly` boolean to render checklist-specific wording.
