# BMS Active Report & Realisasi UX

## Scope

Adds clearer UX for realisasi that exceeds remaining BMS tactical balance and prevents BMS from creating a new normal report while a relevant active report is still unfinished.

## Context and Sources

- `AI_RULES.md`
- `docs/project/10-bms-weekly-balance.md`
- `docs/agent-notes/2026-08-31-1535-fix-completion-budget-validation.md`
- `docs/agent-notes/2026-09-03-1159-bnm-pjum-hanging-review.md`
- User clarification: old junk/test reports from previous periods must not block new BMS report creation.

## Changed Files

- `lib/bms-active-report-blocker.ts`: shared active-report blocker status list, cutover scope, query where builder, and UX message formatter.
- `lib/bms-active-report-blocker.spec.ts`: covers blocker statuses, active-period/cutover scope, report exclusion, and blocker copy.
- `lib/balance.ts`: exposes `getBmsActiveReportBlocker` for pages and server actions.
- `app/dashboard/_components/bms-dashboard.tsx`: uses the blocker for the BMS create-report CTA.
- `app/reports/_components/bms-create-report-button.tsx`: reusable create-report button with toast guidance when blocked.
- `app/reports/page.tsx`: loads the blocker for the BMS reports page.
- `app/reports/_components/bms-mobile-reports-list.tsx`: shows a blocked-aware create CTA on the BMS reports list.
- `app/reports/_components/bms-reports-list.tsx`: uses the same blocked-aware create CTA for the desktop list component.
- `app/reports/(bms)/create/page.tsx`: blocks direct create-page access when a relevant active report exists.
- `app/reports/actions/submit.ts`: rejects forged/manual report creation when a relevant active report exists.
- `lib/unexpected-cost.ts`: centralizes over-balance realization copy and the 250-character reason limit.
- `app/reports/[reportNumber]/completion/completion-client.tsx`: shows the balance card, revised reason copy, 250-character limit, and counter.
- `app/reports/[reportNumber]/completion/use-completion-work-form.ts`: validates the new required reason copy and max length.
- `app/reports/actions/submit-completion-work.ts`: enforces the 250-character reason limit server-side and persists the trimmed value.
- `app/dashboard/reports/[reportNumber]/_components/report-header.tsx`: adds a header badge when a report has an over-balance reason.
- `app/dashboard/reports/[reportNumber]/_components/work-cost-tab.tsx`: renames the orange over-balance reason card.
- `app/reports/[reportNumber]/report-detail-view.tsx`: renames the BMS detail over-balance reason card.
- `docs/project/10-bms-weekly-balance.md`: documents the active-report blocker and renamed over-balance reason.

## Decisions

- The active-report blocker counts reports owned by the BMS in active/non-terminal statuses only.
- To avoid legacy junk reports blocking users forever, the blocker is scoped to the current active balance period, with a fallback only for reports without `balancePeriodId` that were created on or after 2026-09-03 Asia/Jakarta.
- Server-side `submitReport` uses the same helper and excludes the submitted draft report number so restoring/submitting the same draft is not blocked by itself.
- `unexpectedCostNotes` remains the stored field, but user-facing copy is now framed as the reason realisasi exceeded the remaining dana taktis balance.

## Verification

- Helper spec passed: `node -e 'process.geteuid=()=>"codex"; require("./node_modules/tsx/dist/cjs/api/index.cjs").register(); require("./lib/bms-active-report-blocker.spec.ts")'`
- Initial TypeScript compile attempt with `node_modules\.bin\tsc.cmd --noEmit --pretty false --incremental false` failed due Node/PowerShell out-of-memory before diagnostics.

## Remaining Work and Risks

- Re-run TypeScript with a larger Node heap and complete the final verification set.
