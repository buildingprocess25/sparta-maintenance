# Unify BMS Balance Initial Limit with PJUM Advance Amount

## Scope

Refactor the operational settings to remove the redundant `BMS_INITIAL_BALANCE` setting and rely entirely on `PJUM_WEEKLY_ADVANCE_AMOUNT` as the single source of truth for the initial BMS balance limit.

## Context and Sources

- The user reported confusion over having both "Uang muka mingguan" (PJUM Advance) and "Limit Saldo BMS" in the dashboard settings with the same value.
- Partner confirmed it's best to use "Uang muka mingguan" directly.
- The `AppSetting` table uses a flexible key-value schema, allowing logic switches without DB migrations.

## Changed Files

- `lib/app-settings.ts`: Removed `BMS_INITIAL_BALANCE` constant and changed `getBmsInitialBalance()` to fetch `PJUM_WEEKLY_ADVANCE_AMOUNT` instead.
- `app/dashboard/settings/_components/settings-workbench.tsx`: Removed the redundant "Limit Saldo BMS" UI input and payload parameters.
- `app/dashboard/settings/actions.ts`: Removed `bmsInitialBalance` from `updateOperationalSettings` logic.
- `app/dashboard/settings/page.tsx`: Removed `getBmsInitialBalance` from data fetching since it's no longer needed for the UI form.

## Decisions

- **Single Source of Truth**: By making the BMS Initial Balance reference the PJUM Weekly Advance Amount key directly, we eliminate configuration redundancy.
- **No Schema Changes**: The key-value structure of `AppSetting` meant we only needed to update backend logic paths, requiring no Prisma migrations.

## Verification

- Verified manually that the UI no longer displays the redundant field.
- Verified TypeScript builds properly with the interfaces refactored.

## Remaining Work and Risks

None.
