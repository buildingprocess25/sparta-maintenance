# Product

## Register

product

## Users

**BMS (Building Maintenance Staff)**: Teknisi/tukang lapangan yang membuat, memulai, dan menyelesaikan laporan maintenance toko. Mengakses aplikasi dari smartphone di lapangan. User awam secara teknis — tidak terbiasa dengan aplikasi enterprise kompleks. Konteks penggunaan: bisa sedang di toko, pencahayaan bervariasi, koneksi tidak selalu stabil.

**BMC (Branch Manager Coordinator)**: Manajer cabang yang mereview estimasi dan penyelesaian laporan dari BMS di bawah tanggung jawabnya. Mengakses dari desktop atau tablet. Perlu overview laporan per cabang dan aksi approval yang efisien.

**BNM Manager**: Manajemen level atas yang memberikan final approval laporan dan PJUM. Mayoritas menggunakan desktop. Butuh summary cepat dan proses approval yang tidak memerlukan banyak klik.

**Admin (Head Office)**: Tim IT/Ops yang memantau semua laporan production, mengelola user, toko, settings, dan melakukan intervensi jika diperlukan. Mayoritas desktop. Butuh data dense dan tools manajemen lengkap.

## Product Purpose

SPARTA Maintenance adalah aplikasi internal PT Sumber Alfaria Trijaya untuk mengelola alur laporan maintenance toko Alfamart. Alur meliputi pelaporan kerusakan oleh BMS, approval estimasi biaya oleh BMC, pengerjaan, penyelesaian, final approval BNM, serta pencatatan realisasi biaya dan PJUM mingguan. Aplikasi ini juga mencakup checklist kondisi toko, checklist preventif triwulanan, arsip PDF ke Google Drive, dan notifikasi proses bisnis.

Sukses: setiap laporan maintenance selesai melalui approval berjenjang tanpa hambatan; BMS di lapangan dapat membuat dan memantau laporannya dari HP dengan cepat; manajer dapat mereview dan menyetujui tanpa friction; admin dapat memonitor seluruh pipeline.

## Brand Personality

Bersih, ringan, aksesibel.

- **Bersih**: interface tidak penuh dekorasi. Setiap elemen ada fungsinya. Whitespace digunakan untuk fokus, bukan estetika semata.
- **Ringan**: load cepat, navigasi langsung ke tujuan, tidak ada modal atau flow yang panjang tanpa alasan.
- **Aksesibel**: user awam (BMS lapangan) harus langsung paham status laporan, angka, dan langkah selanjutnya tanpa membaca dokumentasi.

Tone: formal tapi tidak kaku. Gunakan bahasa Indonesia yang lugas — tidak ada jargon, tidak ada copy yang "witty". Label harus deskriptif, bukan poetic.

## Anti-references

- **Terlalu cartoonish / fun**: ilustrasi karakter, warna neon, animasi bouncy. Tidak sesuai konteks korporat internal.
- **Startup SaaS glossy**: gradient mesh backgrounds, glassmorphism berlebihan, hero metric template (angka besar + label kecil + gradient accent), card grids yang identik.
- **Enterprise berat seperti Jira/ServiceNow**: terlalu banyak panel, nested settings, toolbar yang padat. SPARTA harus terasa lebih ringan meski fungsionalitasnya setara.
- **Card-heavy dashboard**: setiap section dibungkus card. Gunakan section/table ketika itu adalah pilihan yang lebih baik.

## Design Principles

1. **Jelas untuk user awam**: status, angka, dan langkah selanjutnya harus bisa dipahami tanpa membaca penjelasan panjang. Label global status, helper text pendek untuk metrik yang bisa misleading.
2. **Compact tanpa sesak**: density tinggi untuk admin dan manager desktop, tapi tetap ada breathing room yang cukup. BMS mobile harus lebih longgar karena touch target dan keterbacaan di lapangan.
3. **Aksi dulu, data kemudian**: user datang untuk melakukan sesuatu (submit laporan, review, approve). Tempatkan CTA dan status di atas; detail di bawah atau di tab terpisah.
4. **Konsistensi sistem**: gunakan komponen, label status, dan pola yang sudah ada. Jangan reinvent the wheel. Shadcn/ui + Tailwind + lucide-react sudah cukup kecuali ada alasan kuat.
5. **Mobile-first untuk BMS**: BMS adalah pengguna yang paling sering membuka aplikasi dari HP di kondisi yang tidak ideal. Setiap perubahan pada alur BMS harus diuji perspektif mobile terlebih dahulu.

## Accessibility & Inclusion

- Target WCAG AA (kontras minimal 4.5:1 untuk body text).
- Tidak ada persyaratan khusus yang dinyatakan, tapi mengingat BMS mengakses dari lapangan: touch target minimal 44px, font tidak terlalu kecil, label tidak hanya mengandalkan warna.
- Reduced motion: animasi UI harus mengikuti prefers-reduced-motion.
- Bahasa: semua copy dalam Bahasa Indonesia.
