# Status Distribution Kpis Redesign Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) atau superpowers:executing-plans untuk eksekusi.

**Goal:** Merombak tampilan "Distribusi Status & SLA" (`StatusDistributionKpis`) menjadi gaya **Compact Visual Legend** yang modern, rapi, dan mudah dibaca tanpa tabel yang memerlukan proses *scroll*. Tampilan ini harus selaras dengan kaidah desain Shadcn dan prinsip kebersihan hirarki UX dari `impeccable`.

## Design Architecture

1. **Header Area:** 
   - Tetap pertahankan Total "Laporan Aktif" beserta *breakdown* Brand.
   - Pindahkan ringkasan total _overdue_ ("X lewat SLA") ke posisi yang sejajar dengan subjudul menggunakan komponen `Badge` Shadcn yang mencolok namun proporsional.
2. **Progress Bar Utama:** 
   - Pertebal baris distribusi warna menjadi `h-4` atau `h-5` dengan transisi mulus dan lengkungan sudut `rounded-full` penuh untuk mempertegas identitas *proportion bar*.
3. **Mini-Cards Grid (Pengganti Tabel):**
   - Hapus `<Table>` sepenuhnya. Gantikan dengan CSS Grid `grid-cols-2 md:grid-cols-3 gap-3`.
   - Setiap elemen status akan dirender sebagai sebuah *card* kecil interaktif (`Link`).
   - Elemen dalam *card*:
     - **Baris 1:** Titik indikator warna (sesuai status) + Nama Status.
     - **Baris 2:** Jumlah laporan dalam tipografi *mono* yang tebal.
     - **Baris 3:** Persentase proporsi dalam teks _muted_.
     - **Indikator SLA:** JIKA ada yang melanggar SLA (`overdueCount > 0`), tampilkan teks berwarna merah tebal di sudut kanan bawah kartu. Jika aman, biarkan bersih. Tidak perlu mengulang teks "Aman SLA" berulang kali.

## Step-by-Step Implementation

### Task 1: Redesign Layout Utama dan Progress Bar
- Buka file `app/dashboard/_components/admin/status-distribution.tsx`.
- Ganti `<div className="flex h-3 overflow-hidden rounded-full bg-muted">` menjadi tinggi yang lebih mencolok (misal `h-4`).
- Susun ulang penempatan *Total Active* dan *Badge Overdue* pada bagian *header* komponen agar komposisinya seimbang (sejajar horisontal di *desktop*, vertikal berderet di *mobile*).

### Task 2: Ganti Tabel dengan Mini-Cards Grid
- Hapus semua *import* dari `@/components/ui/table`.
- Ubah *mapping* `visibleStatus` yang tadinya merender `TableRow` menjadi kontainer `<div>` bergaya Shadcn *card*:
  ```tsx
  <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mt-6">
    {visibleStatus.map(item => (
       <Link href={`...`} className="group flex flex-col justify-between p-3 border rounded-lg hover:border-primary transition-colors bg-card">
         <div className="flex items-center gap-2">
            <span className={`h-2.5 w-2.5 rounded-full ${color}`} />
            <span className="text-xs font-medium text-muted-foreground group-hover:text-primary transition-colors">{item.label}</span>
         </div>
         <div className="mt-2 flex items-end justify-between">
            <div className="flex items-baseline gap-2">
                <span className="text-2xl font-semibold tracking-tight">{item.count}</span>
                <span className="text-xs text-muted-foreground">{percentage}%</span>
            </div>
            {item.overdueCount > 0 && (
                <span className="text-[10px] font-bold text-red-600 bg-red-50 px-1.5 py-0.5 rounded-md">
                   {item.overdueCount} overdue
                </span>
            )}
         </div>
       </Link>
    ))}
  </div>
  ```
- Ini menghilangkan keharusan *scroll* panjang, membuang baris repetitif, memperkuat _visual binding_ (warna terasosiasi dengan *card* yang berdekatan dengan *progress bar*), dan memenuhi kaidah *Clean Design*.

---
Seluruh perubahan akan dieksekusi di satu file `status-distribution.tsx` untuk menjaga kecepatan dan isolasi komponen.
