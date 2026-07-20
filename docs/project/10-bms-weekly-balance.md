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

- Jika PJUM approved BNM, saldo BMS reset ke Rp 1.000.000 dan periode kerja baru boleh dimulai.

- Jika PJUM rejected BNM, reset saldo dibatalkan dan lock Review BNM selesai. BMS kembali memakai saldo lama sebelum PJUM dibuat.

## Istilah User

- Saldo tersedia: uang yang masih bisa dipakai BMS.

- Terpakai: total biaya kerja BMS dalam periode aktif.

- Terkunci PJUM: BMS sedang menunggu PJUM disetujui BNM.

- Biaya tak terduga: selisih realisasi yang membuat biaya lebih besar dari saldo atau estimasi.

## Alur Saldo

- 1. BMS membuat laporan dan estimasi.

- 2. Saat submit estimasi, sistem cek total estimasi handler BMS.

- 3. Jika estimasi melebihi saldo tersedia, submit ditolak.

- 4. Jika estimasi aman, laporan berjalan seperti biasa.

- 5. Saat BMS klik Mulai Pekerjaan, biaya estimasi dianggap memakai saldo periode aktif.

- 6. Saat BMS submit penyelesaian, sistem hitung realisasi.

- 7. Jika realisasi lebih besar dari saldo tersedia, BMS tetap bisa submit dengan catatan wajib.

- 8. BMC membuat PJUM untuk minggu berjalan.

- 9. Jika masih ada laporan periode itu yang belum selesai, PJUM tidak bisa dibuat.

- 10. Saat PJUM dibuat, saldo BMS terkunci dan BMS tidak bisa mulai pekerjaan baru.

- 11. Jika PJUM approved, saldo reset ke Rp 1.000.000.

- 12. Jika PJUM rejected, saldo reset dibatalkan.


## Case Bisnis

| Case | Aturan |
| --- | --- |
| Estimasi lebih besar dari saldo | Blokir submit estimasi. |
| Estimasi aman, realisasi membengkak | Izinkan submit penyelesaian dengan catatan wajib. |
| Ada laporan mulai kerja tapi belum selesai PJUM tidak bisa dibuat. |   |
| PJUM sedang Review BNM | BMS tidak bisa mulai pekerjaan baru. |
| PJUM rejected BNM | Reset saldo dibatalkan. |
| Laporan ditolak permanen setelah mulai kerja | Saldo laporan dikembalikan. |
| Admin intervensi realisasi laporan selesai | Saldo historis disesuaikan mengikuti koreksi. |
| BMS telat submit realisasi beda minggu | Biaya tetap masuk periode saat mulai pekerjaan. |

## Periode Saldo

Periode saldo aktif dimulai dari tanggal saldo terakhir reset atau dari awal default jika belum pernah PJUM approved. Setelah PJUM approved, periode baru dimulai dari waktu approval tersebut. Ini lebih cocok daripada kalender mingguan kaku karena user ingin PJUM menjadi trigger reset saldo.
