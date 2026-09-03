## BMS Weekly Balance Design

## Tujuan

BMS memiliki saldo operasional sebesar Rp 1.000.000 untuk pekerjaan item rusak dengan handler BMS. Saldo dipakai untuk mengontrol biaya kerja mingguan, mencegah estimasi melebihi batas sejak awal, dan memberi jejak jelas saat realisasi membengkak.

## Keputusan Bisnis

- Saldo awal BMS: Rp 1.000.000.

- Saldo hanya berlaku untuk item rusak yang dikerjakan handler BMS.

- Estimasi melebihi sisa saldo: tidak bisa submit.

- Realisasi melebihi sisa saldo: boleh submit, tetapi catatan biaya tak terduga wajib diisi.

- PJUM harus dibuat untuk periode minggu berjalan.

- PJUM tidak bisa dibuat jika masih ada laporan BMS pada periode itu yang belum selesai.

- Membuat PJUM membuat saldo masuk status terkunci sampai BNM memutuskan.

- Selama PJUM masih Review BNM, BMS tidak bisa mulai pekerjaan baru.

- Jika PJUM approved BNM, periode baru memakai saldo dasar Rp 1.000.000
  dikurangi realisasi laporan menggantung dari periode sebelumnya.

- Saldo tersedia boleh bernilai negatif jika laporan menggantung melebihi
  saldo dasar.

- Tidak ada approval Regional atau mekanisme buka laporan menggantung.

- Jika PJUM rejected BNM, reset saldo dibatalkan dan lock Review BNM selesai. BMS kembali memakai saldo lama sebelum PJUM dibuat.

## Istilah User

- Saldo tersedia: uang yang masih bisa dipakai BMS.

- Terpakai: total biaya kerja BMS dalam periode aktif.

- Terkunci PJUM: BMS sedang menunggu PJUM disetujui BNM.

- Biaya tak terduga: selisih realisasi yang membuat biaya lebih besar dari saldo atau estimasi.

- Laporan menggantung: laporan selesai dan wajib PJUM yang tidak disertakan
  ketika PJUM periode asal disetujui BNM.

- Kedaluwarsa PJUM: laporan menggantung yang kembali tidak disertakan pada
  approval PJUM berikutnya; laporan tidak dapat di-PJUM-kan lagi.

## Alur Saldo

- 1. BMS membuat laporan dan estimasi.

- 2. Saat submit estimasi, sistem cek total estimasi handler BMS terhadap sisa saldo.

- 3. Jika estimasi melebihi saldo tersedia, submit ditolak.

- 4. Jika estimasi aman, laporan disimpan dan biaya estimasi langsung di-*reserve* (membekukan saldo) sejak status `PENDING_ESTIMATION`. Ini mencegah BMS melakukan spam-submit beberapa laporan yang akumulasinya melampaui limit.

- 5. Jika BMC menolak estimasi secara permanen (`ESTIMATION_REJECTED`), saldo yang di-reserve akan otomatis terlepas (kembali tersedia).

- 6. Jika BMC meminta revisi estimasi (`ESTIMATION_REJECTED_REVISION`), saldo tetap di-reserve sampai BMS resubmit atau laporan ditolak permanen.

- 7. BMS klik Mulai Pekerjaan setelah estimasi di-approve BMC. Saldo tetap ter-reserve.

- 8. Saat BMS submit penyelesaian, sistem hitung realisasi.

- 9. Jika realisasi lebih besar dari saldo tersedia, BMS tetap bisa submit dengan catatan biaya tak terduga wajib diisi.

- 10. BMC membuat PJUM untuk minggu berjalan. Laporan menggantung aktif
  otomatis ikut terpilih dan tidak bisa dilepas dari pilihan PJUM.

- 11. Jika masih ada laporan periode itu yang belum selesai, PJUM tidak bisa dibuat.

- 12. Total realisasi laporan yang dipilih untuk PJUM tidak boleh melebihi
  Rp 1.000.000. Jika melebihi, tombol buat PJUM diblokir.

- 13. Saat PJUM dibuat, saldo BMS terkunci dan BMS tidak bisa mulai pekerjaan baru.

- 14. Jika PJUM approved, laporan selesai yang tidak disertakan dipindahkan ke
  periode baru sebagai laporan menggantung.

