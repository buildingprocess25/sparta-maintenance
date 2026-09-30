# Deleted Report History Migration

## Scope

Menambahkan file migrasi Prisma yang dibuat oleh user untuk tabel `DeletedReport`.

## Context and Sources

- Fitur history penghapusan laporan yang telah diimplementasikan sebelumnya.
- User membuat file migrasi database dari lokal env dan mendeploynya ke database.

## Changed Files

- `prisma/migrations/20260930014538_add_deleted_report_model/migration.sql`: File SQL dari Prisma.

## Decisions

- Commit file migrasi ini secara mandiri setelah logic server & UI selesai dikerjakan agar skema db tersimpan ke git.

## Verification

- `npx prisma migrate status` menunjukkan database sudah up to date.

## Remaining Work and Risks

- None
