# Wajib PJUM Policy Update Design

## Objective
Mengubah aturan bisnis terkait pembuatan PJUM (Pertanggungjawaban Uang Muka). Saat ini, laporan yang tidak memiliki biaya (Rp 0) atau tidak memiliki pekerjaan BMS dianggap "Tidak Perlu PJUM". Ke depannya, **semua laporan yang berstatus COMPLETED wajib di-PJUM-kan**, tanpa memandang nilai biaya atau jenis pekerjaan.

## Pendekatan & Arsitektur
Desain menggunakan pendekatan *feature-toggle* (berbasis fungsi tunggal) yang sangat *low-risk* dan mudah di-*revert*. 

1. **Modifikasi Inti**: Fungsi `requiresPjum(totalReal, items)` di `lib/realisasi.ts` adalah pusat dari penentuan wajib-tidaknya PJUM untuk sebuah laporan. Kita akan mengubah fungsi ini untuk selalu mengembalikan `true`.
2. **Backward Compatibility**: Logika aslinya akan dikomentari *(commented out)* di dalam fungsi tersebut. Ini memastikan jika bisnis memutuskan kembali ke aturan lama, perbaikannya hanya memerlukan penghapusan komen pada 1 baris kode.
3. **Dampak Sistem**:
   - Seluruh laporan `COMPLETED` akan dianggap valid untuk PJUM.
   - UI "Buat PJUM" akan mengizinkan BMS/BMC memilih laporan Rp 0.
   - Tabel Admin dan halaman *detail view* tidak akan menampilkan *badge* abu-abu "Tidak Perlu PJUM".
   - Output PDF akan memproses laporan Rp 0 sebagaimana adanya.
   
## Unit Testing
Karena unit test bergantung pada kalkulasi asli `requiresPjum`, beberapa test di `lib/realisasi.spec.ts` dan `lib/pjum-hanging.spec.ts` yang spesifik menguji laporan "Tidak perlu PJUM" (mengharapkan *false*) akan diubah atau dikomentari sesuai kebutuhan agar *pipeline* tetap berjalan.

## Out of Scope
- Perubahan layout PDF.
- Pembuatan field atau kolom *database* baru.
- Perubahan alur approval.
