# Script Export Toko Unassigned ke Excel

## Scope

Membuat script utility (`scripts/export-unassigned-stores.ts`) untuk memfilter dan mengekspor seluruh toko aktif (`isActive: true`) di seluruh cabang kecuali HEAD OFFICE (`EXCLUDED_ADMIN_BRANCH_NAME`) yang belum memiliki penugasan BMS aktif (`bmsStoreAssignments` tidak ada atau tidak aktif) ke dalam file format Excel (`.xlsx`).

## Context and Sources

- Penjelasan beda summary card header vs tabel Coverage BMS pada `/dashboard/preventive`.
- Model Database: `Store`, `BmsStoreAssignment`.
- Konstanta `EXCLUDED_ADMIN_BRANCH_NAME` ("HEAD OFFICE").

## Changed Files

- `scripts/export-unassigned-stores.ts`: Script TypeScript untuk melakukan read-only query ke database Prisma, menghitung ringkasan per cabang, dan menyusun file Excel 2 sheet (Detail Toko Unassigned dan Ringkasan Per Cabang).
- `package.json`: Menambahkan command `"export:unassigned-stores": "tsx scripts/export-unassigned-stores.ts"`.

## Decisions

- Query hanya bersifat **Read-Only** (`findMany` dengan Prisma Client) sehingga 100% aman untuk dijalankan di environment mana pun.
- Output dibuat dalam 2 sheet (Detail Toko dan Ringkasan Per Cabang) menggunakan library `xlsx`.

## Verification

- Berhasil menjalankan `npx tsx scripts/export-unassigned-stores.ts`.
- Script menemukan **674 toko aktif unassigned** di 28 cabang operational (di luar HEAD OFFICE).
- File Excel berhasil dibuat di root workspace: `Toko_Unassigned_SPARTA_2026-10-09T04-20-05.xlsx`.

## Remaining Work and Risks

None.
