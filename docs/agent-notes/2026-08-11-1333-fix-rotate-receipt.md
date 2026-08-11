# Fix Receipt Compare Dialog Rotate Button

## Scope

Menambahkan fungsi pemutar (rotate) pada penampil foto nota di dialog "Bandingkan dengan Nota" pada detail report, serta memperjelas UX dari tombol reset yang sebelumnya dikira tombol rotate. Di luar scope ini adalah fungsi pan dan zoom, yang akan dipertahankan sebagaimana mestinya.

## Context and Sources

- Bug report / feedback pengguna mengenai tombol "rotate" yang tidak berfungsi.
- Ternyata, tombol berikon `RotateCcw` tersebut selama ini dikonfigurasi sebagai tombol Reset Posisi/Zoom.
- File yang dimodifikasi: `app/dashboard/reports/[reportNumber]/_components/work-cost-tab.tsx`.

## Changed Files

- `app/dashboard/reports/[reportNumber]/_components/work-cost-tab.tsx`: Menambahkan state `rotation`, mengalokasikan satu tombol untuk aksi penambahan `rotation` 90 derajat secara kumulatif dengan icon `RotateCw`, merubah ikon tombol reset menjadi `Maximize`, dan menginjeksi transformasi `rotate` ke `style` pada DOM element gambar terkait.

## Decisions

- Tidak perlu menghapus fungsi Reset, tapi cukup mengganti ikonnya (`RotateCcw` -> `Maximize`) agar tidak ambigu.
- Rotasi harus diletakkan setelah efek `scale()` dan translasi agar saat di-pan, posisi kursor pada foto yang sedang dimiringkan tetap terasa alami.

## Verification

- Telah diverifikasi bahwa `disabled` check pada tombol Reset telah mencakup pemeriksaan nilai `rotation` (yaitu tidak bisa di-reset bila rotasinya sudah 0 dan zoom/pan normal).
- Menunggu hasil pemeriksaan TypeScript yang berjalan di *background*.

## Remaining Work and Risks

None
