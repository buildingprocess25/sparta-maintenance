# BMS Filter and Dialog Refinements (Scenario 3 & 4 Manual Testing)

## Scope

Menyempurnakan feedback dari hasil manual testing user:
1. **Skenario 3 (Manajemen Toko):** Menambahkan filter dropdown BMS terurut alfabetis ascending (ASC) berdasarkan nama pada toolbar Data Toko (`/dashboard/stores`), yang otomatis tersinkronisasi saat cabang dipilih atau diubah.
2. **Skenario 4 (Performa BMS):** Memperbaiki tampilan modal popup detail coverage toko (`BmsCoverageDetailDialog` di `/dashboard/bms-performance`): memperlebar dialog ke `max-w-4xl lg:max-w-5xl w-[95vw]` serta mengeliminasi double scrollbar vertikal yang bertumpuk akibat nested scrollable containers.

Secara sengaja tidak mengubah integritas skema data maupun NIK BMS yang sudah ada di database.

## Context and Sources

- User feedback manual testing untuk Skenario 3 (No. 4: tidak ada dropdown filter BMS) dan Skenario 4 (No. 4: popup sempit dan ada dua scrollbar).
- Plan: `docs/plans/2026-10-07-bms-filter-dialog-refinements-plan.md`
- Task tracker: `docs/plans/task.md`
- Komponen Table UI: `components/ui/table.tsx`

## Changed Files

- `app/dashboard/stores/page.tsx`: Menerima query param `bms?: string`, memanggil `getBmsOptionsByBranch(branch)` terurut ASC, dan meneruskannya ke komponen tabel.
- `app/dashboard/stores/_components/admin-stores-table.tsx`: Menambahkan dropdown Select BMS pada filter toolbar, state `bmsNIK`, sinkronisasi opsi BMS saat filter cabang berubah, dan update parameter URL saat BMS dipilih.
- `app/dashboard/bms-performance/_components/bms-coverage-detail-dialog.tsx`: Melebarkan `DialogContent` ke `max-w-4xl lg:max-w-5xl w-[95vw]`, menghapus wrapper div dengan `overflow-y-auto`, dan memusatkan scrolling pada container `<Table>` menggunakan `containerClassName="h-full max-h-[55vh] overflow-y-auto"`, meluruskan header tabel (`Kode Toko`, `No. Laporan`).
- `tests/stores/store-bms-filter.test.ts`: Unit test untuk filter BMS di halaman Data Toko (query param, rendering Select ASC, dan query database).
- `tests/performance/bms-dialog-ui.test.ts`: Unit test untuk lebar dialog dan pencegahan nested overflow-y-auto.

## Decisions

- **Single Scrollbar Architecture:** Komponen `<Table>` shadcn sudah membungkus `<table>` dalam container dengan `overflow-auto`. Wrapper div tambahan di luar `<Table>` dengan `overflow-y-auto` diubah menjadi `overflow-hidden flex flex-col min-h-0`, dan styling scroll diteruskan langsung ke `containerClassName` milik `<Table>`. Hal ini mengeliminasi 100% masalah double scrollbar.
- **Dynamic BMS Options per Branch:** Saat filter cabang diubah di Data Toko, opsi BMS otomatis di-fetch ulang dari server action `getBmsOptionsByBranch`, dan jika BMS yang sedang aktif tidak ada di cabang baru, filter BMS di-reset ke "Semua BMS".
- **Alphabetical Sorting:** Opsi BMS selalu terurut secara `orderBy: { name: "asc" }` untuk memudahkan pencarian visual oleh Admin/BMC.

## Verification

- `npx tsx --test tests/**/*.test.ts`: 20/20 test suites lulus (100% pass).
- `npm run build:memory`: Verifikasi typecheck, compiler, SSR, dan Turbopack Next.js 16 build berjalan clean tanpa error.

## Remaining Work and Risks

None. Seluruh permintaan perbaikan manual testing (Skenario 3 dan Skenario 4) telah terselesaikan dan diverifikasi.
