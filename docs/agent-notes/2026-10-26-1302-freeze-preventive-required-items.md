# Bekukan syarat preventif lengkap ke I1–I10

## Scope

Membekukan set item yang menentukan "preventif lengkap" ke I1–I10 di
`hasCompletePreventiveEvidence` dan helper SQL `completePreventiveEvidenceSql`.
Di luar scope: validasi submit untuk I11–I13, perubahan skema, dan migrasi.

## Context and Sources

- `.superpowers/sdd/signage-task-2-brief.md` (Task 2).
- `lib/report-preventive.ts`, `lib/report-preventive-sql.ts`, `lib/report-preventive.spec.ts`.

## Changed Files

- `lib/report-preventive.ts`: tambah `PREVENTIVE_REQUIRED_ITEM_IDS` (I1–I10); completeness check memakai set ini. `PREVENTIVE_ITEM_IDS` tetap I1–I13.
- `lib/report-preventive-sql.ts`: helper SQL memakai `PREVENTIVE_REQUIRED_ITEM_IDS` untuk daftar `IN` dan jumlah pembanding.
- `lib/report-preventive.spec.ts`: assertion set I1–I10 dan laporan lengkap berbasis I1–I10.
- `docs/agent-notes/2026-10-26-1302-freeze-preventive-required-items.md`: catatan task ini.

## Decisions

- Set completeness dibekukan ke I1–I10 agar laporan lama (tanpa I11–I13) tetap dihitung lengkap untuk cooldown, KPI, coverage, matriks, dan export.
- Item preventif baru diwajibkan lewat validasi submit, bukan lewat set ini.

## Verification

- RED: `npx tsx lib/report-preventive.spec.ts` gagal, `PREVENTIVE_REQUIRED_ITEM_IDS` undefined.
- GREEN: `npx tsx lib/report-preventive.spec.ts` menghasilkan `report preventive assertions passed`.
- `npx eslint` pada tiga file yang diubah: lolos.
- `npx tsc --noEmit`: tidak ada error di luar `.next/dev/types/routes.d.ts`.

## Remaining Work and Risks

- Verifikasi manual browser dilewati dan menjadi tugas controller.
- Belum ada pengujian terhadap query SQL nyata di database.
