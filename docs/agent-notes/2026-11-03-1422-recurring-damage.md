# Kerusakan Berulang

## Scope

Halaman baru `/dashboard/recurring-damage` (Admin, BMC, BNM): toko dengan
item checklist yang sama rusak ≥ 2x per periode, drill-down Cabang → Toko →
Item → Laporan, dan export XLSX. Tanpa perubahan schema. Akses BMS, Branch
Admin, dan metrik "rusak lagi setelah diperbaiki" di luar cakupan.

## Context and Sources

- Spec: `docs/superpowers/specs/2026-11-03-recurring-damage-design.md`
- Plan: `docs/superpowers/plans/2026-11-03-recurring-damage.md`
- Pola acuan: `app/dashboard/preventive/` dan
  `app/api/dashboard/preventive/annual-matrix-export/route.ts`

## Changed Files

- `lib/recurring-damage.ts`: aturan deteksi rusak, status yang dihitung, filter periode, agregasi toko problematik, dan ringkasan cabang.
- `lib/recurring-damage.spec.ts`: spec fungsi murni.
- `components/dashboard/metric-column.tsx`, `empty-table.tsx`, `report-status-badge.tsx`: komponen dipindah dari halaman Preventif tanpa perubahan markup.
- `app/dashboard/preventive/_components/admin-preventive-table.tsx`: memakai komponen bersama, salinan lokal dihapus.
- `app/dashboard/recurring-damage/detections-query.ts`: query JSONB item rusak per toko/periode (`fetchDamageDetections`, filter toko lewat satu parameter array `= ANY(...::text[])`) dan `computeRecurringDamage(scope, period)` yang memuat toko aktif sesuai cakupan lalu menghitung toko problematik dan ringkasan cabang. Tanpa cek akses dan tanpa cache.
- `app/dashboard/recurring-damage/queries.ts`: resolusi cakupan dengan cek role; `loadRecurringDamageView` untuk halaman (via `unstable_cache` 300 s, tag `recurring-damage`) dan `loadRecurringDamage` untuk export (tanpa cache, data lengkap).
- `app/dashboard/recurring-damage/page.tsx` dan `_components/*`: halaman Kerusakan Berulang (filter Tahun → Triwulan → Bulan, tabel cabang, tabel toko, panel toko).
- `components/app-sidebar.tsx`: menu "Kerusakan Berulang" di grup Monitoring untuk Admin, BMC, BNM.
- `app/api/dashboard/recurring-damage/export/route.ts`: export XLSX (sheet Ringkasan Toko dan Detail Deteksi), akses sama dengan halaman.
- `app/dashboard/recurring-damage/_components/export-recurring-damage-button.tsx`, `page.tsx`: tombol Ekspor XLSX di header.
- `CLAUDE.md`: catatan perilaku halaman Kerusakan Berulang.
- Perbaikan review akhir: export BMC/BNM tanpa cabang, nama file "Semua_Cabang" saat Admin memilih semua cabang, label handler dipusatkan di lib/recurring-damage.ts, newline akhir CLAUDE.md.
- Revisi UI dari user: label "Toko problematik" diganti "Toko rusak berulang"; kolom tabel toko jadi "Item rusak tersering", "Frekuensi rusak maks", "Item rusak berulang" (header export ikut); panel toko diberi judul "Item rusak berulang" dan penanda "Item rusak tersering"; no. laporan dibuka di tab baru.
- Revisi UI tabel toko: tombol "Lihat detail" per baris + petunjuk klik; kolom digabung jadi "Item paling sering rusak" (badge "rusak Nx") dan "Jumlah item rusak berulang" ("N item") dengan tooltip penjelasan; header export disamakan.
- Revisi UI tabel cabang: kolom "Jumlah toko dengan kerusakan berulang" ("N toko") dengan tooltip, tombol "Lihat toko", petunjuk klik; kartu angka ikut berlabel sama dengan satuan toko. `HeaderWithInfo` dipisah ke `_components/header-with-info.tsx`.
- Widget dashboard "Item Paling Sering Rusak" (`app/dashboard/_components/admin/damaged-items-widget.tsx`, dipasang di dashboard Admin dan BMC/BNM), server action `app/dashboard/recurring-damage/actions.ts`, ranking item ter-cache di `queries.ts`, filter `?item=` di halaman dan export; fungsi murni `rankDamagedItems`, `isChecklistItemId`, `filterRecurringDamageByItem` (+ spec).

## Decisions

- Deteksi rusak memakai aturan yang sama dengan seluruh aplikasi
  (`RUSAK` / `NOT_OK`); signage Pudar ikut rusak.
- `ESTIMATION_REJECTED` dan `ARCHIVED_PREVENTIVE` tidak dihitung.
- Item teratas saat seri memakai urutan katalog (compareChecklistItemIds); ringkasan cabang diurutkan dari jumlah toko problematik terbanyak.
- Filter toko memakai satu parameter array (`r."storeCode" = ANY($1::text[])`), bukan daftar `IN` ~22 ribu parameter (batas Postgres 65.535 parameter).
- Halaman memakai `unstable_cache` (revalidate 300 s, tag `recurring-damage`, staleness 5 menit diterima, tanpa `revalidateTag`). Data cache Next menolak entri di atas ~2 MB, jadi entri semua cabang hanya menyimpan ringkasan cabang (`stores: []`); entri satu cabang menyimpan toko cabang itu. Cek auth dilakukan di luar cache.
- Export tetap tanpa cache dan memuat toko semua cabang.
- Baris tabel cabang/toko punya tombol nama agar bisa dibuka dengan keyboard; panel toko tidak dibuka pada tampilan semua cabang.
- `?store=` di luar daftar tetap membuka panel dengan pesan kosong; konten terakhir dipertahankan saat panel ditutup.
- Nama file export memakai nama cabang dari data (bukan dari body) bila datanya satu cabang; body non-objek ditolak 400.
- Widget mengurutkan item berdasarkan jumlah laporan rusak (keputusan user), dengan keterangan jumlah toko berulang agar sesuai dengan halaman tujuan; klik item membuka halaman dengan filter item.

