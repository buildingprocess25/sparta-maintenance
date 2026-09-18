# QR Code Footer Integration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Eliminate QR Code overlap by moving it from a post-process `pdf-lib` stamp into the native `react-pdf` footer layout, so react-pdf`s own layout engine guarantees it never collides with page content.

**Architecture:** Instead of stamping a QR image on top of a finished PDF (which is blind to content underneath), we pass the QR data URL down through the call chain to each individual PDF generator. Each generator embeds the QR as a native `<Image>` element inside its fixed `footer` View, in a two-column layout: left column has the text lines, right column has the QR. The old `pdf-lib` stamp step in `generate-pjum-package-pdf.ts` is removed. `pjum-validator-stamp.ts` becomes a deprecated no-op stub.

**Tech Stack:** `@react-pdf/renderer` (existing), `pdf-lib` (existing, only for merge), TypeScript, Vitest (source-contract style tests)

## Global Constraints

- All PDF generators use `@react-pdf/renderer` with `React.createElement` (no JSX) — maintain this pattern
- `paddingBottom` must be raised to `92` in every generator that embeds QR
- QR image in footer: `width: 56, height: 56`; outer right column: `width: 80`
- Label "Validasi dokumen SPARTA" must be `textAlign: "center"` and `width: 72`
- Display code must be `textAlign: "center"` and `width: 72`
- `verification?: { qrDataUrl: string; displayCode: string }` — always optional, never required
- `generate-pjum-form-pdf.ts` is NOT touched — it is a static form page without a footer stamp
- Run `npm run build` at the end to verify TypeScript compiles cleanly

---

## Task 1: Update Source-Contract Tests (TDD Red Phase)

**Files:**
- Modify: `lib/pdf/pjum-validator-stamp.spec.ts`
- Modify: `lib/pdf/pdf-validator-footer-reserve.spec.ts`

- [ ] **Step 1: Replace `lib/pdf/pjum-validator-stamp.spec.ts`**

```typescript
import assert from "node:assert/strict";
import fs from "node:fs";

const source = fs.readFileSync("lib/pdf/pjum-validator-stamp.ts", "utf8");
const reportPdf = fs.readFileSync("lib/pdf/generate-report-pdf.ts", "utf8");
const pjumPdf = fs.readFileSync("lib/pdf/generate-pjum-pdf.ts", "utf8");
const revisionPdf = fs.readFileSync("lib/pdf/generate-revision-pdf.ts", "utf8");

assert.match(source, /stampPjumValidatorOnPackage/);
assert.match(reportPdf, /verification\?:/);
assert.match(reportPdf, /qrDataUrl/);
assert.match(reportPdf, /Validasi dokumen SPARTA/);
assert.match(reportPdf, /textAlign.*center|center.*textAlign/);
assert.match(pjumPdf, /verification\?:/);
assert.match(pjumPdf, /qrDataUrl/);
assert.match(pjumPdf, /Validasi dokumen SPARTA/);
assert.match(revisionPdf, /verification\?:/);
assert.match(revisionPdf, /qrDataUrl/);
assert.match(revisionPdf, /Validasi dokumen SPARTA/);

console.log("pjum validator stamp source contract passed");
```

- [ ] **Step 2: Replace `lib/pdf/pdf-validator-footer-reserve.spec.ts`**

```typescript
import assert from "node:assert/strict";
import fs from "node:fs";

const pjumRecap = fs.readFileSync("lib/pdf/generate-pjum-pdf.ts", "utf8");
const reportPdf = fs.readFileSync("lib/pdf/generate-report-pdf.ts", "utf8");
const revisionPdf = fs.readFileSync("lib/pdf/generate-revision-pdf.ts", "utf8");
const packagePdf = fs.readFileSync("lib/pdf/generate-pjum-package-pdf.ts", "utf8");

assert.match(pjumRecap, /paddingBottom:\s*9[0-9]|paddingBottom:\s*1[0-9]{2}/);
assert.match(reportPdf, /paddingBottom:\s*9[0-9]|paddingBottom:\s*1[0-9]{2}/);
assert.match(revisionPdf, /paddingBottom:\s*9[0-9]|paddingBottom:\s*1[0-9]{2}/);
assert.doesNotMatch(packagePdf, /stampPjumValidatorOnPackage/);

console.log("pdf validator footer reserve source contract passed");
```

