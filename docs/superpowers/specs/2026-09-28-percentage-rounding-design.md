# Preventive Dashboard Percentage Rounding Design

## 1. Goal
Fix the misleading "100%" completion coverage when a branch is almost but not fully complete (e.g., 490/491 stores), ensuring that 100% strictly indicates full completion.

## 2. Context
The application relies on standard `Math.round()` to convert decimal ratios to integer percentages. Ratios like 0.997 round up to 100, causing a user experience discrepancy where the system claims 100% completion while simultaneously listing pending items. The percentage calculation is also currently duplicated in several places inside `app/dashboard/preventive/actions.ts`.

## 3. Architecture & Implementation

### 3.1. Central Rate Calculation Function
We will update the existing `calculateRate(completed, total)` function in `app/dashboard/preventive/actions.ts` to include protective boundaries:
- If `total === 0`, return 0.
- If `completed === total`, return 100.
- Calculate the rounded rate.
- If the calculated rate is 100 but `completed < total`, return 99.
- If the calculated rate is 0 but `completed > 0`, return 1.

### 3.2. Consolidation of Calculations
We will replace all duplicated inline `Math.round((completed / total) * 100)` calculations with calls to the updated `calculateRate` function.
Functions to update include:
- `getBmsPreventiveCoverage`
- `getAdminPreventiveKpiData` (updates to `capaianNasional`, `percentage` for branches, and `percentage` for quarters/months)

## 4. Edge Cases Handled
- **Zero completed items:** Correctly returns 0%.
- **Zero total items:** Correctly handled (returns 0%).
- **Extremely low completion (>0% but <0.5%):** Avoids showing 0% by capping at a minimum of 1%, ensuring visibility of any effort made.
