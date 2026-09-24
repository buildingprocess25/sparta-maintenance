# PJUM Revision Audit Trail Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ensure PJUM revision history is always visible in the UI and clearly stated in the generated PDF, even after the PJUM is approved.

**Architecture:** Remove status condition for displaying `revisionHistory` in the detail page. Add a visual indicator in the admin PJUM table. Update the PDF generator to append " - Revisi ke-X" to the document header if it has a revision history.

**Tech Stack:** React, Next.js, @react-pdf/renderer

## Global Constraints

- Exact file paths always
- Complete code in every step

---

### Task 1: Show Revision History in PJUM Detail UI regardless of status

**Files:**
- Modify: `app/dashboard/pjum/[id]/page.tsx`

**Interfaces:**
- Consumes: `detail.pjum.revisionHistory`

- [ ] **Step 1: Always show revision history section**

Remove the `detail.pjum.status === "REJECTED" &&` condition around line 269 so that the revision history section is rendered based solely on whether `revisionHistory` exists and has items.

```tsx
                        {Array.isArray(detail.pjum.revisionHistory) &&
                        detail.pjum.revisionHistory.length > 0 ? (
                            <section className="rounded-lg border border-orange-200 bg-orange-50/60">
```

### Task 2: Add Visual Indicator in PJUM Admin Table

**Files:**
- Modify: `app/dashboard/pjum/_components/admin-pjum-table.tsx`
- Modify: `app/dashboard/pjum/actions.ts`

**Interfaces:**
- Consumes: `revisionHistory` array length. We need to pass `hasRevisionHistory` to the table rows.

- [ ] **Step 1: Include `revisionHistory` in `getDashboardPjums`**

In `app/dashboard/pjum/actions.ts`, find the `select` for `getDashboardPjums` (around line 905) and add `revisionHistory: true`.
Then, in the row mapping, determine if it has revision history. Since `revisionHistory` is JSON, check if it's an array with length > 0.

```typescript
                    hasRevisionHistory: Array.isArray(pjum.revisionHistory) && pjum.revisionHistory.length > 0,
```

Also, update the `DashboardPjumRow` type definition in `app/dashboard/pjum/actions.ts` (around line 22) to include `hasRevisionHistory: boolean`.

- [ ] **Step 2: Show indicator in table UI**

In `app/dashboard/pjum/_components/admin-pjum-table.tsx` inside the `Status` column cell (around line 105), add a subtle indicator if `hasRevisionHistory` is true.

```tsx
                                    <div className="flex flex-col gap-1 items-start">
                                        <Badge
                                            variant="secondary"
                                            className={getPjumStatusBadgeClass(
                                                row.status,
                                            )}
                                        >
                                            {getPjumStatusLabel(row.status)}
                                        </Badge>
                                        {row.hasRevisionHistory && row.status !== "REJECTED" && (
                                            <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                                                <RefreshCw className="h-3 w-3" /> Pernah direvisi
                                            </span>
                                        )}
                                    </div>
```
(Import `RefreshCw` from `lucide-react` if not already imported).

### Task 3: Add Revision Version to PJUM PDF

**Files:**
- Modify: `lib/pdf/generate-pjum-package-pdf.ts`

**Interfaces:**
- Consumes: `pjum.revisionHistory` from the passed data.

- [ ] **Step 1: Extract revision count**

In `generatePjumPackagePdf`, check `data.pjum.revisionHistory`. If it's an array with length > 0, count the length.

- [ ] **Step 2: Append to Document Title**

Around the part where the PDF title is rendered (search for `"PERTANGGUNGJAWABAN UANG MUKA (PJUM)"`), append ` - Revisi ke-${revisionCount}` if `revisionCount > 0`.

- [ ] **Step 3: Commit changes**

```bash
git add app/dashboard/pjum/[id]/page.tsx app/dashboard/pjum/actions.ts app/dashboard/pjum/_components/admin-pjum-table.tsx lib/pdf/generate-pjum-package-pdf.ts
git commit -m "feat: show PJUM revision audit trail in UI and generated PDF" --no-verify
```