- [ ] **Step 3: Run tests — expect FAIL**

```powershell
npx vitest run --reporter=verbose lib/pdf/pjum-validator-stamp.spec.ts lib/pdf/pdf-validator-footer-reserve.spec.ts
```

Expected: Both fail (red state is correct).

- [ ] **Step 4: Commit failing tests**

```powershell
git add lib/pdf/pjum-validator-stamp.spec.ts lib/pdf/pdf-validator-footer-reserve.spec.ts
git commit -m "test(pdf): update source-contract assertions for inline QR footer"
```

---

## Task 2: Update `generate-pjum-pdf.ts`

**Files:**
- Modify: `lib/pdf/generate-pjum-pdf.ts`

- [ ] **Step 1: Raise `paddingBottom` to `92` in the `page:` style block (around line 14)**

Change `paddingBottom: 58` ? `paddingBottom: 92`.

- [ ] **Step 2: Replace `footer:` style block (around line 162) with two-column styles**

Remove the old 9-line `footer:` and `footerText:` entries and replace with:

```typescript
footer: {
    position: "absolute",
    bottom: 20,
    left: 36,
    right: 36,
    borderTop: "1px solid #e5e7eb",
    paddingTop: 6,
    flexDirection: "row",
    alignItems: "flex-start",
},
footerLeft: {
    flex: 1,
    flexDirection: "column",
    gap: 2,
},
footerRight: {
    width: 80,
    flexDirection: "column",
    alignItems: "center",
    gap: 2,
},
footerText: { fontSize: 7, color: "#9ca3af", fontStyle: "italic" },
footerQrLabel: {
    fontSize: 5.5,
    color: "#6b7280",
    textAlign: "center",
    width: 72,
},
footerQrImage: { width: 56, height: 56 },
footerQrCode: {
    fontSize: 5.5,
    fontFamily: "Helvetica-Bold",
    color: "#374151",
    textAlign: "center",
    width: 72,
},
```

- [ ] **Step 3: Add `verification?:` to `PjumPdfData` type (around line 220)**

```typescript
export type PjumPdfData = {
    // ... existing fields ...
    watermarkLogoBase64?: string;
    verification?: { qrDataUrl: string; displayCode: string };
};
```

- [ ] **Step 4: Replace footer JSX block in `buildPjumDocument` (around line 518)**

```typescript
React.createElement(
    View,
    { style: styles.footer, fixed: true },
    React.createElement(
        View,
        { style: styles.footerLeft },
        React.createElement(
            Text,
            { style: styles.footerText },
            "Dokumen ini di generate otomatis oleh sistem SPARTA Maintenance",
        ),
        React.createElement(Text, {
            style: styles.footerText,
            render: ({ pageNumber, totalPages }: { pageNumber: number; totalPages: number }) =>
                `Halaman ${pageNumber} dari ${totalPages}`,
        }),
    ),
    data.verification
        ? React.createElement(
              View,
              { style: styles.footerRight },
              React.createElement(Text, { style: styles.footerQrLabel }, "Validasi dokumen SPARTA"),
              React.createElement(Image, { src: data.verification.qrDataUrl, style: styles.footerQrImage }),
              React.createElement(Text, { style: styles.footerQrCode }, data.verification.displayCode),
          )
        : null,
),
```

> `Image` is already imported at the top of this file.

- [ ] **Step 5: Commit**

```powershell
git add lib/pdf/generate-pjum-pdf.ts
git commit -m "feat(pdf): embed QR inline in PJUM recap footer"
```

---

## Task 3: Update `generate-report-pdf.ts`

**Files:**
- Modify: `lib/pdf/generate-report-pdf.ts`

- [ ] **Step 1: Raise `paddingBottom` to `92` in `page:` style (around line 87)**

- [ ] **Step 2: Replace the first `footer:` style block (around line 264) with two-column styles** (same pattern as Task 2 Step 2, but using object key `styles.`)

- [ ] **Step 3: Add `verification?:` to `ReportPdfData` type (around line 591)**

```typescript
export type ReportPdfData = {
    // ... existing fields ...
    approval: { reportStatus: string; stamps: ReportStamp[] };
    verification?: { qrDataUrl: string; displayCode: string };
};
```

