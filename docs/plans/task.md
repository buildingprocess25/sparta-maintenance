| Task | Status | Notes |
| --- | --- | --- |
| Task 1: Update Prisma Schema | Complete | Added `revisionHistory` to `PjumExport` |
| Task 2: Fix Label Status `REJECTED` Menjadi "Direvisi" | Complete | Updated `lib/pjum-status.ts` |
| Task 3: Fitur Filter & Summary Card "Direvisi" di Dashboard | Complete | Updated `admin-pjum-table.tsx` and `page.tsx` |
| Task 4: Action Backend untuk "Minta Revisi" (Manager) | Complete | Updated `approval-actions.ts` |
| Task 5: UI "Minta Revisi" dan Info Minggu/Bulan di Detail PJUM | Complete | Added `pjum-revision-button.tsx` and modified detail `page.tsx` |
| Task 6: Action Backend "Search Candidates" (Mode Edit) | Complete | Added `editingPjumId` bypass in `actions.ts` |
| Task 7: Action Backend "Submit Ulang" | Complete | Added `updateDashboardPjum` in `actions.ts` |
| Task 8: Integrasi "Submit Ulang" ke CreatePjumDialog | Complete | Added edit mode to `create-pjum-dialog.tsx` and wired in detail `page.tsx` |
