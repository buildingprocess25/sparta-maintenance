---
description: Record of BMC Store Cabang Lama implementation
---

# Add BMC Store Legacy Area

Date: 2026-07-31
Context: Implementation of the "Cabang Lama" optional dropdown in BMC Store management

## Overview

Added the ability to optionally select a "Cabang Lama" (legacy area) for a store. The canonical field `Store.branchName` remains the primary grouping, while the `Store.areaName` serves as the optional legacy mapping.

## Technical Decisions

1.  **Schema & Migration Deferred:** No schema migrations, database mutation scripts, or master-area tables were introduced. The legacy `areaName` field is mapped to the existing `areaName` column.
2.  **Server-Side Validation:** Form validation in server actions (`app/bmc/database/actions.ts`) enforces strict branch-area pairs. Forged requests attempting cross-branch selections are rejected.
3.  **UI State Handling:** The Cabang Lama dropdown is conditionally rendered only when the canonical branch has valid legacy options. Canonical branch changes immediately reset the legacy area state to `null`.
4.  **Orphan Area Preservation:** Existing stores with an orphaned `areaName` retain it as a valid option during edits, allowing legacy data to persist unless intentionally changed.
5.  **XLSX Import Changes Deferred:** Modification of the XLSX import functionality and retroactive data remediation were deliberately excluded from this scope.

## Verification

The implementation is verified by:
- Pure unit tests in `app/bmc/database/store-area-options.spec.ts`
- Source-level contract assertions in `app/bmc/database/store-area-contract.spec.ts`
- Clean ESLint and `tsc` typechecks
- Both tests execute sequentially with exit code `0`

## Exact Changed Files

- `app/bmc/database/_components/store-form-dialog.tsx`
- `app/bmc/database/_components/store-table.tsx`
- `app/bmc/database/actions.ts`
- `app/bmc/database/page.tsx`
- `app/bmc/database/queries.ts`
- `app/bmc/database/store-area-contract.spec.ts`
- `app/bmc/database/store-area-options.spec.ts`
- `app/bmc/database/store-area-options.ts`
