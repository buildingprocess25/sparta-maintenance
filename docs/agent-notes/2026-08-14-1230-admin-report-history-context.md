# Contextualize admin and report histories

## Scope

Applied checklist-only context to the admin activity stream, the admin report
history, and the legacy/mobile report history. Report workflow, stored actions,
schema, migrations, authorization, CSRF, PDF handling, and data remain
unchanged.

## Context and Sources

- `AI_RULES.md` and `AGENTS.md`.
- `docs/superpowers/specs/2026-08-14-contextual-checklist-labels-design.md`.
- `docs/superpowers/plans/2026-08-14-contextual-checklist-labels.md`.
- Recent contextual-label task notes through
  `docs/agent-notes/2026-08-14-1217-activity-context-query-lists.md`.
- Current admin activity query, both report history views, shared label helper,
  report item types, and Prisma report JSON shape.

## Changed Files

- `app/dashboard/activity/actions.ts`: selects report items internally and
  derives each admin activity label with checklist-only context without
  exposing item JSON in `AdminActivityEvent`.
- `app/dashboard/reports/[reportNumber]/_components/report-detail-utils.ts`:
  delegates report-history labels to the shared contextual formatter.
- `app/dashboard/reports/[reportNumber]/_components/report-detail-utils.spec.ts`:
  covers checklist and default/BMS formatting for estimation approval.
- `app/dashboard/reports/[reportNumber]/_components/history-tab.tsx`: derives
  checklist context once from the loaded report and passes it to history rows.
- `app/reports/[reportNumber]/report-detail-view.tsx`: derives checklist context
  once and uses shared labels while preserving the existing history tones.
- `docs/agent-notes/2026-08-14-1230-admin-report-history-context.md`: records
  this bounded implementation and its verification.

## Decisions

- `isChecklistOnlyReport` remains the only handler-based flow predicate.
- Admin activity selects raw items only inside the server query and reduces
  them directly to a label; the public event shape remains scalar-only.
- Both detail views derive one boolean per report outside their activity render
  loops. No state, effect, or memoization was added.
- The existing shared formatter remains the source of all wording, while the
  legacy/mobile history map now controls tone only.

## Verification

- RED: the new report-detail formatter spec exited 1 because the contextual
  call returned `Estimasi disetujui` instead of `Checklist disetujui`.
- GREEN: the same focused spec printed
  `report detail activity formatter tests passed`.
- `lib/report-activity-label.spec.ts` printed
  `report activity label tests passed`.
- Focused ESLint over all five Task 4 source/test files exited 0.
- TypeScript with `--noEmit --incremental false` exited 0.
- `git diff --check` exited 0 before documentation was added.

## Remaining Work and Risks

None for Task 4. End-to-end notification work and rollout documentation remain
separate tasks in the approved implementation plan.
