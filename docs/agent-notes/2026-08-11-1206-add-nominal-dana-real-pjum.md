# Penambahan Kolom Total Dana PJUM pada Rekap XLSX

## Scope

Menambahkan kolom "Total Dana PJUM (Rp)" pada fitur Ekspor XLSX Dokumen PJUM yang berisi total akumulasi `totalReal` dari tabel Report untuk setiap laporan yang tercantum pada PJUM. Di luar scope ini adalah perubahan skema database atau antarmuka UI.

## Context and Sources

- Permintaan dari pengguna untuk minor adjustment fitur Export XLSX di dashboard admin (PJUM).
- File: `app/admin/export/queries.ts`, `app/api/admin/export/route.ts`.

## Changed Files

- `app/admin/export/queries.ts`: Menambahkan atribut `totalReal` ke dalam tipe `PjumExportRow` dan memodifikasi logic pada query fetch export data untuk mendapatkan nilai `totalReal` dari tabel `Report` dan menjumlahkannya.
- `app/api/admin/export/route.ts`: Menambahkan penulisan kolom baru "Total Dana PJUM (Rp)" pada file XLSX yang digenerate oleh SheetJS.

## Decisions

- Tidak merubah skema DB (`PjumExport`) karena akan memicu migration, serta data `reportNumbers` sudah cukup untuk me-lookup total real dari laporan secara dinamis saat proses export.
- Menggunakan pendekatan satu query tambahan ke tabel `Report` dengan IN clause mengumpulkan semua unique reportNumber yang ada pada batch hasil export yang bersangkutan, kemudian membuat Map untuk mengoptimasi lookup saat map function dari PjumExport.

## Verification

- Perubahan dilakukan dan sedang menjalani proses kompilasi typescript via CLI.

## Remaining Work and Risks

None