- [ ] **Step 4: Replace the main footer JSX block (around line 2556)**

Same two-column structure as Task 2 Step 4, but using `styles.` prefix and `data.reportNumber` in the label text:

```typescript
`No. Laporan: ${data.reportNumber} — Dokumen ini di generate otomatis oleh sistem SPARTA Maintenance`
```

- [ ] **Step 5: Replace the `docPhotoPageStyles.footer:` block (around line 2791)** with identical two-column styles.

- [ ] **Step 6: Update `makeFooter` function (around line 2897)** — add `verification?` parameter and render QR column when present. Update the call site at ~line 2975 to `makeFooter(data.reportNumber, data.verification)`.

- [ ] **Step 7: Commit**

```powershell
git add lib/pdf/generate-report-pdf.ts
git commit -m "feat(pdf): embed QR inline in report PDF footer"
```

---

## Task 4: Update `generate-revision-pdf.ts`

**Files:**
- Modify: `lib/pdf/generate-revision-pdf.ts`

- [ ] **Step 1: Add `Image` to the import from `@react-pdf/renderer` (line 3)**

- [ ] **Step 2: Raise `paddingBottom` to `92` in `page:` style (around line 64)**

- [ ] **Step 3: Replace `footer:` style block (around line 255)** with two-column styles (same pattern, using `s.` prefix).

- [ ] **Step 4: Add `verification?:` to `RevisionPdfData` type (around line 18)**

- [ ] **Step 5: Replace footer JSX block (around line 747)** with two-column structure using `s.footerLeft`, `s.footerRight`, etc.

- [ ] **Step 6: Commit**

```powershell
git add lib/pdf/generate-revision-pdf.ts
git commit -m "feat(pdf): embed QR inline in revision PDF footer"
```

---

## Task 5: Update Orchestrator + Stub Out Stamp

**Files:**
- Modify: `lib/pdf/generate-pjum-package-pdf.ts`
- Modify: `lib/pdf/pjum-validator-stamp.ts`

- [ ] **Step 1: Pass `verification: params.verification` to `generatePjumPdf` call (~line 175)**

- [ ] **Step 2: Pass `verification: params.verification` to `generateReportPdf` call (~line 354)**

- [ ] **Step 3: Delete the `if (params.verification) { stampPjumValidatorOnPackage... }` block (~line 396–408)**

- [ ] **Step 4: Remove `validatorSkipPageIndexes` variable and its `.push` usage (~lines 234, 282)**

- [ ] **Step 5: Reduce `pjum-validator-stamp.ts` to a no-op stub**

```typescript
import "server-only";

/**
 * @deprecated QR code is now embedded directly in react-pdf footers.
 * This stub exists only to satisfy any remaining imports; it returns the buffer unchanged.
 */
export async function stampPjumValidatorOnPackage(input: {
    buffer: Buffer;
    qrDataUrl: string;
    displayCode: string;
    skipPageIndexes: number[];
}): Promise<Buffer> {
    return input.buffer;
}
```

- [ ] **Step 6: Run both tests — expect GREEN**

```powershell
npx vitest run --reporter=verbose lib/pdf/pjum-validator-stamp.spec.ts lib/pdf/pdf-validator-footer-reserve.spec.ts
```

Expected: **BOTH PASS**.

- [ ] **Step 7: Build to verify TypeScript**

```powershell
npm run build
```

Expected: No new TypeScript errors.

- [ ] **Step 8: Commit**

```powershell
git add lib/pdf/generate-pjum-package-pdf.ts lib/pdf/pjum-validator-stamp.ts
git commit -m "refactor(pdf): remove pdf-lib stamp; QR rendered inside react-pdf footer"
```

---

## Task 6: Write Agent Task Note

- [ ] **Step 1: Create dated task note** in `docs/agent-notes/` using the template at `docs/agent-notes/TEMPLATE.md`.
  - Name format: `YYYY-MM-DD-HHMM-qr-footer-inline.md` (Asia/Jakarta time)
  - Key decision: moved from `pdf-lib` stamp (layout-blind) to `react-pdf` native `<Image>` in footer (layout-aware)
  - Files changed: 5 PDF files + 2 spec files

- [ ] **Step 2: Commit the note**

```powershell
git add docs/agent-notes/
git commit -m "docs: add task note for QR footer inline migration"
```
