# BMS Completion Mobile Responsive Plan

## Scope

Menganalisis bug horizontal overflow pada halaman kirim penyelesaian BMS,
menetapkan desain responsif yang disetujui, dan menulis implementation plan.
Task ini tidak mengubah kode aplikasi atau perilaku runtime.

## Context and Sources

- `AI_RULES.md` dan `AGENTS.md`.
- `docs/project/04-workflows.md`, `docs/project/05-routes-and-ui.md`, dan
  `docs/project/09-testing-and-verification.md`.
- `docs/agent-notes/2026-08-24-2031-refactor-toko-material-photos.md` serta
  plan terkait foto toko material tanggal 2026-08-24.
- Screenshot pengguna untuk state revisi pekerjaan.
- Kode aktual di `app/reports/[reportNumber]/completion/` dan primitive UI di
  `components/ui/`.
- Metadata dan source registry shadcn untuk `scroll-area`, `dialog`, dan
  `dropdown-menu`.
- Riwayat Git yang memperkenalkan photo strip dan gallery foto toko.

## Changed Files

- `docs/superpowers/specs/2026-09-10-bms-completion-mobile-responsive-design.md`:
  desain, akar masalah, responsive contract, dan skenario verifikasi.
- `docs/superpowers/plans/2026-09-10-bms-completion-mobile-responsive.md`:
  rencana implementasi test-first yang dapat dieksekusi per task.
- `docs/project/05-routes-and-ui.md`: kontrak permanen halaman completion BMS
  pada viewport ponsel.
- `docs/agent-notes/2026-09-10-1011-bms-completion-mobile-plan.md`: catatan
  investigasi dan keputusan task ini.

## Decisions

- Akar masalah dicatat sebagai kebocoran intrinsic width dari horizontal photo
  strip dan ancestor flex/grid yang belum memiliki shrink boundary; menu titik
  tiga hanya jalur yang mengekspos kondisi tersebut, bukan dinyatakan sebagai
  akar masalah tanpa bukti.
- Semua gallery completion akan memakai satu `PhotoStrip` berbentuk wrapping
  grid dua/tiga kolom.
- Containment diterapkan berlapis pada child, section, page shell, dan overlay;
  global body overflow suppression tidak dipakai.
- Primitive shadcn global tidak diubah karena implementasinya sesuai registry
  dan tidak terbukti menjadi sumber overflow.
- Tidak ada perubahan data, upload, autosave, validasi, atau payload server.

## Verification

- Membandingkan screenshot dengan struktur DOM dan class Tailwind aktual.
- Memeriksa semua pemakaian horizontal scroller, shrink boundary, dialog,
  dropdown, fixed footer, dan layout realisasi pada completion route.
- Memeriksa implementasi registry shadcn yang relevan.
- Self-review spec dan plan mencakup target 320/360/390/430 piksel, banyak
  foto, state revisi, keyboard virtual, dropdown, dialog, dan desktop
  regression.
- `git diff --check` dan pemeriksaan agent note dijalankan sebelum commit.

## Remaining Work and Risks

Implementasi kode dan browser QA belum dilakukan. Source-contract test menjaga
struktur penting, tetapi bukti final bahwa layout tidak overflow tetap harus
datang dari pengujian browser pada data revisi representatif sesuai plan.
