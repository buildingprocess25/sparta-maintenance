# BMS Completion Mobile Responsive

## Scope

Memperbaiki horizontal overflow pada halaman kirim penyelesaian BMS, terutama
untuk laporan revisi pekerjaan dengan banyak foto dan ketika menu realisasi
digunakan. Perubahan dibatasi pada composition dan layout frontend; upload,
autosave, validasi, state form, dan payload server tidak diubah.

## Context and Sources

- `AI_RULES.md`, `AGENTS.md`, dan implementation plan
  `docs/superpowers/plans/2026-09-10-bms-completion-mobile-responsive.md`.
- Screenshot pengguna yang menunjukkan textarea terkompresi, halaman melebar,
  dan footer keluar viewport.
- Implementasi aktual completion route, reusable photo strip, material-store
  revision form, realisasi editor, dropdown, dialog, dan fixed footer.
- Design spec
  `docs/superpowers/specs/2026-09-10-bms-completion-mobile-responsive-design.md`.

## Changed Files

- `app/reports/[reportNumber]/completion/components/completion-responsive-layout.spec.ts`:
  regression contract untuk photo grid, containment, realisasi, dropdown, dan
  dialog mobile.
- `app/reports/[reportNumber]/completion/components/photo-strip.tsx`: galeri
  horizontal menjadi responsive wrapping grid dua/tiga kolom.
- `app/reports/[reportNumber]/completion/components/start-work-revision-section.tsx`:
  memakai `PhotoStrip` untuk foto toko dan menambah shrink boundaries.
- `app/reports/[reportNumber]/completion/components/evidence-capture-section.tsx`:
  containment untuk evidence content dan actions.
- `app/reports/[reportNumber]/completion/components/additional-documentation-section.tsx`:
  containment untuk collapsible, photo grid, dan textarea.
- `app/reports/[reportNumber]/completion/components/completion-item-section.tsx`:
  containment item, grid realisasi, event menu `onSelect`, serta dialog yang
  dibatasi dynamic viewport.
- `app/reports/[reportNumber]/completion/completion-client.tsx`: viewport guard
  untuk shell, header summary, main content, dan fixed footer; unused imports
  dan destructuring pada file yang sama dibersihkan.

## Decisions

- Satu reusable `PhotoStrip` dipakai untuk seluruh galeri completion agar foto
  banyak menambah tinggi halaman, bukan lebar dokumen.
- Intrinsic width diperbaiki pada child dan ancestor dengan `min-w-0` dan
  `max-w-full`; `overflow-x-clip` hanya menjadi guard pada boundary halaman.
- Realisasi memakai grid `minmax(0,1fr) auto` agar kolom teks dapat menyusut
  tanpa mendorong nominal dan menu keluar viewport.
- Primitive shadcn global dan global body overflow tidak diubah.
- Seluruh implementasi dan dokumentasi task ini di-stage menjadi satu commit
  langsung pada branch `main` sesuai instruksi pengguna.

## Verification

- TDD red state terkonfirmasi untuk photo grid, containment, dan
  realisasi/dialog sebelum masing-masing implementasi.
- Regression suite: 3 tests passed, 0 failed.
- ESLint pada seluruh file yang berubah dengan `--max-warnings=0`: exit 0.
- TypeScript `tsc --noEmit` dengan heap 4 GB: exit 0.
- Next.js production bundle mencapai `Compiled successfully in 3.3min`, lalu
  build internal TypeScript gagal karena process out-of-memory. Percobaan
  berikutnya dihentikan atas permintaan percepatan; hasil ini tidak dicatat
  sebagai full build pass.
- Dev server `/login` merespons HTTP 200.
- Browser QA pada data revisi tidak dijalankan karena route memerlukan sesi dan
  database environment terdeteksi non-local. Tidak ada kredensial dummy atau
  record remote yang digunakan.

## Remaining Work and Risks

QA visual pada viewport 320, 360, 390, dan 430 piksel dengan data revisi
representatif masih perlu dijalankan di environment test yang terisolasi.
Production build penuh juga perlu diulang pada runner dengan memori yang cukup;
bundle berhasil dikompilasi dan typecheck mandiri sudah lulus, tetapi proses
build lengkap belum menghasilkan exit 0 di host ini.
