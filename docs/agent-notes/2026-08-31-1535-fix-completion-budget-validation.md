# Fix: Completion Budget Validation & Unexpected Cost Input

## Scope

Memperbaiki dua bug pada halaman "Kirim Penyelesaian" (BMS completion flow) di branch `feat/bms-balance`:
1. `isOverBudget` false positive karena `maxAvailableBudget` di frontend tidak memperhitungkan estimasi laporan itu sendiri.
2. Textarea input untuk `unexpectedCostNotes` tidak di-render di UI — hanya ada di hook state tapi tidak pernah ditampilkan.

## Context and Sources

- `lib/balance.ts`: dokumentasi aturan bisnis — realisasi > sisa saldo adalah SOFT BLOCK (boleh submit, wajib isi unexpectedCostNotes)
- `app/reports/actions/submit-completion-work.ts:203`: referensi rumus `maxAvailableBudget = balance.availableBalance + reportTotalEstimation` yang benar di backend

## Changed Files

- `app/reports/[reportNumber]/completion/completion-client.tsx`: (1) fix argumen `maxAvailableBudget` ke hook = `availableBalance + report.totalEstimation`, (2) tambah section textarea kondisional saat `isOverBudget === true`

## Decisions

- `maxAvailableBudget = availableBalance + report.totalEstimation`: karena `availableBalance` sudah dikurangi oleh estimasi laporan ini (yang masih `IN_PROGRESS`). Saat submit realisasi, estimasi itu "dikembalikan" ke pool, sehingga batas realisasi = sisa_global + estimasi_laporan_ini.
- Textarea ditampilkan kondisional (hanya saat `isOverBudget === true`) agar tidak mengganggu UX normal flow.
- Tidak mengubah logika backend — sudah benar.

## Verification

- TypeScript compile: `npx tsc --noEmit` → no errors
- Manual test: laporan estimasi 300k, saldo sisa 100k → `maxAvailableBudget = 400k` → realisasi 300k tidak lagi memicu false positive

## Remaining Work and Risks

None
