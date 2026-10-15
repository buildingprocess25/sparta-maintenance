# BNM review deadline and BMS blocker relaxation

## Scope

BMS boleh membuat laporan baru saat laporan sebelumnya berstatus `APPROVED_BMC` (Review BNM). BNM diberi tenggat hari kalender Jakarta dengan cut-off 23:59 WIB; jika terlewat, BMS pemilik laporan diblokir membuat laporan baru. Kartu "Laporan Menunggu Final BNM" mendapat label dua tingkat (lewat 24 jam, lewat batas) dengan tooltip. Di luar cakupan: notifikasi pengingat (butuh migrasi enum + cron), indikator SLA admin, tabel `review_bnm`.

## Context and Sources

- `docs/superpowers/plans/2026-10-15-bnm-review-deadline-bms-blocker.md`
- `lib/bms-active-report-blocker.ts`, `lib/balance.ts`, `lib/app-settings.ts`, `app/dashboard/queries.ts`

## Changed Files

- `lib/bnm-review-deadline.ts`: helper murni tenggat, state, label, pencari laporan lewat tenggat.
- `lib/bnm-review-deadline.spec.ts`: spec helper tenggat.
- `lib/bms-active-report-blocker.ts` / `.spec.ts`: `APPROVED_BMC` keluar dari daftar blokir; tipe `kind`; judul dan pesan baru.
- `lib/bnm-review-entered-at.ts`: lookup waktu masuk Review BNM dari `ApprovalLog`.
- `lib/balance.ts`: `getBmsActiveReportBlocker` mengecek blokir tenggat BNM lebih dulu.
- `app/reports/_components/bms-create-report-button.tsx`, `app/reports/(bms)/create/page.tsx`: judul toast/alert dinamis.
- `app/dashboard/settings/_components/settings-workbench.tsx`, `lib/app-settings.ts`: teks bantuan dan komentar semantik SLA `APPROVED_BMC`.
- `docs/project/04-workflows.md`, `CLAUDE.md`: aturan Review BNM dan blokir.

## Decisions

- Tenggat = 00:00 WIB awal hari ke-(slaDays + 1) setelah hari masuk Review BNM; kalender murni, tanpa libur/akhir pekan.
- Waktu masuk Review BNM = `ApprovalLog` terakhir berstatus `APPROVED_BMC` (tanpa kolom baru), fallback `updatedAt`.
- Notifikasi pengingat ditunda.

## Verification

- `npx tsx lib/bnm-review-deadline.spec.ts` dan `lib/bms-active-report-blocker.spec.ts`: OK.
- `NODE_OPTIONS=--max-old-space-size=6144 npx tsc --noEmit`: bersih (tanpa heap besar, tsc kehabisan memori).
- ESLint file yang diubah: bersih.
- Uji manual di dev server TIDAK dijalankan (butuh mengubah `ApprovalLog` di database bersama).

## Remaining Work and Risks

- Indikator SLA admin masih rolling (di luar cakupan).
