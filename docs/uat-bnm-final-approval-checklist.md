# UAT Checklist - Final Approval BNM

## Tujuan

Memastikan laporan maintenance hanya berstatus `COMPLETED` setelah persetujuan final oleh `BNM_MANAGER`, termasuk jalur revisi dan dampaknya ke PDF/PJUM.

## Scope Perubahan

- Status baru: `APPROVED_BMC`
- Aksi activity baru:
    - `WORK_APPROVED`
    - `FINAL_APPROVED_BNM`
    - `FINAL_REJECTED_REVISION_BNM`
- Tambahan data completion:
    - `completionAdditionalPhotos`
    - `completionAdditionalNote`

## Persiapan UAT

- [ ] Minimal ada 3 akun aktif: `BMS`, `BMC`, `BNM_MANAGER` (dalam cabang yang sama).
- [ ] Ada 1 akun role lain/cabang lain untuk uji akses ditolak.
- [ ] Environment sudah memakai migration terbaru.
- [ ] Seed/master data toko tersedia dan bisa dipakai membuat report.
- [ ] Storage Supabase dapat upload foto.
- [ ] Integrasi Google Drive aktif (untuk validasi arsip ketika final approve).
- [ ] Browser desktop + mobile siap untuk smoke UI.

## Data Uji yang Disiapkan

- [ ] Skenario A: report normal dengan estimasi + completion + foto after.
- [ ] Skenario B: report dengan dokumentasi tambahan (>= 2 foto + catatan).
- [ ] Skenario C: report untuk jalur reject revisi di tahap final BNM.

## Checklist UAT - Alur Utama

### 1) BMS Buat dan Submit Report

- [ ] BMS membuat report baru dari halaman create.
- [ ] Submit estimasi berhasil, status menjadi `PENDING_ESTIMATION`.
- [ ] Report terlihat di list BMC (branch yang sama).

### 2) BMC Review Estimasi

- [ ] BMC approve estimasi, status menjadi `ESTIMATION_APPROVED`.
- [ ] Activity log mencatat `ESTIMATION_APPROVED`.

### 3) BMS Submit Penyelesaian

- [ ] BMS start work lalu submit completion dengan foto wajib per item rusak.
- [ ] Isi catatan global completion (opsional) tersimpan.
- [ ] Status berubah menjadi `PENDING_REVIEW`.
- [ ] Activity log mencatat `COMPLETION_SUBMITTED` atau `RESUBMITTED_WORK` sesuai konteks.

### 4) BMC Approve Penyelesaian (Handoff ke BNM)

- [ ] BMC approve penyelesaian.
- [ ] Status berubah ke `APPROVED_BMC` (bukan `COMPLETED`).
- [ ] Activity log mencatat `WORK_APPROVED`.
- [ ] Report masuk antrean review final BNM.

### 5) BNM Final Approve

- [ ] BNM membuka report status `APPROVED_BMC`.
- [ ] BNM meninjau bukti foto sampai memenuhi gate review.
- [ ] BNM klik setujui final.
- [ ] Status berubah ke `COMPLETED`.
- [ ] Activity log mencatat `FINAL_APPROVED_BNM`.

## Checklist UAT - Jalur Revisi Final BNM

### 6) BNM Reject Final dengan Revisi

- [ ] Pada report `APPROVED_BMC`, BNM pilih tolak/revisi.
- [ ] Sistem mewajibkan alasan penolakan (submit gagal jika kosong).
- [ ] Setelah alasan diisi, status menjadi `REVIEW_REJECTED_REVISION`.
- [ ] Activity log mencatat `FINAL_REJECTED_REVISION_BNM` dengan notes.
- [ ] Catatan penolakan tampil jelas di sidebar/CTA BMS.

### 7) BMS Revisi Setelah Ditolak BNM

- [ ] BMS melihat catatan penolakan BNM di detail report.
- [ ] BMS perbaiki lalu submit ulang completion.
- [ ] Status kembali ke `PENDING_REVIEW`.

### 8) BMC Review Ulang Setelah Revisi

- [ ] BMC review ulang report revisi.
- [ ] Jika approve, status kembali ke `APPROVED_BMC`.

### 9) BNM Final Approve Setelah Revisi

- [ ] BNM approve final report revisi.
- [ ] Status akhir `COMPLETED`.

## Checklist UAT - Dokumentasi Tambahan

- [ ] Di form completion BMS, bisa tambah dokumentasi tambahan (foto).
- [ ] Bisa hapus foto dokumentasi tambahan sebelum submit.
- [ ] Catatan dokumentasi tambahan bisa diisi.
- [ ] Data dokumentasi tambahan tampil di tab completion pada detail report.
- [ ] Jika report berganti/dipilih ulang, state dokumentasi tambahan tidak bocor dari report sebelumnya.

## Checklist UAT - Otorisasi dan Akses

- [ ] BNM hanya bisa final review report cabangnya sendiri.
- [ ] User non-BNM tidak melihat aksi final approve/reject.
- [ ] BNM tidak bisa final review report yang statusnya bukan `APPROVED_BMC`.
- [ ] BMS tidak bisa melihat draft/report milik user lain.

## Checklist UAT - PDF, Arsip, PJUM

- [ ] Setelah `FINAL_APPROVED_BNM`, PDF report menampilkan jejak approval sesuai aksi baru.
- [ ] Label/stamp final pada PDF sesuai konteks persetujuan final BNM.
- [ ] Arsip report ke Google Drive terjadi saat final approve (bukan saat BMC approve).
- [ ] Report yang belum `COMPLETED` tidak bisa masuk proses PJUM.
- [ ] Report `COMPLETED` tetap bisa masuk proses PJUM seperti biasa.

## Checklist UAT - Dashboard, Filter, Badge, Timeline

- [ ] Badge status `APPROVED_BMC` tampil konsisten di list/detail.
- [ ] Timeline menampilkan step final approval BNM sebelum `COMPLETED`.
- [ ] Filter list report bisa menemukan report `APPROVED_BMC` untuk role relevan.
- [ ] Dashboard BNM menampilkan antrean final approval (`APPROVED_BMC`).
- [ ] Activity feed/history menampilkan label action baru dengan benar.

## Negative Test (Wajib)

- [ ] BNM approve final tanpa meninjau semua foto yang diwajibkan -> harus diblok dengan pesan jelas.
- [ ] BNM reject final tanpa notes -> harus diblok.
- [ ] BMC mencoba menyelesaikan report langsung ke `COMPLETED` -> tidak boleh terjadi.
- [ ] PJUM mencoba menarik report belum `COMPLETED` -> harus ditolak.

## Exit Criteria (UAT Lulus)

- [ ] Semua test case critical (alur utama + reject revisi + otorisasi + PJUM gating) lulus.
- [ ] Tidak ada regression blocker di role BMS/BMC/BNM.
- [ ] Tidak ada data mismatch status vs activity log.
- [ ] Stakeholder bisnis menyetujui hasil UAT.

## Sign-off

- QA:
- PIC BMS:
- PIC BMC:
- PIC BNM:
- Tanggal:
