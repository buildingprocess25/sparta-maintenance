# Full Report Photo Gallery Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix "Laporan Lengkap PDF" documentation pages so checklist photos render as a compact cross-item gallery with 5 photos per row, within 2-3 added pages when possible.

**Architecture:** Keep the existing PDF generation pipeline and Drive snapshot cache. Replace the per-item documentation layout inside `lib/pdf/generate-report-pdf.ts` with a flattened photo-tile model: each photo carries its own item caption, and pagination happens globally across all photos instead of per checklist item. Restore cached Drive URL behavior in the API route after generation testing is complete.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript 5, `@react-pdf/renderer`, Prisma 7, Node `tsx` for focused checks.

## Global Constraints

- Read `AI_RULES.md` before implementation.
- Preserve the standard "Laporan Final PDF" output; only the new full PDF documentation pages should change.
- Use existing shadcn/ui components for UI work; this plan does not require new UI components.
- Do not include secrets, raw SQL output, personal data, or production records in task notes.
- Create a dated task note in `docs/agent-notes/` before finishing file-changing work.
- Do not keep `reset.ts` or `scratch*.ts` debug files in the final changed set unless the user explicitly wants them.

---

## File Structure

- Modify `lib/pdf/generate-report-pdf.ts`: add a photo-tile type, flatten checklist item photos, render compact gallery cells with captions, paginate globally, and remove blank-page-causing page breaks.
- Modify `app/api/reports/[reportNumber]/pdf-full/route.ts`: restore redirect to existing `fullPdfDriveUrl` so the cached Drive PDF is reused.
- Modify `lib/pdf/report-pdf-full-builder.ts`: make sure exported helper usage is consistent; no data-shape rewrite is expected unless tests reveal missing URLs.
- Modify `docs/agent-notes/YYYY-MM-DD-HHMM-full-report-photo-gallery.md`: document the implementation and verification.
- Delete or ignore from staging: `reset.ts`, `scratch.ts`, `scratch2.ts`, `scratch3.ts`, `scratch4.ts`.

### Task 1: Add Deterministic Gallery Data Helpers

**Files:**
- Modify: `lib/pdf/generate-report-pdf.ts`

**Interfaces:**
- Consumes: `ChecklistItemWithPhotos[]`
- Produces:
  - `export type ChecklistPhotoTile = { key: string; itemId: string; itemName: string; categoryName: string; url: string; photoIndex: number }`
  - `export function flattenChecklistPhotoTiles(items: ChecklistItemWithPhotos[]): ChecklistPhotoTile[]`
  - `export function paginateChecklistPhotoTiles(tiles: ChecklistPhotoTile[], maxPages?: number): ChecklistPhotoTile[][]`

- [ ] **Step 1: Add helper types and functions near `ChecklistItemWithPhotos`**

```ts
export type ChecklistPhotoTile = {
    key: string;
    itemId: string;
    itemName: string;
    categoryName: string;
    url: string;
    photoIndex: number;
};

const PHOTO_ROWS_PER_PAGE = 6;
const PHOTO_TILES_PER_PAGE = PHOTO_COLS * PHOTO_ROWS_PER_PAGE;

export function flattenChecklistPhotoTiles(
    items: ChecklistItemWithPhotos[],
): ChecklistPhotoTile[] {
    return items.flatMap((item) =>
        item.photoUrls.map((url, index) => ({
            key: `${item.itemId}-${index}-${url}`,
            itemId: item.itemId,
            itemName: item.itemName,
            categoryName: item.categoryName,
            url,
            photoIndex: index + 1,
        })),
    );
}

export function paginateChecklistPhotoTiles(
    tiles: ChecklistPhotoTile[],
    maxPages = 3,
): ChecklistPhotoTile[][] {
    const pages: ChecklistPhotoTile[][] = [];
    const maxTiles = PHOTO_TILES_PER_PAGE * maxPages;
    const limitedTiles = tiles.slice(0, maxTiles);

    for (let i = 0; i < limitedTiles.length; i += PHOTO_TILES_PER_PAGE) {
        pages.push(limitedTiles.slice(i, i + PHOTO_TILES_PER_PAGE));
    }

    return pages;
}
```

