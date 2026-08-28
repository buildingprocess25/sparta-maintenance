# Google Drive Hierarchy Design and Plan

## Scope

Mendokumentasikan desain target hierarchy Google Drive Sparta Maintenance dan
menyusun implementation plan TDD. Tidak ada kode runtime, schema database,
environment production, atau file Google Drive yang diubah.

## Context and Sources

- Diskusi user dan screenshot hierarchy target `DOKUMEN SPARTA`.
- `AI_RULES.md` dan dokumentasi project integrasi/operasi.
- Implementasi aktif di `lib/google-drive`, route upload foto, flow laporan,
  revisi PDF, approval PJUM, cleanup draft, dan script backup database.
- Struktur Drive aktif dibaca sebelumnya melalui credential lokal dengan nilai
  secret tetap tidak dicatat.

## Changed Files

- `docs/superpowers/specs/2026-08-26-google-drive-hierarchy-design.md`: desain target, aturan resolusi toko, evidence mapping, env, deployment, dan rollback.
- `docs/superpowers/plans/2026-08-26-google-drive-hierarchy.md`: rencana implementasi 9 task berbasis TDD.
- `docs/project/07-integrations-and-env.md`: status target hierarchy dan aturan root/env.
- `docs/project/08-operations.md`: pemisahan backup dan ringkasan cutover/rollback.
- `docs/agent-notes/2026-08-26-2215-google-drive-hierarchy-plan.md`: catatan task ini.

## Decisions

- Database store code menjadi identitas utama; normalized exact store name hanya fallback.
- Kode Drive yang placeholder, strip, atau salah dikoreksi tanpa mengubah no-ulok dan nama toko Drive.
- Store baru memakai no-ulok `BELUM DIISI` dan sistem membuat `Maintenance` sejajar dengan `Building`.
- Setiap laporan memiliki folder sendiri dengan dokumen serta kategori foto terpisah.
- Nomor laporan DRAFT harus direservasi sebelum foto checklist pertama agar upload langsung menuju folder final.
- PJUM disimpan di level cabang, sejajar dengan `Toko`, bukan diduplikasi per toko.
- Root foto dan dokumen disatukan secara logical; credential CDN tetap digunakan.
- Backup database tetap berada di root terpisah dan mempertahankan 10 file terbaru.
- Migrasi file legacy tidak termasuk scope implementasi pertama.

## Verification

- Membaca ulang spec dan plan untuk konsistensi requirement dan interface.
- Scan placeholder `TBD`, `TODO`, `implement later`, dan instruksi samar: tidak ditemukan.
- Memastikan plan mencakup policy, resolver, DRAFT lifecycle, upload foto,
  seluruh call site client, PDF final/revisi, PJUM, cleanup, env, docs, smoke
  test, dan rollback.
- `git diff --check` dijalankan setelah finalisasi dokumen.

## Remaining Work and Risks

- Implementasi belum dimulai dan root production tidak boleh diubah sebelum code cutover siap.
- Folder Drive duplikat yang ambigu memerlukan resolusi manual; sistem dirancang gagal aman.
- File legacy tetap berada di hierarchy lama sampai ada proyek migrasi terpisah.
