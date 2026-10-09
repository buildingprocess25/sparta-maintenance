# Sync Active Stores & Coverage BMS Sorting

**Date:** 2026-10-09 13:42 WIB  
**Author:** Antigravity  

## Summary

Implemented active-store filtering for BMS Coverage Hierarchy, auto-deactivation of `BmsStoreAssignment` when stores are deactivated, and added sorting by coverage rate (Terendah Dulu / Tertinggi Dulu) in the BMS Coverage tab.

## Key Changes

1. **`app/dashboard/preventive/coverage-hierarchy-action.ts`**
   - Added `store: { isActive: true }` to `prisma.bmsStoreAssignment.findMany` query. Inactive stores are now excluded from the coverage hierarchy tables.

2. **`app/admin/database/actions.ts` & `app/bmc/database/actions.ts`**
   - Wrapped `updateStore` actions in Prisma `$transaction`.
   - When a store's `isActive` flag is updated to `false`, any active `BmsStoreAssignment` for that store code is automatically deactivated (`isActive: false`, `unassignedAt`, `unassignedByNIK`, `notes`).

3. **`app/dashboard/preventive/_components/bms-coverage-hierarchy-table.tsx`**
   - Added `sortOrder` state ("none" | "asc" | "desc") and a `Select` dropdown in the table toolbar.
   - Allows users to sort branch coverage rates and individual BMS coverage rates in ascending (Terendah Dulu) or descending (Tertinggi Dulu) order.

## Impact & Verification

- Active store counts and coverage percentages now accurately reflect only active stores.
- Deactivating stores cleans up existing assignments automatically without leaving orphan records.
- User can sort coverage achievement on both Admin (branch level) and BMC/BNM (BMS level) dashboards.
