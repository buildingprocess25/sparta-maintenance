# PJUM QR Validator Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a public QR validator to approved PJUM PDFs so Finance can verify whether a printed PJUM document was produced by SPARTA.

**Architecture:** Store a random verification token and human-readable validation code on `PjumExport`. Approved PJUM PDFs embed a QR code that points to a public validator route, while the validator page reads only approved metadata and links to the official Drive PDF. PDF generation reserves safe QR space on SPARTA-generated pages, places a special QR block inside the PJUM form, and stamps a small QR/footer block on every other merged package page.

**Tech Stack:** Next.js 16 App Router, Prisma 7, PostgreSQL, React PDF, pdf-lib, `qrcode`, shadcn/ui-compatible styling, TypeScript.

## Global Constraints

- Public validator route must not require SPARTA login.
- The official PDF button remains public but links to the company Google Drive URL; Drive permissions decide whether the viewer can open it.
- QR text on the PJUM form must be `Scan untuk validasi` and `Kode: PJUM-XXXX`.
- QR text on all other pages must be `Validasi dokumen SPARTA` and `PJUM-XXXX`.
- Validation code must appear on every page together with the QR.
- Token URL must not expose the human-readable validation code as the secret.
- Public metadata must include report numbers.
- The validator UI must be responsive on mobile and match SPARTA Maintenance's compact operational style.
- PJUM approval must remain strict: if final PDF generation, QR generation, upload, or DB update fails, approval must fail rather than silently approving without a validator.
- Create/update canonical docs and an agent note when implementation changes behavior.

---

## File Structure

- `prisma/schema.prisma`: add nullable unique verification fields to `PjumExport`.
- `prisma/migrations/<timestamp>_add_pjum_verification_fields/migration.sql`: add database columns and unique indexes.
- `lib/pjum-verification.ts`: pure helpers for token/code generation, public URL construction, status derivation, and metadata shaping.
- `lib/pjum-verification.spec.ts`: focused unit tests for token/code helpers and public validator status.
- `lib/pdf/qr-code.ts`: server-only QR image generation wrapper around `qrcode`.
- `lib/pdf/pjum-validator-stamp.ts`: `pdf-lib` overlay helper that stamps QR/footer blocks on package pages except the PJUM form page.
- `lib/pdf/generate-pjum-form-pdf.ts`: extend `PjumFormData` and render the special in-form QR block under `PERHATIAN`.
- `lib/pdf/generate-pjum-package-pdf.ts`: pass verification data into the form, reserve footer room for SPARTA-generated PDFs, and apply package-wide QR stamping.
- `app/reports/pjum/approval-actions.ts`: ensure token/code before final PDF generation and persist approved state with final Drive URL.
- `app/v/pjum/[token]/page.tsx`: public validator page.
- `app/v/pjum/[token]/not-found.tsx` if needed: route-local invalid state is preferably handled in `page.tsx`, so create this only if a conventional not-found route proves cleaner.
- `app/v/pjum/[token]/validator-content.tsx`: presentational component for the responsive metadata UI.
- `app/v/pjum/[token]/validator-content.spec.tsx` only if the repo already has a component render test pattern available; otherwise use source-level tests in a helper file.
- `docs/project/04-workflows.md`: document the PJUM validator behavior.
- `docs/project/05-routes-and-ui.md`: document the public `/v/pjum/[token]` route.
- `docs/project/07-integrations-and-env.md`: document use of `APP_BASE_URL`/`NEXT_PUBLIC_APP_URL` for QR URL generation.
- `docs/agent-notes/YYYY-MM-DD-HHMM-pjum-qr-validator.md`: implementation note.

---

### Task 1: Add PJUM Verification Fields and Pure Helper Contract

**Files:**
- Modify: `prisma/schema.prisma`
- Create: `prisma/migrations/<timestamp>_add_pjum_verification_fields/migration.sql`
- Create: `lib/pjum-verification.ts`
- Create: `lib/pjum-verification.spec.ts`

**Interfaces:**
- Produces: `generatePjumVerificationSecret(): { token: string; code: string }`
- Produces: `buildPjumVerificationUrl(input: { baseUrl?: string | null; token: string }): string`
- Produces: `formatPjumVerificationDisplayCode(code: string): string`
- Produces: `derivePjumPublicVerificationStatus(input: { status: string; approvedAt: Date | null; approvedByNIK: string | null; pjumFinalDriveUrl: string | null }): "VALID" | "NEEDS_REVIEW" | "INVALID"`
- Consumed by: approval action, validator route, PDF QR rendering.

- [ ] **Step 1: Write failing helper tests**

Create `lib/pjum-verification.spec.ts`:

```typescript
import assert from "node:assert/strict";
import {
    buildPjumVerificationUrl,
    derivePjumPublicVerificationStatus,
    formatPjumVerificationDisplayCode,
    generatePjumVerificationSecret,
} from "./pjum-verification";

const first = generatePjumVerificationSecret();
const second = generatePjumVerificationSecret();

assert.match(first.token, /^[A-Za-z0-9_-]{32,}$/);
assert.match(first.code, /^[A-Z0-9]{8}$/);
assert.notEqual(first.token, second.token);
assert.notEqual(first.code, second.code);
assert.equal(formatPjumVerificationDisplayCode("AB12CD34"), "PJUM-AB12CD34");

assert.equal(
    buildPjumVerificationUrl({
        baseUrl: "https://maintenance.sparta-alfamart.web.id/",
        token: "abc_123",
    }),
    "https://maintenance.sparta-alfamart.web.id/v/pjum/abc_123",
);

assert.equal(
    derivePjumPublicVerificationStatus({
        status: "APPROVED",
        approvedAt: new Date("2026-09-15T01:00:00.000Z"),
        approvedByNIK: "12345",
        pjumFinalDriveUrl: "https://drive.google.com/file/d/example/view",
    }),
    "VALID",
);

assert.equal(
    derivePjumPublicVerificationStatus({
        status: "APPROVED",
        approvedAt: new Date("2026-09-15T01:00:00.000Z"),
        approvedByNIK: "12345",
        pjumFinalDriveUrl: null,
    }),
    "NEEDS_REVIEW",
);

assert.equal(
    derivePjumPublicVerificationStatus({
        status: "PENDING_APPROVAL",
        approvedAt: null,
        approvedByNIK: null,
        pjumFinalDriveUrl: null,
    }),
    "NEEDS_REVIEW",
);

assert.equal(
    derivePjumPublicVerificationStatus({
        status: "REJECTED",
        approvedAt: null,
        approvedByNIK: null,
        pjumFinalDriveUrl: null,
    }),
    "INVALID",
);

console.log("pjum-verification helpers passed");
```

