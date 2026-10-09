# Filter Non-HO Users in Admin Dashboard User Stats

**Date:** 2026-10-09 14:18 WIB  
**Author:** Antigravity  

## Summary

Filtered out `HEAD OFFICE` users and users with empty branch assignments from the bottom user statistics cards (`Total Tim Cabang`, `Manager Cabang`, `Total BMC Cabang`, `Total BMS Cabang`) on the Admin Dashboard (`/dashboard`).

## Key Changes

1. **`app/dashboard/queries.ts`**
   - Updated `prisma.user.count()` for `BMS`, `BMC`, and `BNM_MANAGER` roles in `getAdminCommandCenterData()`.
   - Added `branchNames: { isEmpty: false }` and `NOT: { branchNames: { has: EXCLUDED_ADMIN_BRANCH_NAME } }`.

## Impact & Verification

- Card metrics now count active operational branch users only.
- Excludes HEAD OFFICE admins/staff from branch team count metrics.
