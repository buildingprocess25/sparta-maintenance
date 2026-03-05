# UI Text Sizing Rules

## Desktop-First Philosophy

Sistem ini desktop-first untuk semua role kecuali BMS saat **membuat laporan** (`/reports/create`). Selalu design untuk desktop terlebih dahulu, lalu responsifkan untuk mobile — bukan sebaliknya.

## Typography Scale

| Elemen                    | Class                                 | Keterangan                   |
| ------------------------- | ------------------------------------- | ---------------------------- |
| Page title / hero heading | `text-2xl` – `text-3xl`               | H1 halaman                   |
| Section heading           | `text-xl`                             | H2 dalam halaman             |
| Card title / subsection   | `text-base` – `text-lg font-semibold` | Judul card                   |
| Body text / paragraf      | `text-sm` – `text-base`               | Konten utama                 |
| Label / field label       | `text-sm font-medium`                 | Form label, stat label       |
| Helper / description      | `text-xs text-muted-foreground`       | Teks sekunder di bawah label |
| Badge / chip              | `text-xs`                             | Badge status, tag kecil      |
| Metadata / timestamp      | `text-xs text-muted-foreground`       | Tanggal, nama actor          |

## Aturan Spesifik

### Yang BOLEH `text-xs`:

- Badge/chip status (`<Badge>`)
- Timestamp / metadata kecil (tanggal, jam)
- Helper text / description sekunder di bawah elemen utama
- Label pada elemen yang memang kecil (pagination, breadcrumb)

### Yang TIDAK BOLEH `text-xs`:

- Label utama sebuah stat card → gunakan `text-sm font-semibold`
- Judul card atau section → gunakan `text-base` atau `text-lg`
- Konten tabel (cell data) → gunakan `text-sm`
- Teks dalam tombol → gunakan `text-sm` (default button)
- Teks navigasi menu → gunakan `text-sm`

### Jangan gunakan:

- `text-[10px]`, `text-[11px]` — terlalu kecil, tidak terbaca di desktop
- `hidden md:block` untuk menyembunyikan teks penting di mobile → lebih baik truncate atau wrap

## Responsive Pattern

Tulis kelas **tanpa prefix** untuk desktop, tambahkan **`sm:`** atau **`md:`** hanya jika mobile perlu lebih kecil:

```tsx
// ✅ Benar — desktop-first
<p className="text-sm sm:text-xs">Label</p>

// ❌ Salah — mobile-first lalu di-override
<p className="text-xs md:text-sm">Label</p>
```

Kecuali untuk BMS create-report flow (`/reports/create`) dan komponen yang memang mobile-first.

## Stat Cards Pattern

```tsx
// Angka stat
<div className="text-3xl font-bold tabular-nums">{value}</div>

// Label utama stat
<p className="text-sm font-semibold mt-1.5">{label}</p>

// Deskripsi sekunder
<p className="text-xs text-muted-foreground mt-1 leading-snug">{description}</p>
```
