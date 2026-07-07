# BMS Weekly Balance Design

## Tujuan

BMS memiliki saldo operasional sebesar Rp 1.000.000 untuk pekerjaan item rusak dengan handler `BMS`. Saldo dipakai untuk mengontrol biaya kerja mingguan, mencegah estimasi melebihi batas sejak awal, dan memberi jejak jelas saat realisasi membengkak.

## Keputusan Bisnis

- Saldo awal BMS: Rp 1.000.000.
- Saldo hanya berlaku untuk item rusak yang dikerjakan handler `BMS`.
- Estimasi melebihi sisa saldo: tidak bisa submit.
- Realisasi melebihi sisa saldo: boleh submit, tetapi catatan biaya tak terduga wajib diisi.
- PJUM harus dibuat untuk periode minggu berjalan.
- PJUM tidak bisa dibuat jika masih ada laporan BMS pada periode itu yang belum selesai.
- Membuat PJUM membuat saldo masuk status terkunci sampai BNM memutuskan.
- Selama PJUM masih `Review BNM`, BMS tidak bisa mulai pekerjaan baru.
- Jika PJUM approved BNM, saldo BMS reset ke Rp 1.000.000 dan periode kerja baru boleh dimulai.
- Jika PJUM rejected BNM, reset saldo dibatalkan dan lock Review BNM selesai. BMS kembali memakai saldo lama sebelum PJUM dibuat.

## Istilah User

- `Saldo tersedia`: uang yang masih bisa dipakai BMS.
- `Terpakai`: total biaya kerja BMS dalam periode aktif.
- `Terkunci PJUM`: BMS sedang menunggu PJUM disetujui BNM.
- `Biaya tak terduga`: selisih realisasi yang membuat biaya lebih besar dari saldo atau estimasi.

## Alur Saldo

1. BMS membuat laporan dan estimasi.
2. Saat submit estimasi, sistem cek total estimasi handler `BMS`.
3. Jika estimasi melebihi saldo tersedia, submit ditolak.
4. Jika estimasi aman, laporan berjalan seperti biasa.
5. Saat BMS klik `Mulai Pekerjaan`, biaya estimasi dianggap memakai saldo periode aktif.
6. Saat BMS submit penyelesaian, sistem hitung realisasi.
7. Jika realisasi lebih besar dari saldo tersedia, BMS tetap bisa submit dengan catatan wajib.
8. BMC membuat PJUM untuk minggu berjalan.
9. Jika masih ada laporan periode itu yang belum selesai, PJUM tidak bisa dibuat.
10. Saat PJUM dibuat, saldo BMS terkunci dan BMS tidak bisa mulai pekerjaan baru.
11. Jika PJUM approved, saldo reset ke Rp 1.000.000.
12. Jika PJUM rejected, saldo reset dibatalkan.

## Case Bisnis

| Case | Aturan |
| --- | --- |
| Estimasi lebih besar dari saldo | Blokir submit estimasi. |
| Estimasi aman, realisasi membengkak | Izinkan submit penyelesaian dengan catatan wajib. |
| Ada laporan mulai kerja tapi belum selesai | PJUM tidak bisa dibuat. |
| PJUM sedang Review BNM | BMS tidak bisa mulai pekerjaan baru. |
| PJUM rejected BNM | Reset saldo dibatalkan. |
| Laporan ditolak permanen setelah mulai kerja | Saldo laporan dikembalikan. |
| Admin intervensi realisasi laporan selesai | Saldo historis disesuaikan mengikuti koreksi. |
| BMS telat submit realisasi beda minggu | Biaya tetap masuk periode saat mulai pekerjaan. |

## Model Data

Tambahkan ledger saldo agar histori tidak hilang.

```prisma
enum BmsBalanceEntryType {
  ESTIMATE_RESERVED
  REALIZATION_ADJUSTMENT
  RESERVE_RELEASED
  PJUM_LOCKED
  PJUM_APPROVED_RESET
  PJUM_REJECTED_RESET_REVERTED
  ADMIN_ADJUSTMENT
}

model BmsBalanceEntry {
  id           String              @id @default(uuid())
  bmsNIK       String
  branchName   String
  areaName     String?
  reportNumber String?
  pjumExportId String?
  periodStart  DateTime            @db.Date
  type         BmsBalanceEntryType
  amount       Decimal             @db.Decimal(15, 2)
  notes        String?
  actorNIK     String?
  createdAt    DateTime            @default(now()) @db.Timestamptz(3)

  @@index([bmsNIK, periodStart])
  @@index([reportNumber])
  @@index([pjumExportId])
}
```

`amount` positif berarti saldo dipakai. `amount` negatif berarti saldo dikembalikan.

## Periode Saldo

Periode saldo aktif dimulai dari tanggal saldo terakhir reset atau dari awal default jika belum pernah PJUM approved. Setelah PJUM approved, periode baru dimulai dari waktu approval tersebut.

Ini lebih cocok daripada kalender mingguan kaku karena user ingin PJUM menjadi trigger reset saldo.

## Validasi Utama

### Submit Estimasi

- Hitung total estimasi item handler `BMS`.
- Cek saldo tersedia BMS.
- Jika total estimasi melebihi saldo, tampilkan pesan:

```text
Estimasi melebihi saldo BMS. Sisa saldo saat ini Rp {saldo}. Kurangi estimasi atau hubungi BMC.
```

### Mulai Pekerjaan

- Jika BMS punya PJUM `PENDING_APPROVAL`, blokir.
- Jika aman, buat entry `ESTIMATE_RESERVED`.

### Submit Penyelesaian

- Hitung realisasi item handler `BMS`.
- Bandingkan dengan estimasi yang sudah memakai saldo.
- Jika realisasi membengkak, catatan wajib.
- Buat entry `REALIZATION_ADJUSTMENT`.

### Buat PJUM

- Periode harus minggu berjalan.
- Jika ada laporan dalam periode itu yang belum selesai, blokir.
- Jika BMS punya PJUM `PENDING_APPROVAL`, blokir.
- Tampilkan warning sebelum membuat:

```text
Setelah PJUM dibuat, saldo BMS akan terkunci sampai BNM menyetujui atau menolak PJUM ini. BMS tidak bisa mulai pekerjaan baru selama PJUM masih Review BNM.
```

### Approval PJUM

- Approved: buat entry `PJUM_APPROVED_RESET`.
- Rejected: buat entry `PJUM_REJECTED_RESET_REVERTED`.

## UI

- Dashboard BMS menampilkan saldo tersedia, terpakai, dan status terkunci.
- Start Work menampilkan pesan jika saldo terkunci karena PJUM.
- Form estimasi menampilkan error jika estimasi melebihi saldo.
- Form completion mewajibkan catatan jika realisasi membengkak.
- Dialog buat PJUM menampilkan warning saldo terkunci.
- Detail PJUM menampilkan dampak saldo: pending, approved reset, atau rejected.

## Non-Scope

- Tidak ada carry-over saldo otomatis antar BMS.
- Tidak ada top-up saldo manual selain intervensi admin.
- Tidak ada multi-wallet per cabang.
