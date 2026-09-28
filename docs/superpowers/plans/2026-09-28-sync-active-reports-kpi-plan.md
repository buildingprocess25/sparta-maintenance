# Sync Active Reports KPI Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Menyamakan jumlah "Laporan aktif" di widget Distribusi Status & SLA (dari 116 menjadi 126) agar sinkron dengan KPI Card atas, dengan cara menampilkan juga status yang tidak memiliki SLA.

**Architecture:** Mengubah logika filter di `status-distribution.tsx` dari yang awalnya mengecualikan status tanpa SLA, menjadi menampilkan semua laporan aktif dengan menggunakan fungsi utilitas `isActiveReportStatus`. Menambahkan penyesuaian UI untuk badge "Kondisi SLA" jika `slaDays` bernilai `null`.

**Tech Stack:** Next.js, React, Tailwind CSS

## Global Constraints

Tidak ada perubahan skema database. Teks badge untuk status tanpa SLA harus "Tanpa batas waktu" dengan warna slate.

---

### Task 1: Update Status Distribution Component

**Files:**
- Modify: `app/dashboard/_components/admin/status-distribution.tsx`

**Interfaces:**
- Consumes: `isActiveReportStatus` from `@/lib/report-status`
- Produces: UI component showing all active statuses.

- [ ] **Step 1: Import isActiveReportStatus**

In `app/dashboard/_components/admin/status-distribution.tsx`, import the utility function:

```tsx
import { getStatusSegmentClass } from "./sla-status-guide";
import { isActiveReportStatus } from "@/lib/report-status";
import type { AdminStatusDatum } from "../../../queries";
```

- [ ] **Step 2: Update the filter logic**

Replace the `visibleStatus` logic so it includes all active statuses, not just those with SLA:

```tsx
    const visibleStatus = status.filter((item) => isActiveReportStatus(item.status));
```

- [ ] **Step 3: Update the Condition Badge in the Table**

Update the `Badge` inside the `TableBody` loop (around line 133) to handle `item.slaDays === null`:

```tsx
                                    <TableCell className="text-right">
                                        <Badge
                                            variant="outline"
                                            className={
                                                item.overdueCount > 0
                                                    ? "border-red-200 bg-red-50 text-red-700"
                                                    : item.slaDays === null
                                                    ? "border-slate-200 bg-slate-50 text-slate-700"
                                                    : "border-emerald-200 bg-emerald-50 text-emerald-700"
                                            }
                                        >
                                            {item.overdueCount > 0
                                                ? `${formatNumber(item.overdueCount)} lewat batas`
                                                : item.slaDays === null
                                                ? "Tanpa batas waktu"
                                                : `Batas ${item.slaDays} hari`}
                                        </Badge>
                                    </TableCell>
```

- [ ] **Step 4: Commit changes**

```bash
git add app/dashboard/_components/admin/status-distribution.tsx
git commit -m "feat: include non-SLA active reports in status distribution widget"
```
