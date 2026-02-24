# SPARTA Maintenance

![Next.js](https://img.shields.io/badge/Next.js-16.1-black?logo=next.js&logoColor=white)
![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white)
![Prisma](https://img.shields.io/badge/Prisma-7-2D3748?logo=prisma&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4-06B6D4?logo=tailwindcss&logoColor=white)
![Supabase](https://img.shields.io/badge/Supabase-3FCF8E?logo=supabase&logoColor=fff)
![Vercel](https://img.shields.io/badge/Vercel-%23000000.svg?logo=vercel&logoColor=white)
![License](https://img.shields.io/badge/License-Proprietary-red)

**Sistem Pelaporan dan Tracking Aset — Maintenance**

Platform terpusat untuk pelaporan kerusakan, monitoring perbaikan, dan pengelolaan estimasi biaya maintenance di seluruh store.

---

## Tech Stack

| Layer     | Technology                                                |
| --------- | --------------------------------------------------------- |
| Framework | [Next.js 16](https://nextjs.org/) (App Router)            |
| Language  | TypeScript 5                                              |
| UI        | React 19 · shadcn/ui · Tailwind CSS 4                     |
| Database  | PostgreSQL via [Neon](https://neon.tech/)                 |
| ORM       | [Prisma 7](https://www.prisma.io/) (Neon adapter)         |
| Storage   | [Supabase](https://supabase.com/) (photo uploads)         |
| Auth      | Session-based JWT ([jose](https://github.com/panva/jose)) |
| PDF       | [@react-pdf/renderer](https://react-pdf.org/)             |
| Email     | Nodemailer + Gmail OAuth2                                 |
| Font      | Outfit · Geist Sans · Geist Mono                          |

---

## Features

### Role-Based Access

| Role      | Full Name                      | Capabilities                             |
| --------- | ------------------------------ | ---------------------------------------- |
| **BMS**   | Branch Maintenance Support     | Buat laporan, estimasi BMS, lihat status |
| **BMC**   | Branch Maintenance Coordinator | Approve/reject laporan, riwayat approval |
| **ADMIN** | Administrator                  | Verifikasi dokumen, arsip, pengaturan    |

### Core Flow

```
BMS membuat laporan → Isi checklist kondisi toko → Estimasi biaya BMS
    → Submit → BMC review & approve/reject → PDF report generated
```

- **Checklist Kondisi** — Inspeksi item store dengan kondisi (Baik/Rusak/Tidak Ada), foto, dan catatan
- **Estimasi BMS** — Input material, jumlah, satuan, dan harga per item rusak
- **Draft Auto-Save** — Debounce 2 detik, termasuk checklist & estimasi BMS
- **Approval Workflow** — BMC approve/reject dengan catatan; laporan rejected bisa diedit ulang
- **PDF Generation** — Generate laporan lengkap dengan React-PDF
- **Email Notification** — Notifikasi otomatis saat laporan di-submit via Gmail OAuth2

---

## Getting Started

### Prerequisites

- **Node.js** ≥ 18
- **npm** (included with Node.js)
- **PostgreSQL** database (recommended: [Neon](https://neon.tech/))
- **Supabase** project (for photo storage)

### 1. Clone & Install

```bash
git clone <repository-url>
cd sparta-maintenance
npm install
```

### 2. Environment Variables

Buat file `.env` di root project:

```env
# Database
DATABASE_URL="postgresql://..."
DIRECT_URL="postgresql://..."    # Direct connection (non-pooled)

# Session
SESSION_SECRET="your-secret-key-min-32-chars"

# Supabase (Photo Storage)
NEXT_PUBLIC_SUPABASE_URL="https://xxx.supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="eyJhbGci..."

# Gmail OAuth2 (Email Notifications)
GMAIL_USER="your-email@gmail.com"
GMAIL_CLIENT_ID="xxx.apps.googleusercontent.com"
GMAIL_CLIENT_SECRET="xxx"
GMAIL_REFRESH_TOKEN="xxx"

# App URL
NEXT_PUBLIC_APP_URL="http://localhost:3000"

# Dev only (optional)
DEV_EMAIL_RECIPIENT="dev@example.com"
```

### 3. Setup Database

```bash
# Generate Prisma Client
npm run db:generate

# Push schema ke database
npm run db:push

# (Optional) Seed data awal
npm run db:seed
```

### 4. Create Admin User

```bash
npm run create-user
```

### 5. Run Development Server

```bash
npm run dev
```

Buka [http://localhost:3000](http://localhost:3000).

---

## Project Structure

```
sparta-maintenance/
├── app/                    # Next.js App Router pages
│   ├── api/                # API routes (auth, reports)
│   ├── approval/           # BMC approval pages
│   ├── dashboard/          # Dashboard (role-based menus & stats)
│   ├── login/              # Login page
│   ├── reports/            # BMS report pages
│   │   ├── create/         # Create report form (checklist + estimasi)
│   │   │   └── components/ # Extracted UI components
│   │   ├── edit/           # Edit rejected reports
│   │   ├── finished/       # Completed reports
│   │   └── [reportNumber]/ # Report detail & PDF view
│   └── user-manual/        # User manual page
├── components/
│   ├── layout/             # Header, Footer, shared layouts
│   └── ui/                 # shadcn/ui components
├── lib/
│   ├── email/              # Email service (Gmail OAuth2)
│   ├── hooks/              # Custom React hooks
│   ├── pdf/                # PDF generation (React-PDF)
│   ├── authorization.ts    # Role-based auth guards
│   ├── checklist-data.ts   # Checklist categories & items
│   ├── prisma.ts           # Prisma client singleton
│   ├── session.ts          # JWT session management
│   └── supabase.ts         # Supabase client
├── prisma/
│   ├── schema.prisma       # Database schema
│   └── seed.ts             # Seed script
├── types/                  # Shared TypeScript types
└── scripts/                # Utility scripts (create-user)
```

---

## Database Schema

```mermaid
erDiagram
    User ||--o{ Report : creates
    User ||--o{ ApprovalLog : approves
    Store ||--o{ Report : has
    Report ||--o{ ApprovalLog : logs

    User {
        string NIK PK
        string email UK
        string name
        enum role "BMS | BMC | ADMIN"
        string[] branchNames
    }

    Store {
        string code PK
        string name
        string branchName
    }

    Report {
        string reportNumber PK
        string branchName
        string storeName
        enum status "DRAFT | PENDING | APPROVED | REJECTED | COMPLETED"
        decimal totalEstimation
        json items "ChecklistItem[]"
        json estimations "MaterialEstimation[]"
    }

    ApprovalLog {
        uuid id PK
        string reportNumber FK
        string approverNIK FK
        enum status
        string notes
    }
```

---

## Available Scripts

| Command               | Description                          |
| --------------------- | ------------------------------------ |
| `npm run dev`         | Start development server             |
| `npm run build`       | Build production bundle              |
| `npm run start`       | Start production server              |
| `npm run lint`        | Run ESLint                           |
| `npm run db:generate` | Generate Prisma Client               |
| `npm run db:push`     | Push schema to database              |
| `npm run db:studio`   | Open Prisma Studio                   |
| `npm run db:seed`     | Seed database                        |
| `npm run db:reset`    | Reset database & re-apply migrations |
| `npm run create-user` | Create a new user via CLI            |

---

## Teams

<a href="https://github.com/buildingprocess25/sparta-maintenance/graphs/contributors">
  <img src="https://contrib.rocks/image?repo=buildingprocess25/sparta-maintenance" />
</a>

## License

Proprietary — Internal asset of **PT Sumber Alfaria Trijaya, Tbk**. All rights reserved. See [LICENSE](LICENSE) for details.
