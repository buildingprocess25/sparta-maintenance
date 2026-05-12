# REFACTOR PLAN — Struktur File & Folder

> Project: SPARTA Maintenance | Stack: Next.js 16 (App Router) | Dibuat: 12 Mei 2026

## 1. RINGKASAN TEMUAN

Tabel berikut merangkum masalah utama yang ditemukan selama analisis struktur folder dan file.

| Kategori Masalah      | Temuan Utama                                                             | Jumlah File Terdampak | Urgensi |
| :-------------------- | :----------------------------------------------------------------------- | :-------------------- | :------ |
| **Logic Leakage**     | Akses Prisma langsung di file `page.tsx` dan komponen UI                 | ~15+ file             | Tinggi  |
| **Hook Dispersion**   | Custom hooks tersebar di `hooks/`, `lib/hooks/`, dan folder `app/`       | ~10+ file             | Sedang  |
| **Large Components**  | File komponen > 1000 baris (misal: `pjum-view.tsx`)                      | ~5 file               | Tinggi  |
| **Type Scattering**   | Definisi TypeScript tersebar, tidak terpusat di `@/types`                | ~20+ file             | Sedang  |
| **Naming Convention** | Mix antara kebab-case dan PascalCase, inkonsistensi folder `_components` | Proyek Luas           | Rendah  |

- **Total file dianalisis:** ~440 file
- **Estimasi waktu refactor:** 3-5 hari kerja (bertahap)

---

## 2. KONDISI SAAT INI vs TARGET

### Struktur Folder SEKARANG (Aktual)

```text
sparta-maintenance/
├── app/
│   ├── reports/
│   │   ├── _components/        # Komponen lokal bercampur
│   │   └── actions/            # Server actions
│   └── api/
├── components/
│   └── ui/                     # Shadcn UI
├── hooks/                      # Beberapa hook
├── lib/
│   ├── hooks/                  # Hook lainnya
│   └── ...
├── prisma/
├── scripts/
├── types/                      # Hanya sedikit type
└── ...
```

### Struktur Folder TARGET (Rekomendasi)

```text
sparta-maintenance/
├── app/                        # KHUSUS Routing, Layout, & Page
│   ├── (auth)/                 # Route grouping
│   ├── (dashboard)/            # Dashboard routes
│   └── ...
├── components/                 # Semua komponen reusable
│   ├── ui/                     # Base UI (shadcn)
│   ├── shared/                 # Komponen antar role
│   ├── reports/                # Komponen khusus domain report
│   └── layout/                 # Header, Footer, Sidebar
├── hooks/                      # Pusat semua custom hooks
├── lib/                        # Shared logic & Core config
│   ├── prisma.ts
│   └── logger.ts
├── services/                   # Data Access Layer & Business Logic
│   ├── report-service.ts       # Pindahan dari page.tsx / actions
│   └── user-service.ts
├── types/                      # Pusat semua TypeScript definitions
│   ├── index.ts                # Barrel file
│   └── reports.ts
├── scripts/                    # CLI scripts
├── public/                     # Static assets
└── prisma/                     # Database & migrations
```

---

## 3. DAFTAR MASALAH DETAIL

### [DDB] Direct Database Access in UI — Urgensi: Tinggi

- **File terdampak:** `app\reports\[reportNumber]\page.tsx`, `app\reports\_components\bmc-approval-list.tsx`, dll.
- **Masalah:** Komponen UI memanggil `prisma.report.findUnique` secara langsung. Hal ini menyulitkan testing, reusable logic, dan melanggar prinsip separation of concerns.
- **Solusi:** Ekstrak query ke dalam folder `services/` atau `lib/queries/` dengan penanda `"server-only"`.
- **Risiko:** Rendah (hanya pemindahan fungsi), asalkan async/await tetap terjaga.

### [LGC] Large Monolithic Components — Urgensi: Tinggi

