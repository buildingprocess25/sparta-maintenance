# Workflows

## Laporan Maintenance

Status normal:

```text
DRAFT
  -> PENDING_ESTIMATION
  -> ESTIMATION_APPROVED
  -> IN_PROGRESS
  -> PENDING_REVIEW
  -> APPROVED_BMC
  -> COMPLETED
```

Status revisi/penolakan:

- `ESTIMATION_REJECTED_REVISION`
- `ESTIMATION_REJECTED`
- `REVIEW_REJECTED_REVISION`

Timestamp penting:

| Field | Arti UI |
| --- | --- |
| `createdAt` | Laporan dibuat. |
| `updatedAt` | Row database berubah; jangan dijadikan satu-satunya "update laporan" jika ada ActivityLog. |
| `ActivityLog.createdAt` | Sumber utama riwayat dan update laporan. |
| `finishedAt` | Final approval BNM Manager, status menjadi `COMPLETED`. |
| `pjumExportedAt` | Laporan sudah masuk/export PJUM. |

Draft BMS memakai hybrid persistence:

- `localStorage` tetap menjadi cache cepat untuk perubahan kecil di device yang sama.
- Server menyimpan row `Report` status `DRAFT` pada checkpoint penting: idle 17 detik setelah perubahan terakhir, upload foto, perpindahan step, page leave best-effort, dan submit.
- Autosave server hanya menyimpan referensi foto yang sudah ter-upload (`photoUrl` dan `photoKey`), bukan meng-upload ulang file foto.
- Submit selalu memakai payload form terbaru sebagai sumber final, sehingga payload submit menang atas autosave draft yang lebih lama.
- Status `DRAFT` tidak dihitung untuk PJUM, realisasi, approval, export final, atau dashboard keuangan.

## Approval

| Tahap | Actor | Target Status |
| --- | --- | --- |
| Submit estimasi | BMS | `PENDING_ESTIMATION` |
| Approve estimasi | BMC | `ESTIMATION_APPROVED` |
| Mulai pekerjaan | BMS | `IN_PROGRESS` |
| Submit penyelesaian | BMS | `PENDING_REVIEW` |
| Approve pekerjaan | BMC | `APPROVED_BMC` |
| Final approval | BNM_MANAGER | `COMPLETED` |

## Review Gate

Saat status `PENDING_REVIEW` atau `APPROVED_BMC`, reviewer wajib membuka fitur bandingkan nota dan foto item pekerjaan sebelum tombol approval bisa digunakan jika ada item pekerjaan BMS.

Jika tidak ada item pekerjaan BMS, reviewer boleh langsung approve.

## PJUM

Status:

- `PENDING_APPROVAL`
- `APPROVED`
- `REJECTED`

Alur:

1. BMC memilih periode.
2. Sistem menampilkan laporan periode berdasarkan `finishedAt`.
3. BMC memilih laporan valid.
4. BMC membuat PJUM.
5. BNM Manager approve/reject.
6. Saat approved, PDF final dapat dilihat dari detail PJUM.

Aturan biaya:

- Laporan Rp 0 tanpa item pekerjaan BMS tidak wajib PJUM.
- Laporan Rp 0 tetapi memiliki item pekerjaan BMS tetap wajib PJUM.
- UI tidak boleh memberi label misleading "belum PJUM" untuk laporan yang memang tidak wajib PJUM.

PDF recap PJUM:

- Halaman recap utama tetap menampilkan table gabungan semua laporan dan total gabungan.
- Jika semua laporan berasal dari satu kategori tipe toko, recap tetap satu table seperti format sebelumnya.
- Jika laporan mencakup lebih dari satu kategori, table utama diberi konteks sebagai rekap gabungan dan rincian berdasarkan tipe toko ditampilkan setelah section tanda tangan `Dibuat Oleh` / `Disetujui Oleh`.
- Breakdown dimulai di sisa ruang halaman yang sama; jika tidak muat, renderer PDF melanjutkan ke halaman berikutnya.
- Kategori breakdown berurutan: `Alfamart Reguler`, `Alfamart Franchise`, `Lawson`, dan `Alfamart - Tipe Toko Belum Diketahui`.

Validasi QR:

- Saat BNM Manager menyetujui PJUM, sistem membuat token validasi publik dan kode validasi manusia.
- PDF final PJUM memuat QR validator dan kode validasi di setiap halaman.
- Scan QR membuka halaman publik `/v/pjum/[token]` tanpa login.
- Halaman validator menampilkan status dokumen, metadata PJUM, nomor laporan, dan tombol PDF resmi.
- Tombol PDF resmi mengarah ke file Google Drive perusahaan; akses file tetap mengikuti permission Drive.
- Finance wajib mencocokkan metadata halaman validator dengan dokumen cetak sebelum menerima PJUM.

## Preventive

- Target: setiap toko checklist preventif minimal satu kali per triwulan.
- Hanya report preventif status `COMPLETED` yang dihitung.
- Report preventif aktif/belum selesai tidak dihitung.
- Export preventive menyediakan pilihan triwulan dan semua triwulan.

## Intervensi Laporan

Intervensi hanya untuk `ADMIN`.

Tujuan:

- Mengubah data laporan yang sudah `COMPLETED`.
- Digunakan untuk koreksi resmi dengan alasan/BAP.

Route:

- `/dashboard/reports/[reportNumber]/intervensi`

## Notifikasi

Notifikasi dibuat saat proses bisnis berjalan, seperti submit laporan, approval, reject, PJUM dibuat, PJUM approved/rejected, dan intervensi.

Recipient:

- BMS menerima update laporan/PJUM miliknya.
- BMC menerima laporan/PJUM dalam scope branch/area.
- BNM Manager menerima approval final/PJUM dalam scope branch/area.
- Jika entity punya area, recipient difilter berdasarkan area.
- Jika entity tidak punya area, recipient fallback ke branch.

## Realisasi

Analisis realisasi dipakai untuk melihat kecukupan uang muka BMS.

Metrik penting:

- Total realisasi.
- Tren realisasi bulanan.
- Rata-rata realisasi per BMS per minggu per cabang.
- Data tetap ditampilkan sebagai agregat cabang, bukan tabel per BMS terpisah.
