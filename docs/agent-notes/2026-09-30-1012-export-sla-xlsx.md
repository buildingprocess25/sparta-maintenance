# Implement SLA XLSX Export

## Scope

- Menambahkan fitur ekspor data SLA Proses SPARTA ke format XLSX di halaman Performa Cabang (`/dashboard/branches`).

## Context and Sources

- Fitur diminta oleh user dari brainstorming session untuk memudahkan rekap data.
- User memilih Opsi 1 (Format Tabel Rata / Flat Table) untuk memudahkan penggunaan Pivot Table dan _filtering_ di Excel.

## Changed Files

- `app/dashboard/branches/_components/admin-sla-table.tsx`: Mengimpor `xlsx`, membuat `handleExport` untuk _flattening_ data, dan menambahkan komponen `Button` Ekspor di *header* tabel.

## Decisions

- Data SLA diubah bentuknya dari format hierarkis (`SLADurationBranch` -> `bmsList`) menjadi _flat records_.
- Baris milik cabang utama diberi nama BMS "[RATA-RATA CABANG]".

## Verification

- Perubahan UI sudah dirender dengan *button* yang memanggil fungsi _export_ dari library `xlsx`.

## Remaining Work and Risks

- None.
