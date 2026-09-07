# Update Deteksi Laporan Gantung PJUM

## Scope

- Memperbarui peringatan UI dan modal *pop-up* persetujuan terkait laporan gantung, karena kini laporan gantung secara otomatis akan terbawa (*carry over*) ke periode operasional selanjutnya dan tidak bisa kedaluwarsa.
- Menambahkan pop-up informasi pada halaman pembuatan PJUM ketika pengguna mencoba melepaskan centang laporan gantung.

## Context and Sources

- Penjelasan pengguna bahwa logika kedaluwarsa telah dihapus, dan laporan gantung akan otomatis masuk ke PJUM berikutnya.

## Changed Files

- `app/dashboard/pjum/[id]/page.tsx`: Menambahkan `InfoPopover` berisi penjelasan *tooltip* mengenai laporan gantung di komponen `Deteksi Laporan Gantung`.
- `app/dashboard/pjum/[id]/_components/pjum-approval-button.tsx`: Mengubah pesan *AlertDialog* untuk mencerminkan bahwa laporan yang tertinggal akan menjadi laporan gantung (bukan kedaluwarsa).
- `app/reports/pjum/approval-actions.ts`: Mengubah pesan *error* terkait konsekuensi persetujuan yang awalnya mengancam akan kedaluwarsa menjadi konsekuensi akan menjadi laporan gantung.
- `app/dashboard/pjum/_components/create-pjum-dialog.tsx`: Menambahkan *overlay* khusus pada checkbox "Laporan Gantung" agar memunculkan pesan *toast* ketika BMS/BMC mencoba mengekliknya, disertai status disabled secara visual.

## Decisions

- Tidak menghilangkan validasi _backend_ terkait konfirmasi (confirmHangingExpiry) karena ini masih menjadi langkah penting bagi BNM Manager untuk mengetahui bahwa ada laporan yang tertinggal sebelum PJUM disetujui, hanya deskripsi yang diubah.
- Menggunakan `relative div` dengan `absolute overlay` untuk menangkap klik *checkbox disabled* di `create-pjum-dialog` karena secara standar elemen HTML *disabled* tidak merespons event *onClick*.

## Verification

- Telah diverifikasi secara manual oleh *user* dan berjalan sesuai ekspektasi.
- Modal *approval* sudah terganti kata-katanya.
- *Toast popup* saat mengeklik *checkbox* juga telah berfungsi.

## Remaining Work and Risks

None