- [ ] **Step 2: Run test and verify it fails**

Run:

```powershell
node_modules\.bin\tsx.cmd lib\pjum-verification.spec.ts
```

Expected: FAIL because `./pjum-verification` does not exist.

- [ ] **Step 3: Add Prisma fields**

In `prisma/schema.prisma`, update `model PjumExport` near the existing PDF fields:

```prisma
  // PDF snapshot path, final archival URL, and public verification identity
  pjumPdfPath       String?
  pjumFinalDriveUrl String?
  verificationToken String? @unique
  verificationCode  String? @unique
```

- [ ] **Step 4: Add migration SQL**

Create `prisma/migrations/<timestamp>_add_pjum_verification_fields/migration.sql`:

```sql
ALTER TABLE "PjumExport"
ADD COLUMN "verificationToken" TEXT,
ADD COLUMN "verificationCode" TEXT;

CREATE UNIQUE INDEX "PjumExport_verificationToken_key"
ON "PjumExport"("verificationToken");

CREATE UNIQUE INDEX "PjumExport_verificationCode_key"
ON "PjumExport"("verificationCode");
```

- [ ] **Step 5: Implement helper module**

Create `lib/pjum-verification.ts`:

```typescript
import crypto from "node:crypto";

export type PjumPublicVerificationStatus =
    | "VALID"
    | "NEEDS_REVIEW"
    | "INVALID";

export function generatePjumVerificationSecret(): {
    token: string;
    code: string;
} {
    return {
        token: crypto.randomBytes(24).toString("base64url"),
        code: crypto.randomBytes(4).toString("hex").toUpperCase(),
    };
}

export function formatPjumVerificationDisplayCode(code: string): string {
    return `PJUM-${code.trim().toUpperCase()}`;
}

export function buildPjumVerificationUrl(input: {
    baseUrl?: string | null;
    token: string;
}): string {
    const configured =
        input.baseUrl?.trim() ||
        process.env.APP_BASE_URL?.trim() ||
        process.env.NEXT_PUBLIC_APP_URL?.trim();

    if (!configured) {
        throw new Error("APP_BASE_URL or NEXT_PUBLIC_APP_URL is required for PJUM verification QR URLs");
    }

    const url = new URL(configured);
    url.pathname = `/v/pjum/${encodeURIComponent(input.token)}`;
    url.search = "";
    url.hash = "";
    return url.toString();
}

export function derivePjumPublicVerificationStatus(input: {
    status: string;
    approvedAt: Date | null;
    approvedByNIK: string | null;
    pjumFinalDriveUrl: string | null;
}): PjumPublicVerificationStatus {
    if (input.status === "APPROVED") {
        return input.approvedAt && input.approvedByNIK && input.pjumFinalDriveUrl
            ? "VALID"
            : "NEEDS_REVIEW";
    }

    if (input.status === "PENDING_APPROVAL") return "NEEDS_REVIEW";
    return "INVALID";
}
```

- [ ] **Step 6: Run helper tests**

Run:

```powershell
node_modules\.bin\tsx.cmd lib\pjum-verification.spec.ts
```

Expected: PASS with `pjum-verification helpers passed`.

- [ ] **Step 7: Validate Prisma schema**

Run:

```powershell
npx prisma validate
```

Expected: Prisma schema validation succeeds.

- [ ] **Step 8: Commit**

```powershell
git add prisma/schema.prisma prisma/migrations lib/pjum-verification.ts lib/pjum-verification.spec.ts
git commit -m "feat(pjum): add verification identity"
```

---

### Task 2: Add Public Validator Query and Responsive Page

**Files:**
- Create: `app/v/pjum/[token]/page.tsx`
- Create: `app/v/pjum/[token]/validator-content.tsx`
- Create: `app/v/pjum/[token]/validator-data.ts`
- Create: `app/v/pjum/[token]/validator-data.spec.ts`
- Modify: `proxy.ts` only if local testing proves `/v/pjum` is unexpectedly redirected.

**Interfaces:**
- Consumes: `derivePjumPublicVerificationStatus()` and `formatPjumVerificationDisplayCode()`.
- Produces: `getPublicPjumVerification(token: string): Promise<PublicPjumVerificationResult>`.
- Produces: public route `/v/pjum/[token]`.

- [ ] **Step 1: Write failing data-shaping test**

Create `app/v/pjum/[token]/validator-data.spec.ts`:

```typescript
import assert from "node:assert/strict";
import { mapPjumVerificationRecord } from "./validator-data";

const result = mapPjumVerificationRecord({
    id: "pjum-id",
    status: "APPROVED",
    verificationCode: "AB12CD34",
    branchName: "CIKOKOL RAYA",
    bmsNIK: "BMS001",
    bms: { name: "RUDI HARTONO" },
    weekNumber: 1,
    monthName: "September",
    fromDate: new Date("2026-09-07T00:00:00.000Z"),
    toDate: new Date("2026-09-15T00:00:00.000Z"),
    reportNumbers: ["IA54-2609-001", "IA54-2609-002"],
    approvedAt: new Date("2026-09-15T03:00:00.000Z"),
    approvedByNIK: "BNM001",
    approver: { name: "BNM TEST" },
    pjumFinalDriveUrl: "https://drive.google.com/file/d/example/view",
    totalExpenditure: 1250000,
});

assert.equal(result.kind, "found");
if (result.kind !== "found") throw new Error("Expected found result");

assert.equal(result.status, "VALID");
assert.equal(result.displayCode, "PJUM-AB12CD34");
assert.equal(result.bmsName, "RUDI HARTONO");
assert.equal(result.approverName, "BNM TEST");
assert.deepEqual(result.reportNumbers, ["IA54-2609-001", "IA54-2609-002"]);
assert.equal(result.reportCount, 2);

console.log("pjum validator data mapping passed");
```

- [ ] **Step 2: Run test and verify it fails**

Run:

```powershell
node_modules\.bin\tsx.cmd "app\v\pjum\[token]\validator-data.spec.ts"
```

