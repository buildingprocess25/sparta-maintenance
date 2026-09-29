# Preventive KPI and Table Data Synchronization Design

## 1. Goal
Resolve the data inconsistency between the "Checklist Preventif" KPI widget (which correctly shows metrics based on active stores) and the detailed branch table (which currently includes both active and inactive stores).

## 2. Context
Currently, `getAdminPreventiveKpiData` (used for the widget) filters out inactive stores by applying `isActive: true` in the Prisma query. Meanwhile, `getAdminPreventive` (used for the detailed table) does not apply this filter. This causes the target store count, completed store count, and missing checklists to mismatch.

## 3. Architecture & Implementation

### 3.1. Data Fetching Update
We will update the `Store` query within `getAdminPreventive` (in `app/dashboard/preventive/actions.ts`) to include `isActive: true`. 

By making this change, the entire Admin Preventive result—including the store rows, branch summaries, target metrics, and history items retrieved by this action—will naturally exclude inactive stores.

### 3.2. Scope
This change affects:
- The "Target toko" metric
- The "Sudah checklist" metric
- The "Belum checklist" metric 
- The list of stores under each branch
- The progress bar percentages
This ensures a 1:1 match with the KPI widget.

## 4. Edge Cases Handled
- **Inactive Stores with History:** We have explicitly decided to completely exclude inactive stores, even if they have historical reports. If historical reports of inactive stores need to be audited in the future, a separate archival/audit view would be required. 
