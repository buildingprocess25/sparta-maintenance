# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Quick Start Commands

```bash
# Development
npm run dev              # Start Next.js dev server (http://localhost:3000)
npm run build            # Build for production
npm run start            # Run production build

# Linting and code quality
npm run lint             # Run ESLint

# Database
npm run db:generate      # Generate Prisma Client (run after schema changes)
npm run db:studio        # Open Prisma Studio (visual DB browser)
npm run db:seed          # Seed initial data
npx prisma migrate dev --name <name>  # Create and run migration
npx prisma migrate deploy             # Deploy migrations to production DB

# User and data management
npm run create-user      # Create a new user via CLI
npm run import:stores    # Import store data from XLSX
npm run fix:store-branch # Correct store branch assignments from XLSX

# Google Drive and authentication
npm run auth:google      # Generate Google OAuth refresh token
npm run test:gdrive      # Validate Google Drive connection

# Maintenance and cleanup
npm run backup:db        # Backup database to local/Drive
npm run cleanup:pending  # Clean up pending reports older than CLEANUP_PENDING_EXPIRY_DAYS
npm run cleanup-photos-v2        # Dry-run: archive approved PJUM photos
npm run cleanup-photos-v2:execute # Execute: archive approved PJUM photos
```

## Project Overview

**SPARTA Maintenance** is an internal application for reporting, approving, and tracking store maintenance work. It manages the complete lifecycle from initial damage reports through estimation, approval, execution, and final documentation.

**Key roles:**
- **BMS**: Branch Maintenance Support — creates reports, executes work, submits completion
- **BMC**: Branch Maintenance Coordinator — reviews estimations and work completion
- **BNM Manager**: Final approval authority
- **Admin**: System administration and data management

**Tech stack:** Next.js 16 (App Router), React 19, TypeScript 5, Prisma 7, PostgreSQL, Tailwind CSS 4, shadcn/ui

## Architecture

### High-Level Structure

```
sparta-maintenance/
├── app/                    # Next.js App Router (pages, layouts, API routes)
│   ├── api/               # API endpoints (health, auth, PDF, photos, cron)
│   ├── dashboard/         # Role-based dashboards
│   ├── reports/           # Report creation, workflow, PJUM
│   ├── login/             # Authentication
│   └── admin/             # Admin backoffice
├── components/            # Shared UI components (shadcn/ui + custom)
├── lib/                   # Domain logic and services
│   ├── email/            # Email templates and Nodemailer
│   ├── google-drive/     # Google Drive API clients and helpers
│   ├── pdf/              # PDF generation with React-PDF
│   ├── storage/          # Photo upload and proxy logic
│   └── authorization.ts  # Auth helpers and role checks
├── prisma/               # Database schema, migrations, seed
├── scripts/              # CLI utilities (user creation, backups, cleanup)
└── types/                # Shared TypeScript types
```

### Data Flow

1. **User actions** → Server Actions or API routes
2. **Validation** → Zod schemas, role/ownership checks
3. **Database** → Prisma queries to PostgreSQL
4. **Side effects** → Email (Nodemailer), PDF generation, Google Drive operations
5. **Response** → JSON or binary (PDF)

### External Services

- **PostgreSQL** (Aiven): Primary database via `DATABASE_URL` and `DIRECT_URL`
- **Google Drive API**: Photo storage (CDN), PDF archival, backup
- **Gmail OAuth2**: Email notifications
- **Render**: Docker deployment with health check at `/api/health`

## Report Workflow

Reports follow this status progression:

```
DRAFT
  → PENDING_ESTIMATION
  → ESTIMATION_APPROVED (or APPROVED_BMC for zero-cost REKANAN)
  → IN_PROGRESS
  → PENDING_REVIEW
  → APPROVED_BMC
  → COMPLETED
```

With rejection/revision branches:
- `ESTIMATION_REJECTED_REVISION`: Estimation sent back to BMS
- `ESTIMATION_REJECTED`: Permanent rejection
- `REVIEW_REJECTED_REVISION`: Completion sent back to BMS

## Key Patterns and Conventions

### Server Actions

Located in `app/**/actions/*.ts` with `"use server"` directive. Follow this pattern:

```typescript
"use server";

import { requireAuth, requireRole } from "@/lib/authorization";
import { validateCSRF } from "@/lib/csrf";
import { z } from "zod";

const schema = z.object({
  // validation schema
});

export async function myAction(input: unknown) {
  const user = await requireAuth();
  await requireRole(user, ["BMS", "ADMIN"]);
  await validateCSRF();

  const data = schema.parse(input);
  
  // Database operations
  // ActivityLog entry if needed
  // revalidatePath() to refresh UI
  
  return { success: true };
}
```

### Database Queries

Server-only queries go in files marked with `"use server-only"` or in `lib/` modules. Use Prisma Client:

```typescript
import { prisma } from "@/lib/prisma";

export async function getReportsByBranch(branchName: string) {
  return prisma.report.findMany({
    where: { branchName },
    include: { store: true },
  });
}
```

### Components

- Use **shadcn/ui components first** before creating custom components
- Custom components go in `components/` with descriptive names
- Sub-components for a page go in `_components/` folder within that page
- Props should be reusable; avoid hardcoding values

**Important:** Do not add manual spacing (padding, gap, margin) to shadcn components — they have calibrated spacing. Use layout wrappers (flex, grid) on containers instead.

### PDF Generation

Use `@react-pdf/renderer` for server-side PDF generation. Snapshots are stored in Google Drive and referenced in the Report model.

