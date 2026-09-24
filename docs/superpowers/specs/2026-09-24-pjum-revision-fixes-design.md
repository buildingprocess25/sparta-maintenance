# PJUM Revision Fixes Design Spec

## 1. Auto-select Laporan di Modal Submit Ulang

**Masalah:** Saat BMC melakukan "Submit Ulang" PJUM, state form (seperti NIK BMS, tanggal mulai, tanggal akhir, dsb.) telah terinisiasi melalui properti `editingPjum`, namun daftar laporan yang *eligible* belum diambil otomatis dari server. Akibatnya, form terlihat kosong dan pengguna harus menekan tombol "Cek Laporan" secara manual (seperti pada screenshot pertama).

**Solusi:**
- Pada `create-pjum-dialog.tsx`, tambahkan hook `useEffect` yang akan bereaksi terhadap transisi nilai `open` menjadi `true` dan tersedianya data `editingPjum`.
- *Effect* ini akan memanggil `searchDashboardPjumCandidates` jika hasil `result` masih kosong.
- State `selectedReports` akan terinisiasi menggunakan array dari `editingPjum.selectedReports` jika tersedia.

## 2. Notifikasi Revisi & Submit Ulang PJUM

**Masalah:** User meminta adanya notifikasi spesifik saat BNM me-*reject*/merevisi PJUM dan saat BMC men-*submit* ulang.

**Solusi:**
- **Revisi dari BNM (PJUM_REJECTED):** Sistem sudah memiliki *event dispatch* notifikasi untuk aksi ini di `approval-actions.ts`. Namun, akan kita verifikasi bahwa notifikasinya benar-benar dikirimkan kepada BMC yang membuat (atau semua BMC di cabang tersebut) dengan template `PJUM_REJECTED`.
- **Submit Ulang dari BMC (PJUM_CREATED):** Sistem juga sudah memiliki aksi `updateDashboardPjum` yang melempar *event* `PJUM_CREATED`. Berdasarkan pilihan pengguna, kita akan memakai ulang *enum* `PJUM_CREATED` dan memastikan BNM mendapatkan pesan yang sama layaknya PJUM dibuat baru.

## 3. Widget "PJUM Menunggu" di Dashboard BMC

**Masalah:** Saat ini, PJUM yang direvisi (status `REJECTED`) hilang dari widget "PJUM Menunggu" pada dashboard BMC, yang membingungkan karena PJUM tersebut secara logis masih "menunggu tindakan BMC". (Seperti ditunjukkan di screenshot ketiga, list kosong padahal ada PJUM revisi).

**Solusi:**
- Pada `app/dashboard/queries.ts` fungsi `getManagerDashboardData`:
- Evaluasi parameter `role`. Jika `role === "BMC"`, ubah query prisma `status` untuk filter `pendingPjums` dan KPI `pendingPjum` menjadi `status: { in: ["PENDING_APPROVAL", "REJECTED"] }`.
- Jika `role === "BNM_MANAGER"`, biarkan filter tetap `status: "PENDING_APPROVAL"`.
- Dengan begitu, PJUM yang direvisi akan tetap muncul di dashboard BMC dengan label *badge* "Direvisi" yang jelas.

---
**Catatan Self-Review:**
- Placeholder scan: Aman, tidak ada TODO.
- Internal consistency: Perubahan dashboard `getManagerDashboardData` konsisten dengan perbaikan UI dan tidak mempengaruhi BNM secara tidak sengaja.
- Ambiguity: Jelas bahwa perubahan hanya memengaruhi *flow* komponen PJUM.
