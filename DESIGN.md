---
name: SPARTA Maintenance
description: Aplikasi internal manajemen maintenance toko Alfamart — pelaporan, approval berjenjang, dan monitoring operasional.
colors:
  primary: "#0069a7"
  primary-deep: "#005a8f"
  primary-deeper: "#004b77"
  primary-darkest: "#00375c"
  foreground: "#1a1f3c"
  muted-fg: "#6b7280"
  background: "#ffffff"
  surface: "#f4f6f9"
  border: "#e5e7eb"
  destructive: "#dc2626"
  status-approved: "#059669"
  status-rejected: "#dc2626"
  status-revision: "#d97706"
  status-pending: "#0069a7"
typography:
  display:
    fontFamily: "Geist, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1.5rem"
    fontWeight: 600
    lineHeight: 1.25
    letterSpacing: "-0.02em"
  headline:
    fontFamily: "Geist, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1.125rem"
    fontWeight: 600
    lineHeight: 1.4
    letterSpacing: "-0.01em"
  title:
    fontFamily: "Geist, ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.9375rem"
    fontWeight: 500
    lineHeight: 1.5
  body:
    fontFamily: "Geist, ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 400
    lineHeight: 1.6
  label:
    fontFamily: "Geist, ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.75rem"
    fontWeight: 500
    lineHeight: 1.4
    letterSpacing: "0.01em"
rounded:
  sm: "4px"
  md: "6px"
  lg: "10px"
  xl: "14px"
  full: "9999px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "12px"
  lg: "16px"
  xl: "24px"
  "2xl": "32px"
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "#ffffff"
    rounded: "{rounded.lg}"
    padding: "0 10px"
    height: "36px"
  button-primary-hover:
    backgroundColor: "{colors.primary-deep}"
  button-outline:
    backgroundColor: "{colors.background}"
    textColor: "{colors.foreground}"
    rounded: "{rounded.lg}"
    padding: "0 10px"
    height: "36px"
  button-ghost:
    backgroundColor: "transparent"
    textColor: "{colors.foreground}"
    rounded: "{rounded.lg}"
    padding: "0 10px"
    height: "36px"
  button-destructive:
    backgroundColor: "transparent"
    textColor: "{colors.destructive}"
    rounded: "{rounded.lg}"
    padding: "0 10px"
    height: "36px"
  input-default:
    backgroundColor: "transparent"
    textColor: "{colors.foreground}"
    rounded: "{rounded.lg}"
    height: "36px"
    padding: "4px 10px"
  badge-default:
    backgroundColor: "{colors.primary}"
    textColor: "#ffffff"
    rounded: "{rounded.full}"
    padding: "2px 8px"
  badge-status-approved:
    backgroundColor: "#d1fae5"
    textColor: "#065f46"
    rounded: "{rounded.full}"
    padding: "2px 8px"
  badge-status-rejected:
    backgroundColor: "#fee2e2"
    textColor: "#991b1b"
    rounded: "{rounded.full}"
    padding: "2px 8px"
  badge-status-revision:
    backgroundColor: "#fef3c7"
    textColor: "#92400e"
    rounded: "{rounded.full}"
    padding: "2px 8px"
  badge-status-pending:
    backgroundColor: "#dbeafe"
    textColor: "#1e40af"
    rounded: "{rounded.full}"
    padding: "2px 8px"
---

# Design System: SPARTA Maintenance

## 1. Overview

**Creative North Star: "The Corporate Compact"**

SPARTA Maintenance adalah tool operasional internal, bukan produk marketing. Design system-nya mencerminkan prinsip yang sama: setiap piksel harus bisa dipertanggungjawabkan. Interface ini melayani petugas lapangan di toko-toko Alfamart, manajer cabang di kantor, dan tim head office — tiga konteks yang berbeda, satu design language yang harus bekerja di semuanya.