```typescript
import { Document, Page, Text } from "@react-pdf/renderer";

export function MyPDFDocument({ data }) {
  return (
    <Document>
      <Page>
        <Text>{data.title}</Text>
      </Page>
    </Document>
  );
}
```

### Email

Use Nodemailer with Gmail OAuth2. Templates are in `lib/email/templates/`. Send via:

```typescript
import { sendEmail } from "@/lib/email/mailer";

await sendEmail({
  to: user.email,
  subject: "Your Subject",
  html: emailTemplate({ data }),
});
```

### Photo Storage

Photos are uploaded to Google Drive CDN and proxied through `/api/photos/[fileId]` to avoid CORS/rate-limit issues. The Report model stores `drivePhotoFileIds` (JSONB array).

## Database Schema Highlights

**Core tables:**
- `User`: NIK (PK), email, role, branchNames, passwordHash
- `Store`: code (PK), name, branchName, isActive
- `Report`: reportNumber (PK), status, items (JSONB), estimations (JSONB), totalEstimation, totalReal
- `ApprovalLog`: Audit trail for approvals/rejections
- `ActivityLog`: Audit trail for all report actions
- `PjumExport`: Weekly PJUM documents with approval workflow
- `PjumBankAccount`: Bank account data for PJUM
- `AppSetting`: System settings (e.g., maintenance mode toggle)

**Important:** Use JSONB for Report.items and Report.estimations rather than creating separate relational tables.

## Authorization

Three main helpers in `lib/authorization.ts`:

```typescript
await requireAuth();           // Ensure user is logged in
await requireRole(user, ["BMS", "ADMIN"]);  // Check role
await requireBranchAccess(user, branchName); // Check branch scope
```

Session is JWT-based, stored in httpOnly cookie, valid for 8 hours.

## Environment Variables

**Required:**
- `DATABASE_URL`: Pooled connection string
- `DIRECT_URL`: Non-pooled connection (for migrations)
- `SESSION_SECRET`: JWT secret (min 32 chars)
- `NEXT_PUBLIC_APP_URL`: Public app URL
- `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REFRESH_TOKEN`: Gmail OAuth
- `GMAIL_USER`: Sender email address
- `GOOGLE_DRIVE_ROOT_FOLDER_ID`: Drive folder for PDF archives
- `DRIVE_CDN_*`: Drive CDN credentials (if using separate OAuth client)

**Optional:**
- `CRON_SECRET`: Token for cron endpoints
- `CLEANUP_PENDING_EXPIRY_DAYS`: TTL for pending reports (default 14)
- `MAINTENANCE_MODE`: Hard override for maintenance page
- `REQUEST_LOG_ENABLED`: Enable structured request logging

## Important Files

| File | Purpose |
|------|---------|
| `prisma/schema.prisma` | Database schema definition |
| `lib/authorization.ts` | Auth helpers and role checks |
| `lib/session.ts` | Session management |
| `lib/prisma.ts` | Prisma Client singleton |
| `lib/logger.ts` | Structured logging |
| `app/api/health/route.ts` | Health check endpoint |
| `proxy.ts` | Middleware for route protection |
| `next.config.ts` | Next.js config (standalone output for Docker) |
| `AI_RULES.md` | Coding rules (shadcn/ui priority, no manual spacing) |

## Common Workflows

### Adding a New Feature

1. **Plan the authorization scope** — which roles can access it?
2. **Create the database schema** — add to `prisma/schema.prisma`, run `npm run db:generate`
3. **Create a server action** — with validation, auth checks, ActivityLog entry
4. **Build the UI** — use shadcn/ui components, follow existing patterns
5. **Test locally** — `npm run dev`, verify with different roles
6. **Update ActivityLog** — if the feature modifies reports or critical data

### Modifying Report Status

1. Update the `ReportStatus` enum in `prisma/schema.prisma`
2. Run `npm run db:generate`
3. Update status transition logic in relevant server actions
4. Update dashboard filters and queries
5. Consider PDF snapshot implications (if status affects final approval)

### Adding a New API Endpoint

1. Create `app/api/[path]/route.ts`
2. Add auth checks: `requireAuth()`, `requireRole()`, or `requireBranchAccess()`
3. Validate input with Zod
4. Return JSON or binary (PDF)
5. Add to endpoint list in README.md

### Deploying to Production

1. Ensure all migrations are committed: `npx prisma migrate deploy`
2. Build locally: `npm run build`
3. Push to main branch
4. Render auto-deploys from main via `render.yaml`
5. Health check: `GET /api/health` should return 200

## Testing and Debugging

- **No test suite currently** — manual testing required
- **Dev-only endpoints** exist for PDF preview (`/api/preview-pdf`, `/api/preview-pjum`)
- **Prisma Studio** for visual DB inspection: `npm run db:studio`
- **Request logging** can be enabled via `REQUEST_LOG_ENABLED` env var
- **Maintenance mode** can be toggled via Admin dashboard or `MAINTENANCE_MODE=true`

## Notes

- Preventive Category I items can only be filled once per quarter (server-side validation)
- Zero-cost REKANAN reports can skip BMS work phase (go directly to APPROVED_BMC)
- Start work requires selfie, receipt, and material store (unless total estimation is zero)
- Completion captures actual costs in `totalReal` and item-level realization
- PJUM (weekly accountability document) requires BMC creation and BNM approval
- All PDF snapshots are archived to Google Drive for compliance