Expected: FAIL because `validator-data` does not exist.

- [ ] **Step 3: Implement validator data helper**

Create `app/v/pjum/[token]/validator-data.ts`:

```typescript
import "server-only";

import prisma from "@/lib/prisma";
import { calculateTotalRealisasiFromItems } from "@/lib/realisasi";
import {
    derivePjumPublicVerificationStatus,
    formatPjumVerificationDisplayCode,
    type PjumPublicVerificationStatus,
} from "@/lib/pjum-verification";

export type PublicPjumVerificationResult =
    | { kind: "not-found" }
    | {
          kind: "found";
          status: PjumPublicVerificationStatus;
          displayCode: string;
          branchName: string;
          bmsNIK: string;
          bmsName: string;
          weekNumber: number;
          monthName: string | null;
          fromDate: Date;
          toDate: Date;
          reportNumbers: string[];
          reportCount: number;
          totalExpenditure: number;
          approvedAt: Date | null;
          approverNIK: string | null;
          approverName: string | null;
          pjumFinalDriveUrl: string | null;
      };

type PjumVerificationRecord = {
    id: string;
    status: string;
    verificationCode: string | null;
    branchName: string;
    bmsNIK: string;
    bms: { name: string } | null;
    weekNumber: number;
    monthName: string | null;
    fromDate: Date;
    toDate: Date;
    reportNumbers: string[];
    approvedAt: Date | null;
    approvedByNIK: string | null;
    approver: { name: string } | null;
    pjumFinalDriveUrl: string | null;
    totalExpenditure: number;
};

export function mapPjumVerificationRecord(
    record: PjumVerificationRecord | null,
): PublicPjumVerificationResult {
    if (!record?.verificationCode) return { kind: "not-found" };

    return {
        kind: "found",
        status: derivePjumPublicVerificationStatus({
            status: record.status,
            approvedAt: record.approvedAt,
            approvedByNIK: record.approvedByNIK,
            pjumFinalDriveUrl: record.pjumFinalDriveUrl,
        }),
        displayCode: formatPjumVerificationDisplayCode(record.verificationCode),
        branchName: record.branchName,
        bmsNIK: record.bmsNIK,
        bmsName: record.bms?.name ?? record.bmsNIK,
        weekNumber: record.weekNumber,
        monthName: record.monthName,
        fromDate: record.fromDate,
        toDate: record.toDate,
        reportNumbers: record.reportNumbers,
        reportCount: record.reportNumbers.length,
        totalExpenditure: record.totalExpenditure,
        approvedAt: record.approvedAt,
        approverNIK: record.approvedByNIK,
        approverName: record.approver?.name ?? record.approvedByNIK,
        pjumFinalDriveUrl: record.pjumFinalDriveUrl,
    };
}

export async function getPublicPjumVerification(
    token: string,
): Promise<PublicPjumVerificationResult> {
    const normalizedToken = token.trim();
    if (!/^[A-Za-z0-9_-]{32,}$/.test(normalizedToken)) {
        return { kind: "not-found" };
    }

    const pjum = await prisma.pjumExport.findUnique({
        where: { verificationToken: normalizedToken },
        select: {
            id: true,
            status: true,
            verificationCode: true,
            branchName: true,
            bmsNIK: true,
            bms: { select: { name: true } },
            weekNumber: true,
            monthName: true,
            fromDate: true,
            toDate: true,
            reportNumbers: true,
            approvedAt: true,
            approvedByNIK: true,
            approver: { select: { name: true } },
            pjumFinalDriveUrl: true,
        },
    });

    if (!pjum) return { kind: "not-found" };

    const reports = await prisma.report.findMany({
        where: { reportNumber: { in: pjum.reportNumbers } },
        select: { items: true, totalReal: true },
    });

    const totalExpenditure = reports.reduce(
        (sum, report) =>
            sum + calculateTotalRealisasiFromItems(report.items, report.totalReal),
        0,
    );

    return mapPjumVerificationRecord({
        ...pjum,
        totalExpenditure,
    });
}
```

If `calculateTotalRealisasiFromItems` does not accept `(items, totalReal)` in the current code, use the actual local helper signature from `lib/realisasi.ts` and adjust this file and test in the same task.

- [ ] **Step 4: Run data test**

Run:

```powershell
node_modules\.bin\tsx.cmd "app\v\pjum\[token]\validator-data.spec.ts"
```

Expected: PASS with `pjum validator data mapping passed`.

- [ ] **Step 5: Create responsive validator UI**

Create `app/v/pjum/[token]/validator-content.tsx`:

