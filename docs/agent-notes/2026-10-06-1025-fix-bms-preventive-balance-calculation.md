# Fix BMS Preventive Maintenance Balance Calculation and Transition Forwarding

## Scope

Fix BMS balance deduction logic to account for preventive maintenance items marked as NOT_OK, and ensure non-hanging active reports are safely forwarded to the new active balance period during PJUM approvals.

## Context and Sources

- Issue report: Report `0052-2610-001` with `preventiveCondition === 'NOT_OK'` and `handler === 'BMS'` completed on Oct 1, 2026 did not deduct active balance or appear in balance history.
- Code path: `lib/balance.ts` (`hasBmsRepairItems` and `approvePjumAndTransitionBmsBalance`).

## Changed Files

- `lib/balance.ts`: Updated `hasBmsRepairItems` to check for `preventiveCondition === "NOT_OK"` alongside `condition === "RUSAK"`. Also added update query in `approvePjumAndTransitionBmsBalance` to move orphaned non-hanging reports from the closed period to the newly initialized active period.

## Decisions

- Include `preventiveCondition === "NOT_OK"` with `handler === "BMS"` in `hasBmsRepairItems()` so preventive maintenance work handled by BMS is recognized as balance-impacting items across active balance calculations and histories.
- Automatically forward non-hanging active reports in the transitioning period to the new `nextPeriod` upon PJUM approval to prevent reports created post-PJUM approval from being locked out in closed periods.

## Verification

- Reviewed logic in `lib/balance.ts` for consistency with UI `isIssueItem` calculation.
- Verified TypeScript compilation and code structure.

## Remaining Work and Risks

None.
