| Task | Status | Notes |
|---|---|---|
| Task 1: Prisma Schema & Migration for BmsStoreAssignment | Done | Model added to schema.prisma, tests passing, migration guide ready for prisma migrate dev |
| Task 2: Data Import Script from Master Excel | Done | Script & unit tests passing, npm run import:bms-assignments configured (script not executed per instructions) |
| Task 3: Form Protection & Backend Guard for BMS Report Creation | Done | getAssignedStoresForBms implemented, server guard added to submit.ts, tests passing |
| Task 4: Store Management Integration in Admin/BMC Dashboard | Done | bmsNIK filter, assignStoreToBms, BMS Coverage column & dropdown added, tests passing |
| Task 5: Quarterly Preventive KPI Engine & BMS Mobile Coverage Alignment | Done | getBmsPreventiveCoverage updated to query BmsStoreAssignment, tests passing |
| Task 6: Multi-Role KPI Monitoring UI in /dashboard/bms-performance & Dashboard Widgets | Done | Performance page, widgets, dialog rincian toko, sidebar access untuk ADMIN |
| Task 7: Full System Verification, Typecheck, and Final Task Note | Done | Unit tests passing (15/15), clean production build |
| Task 8: Dropdown Filter BMS (Ascending) di Toolbar Manajemen Toko | Done | Dropdown BMS select, query param ?bms=, getBmsOptionsByBranch ASC |
| Task 9: Perbaikan Tampilan Modal Popup Detail Toko (BmsCoverageDetailDialog) | Done | Lebarkan dialog (max-w-5xl), hilangkan double scrollbar |
| Task 10: Verifikasi Sistem, Type Check, dan Dokumentasi Task Note | Done | Unit tests (20/20 pass), npm run build:memory clean (exit code 0), task note created |