```tsx
import Link from "next/link";
import { AlertTriangle, CheckCircle2, ExternalLink, ShieldCheck, XCircle } from "lucide-react";
import type { PublicPjumVerificationResult } from "./validator-data";

function formatCurrency(value: number) {
    return new Intl.NumberFormat("id-ID", {
        style: "currency",
        currency: "IDR",
        maximumFractionDigits: 0,
    }).format(value);
}

function formatDate(value: Date | null) {
    if (!value) return "-";
    return value.toLocaleDateString("id-ID", {
        timeZone: "Asia/Jakarta",
        day: "numeric",
        month: "long",
        year: "numeric",
    });
}

export function ValidatorContent({
    result,
}: {
    result: PublicPjumVerificationResult;
}) {
    if (result.kind === "not-found") {
        return (
            <main className="min-h-dvh bg-muted/30 px-4 py-6 text-foreground sm:px-6 lg:px-8">
                <section className="mx-auto flex max-w-3xl flex-col gap-4 rounded-lg border bg-background p-4 shadow-xs sm:p-6">
                    <div className="flex items-start gap-3">
                        <XCircle className="mt-0.5 size-6 shrink-0 text-destructive" aria-hidden="true" />
                        <div className="min-w-0">
                            <p className="text-xs font-semibold uppercase tracking-wide text-destructive">Dokumen tidak valid</p>
                            <h1 className="mt-1 text-xl font-semibold">Dokumen PJUM tidak dapat diverifikasi</h1>
                            <p className="mt-2 text-sm text-muted-foreground">
                                Kode QR tidak terdaftar di SPARTA atau format link validasi tidak sesuai.
                            </p>
                        </div>
                    </div>
                </section>
            </main>
        );
    }

    const statusCopy =
        result.status === "VALID"
            ? {
                  label: "Dokumen PJUM Valid",
                  tone: "text-emerald-700",
                  bg: "bg-emerald-50 border-emerald-200",
                  icon: CheckCircle2,
              }
            : result.status === "NEEDS_REVIEW"
              ? {
                    label: "Dokumen Perlu Dicek",
                    tone: "text-amber-700",
                    bg: "bg-amber-50 border-amber-200",
                    icon: AlertTriangle,
                }
              : {
                    label: "Dokumen Tidak Valid",
                    tone: "text-destructive",
                    bg: "bg-red-50 border-red-200",
                    icon: XCircle,
                };
    const StatusIcon = statusCopy.icon;

    return (
        <main className="min-h-dvh bg-muted/30 px-4 py-6 text-foreground sm:px-6 lg:px-8">
            <div className="mx-auto grid max-w-5xl gap-4 lg:grid-cols-[1fr_320px]">
                <section className={`rounded-lg border p-4 shadow-xs sm:p-6 ${statusCopy.bg}`}>
                    <div className="flex items-start gap-3">
                        <StatusIcon className={`mt-0.5 size-6 shrink-0 ${statusCopy.tone}`} aria-hidden="true" />
                        <div className="min-w-0">
                            <p className={`text-xs font-semibold uppercase tracking-wide ${statusCopy.tone}`}>Validasi dokumen SPARTA</p>
                            <h1 className="mt-1 text-xl font-semibold">{statusCopy.label}</h1>
                            <p className="mt-2 text-sm text-muted-foreground">
                                Cocokkan data di bawah dengan dokumen cetak sebelum menerima PJUM.
                            </p>
                        </div>
                    </div>
                </section>

                <aside className="rounded-lg border bg-background p-4 shadow-xs sm:p-5 lg:row-span-2">
                    <div className="flex items-center gap-2 text-sm font-semibold">
                        <ShieldCheck className="size-4 text-primary" aria-hidden="true" />
                        {result.displayCode}
                    </div>
                    <div className="mt-4 flex flex-col gap-2">
                        {result.pjumFinalDriveUrl ? (
                            <Link
                                href={result.pjumFinalDriveUrl}
                                className="inline-flex h-9 items-center justify-center gap-2 rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground hover:bg-primary/90"
                            >
                                Buka PDF Resmi
                                <ExternalLink className="size-4" aria-hidden="true" />
                            </Link>
                        ) : null}
                    </div>
                </aside>

                <section className="rounded-lg border bg-background p-4 shadow-xs sm:p-6">
                    <dl className="grid gap-3 sm:grid-cols-2">
                        <Meta label="Cabang" value={result.branchName} />
                        <Meta label="BMS" value={`${result.bmsName} (${result.bmsNIK})`} />
                        <Meta label="Periode" value={`${formatDate(result.fromDate)} - ${formatDate(result.toDate)}`} />
                        <Meta label="Minggu/Bulan" value={`Minggu ke-${result.weekNumber}${result.monthName ? `, ${result.monthName}` : ""}`} />
                        <Meta label="Total Pengeluaran" value={formatCurrency(result.totalExpenditure)} />
                        <Meta label="Jumlah Laporan" value={`${result.reportCount} laporan`} />
                        <Meta label="Disetujui Oleh" value={result.approverName ?? "-"} />
                        <Meta label="Tanggal Approval" value={formatDate(result.approvedAt)} />
                    </dl>

                    <div className="mt-5 border-t pt-4">
                        <h2 className="text-sm font-semibold">Nomor Laporan</h2>
                        <div className="mt-2 flex flex-wrap gap-2">
                            {result.reportNumbers.map((reportNumber) => (
                                <span
                                    key={reportNumber}
                                    className="rounded-full border bg-muted px-2 py-1 font-mono text-xs"
                                >
                                    {reportNumber}
                                </span>
                            ))}
                        </div>
                    </div>
                </section>
            </div>
        </main>
    );
}

function Meta({ label, value }: { label: string; value: string }) {
    return (
        <div className="min-w-0 rounded-md border bg-muted/20 p-3">
            <dt className="text-xs font-medium text-muted-foreground">{label}</dt>
            <dd className="mt-1 break-words text-sm font-medium">{value}</dd>
        </div>
    );
}
```

- [ ] **Step 6: Create route page**

Create `app/v/pjum/[token]/page.tsx`:

```tsx
import { ValidatorContent } from "./validator-content";
import { getPublicPjumVerification } from "./validator-data";

export const dynamic = "force-dynamic";

export default async function PjumValidatorPage({
    params,
}: {
    params: Promise<{ token: string }>;
}) {
    const { token } = await params;
    const result = await getPublicPjumVerification(token);

    return <ValidatorContent result={result} />;
}
```

- [ ] **Step 7: Verify route is not protected by proxy**

Run source check:

```powershell
rg -n "protectedPrefixes|/v/pjum|/dashboard|/reports|/approval|/admin" proxy.ts
```

Expected: `protectedPrefixes` only includes `"/dashboard", "/reports", "/approval", "/admin"` and does not include `/v`, so `/v/pjum/[token]` is public without login.

- [ ] **Step 8: Commit**

```powershell
git add app/v/pjum
git commit -m "feat(pjum): add public validator page"
```

---

### Task 3: Add QR Image Generation for PDF Use

**Files:**
- Modify: `package.json`
- Modify: lockfile if present.
- Create: `lib/pdf/qr-code.ts`
- Create: `lib/pdf/qr-code.spec.ts`

**Interfaces:**
- Produces: `createQrPngDataUrl(text: string): Promise<string>`.
- Consumed by: PJUM form PDF and package stamping.

- [ ] **Step 1: Install QR dependency**

Run:

```powershell
npm install qrcode
npm install -D @types/qrcode
```

Expected: `package.json` and lockfile update with `qrcode` and `@types/qrcode`.

- [ ] **Step 2: Write failing QR test**

Create `lib/pdf/qr-code.spec.ts`:

```typescript
import assert from "node:assert/strict";
import { createQrPngDataUrl } from "./qr-code";

const dataUrl = await createQrPngDataUrl("https://maintenance.sparta-alfamart.web.id/v/pjum/example-token");

assert.match(dataUrl, /^data:image\/png;base64,/);
assert.ok(dataUrl.length > 500, `Expected QR data URL to be non-empty, got ${dataUrl.length}`);

console.log("pjum qr generation passed");
```

