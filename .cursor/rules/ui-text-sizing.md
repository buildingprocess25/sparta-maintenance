# UI Text Sizing Rules

## Desktop-First Philosophy

Sistem ini desktop-first untuk semua role kecuali BMS saat **membuat laporan** (`/reports/create`). Selalu design untuk desktop terlebih dahulu, lalu responsifkan untuk mobile — bukan sebaliknya.

## Base Size

| Konteks | Base terkecil yang boleh digunakan |
| ------- | ---------------------------------- |
| Desktop | `text-base` (16px)                 |
| Mobile  | `text-xs` (12px)                   |

Semua teks yang terlihat di desktop **minimum `text-base`**; teks yang hanya muncul di mobile minimum `text-xs`.

## Typography Scale

| Elemen                    | Desktop                         | Mobile (responsive)             |
| ------------------------- | ------------------------------- | ------------------------------- |
| Page title / hero heading | `text-2xl` – `text-3xl`         | boleh lebih kecil               |
| Section heading           | `text-xl`                       | `text-lg`                       |
| Card title / subsection   | `text-lg font-semibold`         | `text-base font-semibold`       |
| Body text / paragraf      | `text-base`                     | `text-xs`                       |
| Label / field label       | `text-base font-medium`         | `text-xs font-medium`           |
| Helper / description      | `text-sm text-muted-foreground` | `text-xs text-muted-foreground` |
| Badge / chip              | `text-sm`                       | `text-xs`                       |
| Metadata / timestamp      | `text-sm text-muted-foreground` | `text-xs text-muted-foreground` |

## Aturan Spesifik

### Yang BOLEH `text-xs`:

- Badge/chip status (`<Badge>`)
- Timestamp / metadata kecil (tanggal, jam)
- Helper text / description sekunder di bawah elemen utama
- Label pada elemen yang memang kecil (pagination, breadcrumb)

### Yang TIDAK BOLEH `text-xs` di desktop:

- Label utama sebuah stat card → gunakan `text-base font-semibold`
- Judul card atau section → gunakan `text-lg` atau `text-xl`
- Konten tabel (cell data) → gunakan `text-base`
- Teks dalam tombol → gunakan `text-base` atau `text-sm` (sesuai Button component)
- Teks navigasi menu → gunakan `text-base`
- Helper/description text → gunakan `text-sm` (bukan `text-xs`)

### Jangan gunakan:

- `text-[10px]`, `text-[11px]` — terlalu kecil
- `text-xs` untuk teks utama / label di desktop
- `hidden md:block` untuk menyembunyikan teks penting di mobile → lebih baik truncate atau wrap

## Responsive Pattern

Tailwind adalah mobile-first: kelas tanpa prefix berlaku untuk **semua ukuran layar** (termasuk mobile). Tambahkan `lg:` untuk override di desktop. Desain untuk desktop dulu, lalu pastikan mobile tetap terbaca.

```tsx
// ✅ Benar — mobile xs, desktop base
<p className="text-xs lg:text-base">Label utama</p>

// ✅ Benar — helper: mobile xs, desktop sm
<p className="text-xs lg:text-sm text-muted-foreground">Deskripsi</p>

// ✅ Benar — elemen yang hanya muncul di desktop (hidden di mobile)
<p className="text-sm hidden lg:block text-muted-foreground">Teks desktop only</p>

// ❌ Salah — xs di desktop, tidak boleh untuk konten utama
<p className="text-xs">Label</p>

// ❌ Salah — pixel sizes
<p className="text-[10px]">Metadata</p>
```

Kecuali untuk BMS create-report flow (`/reports/create`) dan komponen yang memang mobile-first.

## Stat Cards Pattern

```tsx
// Angka stat
<div className="text-2xl lg:text-3xl font-bold tabular-nums">{value}</div>

// Label utama stat — mobile xs, desktop base
<p className="text-xs font-semibold lg:text-base mt-1.5">{label}</p>

// Deskripsi sekunder — desktop only (hidden di mobile), cukup text-sm
<p className="text-sm text-muted-foreground mt-1 leading-snug hidden lg:block">{description}</p>
```