- [ ] **Step 2: Run a TypeScript syntax check**

Run: `npm run build`

Expected: the build may still fail on existing unrelated issues, but there should be no TypeScript error for `ChecklistPhotoTile`, `flattenChecklistPhotoTiles`, or `paginateChecklistPhotoTiles`.

### Task 2: Render Compact Cross-Item Photo Gallery

**Files:**
- Modify: `lib/pdf/generate-report-pdf.ts`

**Interfaces:**
- Consumes: `ChecklistPhotoTile[]` from Task 1.
- Produces: `buildChecklistPhotoPages(items, dimensionMap, data, maxPages)` returns pages where each row contains up to 5 photos from any checklist item.

- [ ] **Step 1: Replace single-photo renderer with a captioned tile renderer**

```ts
function truncatePdfText(value: string, maxLength: number): string {
    return value.length > maxLength
        ? `${value.slice(0, Math.max(0, maxLength - 1))}...`
        : value;
}

function renderDocPhotoTile(tile: ChecklistPhotoTile) {
    return React.createElement(
        View,
        { key: tile.key, style: docPhotoPageStyles.photoTile },
        React.createElement(Image, {
            src: tile.url,
            style: docPhotoPageStyles.photoImage,
        }),
        React.createElement(
            Text,
            { style: docPhotoPageStyles.photoCaption },
            `${tile.itemId} - ${truncatePdfText(tile.itemName, 22)}`,
        ),
    );
}
```

- [ ] **Step 2: Update documentation page styles**

Use these style entries in `docPhotoPageStyles`:

```ts
photoGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: PHOTO_GAP,
},
photoTile: {
    width: PHOTO_CELL_W,
    marginBottom: 6,
},
photoImage: {
    width: PHOTO_CELL_W,
    height: PHOTO_CELL_H,
    objectFit: "cover",
    borderRadius: 2,
},
photoCaption: {
    marginTop: 2,
    fontSize: 5.5,
    color: "#374151",
    lineHeight: 1.15,
},
```

Remove the old `itemHeader`, `itemCode`, `itemName`, and `photoRow` dependencies from the documentation page render path after the new grid is wired.

- [ ] **Step 3: Replace `renderPageContent` with tile-based content**

```ts
function renderPageContent(pageTiles: ChecklistPhotoTile[]) {
    return React.createElement(
        View,
        { style: docPhotoPageStyles.photoGrid },
        ...pageTiles.map(renderDocPhotoTile),
    );
}
```

- [ ] **Step 4: Replace item-height pagination with global pagination**

Inside `buildChecklistPhotoPages`, replace the `currentPageItems/currentPageH/flushPage` item loop with:

```ts
const tiles = flattenChecklistPhotoTiles(itemsWithPhotos);
const pageTiles = paginateChecklistPhotoTiles(tiles, maxPages);

pageTiles.forEach((tilesForPage, index) => {
    pages.push(
        React.createElement(
            Page,
            {
                key: `doc-page-${index + 1}`,
                size: "A4",
                style: docPhotoPageStyles.page,
            },
            data.watermarkLogoBase64
                ? React.createElement(
                      View,
                      {
                          style: docPhotoPageStyles.watermarkContainer,
                          fixed: true,
                      },
                      React.createElement(Image, {
                          src: `data:image/png;base64,${data.watermarkLogoBase64}`,
                          style: docPhotoPageStyles.watermarkImage,
                      }),
                      React.createElement(
                          Text,
                          { style: docPhotoPageStyles.watermarkText },
                          "Dokumen dibuat oleh SPARTA",
                      ),
                  )
                : null,
            makeHeader(),
            React.createElement(
                View,
                null,
                React.createElement(
                    Text,
                    { style: docPhotoPageStyles.sectionTitle },
                    "Dokumentasi Foto Checklist",
                ),
                renderPageContent(tilesForPage),
            ),
            makeFooter(data.reportNumber),
        ),
    );
});
```

