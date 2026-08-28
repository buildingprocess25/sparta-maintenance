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
4. BMC membuat PJUM dan periode saldo BMS terkunci secara atomik.
5. BNM Manager approve/reject.
6. Saat approved, PDF final dapat dilihat dari detail PJUM.

Laporan menggantung:

- Laporan `COMPLETED` yang wajib PJUM tetapi tidak dipilih menjadi laporan
  menggantung saat BNM menyetujui PJUM periode asal.
- Laporan tersebut dipindahkan ke periode saldo baru dan realisasinya
  mengurangi saldo Rp 1.000.000. Saldo tersedia boleh menjadi negatif.
- Laporan menggantung langsung menjadi kandidat PJUM berikutnya tanpa membuka
  kembali rentang tanggal lama dan tanpa approval Regional.
- Toleransi berakhir saat PJUM berikutnya disetujui BNM, bukan setelah tujuh
  hari kalender.
- Jika masih tidak disertakan, laporan mendapat `pjumExpiredAt`, tidak dapat
  di-PJUM-kan lagi, dan tidak membebani periode sesudahnya.
- BNM harus mengonfirmasi secara eksplisit jika approval akan membuat laporan
  menggantung kedaluwarsa permanen.

Aturan biaya:

- Laporan Rp 0 tanpa item pekerjaan BMS tidak wajib PJUM.
- Laporan Rp 0 tetapi memiliki item pekerjaan BMS tetap wajib PJUM.
- UI tidak boleh memberi label misleading "belum PJUM" untuk laporan yang memang tidak wajib PJUM.

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
