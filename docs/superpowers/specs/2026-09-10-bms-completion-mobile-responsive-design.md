# BMS Completion Mobile Responsive Design

## Problem

Halaman `/reports/[reportNumber]/completion` dapat memperlebar dokumen melebihi
viewport ponsel. Gejalanya paling jelas pada laporan
`REVIEW_REJECTED_REVISION`: input toko material dan judul form terkompresi,
footer submit bergeser keluar layar, dan halaman dapat digeser secara
horizontal. Banyak foto sebelum, sesudah, selfie, nota, foto toko, atau
dokumentasi tambahan memperbesar kemungkinan masalah. Interaksi menu titik
tiga pada baris realisasi menjadi salah satu jalur yang mengekspos layout yang
sudah tidak memiliki containment lebar yang memadai.

## Evidence and Root Cause

- `PhotoStrip` membentuk satu baris thumbnail `shrink-0` dengan negative
  horizontal margin dan `overflow-x-auto`, tetapi tidak memberi kontrak
  `min-w-0` dan `max-w-full` kepada scroll container.
- Galeri foto toko mengulang pola yang sama di dalam flex dan grid yang masih
  memakai default `min-width: auto`. Min-content width deretan foto dapat naik
  melalui ancestor hingga memperlebar dokumen.
- `StartWorkRevisionSection`, `CompletionItemSection`, dan beberapa child
  layout belum konsisten membatasi diri ke lebar parent.
- Baris realisasi menggabungkan nama barang, nominal, dan menu titik tiga dalam
  flex row tanpa kontrak eksplisit bahwa kolom teks boleh menyusut dan grup
  action harus tetap berada di viewport.
- Dialog edit memakai grid dua kolom tetap untuk jumlah dan satuan. Pada
  viewport sangat sempit dan saat keyboard virtual terbuka, layout ini tidak
  mempunyai fallback satu kolom.
- Komponen `DropdownMenu` dan `Dialog` lokal sesuai implementasi registry
  shadcn `radix-vega`; tidak ada bukti bahwa komponen global tersebut merupakan
  sumber intrinsic page width. Perbaikan tetap dibatasi pada composition di
  halaman completion.

## Responsive Contract

- Target viewport ponsel adalah lebar CSS 320, 360, 390, dan 430 piksel,
  portrait maupun landscape.
- Pada seluruh state halaman, `document.documentElement.scrollWidth` tidak
  boleh lebih besar dari `window.innerWidth` lebih dari toleransi satu piksel.
- Tidak ada teks form yang pecah per karakter akibat kolom terkompresi.
- Header sticky, content, dialog, dropdown, dan footer submit selalu berada di
  dalam viewport serta tetap dapat digunakan dengan keyboard virtual terbuka.
- Foto tidak memakai horizontal strip. Foto ditampilkan dalam grid dua kolom
  pada viewport di bawah 360 piksel dan tiga kolom mulai 360 piksel. Penambahan
  foto memperpanjang halaman secara vertikal, bukan memperlebar dokumen.
- Semua jenis galeri pada halaman memakai satu `PhotoStrip` yang reusable,
  termasuk galeri foto toko material.
- Tidak ada perubahan pada state form, upload, autosave, validasi, maupun
  payload server.

## Chosen Approach

Gunakan containment berlapis dan grid foto wrapping.

1. Ubah `PhotoStrip` dari horizontal flex scroller menjadi responsive grid.
2. Gunakan `PhotoStrip` yang sama untuk foto toko material agar tidak ada dua
   implementasi gallery yang berperilaku berbeda.
3. Tambahkan `min-w-0`, `max-w-full`, dan `overflow-x-clip` hanya pada boundary
   halaman dan section yang membutuhkannya. Clipping halaman adalah guard
   terakhir; child tetap harus mempunyai aturan shrink yang benar.
4. Ubah baris realisasi menjadi grid `minmax(0, 1fr) auto`, pertahankan nominal
   dan action sebagai kolom kanan yang stabil, dan gunakan event `onSelect`
   pada item DropdownMenu.
5. Batasi dialog ke dynamic viewport dan ubah field jumlah/satuan menjadi satu
   kolom di layar tersempit, lalu dua kolom mulai 360 piksel.

Pendekatan ini dipilih dibanding mempertahankan horizontal photo scroller
karena pengguna meminta halaman tetap satu layar tanpa pergeseran ke kanan.
Mengganti seluruh halaman dengan komponen atau layout baru juga ditolak karena
tidak diperlukan untuk memperbaiki akar masalah.

## Component Boundaries

- `completion-client.tsx`: boundary viewport utama dan footer.
- `photo-strip.tsx`: satu-satunya renderer koleksi foto completion.
- `start-work-revision-section.tsx`: composition revisi bukti awal dan toko
  material; tidak lagi merender gallery sendiri.
- `evidence-capture-section.tsx` dan
  `additional-documentation-section.tsx`: boundary aman bagi galeri reusable.
- `completion-item-section.tsx`: foto item, baris realisasi, menu action, dan
  dialog edit yang responsive.

Tidak ada komponen shadcn baru yang perlu dipasang. `Button`, `DropdownMenu`,
`Dialog`, input, textarea, dan collapsible yang sudah tersedia tetap dipakai.

## Interaction and Data Flow

Upload dan autosave tetap menghasilkan `LocalPhoto[]`. Setiap section hanya
meneruskan array itu ke `PhotoStrip`. Grid mengubah presentasi, bukan urutan,
ID, preview URL, atau callback remove/preview. Menu titik tiga tetap membuka
aksi Edit dan Hapus; memilih Edit memindahkan salinan entry ke dialog seperti
sekarang. Simpan dialog tetap mengganti entry berdasarkan ID.

## Error Handling and Accessibility

- Empty state foto tetap terlihat ketika array kosong.
- Tombol preview dan hapus tetap memiliki accessible name.
- Target hapus foto tetap minimal 44 piksel.
- Dropdown tetap memakai portal dan collision handling bawaan shadcn/Radix.
- Dialog tetap memiliki title dan description, dapat discroll secara vertikal,
  dan tidak melewati dynamic viewport.
- Tidak ada global `body { overflow-x: hidden }` karena itu hanya menutupi child
  yang rusak dan berisiko menyembunyikan overlay lain.

## Verification

Tambahkan source-contract regression test untuk memastikan grid foto,
containment, responsive dialog, dan event DropdownMenu tidak kembali ke pola
yang menyebabkan overflow. Verifikasi visual tetap wajib karena DOM unit test
tidak menghitung layout browser.

Skenario manual pada tiap viewport target:

1. Buka laporan `REVIEW_REJECTED_REVISION` dengan data bukti awal.
2. Tampilkan sedikitnya delapan foto pada setiap jenis galeri.
3. Buka seluruh collapsible item.
4. Buka menu titik tiga, pilih Edit, isi setiap field, buka Select satuan,
   simpan, lalu buka dan tutup dialog kembali.
5. Fokus setiap input agar keyboard virtual tampil.
6. Tambah dan hapus foto serta toko material, lalu gunakan preview.
7. Pastikan tidak ada horizontal page scroll dan footer submit tidak keluar
   viewport pada setiap langkah.