- [ ] **Step 3: Run test and verify it fails**

Run:

```powershell
node_modules\.bin\tsx.cmd lib\pdf\qr-code.spec.ts
```

Expected: FAIL because `./qr-code` does not exist.

- [ ] **Step 4: Implement QR helper**

Create `lib/pdf/qr-code.ts`:

```typescript
import "server-only";

import QRCode from "qrcode";

export async function createQrPngDataUrl(text: string): Promise<string> {
    return QRCode.toDataURL(text, {
        errorCorrectionLevel: "M",
        margin: 3,
        width: 192,
        color: {
            dark: "#000000",
            light: "#FFFFFF",
        },
    });
}
```

- [ ] **Step 5: Run QR test**

Run:

```powershell
node_modules\.bin\tsx.cmd lib\pdf\qr-code.spec.ts
```

Expected: PASS with `pjum qr generation passed`.

- [ ] **Step 6: Commit**

```powershell
git add package.json package-lock.json lib/pdf/qr-code.ts lib/pdf/qr-code.spec.ts
git commit -m "feat(pdf): add qr generation helper"
```

If the repository uses a different lockfile name, replace `package-lock.json` with that actual lockfile.

---

### Task 4: Render Special QR Block Inside the PJUM Form Page

**Files:**
- Modify: `lib/pdf/generate-pjum-form-pdf.ts`
- Modify: `scripts/test-pjum-form.ts`
- Create: `lib/pdf/generate-pjum-form-pdf-qr.spec.ts`

**Interfaces:**
- Consumes: `PjumFormData.verification?: { qrDataUrl: string; displayCode: string }`.
- Produces: PJUM form page with in-form QR under `PERHATIAN`.

- [ ] **Step 1: Write form QR source-level test**

Create `lib/pdf/generate-pjum-form-pdf-qr.spec.ts`:

```typescript
import assert from "node:assert/strict";
import fs from "node:fs";

const source = fs.readFileSync("lib/pdf/generate-pjum-form-pdf.ts", "utf8");

assert.match(source, /verification\?: \{\s*qrDataUrl: string;\s*displayCode: string;\s*\}/s);
assert.match(source, /Scan untuk validasi/);
assert.match(source, /Kode: /);
assert.match(source, /qrDataUrl/);

console.log("pjum form qr source contract passed");
```

- [ ] **Step 2: Run test and verify it fails**

Run:

```powershell
node_modules\.bin\tsx.cmd lib\pdf\generate-pjum-form-pdf-qr.spec.ts
```

Expected: FAIL because the form does not yet include verification QR fields/copy.

- [ ] **Step 3: Extend `PjumFormData`**

In `lib/pdf/generate-pjum-form-pdf.ts`, update the type:

```typescript
export type PjumFormData = {
    /** "minggu ke X bulan Y 20ZZ" — auto-filled */
    weekNumber: number;
    monthName: string;
    year: number;
    /** BMS name (a/n) */
    bmsName: string;
    /** Date PJUM is submitted — ISO string */
    submissionDate: string;
    /** Total pengeluaran (sum of all reports) */
    totalExpenditure: number;
    /** UM fixed = 1.000.000 */
    periodeFrom: string;
    periodeTo: string;
    verification?: {
        qrDataUrl: string;
        displayCode: string;
    };
};
```

- [ ] **Step 4: Add form QR styles**

Add these styles to the existing StyleSheet:

```typescript
    formQrBlock: {
        marginTop: 8,
        alignItems: "flex-start",
    },
    formQrImage: {
        width: 54,
        height: 54,
    },
    formQrText: {
        marginTop: 2,
        fontSize: 5.5,
        lineHeight: 1.15,
    },
    formQrCode: {
        fontSize: 5.5,
        fontFamily: "Helvetica-Bold",
        lineHeight: 1.15,
    },
```

- [ ] **Step 5: Render QR block under `PERHATIAN`**

Inside the existing `attention` view, after point 2 text, render:

```typescript
                        pjum.verification
                            ? React.createElement(
                                  View,
                                  { style: s.formQrBlock },
                                  React.createElement(Image, {
                                      src: pjum.verification.qrDataUrl,
                                      style: s.formQrImage,
                                  }),
                                  React.createElement(
                                      Text,
                                      { style: s.formQrText },
                                      "Scan untuk validasi",
                                  ),
                                  React.createElement(
                                      Text,
                                      { style: s.formQrCode },
                                      `Kode: ${pjum.verification.displayCode}`,
                                  ),
                              )
                            : null,
```

- [ ] **Step 6: Update local test script**

In `scripts/test-pjum-form.ts`, add a tiny valid PNG data URL placeholder:

```typescript
            verification: {
                qrDataUrl:
                    "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/p9sAAAAASUVORK5CYII=",
                displayCode: "PJUM-AB12CD34",
            },
```

- [ ] **Step 7: Run source and render tests**

Run:

```powershell
node_modules\.bin\tsx.cmd lib\pdf\generate-pjum-form-pdf-qr.spec.ts
node_modules\.bin\tsx.cmd scripts\test-pjum-form.ts
```

Expected:

```text
pjum form qr source contract passed
PASS: PDF generated, size: ...
```

- [ ] **Step 8: Commit**

```powershell
git add lib/pdf/generate-pjum-form-pdf.ts lib/pdf/generate-pjum-form-pdf-qr.spec.ts scripts/test-pjum-form.ts
git commit -m "feat(pjum): render form qr validator"
```

---

### Task 5: Stamp QR and Validation Code on Every Other Package Page

**Files:**
- Create: `lib/pdf/pjum-validator-stamp.ts`
- Create: `lib/pdf/pjum-validator-stamp.spec.ts`
- Modify: `lib/pdf/generate-pjum-package-pdf.ts`

**Interfaces:**
- Consumes: `createQrPngDataUrl()`.
- Produces: `stampPjumValidatorOnPackage(input: { buffer: Buffer; qrDataUrl: string; displayCode: string; skipPageIndexes: number[] }): Promise<Buffer>`.
- `skipPageIndexes` is zero-based; the PJUM form page must be skipped because it has its own in-form QR placement.

- [ ] **Step 1: Write source-level stamp contract test**

Create `lib/pdf/pjum-validator-stamp.spec.ts`:

