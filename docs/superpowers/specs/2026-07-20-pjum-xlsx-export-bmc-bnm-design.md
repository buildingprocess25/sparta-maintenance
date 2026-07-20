# PJUM XLSX Export for BMC and BNM Design

## Tujuan

Role `BMC` dan `BNM_MANAGER` dapat mengunduh rekap XLSX dari `/dashboard/pjum` tanpa memperoleh akses ke PJUM di luar cabang yang ditugaskan kepada akun mereka.

## Kondisi Saat Ini

- `/dashboard/pjum` dapat diakses oleh `ADMIN`, `BMC`, dan `BNM_MANAGER`.
- `ExportPjumDialog` dan pembentuk sheet `Rekap PJUM` sudah tersedia dan dipakai oleh `ADMIN`.
- Endpoint `POST /api/admin/export` menerima ketiga role tersebut, tetapi saat ini hanya mengizinkan ekspor sheet `pjum` untuk `ADMIN`.
- Daftar PJUM untuk BMC dan BNM dibatasi oleh `user.branchNames`.

## Keputusan Desain

- Gunakan kembali `ExportPjumDialog`, `fetchPjumExportRows`, dan `buildPjumSheet`; tidak membuat endpoint atau exporter baru.
- Format workbook tetap satu baris per dokumen PJUM.
- Filter ekspor tetap terpisah dari filter tabel dan tetap menyediakan rentang tanggal, cabang, serta Nama/NIK BMS.
- Scope server mengikuti kebijakan halaman saat ini: cabang merupakan batas akses. Area hanya merupakan filter tampilan dan tidak menjadi batas otomatis.
- Tidak ada dependency, model database, atau migrasi baru.

## Perilaku Berdasarkan Role

| Role | Tombol header | Scope ekspor |
| --- | --- | --- |
| `ADMIN` | Ekspor XLSX | Semua cabang non-HEAD OFFICE seperti perilaku saat ini. |
| `BMC` | Buat PJUM dan Ekspor XLSX | Hanya cabang dalam `user.branchNames`. |
| `BNM_MANAGER` | Ekspor XLSX | Hanya cabang dalam `user.branchNames`. |

Untuk BMC, kedua aksi dikelompokkan dalam satu container header responsif. BNM tidak memperoleh aksi membuat PJUM.

## Alur Data dan Otorisasi

1. Pengguna membuka dialog ekspor dari `/dashboard/pjum`.
2. Dialog mengirim `POST /api/admin/export` dengan `sheets: ["pjum"]` dan filter opsional.
3. Endpoint memastikan role adalah `ADMIN`, `BMC`, atau `BNM_MANAGER`.
4. Untuk BMC dan BNM, endpoint hanya menerima permintaan satu sheet `pjum` untuk alur ini.
5. Jika pengguna tidak memilih cabang, endpoint mengganti filter cabang dengan seluruh `user.branchNames` yang tidak kosong.
6. Jika pengguna mengirim cabang di luar `user.branchNames`, endpoint mengembalikan `403` dan tidak menjalankan query ekspor.
7. Query dan pembentuk workbook yang sudah ada menghasilkan file XLSX.
8. Browser mengunduh file dengan nama `Rekap_PJUM_YYYYMMDD.xlsx`.

Validasi cabang wajib dilakukan di server. Daftar cabang pada dialog hanya membantu UX dan tidak dianggap sebagai batas keamanan.

## Format Workbook

Sheet tetap bernama `Rekap PJUM` dengan kolom:

1. Branch
2. NIK BMS
3. Nama BMS
4. Minggu ke-
5. Dari Tanggal
6. Sampai Tanggal
7. Status
8. Jumlah Laporan
9. Dibuat Oleh
10. Tanggal Dibuat
11. Disetujui Oleh
12. Tanggal Disetujui

Tipe tanggal dan angka tetap memakai implementasi workbook yang sudah ada.

## Penanganan Error

- Pengguna tanpa sesi menerima `401`.
- Role di luar ADMIN, BMC, dan BNM menerima `403`.
- BMC atau BNM yang meminta cabang di luar scope menerima `403` dengan pesan akses cabang yang sudah ada.
- Permintaan kombinasi sheet yang tidak diizinkan untuk role terbatas tetap menerima `403`.
- Kegagalan query atau pembuatan workbook tetap menghasilkan pesan ekspor generik dan dicatat melalui logger.
- Dialog mempertahankan toast loading, success, dan error yang sudah ada.

## Verifikasi

- Uji aturan akses untuk memastikan ekspor `pjum` diterima bagi BMC dan BNM.
- Uji bahwa cabang kosong dinormalisasi menjadi semua cabang milik pengguna.
- Uji bahwa cabang asing dan kombinasi sheet terlarang ditolak sebelum query.
- Pastikan ADMIN tetap dapat mengekspor format yang sama.
- Jalankan lint pada file yang berubah, TypeScript typecheck, dan production build.
- Lakukan smoke test manual untuk susunan tombol BMC, tombol BNM, unduhan XLSX, serta isi header sheet.

## Non-Scope

- Ekspor satu baris per laporan di dalam PJUM.
- Menyamakan filter ekspor dengan filter tabel aktif.
- Menambah filter status atau area ke dialog ekspor.
- Mengubah isi, urutan kolom, nama sheet, atau format workbook ADMIN.
- Membuat endpoint ekspor khusus PJUM.
