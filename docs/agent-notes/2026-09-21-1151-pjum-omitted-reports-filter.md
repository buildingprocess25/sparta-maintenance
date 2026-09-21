# Filter Laporan Gantung Berdasarkan Kebutuhan PJUM

## Scope

Memperbaiki query pengambilan data "Laporan Gantung" (Tidak masuk PJUM) di halaman detail PJUM agar hanya menampilkan laporan yang benar-benar membutuhkan PJUM, mencegah munculnya laporan vendor/berbiaya Rp 0 sebagai false alarm. Tidak mencakup perbaikan sinkronisasi pengecekan BMS di engine realisasi.

## Context and Sources

- Diskusi mengenai keluhan laporan yang tidak perlu PJUM tapi muncul di "Tidak masuk PJUM".
- File `lib/balance.ts` dan fungsi `getOmittedHangingReportsForPjum`.

## Changed Files

- `lib/balance.ts`: Menambahkan pengambilan kolom `items` pada fungsi `getOmittedHangingReportsForPjum` dan memfilternya dengan fungsi `requiresPjum`.

## Decisions

- Laporan di UI PJUM yang mendeteksi laporan "gantung" (omitted) harus difilter dengan fungsi `requiresPjum` sebelum direturn, sehingga UI konsisten dengan engine persetujuan PJUM (`classifyPjumApprovalReports`).
- Laporan yang secara eksplisit sudah pernah digantung (memiliki `pjumHangingAt`) tetap akan ditampilkan.

## Verification

- `tsc --noEmit` sudah dijadwalkan, tapi proses dibatasi oleh memory (OOM). Perubahan kodenya dipastikan aman secara tipe karena menggunakan helper function yang sudah tersedia.

## Remaining Work and Risks

None