```typescript
import assert from "node:assert/strict";
import fs from "node:fs";

const source = fs.readFileSync("lib/pdf/pjum-validator-stamp.ts", "utf8");

assert.match(source, /stampPjumValidatorOnPackage/);
assert.match(source, /Validasi dokumen SPARTA/);
assert.match(source, /skipPageIndexes/);
assert.match(source, /drawImage/);
assert.match(source, /drawText/);

console.log("pjum validator stamp source contract passed");
```

- [ ] **Step 2: Run test and verify it fails**

Run:

```powershell
node_modules\.bin\tsx.cmd lib\pdf\pjum-validator-stamp.spec.ts
```

Expected: FAIL because `pjum-validator-stamp.ts` does not exist.

- [ ] **Step 3: Implement stamp helper**

Create `lib/pdf/pjum-validator-stamp.ts`:

```typescript
import "server-only";

import { PDFDocument, rgb, StandardFonts } from "pdf-lib";

function dataUrlToBytes(dataUrl: string): Uint8Array {
    const base64 = dataUrl.split(",")[1];
    if (!base64) throw new Error("Invalid QR data URL");
    return Uint8Array.from(Buffer.from(base64, "base64"));
}

export async function stampPjumValidatorOnPackage(input: {
    buffer: Buffer;
    qrDataUrl: string;
    displayCode: string;
    skipPageIndexes: number[];
}): Promise<Buffer> {
    const pdf = await PDFDocument.load(input.buffer);
    const qrImage = await pdf.embedPng(dataUrlToBytes(input.qrDataUrl));
    const regularFont = await pdf.embedFont(StandardFonts.Helvetica);
    const boldFont = await pdf.embedFont(StandardFonts.HelveticaBold);
    const skip = new Set(input.skipPageIndexes);

    pdf.getPages().forEach((page, index) => {
        if (skip.has(index)) return;

        const { width } = page.getSize();
        const qrSize = 44;
        const x = width - 72;
        const y = 18;

        page.drawRectangle({
            x: x - 4,
            y: y - 4,
            width: qrSize + 8,
            height: qrSize + 22,
            color: rgb(1, 1, 1),
            opacity: 0.92,
        });

        page.drawImage(qrImage, {
            x,
            y: y + 18,
            width: qrSize,
            height: qrSize,
        });

        page.drawText("Validasi dokumen SPARTA", {
            x: x - 22,
            y: y + 9,
            size: 5.5,
            font: regularFont,
            color: rgb(0, 0, 0),
        });

        page.drawText(input.displayCode, {
            x: x - 2,
            y,
            size: 5.5,
            font: boldFont,
            color: rgb(0, 0, 0),
        });
    });

    return Buffer.from(await pdf.save());
}
```

- [ ] **Step 4: Run stamp contract test**

Run:

```powershell
node_modules\.bin\tsx.cmd lib\pdf\pjum-validator-stamp.spec.ts
```

Expected: PASS with `pjum validator stamp source contract passed`.

- [ ] **Step 5: Extend package generator input**

In `lib/pdf/generate-pjum-package-pdf.ts`, extend params:

```typescript
    verification?: {
        qrDataUrl: string;
        displayCode: string;
    };
```

- [ ] **Step 6: Pass verification into fallback PJUM form data**

When constructing `fallbackPjumData`, include:

```typescript
                  verification: params.verification,
```

For the direct `params.pjumData` path, approval code will pass `pjumData.verification` in Task 6.

- [ ] **Step 7: Track form page indexes and stamp package**

After inserting form pages and before returning the final buffer, track skipped indexes:

```typescript
    const validatorSkipPageIndexes: number[] = [];
```

When adding form pages:

```typescript
        formPages.forEach((p) => {
            validatorSkipPageIndexes.push(merged.getPageCount());
            merged.addPage(p);
        });
```

Replace the current return buffer creation:

```typescript
    let finalBuffer = Buffer.from(await merged.save());

    if (params.verification) {
        const { stampPjumValidatorOnPackage } = await import(
            "@/lib/pdf/pjum-validator-stamp"
        );
        finalBuffer = await stampPjumValidatorOnPackage({
            buffer: finalBuffer,
            qrDataUrl: params.verification.qrDataUrl,
            displayCode: params.verification.displayCode,
            skipPageIndexes: validatorSkipPageIndexes,
        });
    }

    return {
        buffer: finalBuffer,
        branchName,
        bmsNIK: bmsUser?.NIK ?? params.bmsNIK,
        monthName,
        year,
        fileName: `PJUM-${bmsUser?.NIK ?? params.bmsNIK}-${params.from || "export"}.pdf`,
    };
```

- [ ] **Step 8: Run focused tests**

Run:

```powershell
node_modules\.bin\tsx.cmd lib\pdf\pjum-validator-stamp.spec.ts
node_modules\.bin\tsx.cmd scripts\smoke-react-pdf-renderer.ts
```

Expected: both pass.

- [ ] **Step 9: Commit**

```powershell
git add lib/pdf/pjum-validator-stamp.ts lib/pdf/pjum-validator-stamp.spec.ts lib/pdf/generate-pjum-package-pdf.ts
git commit -m "feat(pjum): stamp validator on package pages"
```

---

### Task 6: Wire QR Validator Into BNM Approval Flow

**Files:**
- Modify: `app/reports/pjum/approval-actions.ts`
- Create: `app/reports/pjum/approval-verification.spec.ts`

**Interfaces:**
- Consumes: `generatePjumVerificationSecret()`, `buildPjumVerificationUrl()`, `formatPjumVerificationDisplayCode()`, `createQrPngDataUrl()`.
- Produces: approved PJUM records with `verificationToken`, `verificationCode`, `pjumFinalDriveUrl`, and QR-stamped final PDF.

- [ ] **Step 1: Write source-level approval wiring test**

Create `app/reports/pjum/approval-verification.spec.ts`:

```typescript
import assert from "node:assert/strict";
import fs from "node:fs";

const source = fs.readFileSync("app/reports/pjum/approval-actions.ts", "utf8");

assert.match(source, /generatePjumVerificationSecret/);
assert.match(source, /buildPjumVerificationUrl/);
assert.match(source, /formatPjumVerificationDisplayCode/);
assert.match(source, /createQrPngDataUrl/);
assert.match(source, /verificationToken/);
assert.match(source, /verificationCode/);
assert.match(source, /verification: \{/);

console.log("pjum approval verification wiring passed");
```

