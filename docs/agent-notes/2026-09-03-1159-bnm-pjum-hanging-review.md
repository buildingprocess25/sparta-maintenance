# BNM PJUM Hanging Review

## Scope

Shows BNM reviewers which active laporan gantung are included in a pending PJUM and which hanging reports would be left behind. This finishes the review visibility portion of the mandatory hanging-report PJUM work.

## Context and Sources

- User clarified that laporan gantung means a completed PJUM-required report whose `finishedAt` belonged to the previous PJUM range but was omitted when that previous PJUM was approved.
- `docs/superpowers/plans/2026-09-03-pjum-mandatory-hanging-and-limit.md`
- `docs/project/10-bms-weekly-balance.md`
- `docs/agent-notes/2026-08-28-1433-pjum-hanging-carryover.md`
- `docs/agent-notes/2026-09-03-1043-pjum-mandatory-hanging-limit.md`
- `docs/agent-notes/2026-09-03-1056-dashboard-bmc-pjum-enforcement.md`
- `docs/agent-notes/2026-09-03-1118-full-page-bmc-pjum-route-parity.md`

## Changed Files

- `lib/balance.ts`: adds a helper for included active hanging reports and enriches omitted hanging summaries with store and finish-date data.
- `app/reports/pjum/approval-actions.ts`: returns included and omitted hanging report lists in BNM PJUM detail data.
- `app/reports/pjum/_components/pjum-approval-detail.tsx`: renders the hanging-report detection panel on the BNM review page.
- `app/dashboard/pjum/[id]/page.tsx`: renders the same detection information in dashboard PJUM detail and marks included hanging rows.
- `app/dashboard/pjum/[id]/_components/pjum-approval-button.tsx`: includes omitted hanging report numbers in the approval confirmation.
- `docs/project/10-bms-weekly-balance.md`: records mandatory carryover inclusion, Rp1,000,000 selected total cap, and BNM visibility.
- `docs/agent-notes/2026-09-03-1159-bnm-pjum-hanging-review.md`: task note.

## Decisions

- Included hanging reports are detected from the PJUM's own report numbers plus active hanging lifecycle fields.
- Omitted hanging reports still use the locked balance-period relationship so forged or legacy omissions remain visible and guarded.
- BNM sees included and omitted lists only while the PJUM is pending approval.

## Verification

- `node_modules\.bin\tsc.cmd --noEmit --pretty false --incremental false` passed after the dashboard review panel changes.

## Remaining Work and Risks

Run the final full verification set after staging all branch changes.