- **File terdampak:** `app\reports\pjum\_components\pjum-view.tsx` (1466 baris).
- **Masalah:** Komponen terlalu besar, sulit dimaintain, dan menggabungkan banyak sub-fitur (tabel, filter, export, history) dalam satu file.
- **Solusi:** Pecah menjadi sub-komponen kecil di folder `app/reports/pjum/_components/` atau `components/reports/`.
- **Risiko:** Sedang (prop drilling atau state management shared perlu diperhatikan).

### [HKS] Scattered Custom Hooks — Urgensi: Sedang

- **File terdampak:** `lib\hooks\use-photo-upload.ts` vs `app\reports\(bms)\create\hooks\use-photo-upload.ts`.
- **Masalah:** Duplikasi logic atau inkonsistensi lokasi hook. Developer bingung harus pakai yang mana.
- **Solusi:** Unifikasi hook ke folder `@/hooks`. Gunakan komposisi jika fiturnya sedikit berbeda.
- **Risiko:** Rendah (hanya update import path).

---

## 4. RENCANA EKSEKUSI (BERTAHAP)

### Fase 1 — Quick Wins (1-2 jam)

- [ ] Buat folder `@/types` jika belum ada dan migrasikan interface umum.
- [ ] Pindahkan semua hook dari `lib/hooks` ke root `hooks/`.
- [ ] Update path alias di `tsconfig.json` jika perlu penambahan (misal `@/services`).

### Fase 2 — Reorganisasi Struktur (1 hari)

- [ ] Standarisasi penamaan file komponen (rekomendasi: kebab-case konsisten dengan shadcn).
- [ ] Pindahkan komponen dari `_components` lokal ke `@/components/domain-name` jika dirasa reusable di role lain.
- [ ] Hapus file config redundant (`prisma.config.ts` jika memang sudah dicover oleh `schema.prisma` dan env). _Catatan: Cek penggunaan Prisma 7._

### Fase 3 — Pemisahan Concern (2 hari)

- [ ] Buat `services/` layer. Pindahkan logic `prisma.xxx.findMany` dari Page/Component ke Service.
- [ ] Refactor `pjum-view.tsx`: Ekstrak `PjumTable`, `PjumFilters`, dan `PjumHistory` ke file terpisah.
- [ ] Integrasi hooks: Pastikan satu flow (misal upload foto) menggunakan satu hook utama yang konsisten.

### Fase 4 — Polish & Documentation (0.5 hari)

- [ ] Tambahkan barrel files (`index.ts`) untuk memudahkan import.
- [ ] Update `AI_CONTEXT.md` dengan struktur folder yang baru.
- [ ] Jalankan `npm run lint` dan `tsc --noEmit` untuk memastikan tidak ada broken imports.

---

## 5. FILE YANG TIDAK BOLEH DIPINDAH / DIUBAH

| File                 | Alasan                                                       |
| :------------------- | :----------------------------------------------------------- |
| `app/layout.tsx`     | Root layout Next.js                                          |
| `app/api/**/*`       | Endpoint publik/internal, pindah path akan memutus integrasi |
| `instrumentation.ts` | Magic file Next.js untuk logging/monitoring                  |
| `next.config.ts`     | Konfigurasi framework                                        |

---

## 6. SETUP PENDUKUNG YANG DIREKOMENDASIKAN

1. **Path Aliases:**
    ```json
    "paths": {
      "@/components/*": ["components/*"],
      "@/hooks/*": ["hooks/*"],
      "@/services/*": ["services/*"],
      "@/types/*": ["types/*"],
      "@/lib/*": ["lib/*"]
    }
    ```
2. **ESLint Rule:** Tambahkan rule untuk mencegah import relatif yang terlalu panjang (`../../../../`).

---

## 7. CHECKLIST SEBELUM MERGE

- [ ] Semua import sudah diupdate (Gunakan search & replace global dengan hati-hati)
- [ ] `npm run build` berhasil tanpa error
- [ ] Fitur utama (Upload foto, Submit report, PDF generation) sudah ditest manual
- [ ] Tidak ada file `index.ts` yang menyebabkan circular dependency
- [ ] `AI_CONTEXT.md` sudah mencerminkan kondisi terbaru
