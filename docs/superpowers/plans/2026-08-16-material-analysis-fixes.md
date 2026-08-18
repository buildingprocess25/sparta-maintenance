# Material Analysis Fixes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix the Material Analysis bugs reported by the user (Brand filter, HEAD OFFICE exclusion, Export button color, Item Rusak display, and Branch filter consistency).

**Architecture:** We will reuse existing utility functions (`getReportBrandWhere`, `fetchAllBranchNames`, `EXCLUDED_ADMIN_BRANCH_NAME`, `getChecklistItemMeta`) to align the Material Analysis feature with the rest of the application's reporting logic.

**Tech Stack:** Next.js, Prisma, Tailwind CSS, shadcn/ui.

## Global Constraints

- No structural database changes.
- Ensure the UI button uses the primary theme color.

---

### Task 1: Fix Material Analysis Server Actions

**Files:**
- Modify: `app/admin/material-analysis/actions.ts`

**Interfaces:**
- Consumes: `fetchAllBranchNames` (from `app/admin/export/queries`), `EXCLUDED_ADMIN_BRANCH_NAME` (from `lib/admin-branch-scope`), `getReportBrandWhere`, `StoreBrandFilter` (from `lib/store-brand-filter`), and `getChecklistItemMeta` (from `lib/checklist-data`).
- Produces: Corrected `MaterialAnalysisRow[]` where `brand` filtering works, `HEAD OFFICE` is excluded, and `itemName` falls back to checklist metadata if empty.

- [ ] **Step 1: Write minimal implementation**

```typescript
// Replace the entire actions.ts content with the corrected version

"use server";

import prisma from "@/lib/prisma";
import { requireAuth } from "@/lib/authorization";
import type { ReportItemJson } from "@/types/report";
import { fetchAllBranchNames } from "@/app/admin/export/queries";
import { EXCLUDED_ADMIN_BRANCH_NAME } from "@/lib/admin-branch-scope";
import { getReportBrandWhere, type StoreBrandFilter } from "@/lib/store-brand-filter";
import { getChecklistItemMeta } from "@/lib/checklist-data";

export type MaterialAnalysisRow = {
    id: string;
    itemName: string;
    materialName: string;
    realisasiNominal: number;
    storeCode: string;
    storeName: string;
    branchName: string;
    brand: string;
    reportNumber: string;
    bmsName: string;
    finishedAt: string; // ISO string for client
};

export type MaterialAnalysisFilters = {
    fromDate: string;
    toDate: string;
    branchName?: string;
    brand?: string;
};

export async function getAvailableBranches(): Promise<string[]> {
    const user = await requireAuth();
    if (user.role !== "ADMIN") {
        throw new Error("Unauthorized");
    }

    // Use the exact same query as the reports page
    return fetchAllBranchNames();
}

export async function getMaterialAnalysisData(
    filters: MaterialAnalysisFilters
): Promise<MaterialAnalysisRow[]> {
    const user = await requireAuth();
    if (user.role !== "ADMIN") {
        throw new Error("Unauthorized");
    }

    const { fromDate, toDate, branchName, brand } = filters;

    const where: any = {
        status: "COMPLETED",
        finishedAt: {
            gte: new Date(fromDate),
            lte: new Date(toDate),
        },
        branchName: { not: EXCLUDED_ADMIN_BRANCH_NAME },
    };

    if (branchName && branchName !== "Semua Cabang") {
        where.branchName = branchName;
    }

    if (brand && brand !== "Semua Brand") {
        const brandWhere = getReportBrandWhere(brand as StoreBrandFilter);
        if (brandWhere) {
            where.AND = [brandWhere];
        }
    }

    // Prisma query for completed reports in date range
    const reports = await prisma.report.findMany({
        where,
        include: {
            createdBy: {
                select: { name: true },
            },
            store: {
                select: { brand: true },
            }
        },
        orderBy: {
            finishedAt: "desc",
        },
    });

    const flattenedData: MaterialAnalysisRow[] = [];

    for (const report of reports) {
        const items = report.items as unknown as ReportItemJson[];
        
        if (!Array.isArray(items)) continue;

        items.forEach((item, itemIndex) => {
            if (item.realisasiItems && item.realisasiItems.length > 0) {
                item.realisasiItems.forEach((realisasi, realisasiIndex) => {
                    const nominal = realisasi.totalPrice ?? (realisasi.quantity * realisasi.price);
                    
                    const itemMeta = getChecklistItemMeta(item.itemId);
                    const itemName = item.itemName?.trim() || itemMeta?.itemName || item.itemId || "-";

                    flattenedData.push({
                        id: `${report.reportNumber}-${item.itemId || itemIndex}-${realisasiIndex}`,
                        itemName,
                        materialName: realisasi.materialName?.trim() || "-",
                        realisasiNominal: nominal,
                        storeCode: report.storeCode || "-",
                        storeName: report.storeName || "-",
                        branchName: report.branchName || "-",
                        brand: report.store?.brand || "-",
                        reportNumber: report.reportNumber,
                        bmsName: report.createdBy.name || "-",
                        finishedAt: report.finishedAt?.toISOString() || "",
                    });
                });
            }
        });
    }

    return flattenedData;
}
```

- [ ] **Step 2: Commit**

```bash
git add app/admin/material-analysis/actions.ts
git commit -m "fix: update material analysis filters and item name parsing"
```

---

### Task 2: Fix Export Button Color in Client Component

**Files:**
- Modify: `app/admin/material-analysis/client.tsx`

**Interfaces:**
- Consumes: `Button` component from shadcn/ui.
- Produces: A default styled primary button for "Ekspor XLSX".

- [ ] **Step 1: Write minimal implementation**

```tsx
// In app/admin/material-analysis/client.tsx
// Find the button rendering block (approx lines 145-155)

// Replace:
                <Button 
                    onClick={handleExport} 
                    disabled={isPending || filteredData.length === 0}
                    variant="outline"
                    className="w-full md:w-auto bg-green-600 hover:bg-green-700 text-white border-transparent"
                >
                    <IconDownload className="size-4 mr-2" />
                    Ekspor XLSX
                </Button>

// With:
                <Button 
                    onClick={handleExport} 
                    disabled={isPending || filteredData.length === 0}
                    className="w-full md:w-auto"
                >
                    <IconDownload className="size-4 mr-2" />
                    Ekspor XLSX
                </Button>
```

- [ ] **Step 2: Commit**

```bash
git add app/admin/material-analysis/client.tsx
git commit -m "fix: restore default primary color for export button"
```
