# Hanging Report Identification Logic Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Refactor hanging report detection to use hybrid `BmsBalancePeriod` status logic and date-based legacy fallback.

**Architecture:** Modifies the Prisma query in `searchDashboardPjumCandidates` to properly identify left-behind reports based on their Balance Period status, while preserving a fallback for legacy production data. The local seed script is also updated to match this architectural reality.

**Tech Stack:** Next.js Server Actions, Prisma ORM, TypeScript

## Global Constraints

- Must seamlessly handle both reports with `balancePeriodId` (new flow) and `null` (legacy flow).
- The definition of hanging must remain strictly bounded: only left behind (CLOSED) reports or strictly older legacy reports.

---

### Task 1: Update Dashboard Candidates Query

**Files:**
- Modify: `app/dashboard/pjum/actions.ts`

**Interfaces:**
- Consumes: Prisma `Report` model and `BmsBalancePeriod` relation
- Produces: `isHangingReport` boolean via Server Action

- [ ] **Step 1: Update the OR condition in Prisma query**

```typescript
// Find searchDashboardPjumCandidates in app/dashboard/pjum/actions.ts
// Replace the OR condition array to support the 3-pronged hybrid logic

            OR: [
                { finishedAt: { gte: fromDateObj, lt: toDateObj } }, // Laporan normal (sesuai filter)
                { balancePeriod: { status: "CLOSED" } }, // Gantung baru (mengecek status cycle)
                { balancePeriodId: null, finishedAt: { lt: fromDateObj } }, // Gantung legacy (fallback tanggal)
            ],
```

- [ ] **Step 2: Update the `isHangingReport` evaluation logic**

```typescript
// Find the mapping step inside rawReports.map in searchDashboardPjumCandidates
// Replace the old isHangingReport assignment

            const isHangingReport = report.balancePeriodId
                ? report.balancePeriod?.status === "CLOSED"
                : Boolean(report.finishedAt && new Date(report.finishedAt) < fromDateObj);
```

- [ ] **Step 3: Commit**

```bash
git add app/dashboard/pjum/actions.ts
git commit -m "fix(pjum): use hybrid logic for hanging report detection"
```

---

### Task 2: Update Seed Script for Manual Simulation

**Files:**
- Modify: `prisma/seed-hanging.ts`

**Interfaces:**
- Consumes: Prisma models
- Produces: Simulated dummy data representing a `CLOSED` cycle with left-behind reports.

- [ ] **Step 1: Rewrite BmsBalancePeriod seeding logic**

```typescript
// Replace the period creation block to create a CLOSED period for the hanging reports
// and an ACTIVE period to simulate current state.

  // Periode lama yang sudah ditutup (tempat laporan gantung tertinggal)
  let closedPeriod = await prisma.bmsBalancePeriod.findFirst({
    where: { bmsNIK: bmsUser.NIK, status: "CLOSED" }
  });

  if (!closedPeriod) {
    closedPeriod = await prisma.bmsBalancePeriod.create({
      data: {
        bmsNIK: bmsUser.NIK,
        status: "CLOSED",
        initialBalance: 5000000,
      }
    });
  }

  // Periode saat ini yang aktif
  let activePeriod = await prisma.bmsBalancePeriod.findFirst({
    where: { bmsNIK: bmsUser.NIK, status: "ACTIVE" }
  });

  if (!activePeriod) {
    activePeriod = await prisma.bmsBalancePeriod.create({
      data: {
        bmsNIK: bmsUser.NIK,
        status: "ACTIVE",
        initialBalance: 5000000,
      }
    });
  }
```

- [ ] **Step 2: Assign hanging reports to the CLOSED period**

```typescript
// When creating hangingReport1 and hangingReport2, assign their balancePeriodId to the closed period

      balancePeriodId: closedPeriod.id,
      pjumExportedAt: null, // explicit
```

- [ ] **Step 3: Run the script to verify no errors**

```bash
npx tsx prisma/seed-hanging.ts
```

- [ ] **Step 4: Commit**

```bash
git add prisma/seed-hanging.ts
git commit -m "chore(seed): update hanging reports seed to use closed balance period"
```
