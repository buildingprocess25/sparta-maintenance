# Detailed SLA Table for Branches & BMS Design

## 1. Goal
Provide a detailed breakdown of the SLA and process duration per stage, grouped by branch and then by BMS, in an expandable (accordion) table. This will replace the simple `/dashboard/preventive` link from the SLA widget with a dedicated view on the "Performa Cabang" page.

## 2. Context
Currently, the "Durasi Proses per Tahapan" widget links to `/dashboard/preventive`, which doesn't actually show detailed duration breakdown. The user wants a detailed view similar to the provided Excel screenshot, showing 7 specific SLA stages, grouped by Branch Name -> BMS Name. We will place this new view in `/dashboard/branches` under a new Tab ("SLA Proses").

## 3. Architecture & Implementation

### 3.1. Backend Action (`app/dashboard/branches/actions.ts`)
We will create a new function `getAdminDetailedSLAData(period, brand)` that computes the 7 SLA metrics.
We will use a raw SQL CTE on `ActivityLog` to extract the earliest or latest timestamps for key `ActivityAction` events per report, and then compute the average differences.

The 7 duration metrics and their start/end mapping:
1. **Pengajuan Estimasi - Appv Estimasi BMC:** `SUBMITTED` → `ESTIMATION_APPROVED`
2. **Pengajuan Estimasi - Revisi Estimasi BMC:** `SUBMITTED` → `ESTIMATION_REJECTED_REVISION`
3. **Appv Estimasi BMC - Mulai Dikerjakan BMS:** `ESTIMATION_APPROVED` → `WORK_STARTED`
4. **Pekerjaan Dimulai - Realisasi Diajukan:** `WORK_STARTED` → `COMPLETION_SUBMITTED`
5. **Realisasi Diajukan - Revisi Pekerjaan Oleh BMC:** `COMPLETION_SUBMITTED` → `WORK_REJECTED_REVISION`
6. **Realisasi Diajukan - Appv BMC:** `COMPLETION_SUBMITTED` → `WORK_APPROVED`
7. **Appv BMC - Appv MGR:** `WORK_APPROVED` → `FINAL_APPROVED_BNM`

The SQL will group these averages by `r."branchName"` and `bms."name"` (by joining `User` on `r."bmsNIK"`).

### 3.2. Frontend: Branches Page Update (`app/dashboard/branches/page.tsx`)
We will introduce a `Tabs` component to separate the existing summary and the new SLA view:
- **Tab 1 ("Ringkasan"):** Displays the existing `AdminBranchesTable`.
- **Tab 2 ("SLA Proses"):** Displays the new `AdminSLATable`.

### 3.3. Frontend: SLA Table Component (`app/dashboard/branches/_components/admin-sla-table.tsx`)
This component will render the grouped data.
- **Outer Rows:** Branch Name. These rows will function as accordions (collapsible).
- **Inner Rows (Expanded):** List of BMS under that branch.
- **Columns:** The 7 computed duration averages formatted as HH:mm:ss (or `Xj Ym`).
- We will include an average row at the bottom for overall Branch averages if needed, or just display the branch average in the outer row itself.

### 3.4. Update Widget Link (`app/dashboard/_components/admin/process-duration-widget.tsx`)
Update the "Lihat Analisis Lengkap" link to point to `/dashboard/branches?tab=sla`.

## 4. Edge Cases Handled
- Reports that haven't reached certain stages will have `NULL` for those durations and won't negatively skew the averages (handled natively by SQL `AVG()`).
- Responsive design for the wide 7-column table by wrapping it in an `overflow-x-auto` container.
