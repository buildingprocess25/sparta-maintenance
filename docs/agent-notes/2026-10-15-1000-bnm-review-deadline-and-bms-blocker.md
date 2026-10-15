# BNM review deadline and BMS blocker relaxation

## Scope

BMS boleh membuat laporan baru saat laporan sebelumnya berstatus `APPROVED_BMC` (Review BNM). BNM diberi tenggat hari kalender Jakarta dengan cut-off 23:59 WIB; jika terlewat, BMS pemilik laporan diblokir membuat laporan baru. Kartu "Laporan Menunggu Final BNM" mendapat label dua tingkat (lewat 24 jam, lewat batas) dengan tooltip. Di luar cakupan: notifikasi pengingat (butuh migrasi enum + cron), indikator SLA admin, tabel `review_bnm`.

## Context and Sources

- `docs/superpowers/plans/2026-10-15-bnm-review-deadline-bms-blocker.md`
- `lib/bms-active-report-blocker.ts`, `lib/balance.ts`, `lib/app-settings.ts`, `app/dashboard/queries.ts`

## Changed Files

- `lib/bnm-review-deadline.ts`: helper murni tenggat, state, label, pencari laporan lewat tenggat.
- `lib/bnm-review-deadline.spec.ts`: spec helper tenggat.

## Decisions

- Tenggat = 00:00 WIB awal hari ke-(slaDays + 1) setelah hari masuk Review BNM; kalender murni, tanpa libur/akhir pekan.
- Waktu masuk Review BNM = `ApprovalLog` terakhir berstatus `APPROVED_BMC` (tanpa kolom baru), fallback `updatedAt`.
- Notifikasi pengingat ditunda.

## Verification

- `npx tsx lib/bnm-review-deadline.spec.ts`: OK.

## Remaining Work and Risks

- Indikator SLA admin masih rolling (di luar cakupan).