- [ ] **Step 2: Run test and verify it fails**

Run:

```powershell
node_modules\.bin\tsx.cmd app\reports\pjum\approval-verification.spec.ts
```

Expected: FAIL because approval action does not yet wire verification.

- [ ] **Step 3: Add imports**

In `app/reports/pjum/approval-actions.ts`, add:

```typescript
import {
    buildPjumVerificationUrl,
    formatPjumVerificationDisplayCode,
    generatePjumVerificationSecret,
} from "@/lib/pjum-verification";
import { createQrPngDataUrl } from "@/lib/pdf/qr-code";
```

- [ ] **Step 4: Select existing verification fields**

In the `pjumExport` select inside `approvePjumExport`, add:

```typescript
                verificationToken: true,
                verificationCode: true,
```

- [ ] **Step 5: Ensure token/code before PDF generation**

After `approvedAtDate` is created and before `pjumFormData`, add:

```typescript
        let verificationToken = pjumExport.verificationToken;
        let verificationCode = pjumExport.verificationCode;

        if (!verificationToken || !verificationCode) {
            for (let attempt = 0; attempt < 3; attempt += 1) {
                const generated = generatePjumVerificationSecret();
                try {
                    await prisma.pjumExport.update({
                        where: { id: pjumExport.id },
                        data: {
                            verificationToken: generated.token,
                            verificationCode: generated.code,
                        },
                    });
                    verificationToken = generated.token;
                    verificationCode = generated.code;
                    break;
                } catch (error) {
                    if (attempt === 2) throw error;
                }
            }
        }

        if (!verificationToken || !verificationCode) {
            throw new Error("Failed to prepare PJUM verification identity");
        }

        const verificationUrl = buildPjumVerificationUrl({
            token: verificationToken,
        });
        const verificationDisplayCode =
            formatPjumVerificationDisplayCode(verificationCode);
        const verificationQrDataUrl = await createQrPngDataUrl(verificationUrl);
```

- [ ] **Step 6: Pass verification into form and package**

Add to `pjumFormData`:

```typescript
            verification: {
                qrDataUrl: verificationQrDataUrl,
                displayCode: verificationDisplayCode,
            },
```

Add to `generatePjumPackagePdf` call:

```typescript
            verification: {
                qrDataUrl: verificationQrDataUrl,
                displayCode: verificationDisplayCode,
            },
```

- [ ] **Step 7: Preserve verification fields in final update**

In the final `prisma.pjumExport.update` data block, include the known values:

```typescript
                verificationToken,
                verificationCode,
```

- [ ] **Step 8: Run approval wiring test**

Run:

```powershell
node_modules\.bin\tsx.cmd app\reports\pjum\approval-verification.spec.ts
```

Expected: PASS with `pjum approval verification wiring passed`.

- [ ] **Step 9: Run focused PDF smoke tests**

Run:

```powershell
node_modules\.bin\tsx.cmd scripts\smoke-react-pdf-renderer.ts
node_modules\.bin\tsx.cmd scripts\test-pjum-form.ts
```

Expected: both pass.

- [ ] **Step 10: Commit**

```powershell
git add app/reports/pjum/approval-actions.ts app/reports/pjum/approval-verification.spec.ts
git commit -m "feat(pjum): embed validator qr on approval"
```

---

### Task 7: Reserve Footer Room in SPARTA-Generated PDFs

**Files:**
- Modify: `lib/pdf/generate-pjum-pdf.ts`
- Modify: `lib/pdf/generate-report-pdf.ts`
- Create: `lib/pdf/pdf-validator-footer-reserve.spec.ts`

**Interfaces:**
- Consumes: QR stamp dimensions from Task 5.
- Produces: bottom padding/margin room so package-page QR does not cover content.

- [ ] **Step 1: Write source-level footer reserve test**

Create `lib/pdf/pdf-validator-footer-reserve.spec.ts`:

```typescript
import assert from "node:assert/strict";
import fs from "node:fs";

const pjumRecap = fs.readFileSync("lib/pdf/generate-pjum-pdf.ts", "utf8");
const reportPdf = fs.readFileSync("lib/pdf/generate-report-pdf.ts", "utf8");

assert.match(pjumRecap, /paddingBottom:\s*5[6-9]|paddingBottom:\s*6[0-9]/);
assert.match(reportPdf, /paddingBottom:\s*5[6-9]|paddingBottom:\s*6[0-9]/);

console.log("pdf validator footer reserve source contract passed");
```

- [ ] **Step 2: Run test and verify it fails if no safe footer exists**

Run:

```powershell
node_modules\.bin\tsx.cmd lib\pdf\pdf-validator-footer-reserve.spec.ts
```

Expected: FAIL if either generator does not reserve enough bottom space.

- [ ] **Step 3: Update PJUM recap page bottom padding**

In `lib/pdf/generate-pjum-pdf.ts`, find the top-level page style and set `paddingBottom` to at least `58`.

Expected style pattern:

```typescript
    page: {
        ...
        paddingBottom: 58,
        ...
    },
```

- [ ] **Step 4: Update report PDF page bottom padding**

In `lib/pdf/generate-report-pdf.ts`, find each top-level page style used for generated report pages and set `paddingBottom` to at least `58`. Keep existing top/side padding unchanged.

Expected style pattern:

```typescript
    page: {
        ...
        paddingBottom: 58,
        ...
    },
```

- [ ] **Step 5: Run footer source test**

Run:

```powershell
node_modules\.bin\tsx.cmd lib\pdf\pdf-validator-footer-reserve.spec.ts
```

Expected: PASS with `pdf validator footer reserve source contract passed`.

- [ ] **Step 6: Render smoke PDFs**

Run:

```powershell
node_modules\.bin\tsx.cmd scripts\test-pjum-form.ts
node_modules\.bin\tsx.cmd scripts\smoke-react-pdf-renderer.ts
```

Expected: both pass.

- [ ] **Step 7: Commit**

```powershell
git add lib/pdf/generate-pjum-pdf.ts lib/pdf/generate-report-pdf.ts lib/pdf/pdf-validator-footer-reserve.spec.ts
git commit -m "fix(pdf): reserve validator footer space"
```

---

### Task 8: Document Behavior and Run Verification