- 15. Saldo periode baru dihitung dari Rp 1.000.000 dikurangi laporan
  menggantung dan penggunaan baru.

- 16. Laporan menggantung wajib masuk PJUM periode berikutnya. Saat BNM
  mereview PJUM, sistem menampilkan laporan gantung yang ikut PJUM dan laporan
  gantung yang tertinggal jika ada anomali data lama/forged request.

- 17. Jika PJUM rejected, saldo reset dibatalkan.


## Case Bisnis

| Case | Aturan |
| --- | --- |
| Estimasi lebih besar dari saldo | Blokir submit estimasi. |
| Submit estimasi aman | Saldo langsung di-reserve sejak `PENDING_ESTIMATION`. |
| Estimasi ditolak permanen oleh BMC | Saldo yang di-reserve dikembalikan (otomatis). |
| Estimasi aman, realisasi membengkak | Izinkan submit penyelesaian dengan catatan wajib. |
| Ada laporan mulai kerja tapi belum selesai | PJUM tidak bisa dibuat. |
| BMC membuat PJUM dengan laporan menggantung aktif | Laporan menggantung otomatis terpilih dan tidak bisa di-unselect. |
| Total pilihan laporan PJUM lebih dari Rp 1.000.000 | Tombol buat PJUM diblokir dan UI menjelaskan batas nominal. |
| PJUM sedang Review BNM | BMS tidak bisa mulai pekerjaan baru. |
| Laporan selesai tidak dipilih dalam PJUM | Menjadi laporan menggantung saat approval BNM dan mengurangi saldo periode berikutnya. |
| Total laporan menggantung lebih dari Rp 1.000.000 | Saldo periode berikutnya boleh negatif. |
| Laporan menggantung ikut PJUM berikutnya | Dipertanggungjawabkan dan tidak lagi membebani periode selanjutnya. |
| BNM review PJUM dengan laporan menggantung | Detail PJUM menampilkan laporan gantung yang ikut dan yang tertinggal. |
| PJUM rejected BNM | Reset saldo dibatalkan. |
| Laporan ditolak permanen setelah mulai kerja | Saldo laporan dikembalikan. |
| Admin intervensi realisasi laporan selesai | Saldo historis disesuaikan mengikuti koreksi. |
| BMS telat submit realisasi beda minggu | Biaya tetap masuk periode saat mulai pekerjaan. |

## Periode Saldo

Periode saldo aktif dimulai dari tanggal saldo terakhir reset atau dari awal default jika belum pernah PJUM approved. Setelah PJUM approved, periode baru dimulai dari waktu approval tersebut. Ini lebih cocok daripada kalender mingguan kaku karena user ingin PJUM menjadi trigger reset saldo.

Saldo dasar tetap Rp 1.000.000 agar breakdown dapat dijelaskan terpisah:

```text
saldo tersedia = saldo dasar
               - realisasi laporan menggantung aktif
               - realisasi laporan baru
               - estimasi laporan berjalan
```

UI BMS menampilkan saldo dasar, pengurang laporan menggantung, penggunaan
periode berjalan, dan saldo tersedia. BMC melihat carryover sebagai kandidat
khusus yang wajib ikut pada PJUM berikutnya. BNM melihat daftar laporan
gantung yang ikut PJUM dan daftar yang tertinggal jika ada anomali data lama
atau request tidak normal sebelum konfirmasi approval.

## Go-Live

- Migration menambah field nullable sehingga saldo dan periode existing tidak
  berubah saat schema dipasang.
- Aturan carryover berlaku untuk PJUM yang disetujui setelah cutover. PJUM yang
  sudah approved tidak dihitung ulang secara retroaktif.
- Periode `ACTIVE` tetap berjalan. Periode `LOCKED_PJUM` memakai aturan baru
  ketika PJUM pending tersebut disetujui.
- Jalankan `npm run audit:bms-balance-cutover -- --strict` sebelum deploy kode.
  Audit bersifat read-only dan memeriksa periode ganda, BMS tanpa periode,
  mismatch locked/pending PJUM, serta laporan berjalan tanpa periode.
- Hentikan approval BNM sementara ketika migration dan audit cutover dilakukan.
- Gunakan `prisma migrate deploy`; jangan gunakan `prisma db push` pada
  production.

