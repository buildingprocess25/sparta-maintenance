# Merge main into feat/bms-balance — Conflict Resolution

## Scope

Resolve 3 merge conflicts saat merge `main` ke `feat/bms-balance`.
Tidak ada perubahan fungsional baru — hanya integrasi dua jalur fitur yang berkembang paralel.

## Context and Sources

- Branch `feat/bms-balance`: implementasi BMS Balance Period, hanging reports, atomic PJUM approval transition.
- Branch `main`: implementasi PJUM QR Validator (verificationToken/verificationCode), store type breakdown, BMC store restriction.
- Conflict terjadi di 3 file karena kedua fitur menyentuh `approvePjumExport` dan dokumentasi yang sama.

## Changed Files

- `.superpowers/sdd/task-2-report.md`: dihapus (sudah dihapus di main via .gitignore, file scratch tidak relevan).
- `docs/project/06-database.md`: gabungkan paragraf `BmsBalancePeriod` (HEAD) dan klasifikasi toko (main) — keduanya tidak saling bertentangan, hanya jatuh di titik yang sama.
- `app/reports/pjum/approval-actions.ts`: pertahankan semua import dari kedua branch; ubah conflict block 2 agar `approvePjumAndTransitionBmsBalance` menerima `verificationToken` dan `verificationCode` sebagai argumen baru.
- `lib/balance.ts`: extend parameter type `pjumExport` di `approvePjumAndTransitionBmsBalance` untuk menerima `verificationToken: string` dan `verificationCode: string`, dan sertakan keduanya di `tx.pjumExport.updateMany()` agar QR identity tersimpan dalam transaksi atomik yang sama.

## Decisions

- **Satu transaksi atomik**: `verificationToken` dan `verificationCode` kini disimpan di dalam transaksi `prisma.$transaction` yang sama dengan approval PJUM dan transisi balance period. Ini lebih aman daripada dua operasi terpisah.
- **Tidak menghapus logika QR dari `approval-actions.ts`**: kode generate QR tetap di action layer; `lib/balance.ts` hanya menerima hasil akhirnya sebagai parameter.

## Verification

- `git diff --check` → tidak ada conflict marker.
- `git status` → semua file yang berkonflik sudah resolved (tidak ada status `UU`).
- Build dijalankan terpisah dengan `NODE_OPTIONS=--max-old-space-size=8192` dan telah sukses di sesi sebelumnya.

## Remaining Work and Risks

- Build ulang (`npm run build:memory`) perlu dijalankan setelah merge commit untuk memvalidasi TypeScript di kedua fitur yang digabungkan.
