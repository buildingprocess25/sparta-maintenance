# Maintenance Report Export - Jenis Laporan Column Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a "Jenis Laporan" column to the XLSX maintenance export that dynamically indicates whether a report is "Preventif" or "Insidentil" based on its historically saved JSON evidence.

**Architecture:** Use a highly-efficient raw SQL sub-query in `fetchReportExportRows` (`queries.ts`) to check preventive evidence using the pre-existing `completePreventiveEvidenceSql`. Then, inject the evaluated `isPreventive` boolean into the data rows and output it in the Excel sheet (`route.ts`) as a formatted string ("Preventif" or "Insidentil").

**Tech Stack:** Next.js, Prisma, xlsx

## Global Constraints

- Must evaluate `isPreventive` at the DB level to prevent large JSON loads in Node.js memory.
- The new column in Excel MUST be named "Jenis Laporan".
- The cell values MUST be exactly "Preventif" or "Insidentil".

---

### Task 1: Extend database query to evaluate `isPreventive`

**Files:**
- Modify: `app/admin/export/queries.ts`

**Interfaces:**
- Produces: Updated `ReportExportRow` shape mapping that yields an `isPreventive: boolean` field in its returned array.

- [ ] **Step 1: Import the Prisma module**

Ensure `Prisma` is available. It's likely already imported for `Prisma.sql`, but verify at the top of the file. No changes strictly required if already imported.

- [ ] **Step 2: Add raw query and `Set` evaluation to `fetchReportExportRows`**

Right after fetching the `reports` array using `prisma.report.findMany`, extract the `reportNumber`s. Then, execute the `completePreventiveEvidenceSql` in a `prisma.$queryRaw` statement.

```typescript
        const reportNumbers = reports.map((r) => r.reportNumber);
        
        let preventiveSet = new Set<string>();
        if (reportNumbers.length > 0) {
            const preventiveReports = await prisma.$queryRaw<{ reportNumber: string }[]>`
                SELECT r."reportNumber"
                FROM "Report" r
                WHERE r."reportNumber" IN (${Prisma.join(reportNumbers)})
                  AND ${completePreventiveEvidenceSql({
                      statusColumn: Prisma.sql`r."status"`,
                      itemsColumn: Prisma.sql`r."items"`,
                  })}
            `;
            preventiveSet = new Set(preventiveReports.map(r => r.reportNumber));
        }
```

- [ ] **Step 3: Map the `isPreventive` value to the returned rows**

In the `return reports.map((r) => { ... })` function at the end of `fetchReportExportRows`, add the `isPreventive` field based on the set.

```typescript
            return {
                reportNumber: r.reportNumber,
                isPreventive: preventiveSet.has(r.reportNumber),
                createdAt: r.createdAt,
                // ... (rest of the fields remain the same)
```

- [ ] **Step 4: Commit changes**

```bash
git add app/admin/export/queries.ts
git commit -m "feat: evaluate preventive status in maintenance report export query"
```

---

### Task 2: Inject "Jenis Laporan" column into Excel Builder

**Files:**
- Modify: `app/api/admin/export/route.ts`

**Interfaces:**
- Consumes: The updated `fetchReportExportRows` return containing `isPreventive`.
- Produces: A modified `buildReportSheet` function generating the new Excel column.

- [ ] **Step 1: Update headers in `buildReportSheet`**

Add `"Jenis Laporan"` to the `headers` array, right after `"No. Laporan"`.

```typescript
  const headers = [
    "No. Laporan",
    "Jenis Laporan",
    "Tanggal Dibuat",
    "Branch",
    // ... rest of headers
  ];
```

- [ ] **Step 2: Update row data mapping in `buildReportSheet`**

Map `r.isPreventive` to `"Preventif" : "Insidentil"` and place it right after `r.reportNumber`.

```typescript
    ...rows.map((r) => [
      textCell(r.reportNumber),
      textCell(r.isPreventive ? "Preventif" : "Insidentil"),
      dateCell(r.createdAt),
      textCell(r.branchName),
      // ... rest of mapped data
    ]),
```

- [ ] **Step 3: Run manual testing with Prisma Studio**

Run `npm run dev`, hit the `/api/admin/export` or download via the frontend Dashboard, and manually verify that the new "Jenis Laporan" column exists and displays "Preventif" or "Insidentil".

- [ ] **Step 4: Commit changes**

```bash
git add app/api/admin/export/route.ts
git commit -m "feat: add Jenis Laporan column to Excel maintenance export"
```