## Verification

- `npx tsx lib/recurring-damage.spec.ts`: lulus.
- `npx tsc --noEmit` (dicek terscope: 4 file TSX yang diubah/dibuat) dan eslint pada file Preventif: tanpa error baru.
- Task 4: tsc terscope (dua file baru + `lib/recurring-damage.ts`) dan eslint `app/dashboard/recurring-damage`: tanpa error.
- Script verifikasi sementara di DB lokal (2026): 22150 toko aktif, 45374 deteksi, 1431 toko problematik, durasi 3329 ms (run pertama, cache dingin) dan 2232 ms (run kedua), signage Pudar/Rusak di luar NOT_OK = 0. Script dihapus.
- Perbaikan cache + parameter array: tsc terscope exit 0, eslint `app/dashboard/recurring-damage` bersih, spec lulus. Script sementara (dihapus) memanggil `computeRecurringDamage` untuk 2026: semua cabang 6080 ms (run pertama) dan 3424 ms (run kedua), 29 cabang, 1431 toko problematik, 7180 deteksi di toko problematik; payload ringkasan saja 1.539 byte (data lengkap semua cabang 1.981.582 byte, nyaris 2 MB). Satu cabang (cabang dengan toko problematik terbanyak, 208 toko): 349 ms, 1228 deteksi, payload 331.349 byte.
- Cross-check manual (SQL terpisah, toko teratas cabang tersebut dan item teratasnya): cocok, 4 laporan terhitung = maxFrequency 4.
- Task 5: tsc terscope (halaman, `_components/*`, sidebar, komponen dashboard, modul data) exit 0; eslint `app/dashboard/recurring-damage` bersih, `components/app-sidebar.tsx` hanya warning lama (`Image` tidak terpakai, bukan dari perubahan ini).
- Task 6: tsc terscope (route export, tombol, halaman, `_components/*`, komponen dashboard, modul data) exit 0; eslint `app/dashboard/recurring-damage app/api/dashboard/recurring-damage` bersih.
- Cek export di browser: dilakukan controller setelah Task 6.
- Task 7: `npx tsx lib/recurring-damage.spec.ts` dan `lib/report-preventive.spec.ts` lulus (exit 0). `npx tsc --noEmit` penuh OOM di mesin ini; diganti tsc terscope (modul, spec, komponen dashboard, sidebar, halaman + `_components`, route export, admin-preventive-table): exit 0. eslint pada file perintah brief: hanya masalah lama (error `react-hooks/set-state-in-effect` dan 3 warning `no-unused-expressions` di admin-preventive-table.tsx, warning `Image` tidak terpakai di app-sidebar.tsx); file fitur ini bersih.
- Task 7 build: `NODE_OPTIONS=--max-old-space-size=8192 npm run build` dua kali. Percobaan 1: gagal alokasi memori native (Turbopack). Percobaan 2: "Compiled successfully in 89s", lalu JavaScript heap out of memory setelah kompilasi (tahap berikutnya); daftar route tidak tercetak. Bukan kesalahan kode; verifikasi build penuh perlu mesin dengan memori lebih besar.
- Revisi UI: eslint dan scoped tsc bersih; belum dicek ulang di browser.
- Widget + filter item: spec lulus, eslint bersih pada file fitur (error/warning lama di admin-dashboard-v2.tsx dan manager-dashboard.tsx tidak disentuh), scoped tsc lulus; belum dicek di browser.

## Remaining Work and Risks

- Akses BMS dan Branch Admin, metrik "rusak lagi setelah diperbaiki", dan persentase di Layer 1 sengaja di luar cakupan.
- Cek browser (halaman dan export) belum dilakukan; dilakukan controller setelah Task 7 dan catatan ini akan diperbarui bila dijalankan.
- Build produksi belum terverifikasi sampai selesai: OOM di mesin ini setelah kompilasi sukses (lihat Verification); route belum terlihat di output build.
- Durasi query deteksi setahun penuh untuk semua toko 2,2-3,4 s di DB lokal (run pertama sampai ~6 s), di atas target 2 s. Load pertama Admin semua cabang (cache belum terisi atau kedaluwarsa) tetap selama itu; latensi produksi belum diukur. EXPLAIN ANALYZE: Parallel Seq Scan `Report` (~21,9 ribu laporan setahun) + nested loop `jsonb_array_elements`; eksekusi 1,68 s, sebagian besar waktu di pembacaan halaman TOAST kolom `items` (read ~23,7 ribu buffer, cache dingin). Filter kode toko tidak selektif untuk Admin semua cabang. Opsi lanjutan bila perlu: tabel ringkasan deteksi.
