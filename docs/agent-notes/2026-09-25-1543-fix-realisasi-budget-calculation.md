# Fix Completion Form Realisasi Budget Calculation

## Scope

Fixes a bug where the completion form and submit action incorrectly calculated `maxAvailableBudget` for reports that were already in the realization phase (`PENDING_REVIEW` or `REVIEW_REJECTED_REVISION`).

## Context and Sources

The user reported a bug where a BMS is told their realisasi exceeds the sisa saldo dana taktis, even though the realization value is exactly the total limit and the remaining balance is Rp 0.
The calculation of `maxAvailableBudget` incorrectly added back the report's `totalEstimation` to the current `availableBalance`, instead of the report's `totalReal`, causing the max limit to be incorrectly assessed as lower than what it really should be.

## Changed Files

- `app/reports/[reportNumber]/completion/queries.ts`: Fetch and parse `totalReal`.
- `app/reports/[reportNumber]/completion/completion-client.tsx`: Use `totalReal` if the report has already reserved its realization cost.
- `app/reports/actions/submit-completion-work.ts`: Fetch `totalReal` and calculate `reservedCost` dynamically in the backend validation.

## Decisions

- I mirrored the logic used by `calculateBmsBalance` where if the report has already hit the realization phase, the amount previously deducted is `totalReal`. When calculating the max possible budget during resubmission/edit, we add back `totalReal` instead of `totalEstimation`.

## Verification

Code walkthrough verified that adding back `totalReal` perfectly balances out the subtracted amount in `balance.availableBalance`, returning the correct limit for the validation check.

## Remaining Work and Risks

None.
