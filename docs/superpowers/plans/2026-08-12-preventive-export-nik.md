# Preventive Checklist Export - NIK BMS Column Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a dedicated NIK BMS column to the preventive checklist Excel export for each quarter.

**Architecture:** Modify the database query format in `queries.ts` to separate the NIK and the Name, and then update the Excel sheet generation logic in `route.ts` to map this new data into a dedicated NIK column before the Name column.

**Tech Stack:** Next.js, Prisma, xlsx

## Global Constraints

- Must separate NIK and Name into two distinct properties in the `formatQuarter` return.
- Must place the NIK column immediately before the BMS Name column for each quarter (e.g. `TW1 NIK`, `TW1 BMS`, `TW1 TGL`).

---

### Task 1: Update the formatQuarter logic and type definition

**Files:**
- Modify: `app/admin/export/queries.ts`

**Interfaces:**
- Produces: Updated `PreventiveExportRow` type and an updated `formatQuarter` return structure yielding `{ nik: string, by: string, date: Date | null }`.

- [ ] **Step 1: Modify `fetchPreventiveExportRows` mapping logic**

Update the `formatQuarter` function to return `nik` alongside `by` and `date`. Also update the `return` statement at the bottom of the map function to include the updated quarters.

```typescript
            const formatQuarter = (
                info: { doneAt: Date; bmsName: string; bmsNIK: string } | null,
            ) => {
                if (!info) {
                    return { nik: "", by: "", date: null };
                }

                return {
                    nik: info.bmsNIK || "",
                    by: info.bmsName || "",
                    date: info.doneAt,
                };
            };
```

- [ ] **Step 2: Commit changes**

```bash
git add app/admin/export/queries.ts
git commit -m "feat: expose NIK in preventive export rows"
```

---

### Task 2: Update the Excel mapping in the API route

**Files:**
- Modify: `app/api/admin/export/route.ts`

**Interfaces:**
- Consumes: The updated `formatQuarter` structure from `fetchPreventiveExportRows`.
- Produces: A modified `buildPreventiveSheet` function that outputs the `TW[X] NIK` column.

- [ ] **Step 1: Update `PREVENTIVE_QUARTER_COLUMNS` configuration**

Add the `nik` property and `nikHeader` to all 4 quarters in `PREVENTIVE_QUARTER_COLUMNS`.

```typescript
const PREVENTIVE_QUARTER_COLUMNS = {
  1: {
    nik: "q1Nik",
    by: "q1By",
    date: "q1Date",
    nikHeader: "TW1 NIK",
    bmsHeader: "TW1 BMS",
    dateHeader: "TW1 TGL",
  },
  2: {
    nik: "q2Nik",
    by: "q2By",
    date: "q2Date",
    nikHeader: "TW2 NIK",
    bmsHeader: "TW2 BMS",
    dateHeader: "TW2 TGL",
  },
  3: {
    nik: "q3Nik",
    by: "q3By",
    date: "q3Date",
    nikHeader: "TW3 NIK",
    bmsHeader: "TW3 BMS",
    dateHeader: "TW3 TGL",
  },
  4: {
    nik: "q4Nik",
    by: "q4By",
    date: "q4Date",
    nikHeader: "TW4 NIK",
    bmsHeader: "TW4 BMS",
    dateHeader: "TW4 TGL",
  },
} as const;
```

- [ ] **Step 2: Update `buildPreventiveSheet` header logic**

Update the headers mapping to include `nikHeader`.

```typescript
  const quarterHeaders = quarters.flatMap((q) => [
    PREVENTIVE_QUARTER_COLUMNS[q].nikHeader,
    PREVENTIVE_QUARTER_COLUMNS[q].bmsHeader,
    PREVENTIVE_QUARTER_COLUMNS[q].dateHeader,
  ]);
```

- [ ] **Step 3: Update `buildPreventiveSheet` data mapping**

Update the quarter cells to push `nik` before `by`. Since `r` is typed as `any` or `Awaited<ReturnType<typeof fetchPreventiveExportRows>>[number]`, we can access `r[config.nik]`. Note that the `qXNik` field is actually nested inside `qX`, so let's check how the previous mapping works.

Wait, in `queries.ts`, the return object was:
```typescript
            return {
                storeCode: store.code,
                storeName: store.name,
                branchName: store.branchName,
                q1By: q1.by,
                q1Date: q1.date,
                // ...
            };
```
We need to make sure we also added `q1Nik: q1.nik,` etc in `queries.ts` in Task 1.

Let's revise Step 3 to ensure we map it from `config.nik`.

```typescript
      const quarterCells = quarters.flatMap((q) => {
        const config = PREVENTIVE_QUARTER_COLUMNS[q];
        return [
          textCell((r as any)[config.nik]), 
          textCell((r as any)[config.by]), 
          dateCell((r as any)[config.date])
        ];
      });
```

- [ ] **Step 4: Update `queries.ts` return object (Adjustment from Task 1 check)**

Ensure `queries.ts` returns the `qXNik` properties.

```typescript
            return {
                storeCode: store.code,
                storeName: store.name,
                branchName: store.branchName,
                q1Nik: q1.nik,
                q1By: q1.by,
                q1Date: q1.date,
                q2Nik: q2.nik,
                q2By: q2.by,
                q2Date: q2.date,
                q3Nik: q3.nik,
                q3By: q3.by,
                q3Date: q3.date,
                q4Nik: q4.nik,
                q4By: q4.by,
                q4Date: q4.date,
            };
```

- [ ] **Step 5: Run manual tests (Local testing with Prisma Studio)**

Manually change your local BMC account `branchNames` to `["BALARAJA"]` via Prisma Studio, and run `npm run dev`. Download the export and verify the column headers and NIK data.

- [ ] **Step 6: Commit changes**

```bash
git add app/api/admin/export/route.ts app/admin/export/queries.ts
git commit -m "feat: add NIK column to Excel preventive export"
```
