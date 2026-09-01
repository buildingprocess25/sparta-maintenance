# Fix: Admin User Branch Transfer — Select + Active Report Warning

## Scope

- Ganti field Branch di AdminUserFormDialog dari `<Input+datalist>` ke `<Select>` shadcn.
- Tambahkan server action `adminGetUserActiveReports` untuk cek laporan berjalan.
- Tambahkan warning banner di form edit saat user target punya laporan aktif.

## Context and Sources

- `app/admin/database/_components/store-form-dialog.tsx`: referensi pola Select yang diikuti.
- Histori laporan aman saat ganti branch karena `branchName` di-snapshot per Report row, bukan FK.

## Changed Files

- `app/admin/database/_components/user-form-dialog.tsx`: fix Select + tambah warning UI.
- `app/admin/database/actions.ts`: tambah `adminGetUserActiveReports`.

## Decisions

- Warning bersifat informatif (soft warning), tidak memblokir simpan.
- Hanya laporan non-terminal yang dihitung: PENDING_ESTIMATION, ESTIMATION_APPROVED,
  ESTIMATION_REJECTED_REVISION, IN_PROGRESS, PENDING_REVIEW, APPROVED_BMC, REVIEW_REJECTED_REVISION.

## Verification

- TypeScript compile clean
- Manual test: edit user BMS dengan laporan aktif → warning muncul, simpan tetap berhasil.
