# Export XLSX Preventive Tab Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an "Ekspor XLSX" button to the Preventive Dashboard Cabang tab that exports the summarized branch completion data with accurate percentage formatting for Excel.

**Architecture:** We will add a new `handleExportXlsx` function in `AdminPreventiveTable`. We will also add the missing `xlsx` dependency import. The function will construct an array of objects mapping the `sortedBranchSummaries` state to the 6 requested columns. The `Coverage` column will use `z: '0.00"%"'` styling through `xlsx` or simply be passed as a number out of 1 (e.g. `completionRate / 100`) and formatted by XLSX utility, or be a string if needed. However, since XLSX `json_to_sheet` doesn't natively do cell-by-cell `z` formatting easily without looping over cell objects, the simplest approach for a pure number + percentage in Excel via standard `xlsx` is to pass it as `(branch.completionRate / 100)` and manually assign `z: "0.00%"` to the column cells, OR we can export it as a Number formatted to 2 decimals if user strictly wants a raw number. Wait, we can just map it as `Number(branch.completionRate.toFixed(2)) / 100` and apply `z` style, or just string `"21.09%"`. 
Wait, the easiest robust way in sheetjs for simple export is `branch.completionRate / 100`, then iterating the sheet cells and setting `s.z = "0.00%"`.

**Tech Stack:** React, Lucide React, XLSX (SheetJS)

## Global Constraints

- Must match exact dashboard UI columns: Cabang, Target, Selesai, Belum, Coverage, Terakhir.
- Percentage must support 2 decimal places.
- Must not use `cat` or `grep` via bash.

---

### Task 1: Implement Export Functionality in AdminPreventiveTable

**Files:**
- Modify: `app/dashboard/preventive/_components/admin-preventive-table.tsx`

**Interfaces:**
- Consumes: `sortedBranchSummaries` state and `formatDate` helper.
- Produces: A downloaded `.xlsx` file named `Preventive_Cabang_SPARTA.xlsx`.

- [ ] **Step 1: Add the XLSX import**
  Add `import * as XLSX from "xlsx";` and `import { Download } from "lucide-react";` (if not already present).

- [ ] **Step 2: Add `handleExportXlsx` function inside `AdminPreventiveTable`**
  ```typescript
  const handleExportXlsx = () => {
      const rows = sortedBranchSummaries.map(branch => ({
          "Cabang": branch.branchName,
          "Target": branch.totalStores,
          "Selesai": branch.completed,
          "Belum": branch.pending,
          "Coverage": branch.completionRate / 100, // Decimal format for excel percentage
          "Terakhir": formatDate(branch.lastDoneAt)
      }));

      const worksheet = XLSX.utils.json_to_sheet(rows);
      
      // Apply percentage formatting to the 'Coverage' column (Column E)
      const range = XLSX.utils.decode_range(worksheet['!ref'] || "A1:F1");
      for (let R = range.s.r + 1; R <= range.e.r; ++R) {
          const cellAddress = { c: 4, r: R }; // Column E is index 4
          const cellRef = XLSX.utils.encode_cell(cellAddress);
          if (worksheet[cellRef]) {
              worksheet[cellRef].z = '0.00%';
          }
      }

      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Cabang");
      XLSX.writeFile(workbook, "Preventive_Cabang_SPARTA.xlsx");
  };
  ```

- [ ] **Step 3: Add the Export Button to the UI**
  Locate the header of `<TabsContent value="branches">`. Add the export button next to the sorting control:
  ```tsx
  <div className="flex items-center gap-2">
      <Button 
          variant="outline" 
          size="sm" 
          onClick={handleExportXlsx}
          disabled={sortedBranchSummaries.length === 0}
          className="h-8"
      >
          <Download className="mr-2 h-3.5 w-3.5" />
          Ekspor XLSX
      </Button>
      <button
          onClick={() => setBranchSort(prev => prev === "asc" ? "desc" : "asc")}
          className="flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-xs font-medium hover:bg-muted transition-colors h-8"
      >
          <ArrowDownUp className="h-3.5 w-3.5" />
          {branchSort === "asc" ? "Terendah dulu" : "Tertinggi dulu"}
      </button>
  </div>
  ```

- [ ] **Step 4: Verify and commit**
  Ensure the app compiles properly without missing imports and commit the changes.
