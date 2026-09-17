# Skip Missing Store Enrichment Reset

## Scope

Mengubah sync store enrichment agar toko database yang tidak ditemukan di
Google Sheet hanya dihitung sebagai audit mismatch dan tidak di-reset
`ownershipType`-nya ke `UNKNOWN`.

Di luar scope: mengubah data production langsung, membuat toko baru dari row
sheet, atau mengubah aturan update toko yang matched by code.

## Context and Sources

- User menemukan dry-run `sync:store-enrichment` menghasilkan 526 update.
- Analisis read-only menunjukkan 398 update berasal dari reset missing DB
  store ke `UNKNOWN`, terdiri dari Lawson, toko inactive, dan sebagian Alfamart
  aktif.
- `lib/jobs/sync-store-enrichment.ts`: source logic sync enrichment.
- `docs/project/06-database.md`: canonical documentation untuk store
  enrichment.

## Changed Files

- `lib/jobs/sync-store-enrichment.ts`: menghapus update reset
  `ownershipType` untuk toko DB yang tidak ada di sheet; count audit tetap ada.
- `lib/jobs/sync-store-enrichment.spec.ts`: memperbarui test agar missing DB
  store tidak masuk daftar update.
- `docs/project/06-database.md`: mendokumentasikan perilaku baru audit-only
  untuk toko DB yang tidak ada di sheet.
- `docs/agent-notes/2026-09-14-1649-skip-missing-store-enrichment-reset.md`:
  task note ini.

## Decisions

- Missing DB store tidak boleh diganggu apa pun brand/statusnya: Lawson,
  inactive, maupun active Alfamart.
- Sync tetap mengupdate toko yang matched by normalized `Kode Toko`.
- Row sheet yang tidak ada di database tetap tidak membuat toko baru.
- `databaseStoresNotFoundInSheet` tetap dilaporkan sebagai audit mismatch.

## Verification

- Regression test dibuat dan awalnya gagal karena `ZZ99` masih di-reset ke
  `UNKNOWN`.
- `node -e "process.geteuid=()=>'codex'; require('./node_modules/tsx/dist/cjs/api/index.cjs').register(); require('./lib/jobs/sync-store-enrichment.spec.ts')"`
  berhasil: `sync-store-enrichment tests passed`.
- `npm run sync:store-enrichment -- --dry-run` berhasil dan menunjukkan
  `Toko updated: 128`, turun dari 526; `Toko DB tidak ada di sheet: 744` tetap
  menjadi audit count.
- `.\\node_modules\\.bin\\tsc.cmd --noEmit --pretty false --incremental false`
  gagal dengan Node heap out-of-memory pada heap default.
- `$env:NODE_OPTIONS='--max-old-space-size=4096'; .\\node_modules\\.bin\\tsc.cmd --noEmit --pretty false --incremental false`
  berhasil tanpa error.

## Remaining Work and Risks

- Sebelum real sync, user tetap sebaiknya menjalankan dry-run terakhir untuk
  memastikan angka source sheet/database belum berubah.