Bersih, ringan, aksesibel. Bukan berarti minimal atau steril. Artinya: tidak ada dekorasi yang tidak bermakna, tidak ada warna yang sekadar "kelihatan bagus", tidak ada komponen yang memerlukan penjelasan. Biru korporat (#0069a7) adalah warisan merek PT Sumber Alfaria Trijaya — ia bukan pilihan estetika, tapi identitas yang wajib dijaga.

Interface ini secara eksplisit menolak: tampilan startup SaaS dengan gradient mesh dan glassmorphism berlebihan; dashboard card-heavy yang membungkus setiap data dalam container; komponen yang terlalu "fun" atau cartoonish; dan enterprise berat seperti Jira yang membuat pengguna awam perlu training sebelum bisa submit laporan.

**Key Characteristics:**
- Biru korporat Alfamart sebagai primary, bukan aksesori
- Flat-by-default di mobile; sedikit elevation di desktop admin
- Status di-encode via warna dan label — tidak pernah hanya salah satunya
- Mobile-first untuk BMS; data-dense untuk admin desktop
- Geist, satu typeface, multiple weight — tidak ada drama tipografi

## 2. Colors: The Corporate Blue System

Palette didominasi satu brand color yang kuat. Semua aksen lain bersifat semantik (status) atau netral (surface, text, border).

### Primary
- **Corporate Blue** (`#0069a7`): Warna merek PT Sumber Alfaria Trijaya. Digunakan untuk tombol utama, link aktif, focus ring, sidebar, nav item aktif, dan semua CTA. Rarity-nya rendah karena ia adalah warna fungsional, bukan dekoratif.
- **Corporate Blue Deep** (`#005a8f`): Hover state untuk elemen primary. Juga digunakan untuk chart-2 di admin.
- **Corporate Blue Deeper** (`#004b77`): Active state dan sidebar primary. Chart-3 dan chart-4.
- **Corporate Blue Darkest** (`#00375c`): Sidebar primary di dark mode. Sangat sedikit digunakan — hanya untuk kontras ekstrem pada latar primary yang terang.

### Neutral
- **Ink / Foreground** (`oklch(0.13 0.028 261.692)` ≈ `#1a1f3c`): Semua body text dan heading. Blue-tinted dark, selaras dengan brand tanpa terasa murni hitam.
- **Muted Foreground** (`oklch(0.551 0.027 264.364)` ≈ `#6b7a9e`): Label sekunder, placeholder, metadata, timestamp. Tidak boleh digunakan untuk body text karena kontrasnya di bawah 4.5:1 pada background putih.
- **Background** (`oklch(1 0 0)` = `#ffffff`): Body page background. Murni putih; tidak ada tint hangat.
- **Card / Surface** (`oklch(1 0 0)` = `#ffffff`, dark: `oklch(0.21 0.034 264.665)`): Surface container untuk card dan popover.
- **Muted Surface** (`oklch(0.967 0.003 264.542)` ≈ `#f4f6f9`): Background input, secondary surface, muted areas.
- **Border** (`oklch(0.928 0.006 264.531)` ≈ `#e5e7eb`): Semua divider, input border, card border saat dibutuhkan.

### Status Colors (Semantic Only)
Status di SPARTA digunakan sangat konsisten melalui `activity-format.ts`. Warna ini tidak pernah dipakai untuk dekorasi.
- **Status Approved** (`emerald`: bg `#d1fae5`, text `#065f46`): ESTIMATION_APPROVED, WORK_APPROVED, FINAL_APPROVED_BNM, PJUM_APPROVED.
- **Status Rejected** (`red`: bg `#fee2e2`, text `#991b1b`): Semua varian REJECTED.
- **Status Revision** (`amber`: bg `#fef3c7`, text `#92400e`): Semua varian REJECTED_REVISION dan REVISED.
- **Status Pending / Neutral** (`blue`: bg `#dbeafe`, text `#1e40af`): Status diajukan, diproses, atau netral.
- **Destructive** (`oklch(0.55 0.22 30)` ≈ `#c2390e`): Hanya untuk aksi destruktif (hapus, batalkan). Bukan untuk status laporan.

**The Two-Signal Rule.** Status laporan selalu dikomunikasikan via warna DAN label teks. Warna saja tidak cukup (aksesibilitas). Label saja tidak cukup (keterbacaan cepat). Selalu keduanya, selalu dari `getActionBadgeClass()` dan `getActivityActionLabel()` yang sama.

## 3. Typography

**Display / Body Font:** Geist (dengan fallback `ui-sans-serif, system-ui, sans-serif`)
**Mono Font:** Geist Mono (untuk nomor laporan, kode, data teknis)

**Character:** Satu typeface, enam weight. Geist adalah geometric sans-serif dengan karakter netral dan legibility tinggi di ukuran kecil — pilihan tepat untuk tool korporat yang sering menampilkan data padat. Tidak ada pasangan serif; typographic hierarchy dibangun dari weight dan ukuran, bukan keberagaman typeface.

### Hierarchy
- **Display** (600, 1.5rem, 1.25): Header halaman, title mobile. Digunakan sparingly — hanya satu per layar.
- **Headline** (600, 1.125rem, 1.4): Section header, card title, nama komponen penting di dashboard.
- **Title** (500, 0.9375rem, 1.5): Sub-section, label kolom tabel, judul panel.
- **Body** (400, 0.875rem, 1.6): Semua konten paragraf, deskripsi, metadata. Maks 75ch untuk body text panjang.
- **Label** (500, 0.75rem, 1.4): Badge, status chip, nav item label, tabel header. Sering uppercase dengan `tracking-wide` (0.08em) untuk kategori.

**The No-Novelty Rule.** Tidak ada font kedua. Tidak ada display size di atas 1.5rem pada halaman ini (tool korporat, bukan landing page). Letter-spacing negatif di bawah -0.04em dilarang — terlalu rapat.

## 4. Elevation

SPARTA menggunakan hybrid elevation: flat-by-default untuk mobile BMS, sedikit elevation di desktop admin.

Untuk **BMS mobile** (`/dashboard`, `/activity`, `/reports`): interface sepenuhnya flat. Tidak ada `box-shadow` pada activity item, card list, atau section container. Depth dikomunikasikan melalui warna background (muted surface vs. putih) dan border tipis (`border-border/40`). Pendekatan ini mengurangi visual noise pada layar kecil dengan pencahayaan bervariasi di lapangan.

Untuk **admin dan manager desktop** (`/dashboard` admin, tabel reports): boleh menggunakan shadow minimal untuk card yang perlu dibedakan dari background utama.

### Shadow Vocabulary
- **None (mobile BMS)**: `box-shadow: none`. Flat total. Depth via tonal layering.
- **Surface Lift** (`shadow-xs`): `0 1px 2px 0 rgb(0 0 0 / 0.05)`. Digunakan pada input field dan button outline di desktop — hanya untuk affordance, bukan dekorasi.
- **Card Elevation** (`shadow-sm`): `0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)`. Hanya untuk modal, popover, dropdown. Tidak untuk card konten biasa.

**The Flat-Mobile Rule.** Komponen BMS mobile tidak boleh memiliki `shadow-sm` atau lebih besar. Jika sebuah komponen memerlukan shadow untuk terlihat sebagai "unit terpisah" di mobile, strukturnya perlu dipikirkan ulang — bukan shadownya yang ditambah.

## 5. Components

### Buttons
Tool yang efisien membutuhkan tombol yang reliabel dan ringkas. Tidak ada animasi berlebihan; transisi cukup 150ms.

- **Shape:** Rounded medium (10px / `rounded-[var(--radius)]`)
- **Primary:** Background `#0069a7`, text putih, padding `0 10px`, height 36px. Hover: `#005a8f`. Focus: ring 3px `#0069a7/50`.
- **Outline:** Border `oklch(0.928...)`, background transparent-ish, hover muted. `shadow-xs` untuk affordance.
- **Ghost:** Transparent background, hover `bg-muted`. Untuk aksi sekunder dan navigasi.
- **Destructive:** Background merah transparan (`bg-destructive/10`), text merah. Tidak pernah solid merah kecuali dalam alert dialog konfirmasi.
- **Icon variants:** `size-6` (xs), `size-8` (sm), `size-9` (default), `size-10` (lg) — untuk nav button dan aksi inline.

### Badges / Status Chips
Komponen terpenting di SPARTA. Setiap laporan punya status; setiap aktivitas punya aksi. Badge mengkomunikasikan keduanya.

- **Shape:** Full-pill (`border-radius: 9999px`)
- **Default (primary):** `bg-primary text-white`
- **Status variants:** Color-coded per semantic role (lihat Colors → Status Colors). Selalu dari `getActionBadgeClass()` dan `getActivityActionLabel()`.
- **Ukuran:** Kecil (`text-[9px]`, `px-1.5 py-0.5`) untuk in-list activity item; normal (`text-xs`, `h-5 px-2`) untuk tabel dan detail.
- **Rule:** Selalu disertai label teks. Tidak pernah warna saja.

### Cards / Containers
- **Mobile BMS:** Tidak ada border, tidak ada shadow. Section flat dengan `border-b border-border/40` sebagai divider antar item. Background transparant atau `bg-muted/30` pada hover.
- **Desktop Admin/Manager:** `rounded-lg` (10px), border tipis `border-border`, `shadow-xs` opsional. Tidak nested cards.
- **Internal Padding:** `p-4` (16px) untuk card konten, `p-3` (12px) untuk list item compact.

### Inputs / Fields
- **Style:** Border `border-input`, background transparent (light) atau `bg-input/30` (dark), radius `rounded-md` (6px), height 36px.
- **Focus:** Ring 3px `ring-ring/50` + border berubah ke `border-ring`. Transition `color, box-shadow`.
- **Error:** Ring merah `ring-destructive/20`, border merah. Label via `aria-invalid`.
- **Search input:** Selalu disertai ikon `Search` di `left-2.5` dengan `h-4 w-4 text-muted-foreground`.

### Navigation (BMS Mobile Bottom Nav)
- **Style:** Fixed bottom, `bg-background/90 backdrop-blur-xl`, border top `border-border/60`. Safe area aware (`pb-[env(safe-area-inset-bottom)+15px]`).
- **Nav item:** Flex column, ikon `size-5`, label `text-[8px] font-bold uppercase tracking-wide`. Min touch target `min-h-11`.
- **Active state:** `bg-primary/15 text-primary`. Inactive: `text-muted-foreground`.
- **Menu item:** Membuka Sheet dari bawah untuk aksi sekunder (Ganti Password, Logout).

### Activity Item (Signature Component)
Komponen paling sering muncul di SPARTA untuk BMS. Flat, tanpa card wrapper.

- **Layout:** Flex row, gap 12px, padding `p-3`, `border-b border-border/40`.
- **Icon container:** `size-9`, `rounded-xl`, warna tonal sesuai aksi (sky untuk created, emerald untuk approved, red untuk rejected, amber untuk revision).
- **Content:** Nomor laporan (link ke detail), metadata toko/cabang, badge status, nama aktor.
- **Time:** Relative time (`formatRelativeDate`) atau jam absolut tergantung konteks.
- **Hover:** `hover:bg-muted/30 transition-colors`.

### Sticky Search Bar (Activity Page)
- **Layout:** `sticky`, mengikuti header visibility dengan `transition-[top]`.
- **Search:** Full-width input dengan ikon Search di kiri, `bg-card`, height 36px.
- **Filter:** Tombol icon `Filter` di kanan, membuka `DropdownMenu` dengan `DropdownMenuRadioGroup`.

## 6. Do's and Don'ts

### Do:
- **Do** selalu gunakan label teks bersama warna pada setiap badge status — warna saja tidak cukup untuk aksesibilitas.
- **Do** gunakan `getActionBadgeClass()` dan `getActivityActionLabel()` dari `activity-format.ts` sebagai single source of truth untuk semua warna dan label status aktivitas.
- **Do** buat tampilan BMS mobile flat total — tidak ada shadow pada list item atau section container mobile.
- **Do** jaga touch target minimum 44px untuk semua elemen interaktif di BMS mobile.
- **Do** gunakan `formatRelativeDate()` dan label tanggal relatif ("Hari ini", "Kemarin") untuk aktivitas terbaru di BMS.
- **Do** cap line length body text di 65–75ch pada halaman dengan konten panjang.
- **Do** gunakan primary blue `#0069a7` sebagai identitas brand — dia adalah fungsional, bukan dekorasi.
- **Do** pisahkan status laporan dan status PJUM — keduanya berbeda dan tidak boleh dikombinasikan dalam satu badge.
- **Do** gunakan komponen dan pola yang sudah ada sebelum membuat yang baru — shadcn/ui + lucide-react sudah cukup.
- **Do** implement `@media (prefers-reduced-motion: reduce)` untuk semua animasi.

### Don't:
- **Don't** gunakan glassmorphism, gradient mesh, atau efek visual dekoratif — SPARTA bukan startup SaaS.
- **Don't** bungkus setiap section dalam card — gunakan section/table ketika itu pilihan yang lebih baik. Nested cards selalu salah.
- **Don't** gunakan warna status (approved/rejected/revision) untuk tujuan non-semantik atau dekorasi.
- **Don't** tambah font kedua — satu typeface (Geist) dengan multiple weight sudah cukup.
- **Don't** gunakan `border-left` berwarna lebih dari 1px sebagai aksen — itu adalah anti-pattern yang dilarang.
- **Don't** gunakan `box-shadow` pada activity item atau section container BMS mobile.
- **Don't** buat interface yang terasa "fun" atau cartoonish — SPARTA dipakai petugas lapangan dalam konteks operasional serius.
- **Don't** gunakan `PJUM_CREATED` atau `PJUM_APPROVED` sebagai filter langsung ke Prisma `activityLog` — aksi PJUM adalah virtual/synthetic dan tidak ada di enum database `ActivityAction`.
- **Don't** tampilkan label ambigu seperti "selesai" untuk timestamp selain final BNM approval — gunakan `finishedAt` dengan label eksplisit "Selesai".
- **Don't** buat komponen baru jika helper lokal atau shadcn/ui sudah cukup — konsistensi lebih penting dari inovasi lokal.
