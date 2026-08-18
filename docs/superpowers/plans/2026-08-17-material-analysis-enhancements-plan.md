# Material Analysis UI/UX Enhancements Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Enhance the Material Analysis UI by adding an independent Export Dialog, making report numbers clickable links, and reducing table size to match the Laporan Maintenance tab.

**Tech Stack:** Next.js, React, Tailwind CSS, shadcn/ui.

---

### Task 1: Create Export Dialog Component

**Files:**
- Create: `app/admin/material-analysis/export-dialog.tsx`

**Implementation:**
- Create an `ExportMaterialAnalysisDialog` component.
- The dialog should contain standard UI inputs for: `Dari Tanggal`, `Sampai Tanggal`, `Cabang`, and `Brand`.
- State initializes to default values ("Semua Cabang", "Semua Brand", 1st of current month, and today) just like `client.tsx` initially does.
- On submit, call `getMaterialAnalysisData(filters)`.
- Use the `xlsx` library to generate and download the `.xlsx` file.

- [ ] **Step 1: Write `export-dialog.tsx`**
- [ ] **Step 2: Commit**
```bash
git add app/admin/material-analysis/export-dialog.tsx
git commit -m "feat: add export material analysis dialog component"
```

---

### Task 2: Update Material Analysis Client Component

**Files:**
- Modify: `app/admin/material-analysis/client.tsx`

**Implementation:**
- Replace the current `<Button onClick={handleExport}>` with `<ExportMaterialAnalysisDialog branches={branches} />`.
- Import `Link` from `next/link` and `ArrowUpRight` from `lucide-react`.
- Convert the Report Number column in the table to a link matching `admin-reports-table.tsx`:
  `<Link prefetch={false} href={\`/dashboard/reports/\${row.reportNumber}\`} className="inline-flex items-center gap-1 font-mono font-medium text-primary underline-offset-4 hover:underline">{row.reportNumber}<ArrowUpRight className="h-3 w-3" /></Link>`
- Apply styling to the Table to match `admin-reports-table.tsx`:
  - `Table` class: `className="text-[11px] [&_td]:py-2 [&_th]:h-8 [&_th]:py-1.5"`
  - `TableHeader` class: `className="bg-slate-50/80"`
  - Apply `className="align-middle"` and truncate classes to appropriate `TableCell`s.

- [ ] **Step 1: Update `client.tsx` with dialog and table styles**
- [ ] **Step 2: Commit**
```bash
git add app/admin/material-analysis/client.tsx
git commit -m "feat: apply standardized styling and report links to material analysis table"
```