- [ ] **Step 5: Remove the `break: pageCount > 1` prop**

Expected behavior: no blank watermark-only pages between documentation pages.

### Task 3: Restore Full PDF Cache Reuse

**Files:**
- Modify: `app/api/reports/[reportNumber]/pdf-full/route.ts`

**Interfaces:**
- Consumes: `resolveFullReportSnapshotUrl(report)`
- Produces: cached full PDF requests redirect to Drive URL instead of regenerating.

- [ ] **Step 1: Restore existing URL redirect**

Replace the temporary bypass block with:

```ts
const existingUrl = resolveFullReportSnapshotUrl(report);
if (existingUrl) {
    return NextResponse.redirect(existingUrl);
}
```

- [ ] **Step 2: Keep first-generation response unchanged**

Do not change this response block:

```ts
return new NextResponse(buffer as unknown as BodyInit, {
    headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="${reportNumber}_full.pdf"`,
        "Cache-Control": "private, max-age=3600, immutable",
        "X-PDF-Source": "generated",
    },
});
```

### Task 4: Focused Verification

**Files:**
- Modify: `docs/agent-notes/YYYY-MM-DD-HHMM-full-report-photo-gallery.md`

**Interfaces:**
- Consumes: the implementation from Tasks 1-3.
- Produces: verified PDF layout and task note.

- [ ] **Step 1: Run static checks**

Run: `npm run build`

Expected: PASS. If it fails, record the exact failing file and error in the task note and fix implementation-owned failures.

- [ ] **Step 2: Generate a local full PDF using the existing scratch command only if DB/env access is available**

Preferred command after replacing the hardcoded report number with a known completed test report:

```powershell
npx tsx scratch2.ts
```

Expected: `test-full.pdf` is created and the generated documentation pages show up to 5 photos per row with item captions.

- [ ] **Step 3: Manually inspect generated PDF**

Expected checks:
- Documentation pages contain compact rows of photo tiles, not one full-width item bar per photo.
- Each row contains up to 5 photos.
- No blank watermark-only pages appear between documentation pages.
- Existing standard PDF pages still render before the documentation pages.
- If a report has more than 90 checklist photos, only the first 90 appear because the max is 3 pages × 30 photos/page.

- [ ] **Step 4: Write task note**

Create `docs/agent-notes/YYYY-MM-DD-HHMM-full-report-photo-gallery.md` with:

```md
# Full Report Photo Gallery

## Scope

Fix the "Laporan Lengkap PDF" documentation pages so checklist photos render as a compact cross-item gallery with captions, and restore cache reuse for generated full PDFs.

## Context and Sources

- User screenshot showed one checklist item/photo per row and blank-looking pages.
- Existing task note: `docs/agent-notes/2026-09-03-1624-laporan-lengkap-pdf.md`.
- Files reviewed: `lib/pdf/generate-report-pdf.ts`, `lib/pdf/report-pdf-full-builder.ts`, `app/api/reports/[reportNumber]/pdf-full/route.ts`.

## Changed Files

- `lib/pdf/generate-report-pdf.ts`: Replaced per-item documentation layout with compact cross-item gallery pagination.
- `app/api/reports/[reportNumber]/pdf-full/route.ts`: Restored redirect to cached `fullPdfDriveUrl`.

## Decisions

1. Documentation pages use 5 columns per row and 6 rows per page, capped at 3 pages.
2. Captions stay on each photo tile as `{itemId} - {itemName}` so item context is preserved without full-width item headers.
3. Existing generated Drive URLs are reused again instead of regenerating on every request.

## Verification

- `npm run build`: Record PASS or the exact implementation-owned failure.
- Manual PDF inspection: Record generated report number or explain why local generation was unavailable.

## Remaining Work and Risks

Record any skipped verification or environment blocker. Write `None` if nothing remains.
```

- [ ] **Step 5: Clean debug files from final staging**

Before staging, make sure these files are not included unless requested:

```text
reset.ts
scratch.ts
scratch2.ts
scratch3.ts
scratch4.ts
```

