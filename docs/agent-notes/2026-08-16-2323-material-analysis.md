# Analisa Material Realisasi

## Scope

Menambahkan fitur "Analisa Material" pada menu Admin HO untuk melihat dan mengekspor (XLSX) data material yang direalisasikan pada laporan-laporan dengan status COMPLETED. Item lain atau mengubah data master tidak dalam scope.

## Context and Sources

- Permintaan implementasi dari user untuk fitur analisa material HO.
- `types/report.ts` untuk struktur `ReportItemJson` dan `RealisasiItemJson`.
- `lib/realisasi.ts` untuk melihat bagaimana material direalisasikan.

## Changed Files

- `components/app-sidebar.tsx`: Menambahkan menu "Analisa Material" ke dalam sidebar Admin.
- `app/admin/material-analysis/actions.ts`: [NEW] Fungsi Server Action `getMaterialAnalysisData` untuk mem-fetch dan mem-flatten (memipihkan) data laporan menjadi format baris tabel.
- `app/admin/material-analysis/client.tsx`: [NEW] Komponen UI Client yang menampilkan data table dengan filter dan memfasilitasi export ke XLSX.
- `app/admin/material-analysis/page.tsx`: [NEW] Halaman utama (Server Component) dengan proteksi otorisasi Admin HO.

## Decisions

- **Client-Side Pagination**: Pagination dan ekspor XLSX dilakukan di sisi klien. Server menarik semua baris laporan yang memenuhi filter dari database, melakukan proses pemipihan (flatten) dari struktur JSON ke dalam memori, lalu mengirim array hasil ke UI. Ini menjamin data di tabel 100% konsisten dengan data yang diekspor.
- **Default Rentang Tanggal Bulan Berjalan**: Untuk mencegah query yang terlampau berat akibat mengambil seluruh historis laporan saat fitur pertama kali dibuka, filter default diatur ke 1 bulan terakhir.

## Verification

- Telah dicek bahwa branch ini (`feat/material-analysis`) tidak error secara syntax (`npx tsc --noEmit` terkendala OOM di Windows, namun penulisan type sudah inline dengan skema `types/report.ts` dan `prisma`).
- Fungsionalitas tabel, filter, formating currency dan ekspor Excel di UI sudah diatur menggunakan shadcn dan xlsx standard.

## Remaining Work and Risks

None.