**Files:**
- Modify: `docs/project/04-workflows.md`
- Modify: `docs/project/05-routes-and-ui.md`
- Modify: `docs/project/07-integrations-and-env.md`
- Create: `docs/agent-notes/YYYY-MM-DD-HHMM-pjum-qr-validator.md`

**Interfaces:**
- Consumes: implemented validator behavior from Tasks 1-7.
- Produces: canonical project docs and required task note.

- [ ] **Step 1: Update workflow docs**

In `docs/project/04-workflows.md`, under `## PJUM`, add:

```markdown
Validasi QR:

- Saat BNM Manager menyetujui PJUM, sistem membuat token validasi publik dan kode validasi manusia.
- PDF final PJUM memuat QR validator dan kode validasi di setiap halaman.
- Scan QR membuka halaman publik `/v/pjum/[token]` tanpa login.
- Halaman validator menampilkan status dokumen, metadata PJUM, nomor laporan, dan tombol PDF resmi.
- Tombol PDF resmi mengarah ke file Google Drive perusahaan; akses file tetap mengikuti permission Drive.
- Finance wajib mencocokkan metadata halaman validator dengan dokumen cetak sebelum menerima PJUM.
```

- [ ] **Step 2: Update route docs**

In `docs/project/05-routes-and-ui.md`, add route row:

```markdown
| `/v/pjum/[token]` | Publik | Validasi QR dokumen PJUM tanpa login; menampilkan metadata PJUM dan link PDF resmi Drive. |
```

Under UI patterns, add:

```markdown
Public PJUM validator tetap mengikuti gaya SPARTA: compact, mobile-first, status memakai label dan warna semantik, serta tidak memakai layout marketing.
```

- [ ] **Step 3: Update integrations/env docs**

In `docs/project/07-integrations-and-env.md`, under `APP_BASE_URL` or Google Drive notes, add:

```markdown
QR validator PJUM memakai `APP_BASE_URL` dengan fallback `NEXT_PUBLIC_APP_URL` untuk membangun URL publik `/v/pjum/[token]`. Production harus mengisi base URL domain resmi SPARTA agar QR tidak mengarah ke localhost atau domain sementara.
```

- [ ] **Step 4: Run focused test suite**

Run:

```powershell
node_modules\.bin\tsx.cmd lib\pjum-verification.spec.ts
node_modules\.bin\tsx.cmd "app\v\pjum\[token]\validator-data.spec.ts"
node_modules\.bin\tsx.cmd lib\pdf\qr-code.spec.ts
node_modules\.bin\tsx.cmd lib\pdf\generate-pjum-form-pdf-qr.spec.ts
node_modules\.bin\tsx.cmd lib\pdf\pjum-validator-stamp.spec.ts
node_modules\.bin\tsx.cmd app\reports\pjum\approval-verification.spec.ts
node_modules\.bin\tsx.cmd lib\pdf\pdf-validator-footer-reserve.spec.ts
node_modules\.bin\tsx.cmd scripts\smoke-react-pdf-renderer.ts
node_modules\.bin\tsx.cmd scripts\test-pjum-form.ts
```

Expected: all pass.

- [ ] **Step 5: Run typecheck**

Run:

```powershell
node_modules\.bin\tsc.cmd --noEmit --pretty false --incremental false
```

Expected: no TypeScript errors. If pre-existing unrelated errors appear, record exact output in the agent note.

- [ ] **Step 6: Run build**

Run:

```powershell
node_modules\.bin\next.cmd build
```

Expected: production build succeeds. If local build fails for environment-specific reasons, record the exact output and verify in the deployment environment.

- [ ] **Step 7: Create agent note**

Create `docs/agent-notes/YYYY-MM-DD-HHMM-pjum-qr-validator.md`:

```markdown
# PJUM QR Validator

## Scope

Adds public QR validation for approved PJUM documents. This includes token/code persistence, public validator metadata UI, QR rendering in final PJUM PDFs, and documentation updates.

## Context and Sources

- User reported many users still create and print manual PJUM forms outside SPARTA.
- Reviewed `app/reports/pjum/approval-actions.ts`, `lib/pdf/generate-pjum-form-pdf.ts`, `lib/pdf/generate-pjum-package-pdf.ts`, `lib/google-drive/archive.ts`, `docs/project/04-workflows.md`, `docs/project/05-routes-and-ui.md`, `docs/project/07-integrations-and-env.md`, and `DESIGN.md`.

## Changed Files

- `prisma/schema.prisma`: added PJUM verification token/code fields.
- `prisma/migrations/...`: added verification columns and unique indexes.
- `lib/pjum-verification.ts`: added token/code and validator status helpers.
- `app/v/pjum/[token]/*`: added public validator route and UI.
- `lib/pdf/*`: added QR generation, form QR rendering, package stamping, and footer reserve.
- `app/reports/pjum/approval-actions.ts`: wired verification QR into BNM approval.
- `docs/project/*`: documented validator behavior, route, and base URL dependency.

## Decisions

- Validator page is public without SPARTA login.
- Official PDF button remains public but points to company Drive, so Drive permissions control PDF access.
- URL token is long/random; printed code is a separate short human-readable audit code.
- Report numbers are shown on the public validator page.
- QR appears with validation code on every final package page.

## Verification

- Add exact command results here.

## Remaining Work and Risks

- Finance must still compare validator metadata against the printed document; QR validity alone does not prove the paper was not manually altered.
```

- [ ] **Step 8: Commit docs and note**

```powershell
git add docs/project/04-workflows.md docs/project/05-routes-and-ui.md docs/project/07-integrations-and-env.md docs/agent-notes
git commit -m "docs(pjum): record qr validator behavior"
```

---

## Self-Review

- Spec coverage: The plan covers public no-login validation, Drive-link behavior, QR placement on the PJUM form and all other pages, validation code semantics, report-number metadata, responsive SPARTA-style UI, schema persistence, approval flow wiring, docs, and verification.
- Placeholder scan: The plan avoids `TBD` and includes exact file paths, commands, expected outputs, and code snippets for each task.
- Type consistency: The helper names `generatePjumVerificationSecret`, `buildPjumVerificationUrl`, `formatPjumVerificationDisplayCode`, `derivePjumPublicVerificationStatus`, `createQrPngDataUrl`, and `stampPjumValidatorOnPackage` are introduced before use and remain consistent across tasks.
