# Full PDF Photo Label Overlay Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Menambahkan label status (Baik/Rusak/OK/Not OK) di pojok kiri atas pada tiap foto di halaman galeri laporan PDF, menggunakan `position: absolute` dari `@react-pdf/renderer`.

**Architecture:** Meneruskan data `condition` dan `preventiveCondition` dari database item ke struktur `ChecklistItemWithPhotos`, lalu menggunakannya di `renderDocPhotoTile` untuk me-render badge label berdasar kondisi.

**Tech Stack:** React, @react-pdf/renderer, TypeScript

## Global Constraints
- React PDF components (`View`, `Text`, `Image`) must be imported from `@react-pdf/renderer`.
- Badge text and color should match `conditionLabel` logic already present in `generate-report-pdf.ts`.

---
### Task 1: Update Types to Include Conditions

**Files:**
- Modify: `lib/pdf/generate-report-pdf.ts`
- Modify: `lib/pdf/checklist-photo-gallery.ts`

**Interfaces:**
- Produces: `ChecklistItemWithPhotos` and `ChecklistPhotoTile` with `condition?: string | null` and `preventiveCondition?: string | null`.

- [ ] **Step 1: Update `ChecklistItemWithPhotos`**
In `lib/pdf/generate-report-pdf.ts`, add `condition` and `preventiveCondition` fields to the type.

```typescript
export type ChecklistItemWithPhotos = {
    itemId: string;
    itemName: string;
    categoryName: string;
    photoUrls: string[]; // normalized before-photo URLs
    condition?: string | null;
    preventiveCondition?: string | null;
};
```

- [ ] **Step 2: Update `ChecklistPhotoTile`**
In `lib/pdf/checklist-photo-gallery.ts`, update the type.

```typescript
export type ChecklistPhotoTile = {
    key: string;
    itemId: string;
    itemName: string;
    categoryName: string;
    url: string;
    photoIndex: number;
    condition?: string | null;
    preventiveCondition?: string | null;
};
```

- [ ] **Step 3: Update `flattenChecklistPhotoTiles`**
In `lib/pdf/checklist-photo-gallery.ts`, pass the properties along.

```typescript
export function flattenChecklistPhotoTiles(
    items: ChecklistItemWithPhotos[],
): ChecklistPhotoTile[] {
    return [...items].sort(compareChecklistItemsById).flatMap((item) =>
        item.photoUrls.map((url, index) => ({
            key: `${item.itemId}-${index}-${url}`,
            itemId: item.itemId,
            itemName: item.itemName,
            categoryName: item.categoryName,
            url,
            photoIndex: index + 1,
            condition: item.condition,
            preventiveCondition: item.preventiveCondition,
        })),
    );
}
```

- [ ] **Step 4: Commit**
```bash
git add lib/pdf/generate-report-pdf.ts lib/pdf/checklist-photo-gallery.ts
git commit -m "feat(pdf): add condition types to checklist photo gallery"
```

---
### Task 2: Pass Conditions from DB to Gallery Data

**Files:**
- Modify: `lib/pdf/report-pdf-full-builder.ts`

**Interfaces:**
- Consumes: `ChecklistItemWithPhotos` type with new fields.
- Produces: Correctly mapped objects in `extractChecklistPhotos`.

- [ ] **Step 1: Map `condition` and `preventiveCondition` in `extractChecklistPhotos`**
In `lib/pdf/report-pdf-full-builder.ts`:

```typescript
function extractChecklistPhotos(items: ReportItemJson[]): ChecklistItemWithPhotos[] {
    return items
        .map((item): ChecklistItemWithPhotos => {
            const meta = getChecklistItemMeta(item.itemId);
            const photoUrls: string[] = [];

            // Prefer `images` array (new standard), fall back to single `photoUrl`
            const parsedImages = parseUrlList(item.images);
            if (parsedImages.length > 0) {
                photoUrls.push(...parsedImages);
            } else if (item.photoUrl) {
                photoUrls.push(item.photoUrl);
            }

            return {
                itemId: item.itemId,
                itemName:
                    item.itemName ||
                    meta?.itemName ||
                    item.itemId,
                categoryName:
                    item.categoryName ||
                    meta?.categoryName ||
                    "Tanpa Kategori",
                photoUrls,
                condition: item.condition,
                preventiveCondition: item.preventiveCondition,
            };
        })
        .filter((item) => item.photoUrls.length > 0)
        .sort(compareChecklistItemsById);
}
```

- [ ] **Step 2: Commit**
```bash
git add lib/pdf/report-pdf-full-builder.ts
git commit -m "feat(pdf): populate conditions for photo gallery builder"
```

---
### Task 3: Render Badge Overlay on Photos

**Files:**
- Modify: `lib/pdf/generate-report-pdf.ts`

**Interfaces:**
- Consumes: `docPhotoPageStyles` and `renderDocPhotoTile`.
- Produces: Visual overlay of Baik/Rusak status.

- [ ] **Step 1: Add overlay styles**
In `lib/pdf/generate-report-pdf.ts`, add to `docPhotoPageStyles`:

```typescript
    photoBadgeContainer: {
        position: "absolute",
        top: 2,
        left: 2,
        padding: "2 4",
        backgroundColor: "rgba(255, 255, 255, 0.9)",
        borderRadius: 2,
    },
    photoBadgeTextBaik: {
        fontFamily: "Helvetica-Bold",
        fontSize: 5,
        color: "#16a34a",
    },
    photoBadgeTextRusak: {
        fontFamily: "Helvetica-Bold",
        fontSize: 5,
        color: "#dc2626",
    },
    photoBadgeTextNeutral: {
        fontFamily: "Helvetica-Bold",
        fontSize: 5,
        color: "#6b7280",
    },
```

- [ ] **Step 2: Update `renderDocPhotoTile`**
Modify the renderer to use `conditionLabel` and absolute position styles.

```typescript
function renderDocPhotoTile(tile: ChecklistPhotoTile) {
    const label = conditionLabel(tile.condition ?? null, tile.preventiveCondition ?? null);
    const isRusak = label === "Rusak" || label === "Not OK";
    const isBaik = label === "Baik" || label === "OK";
    const badgeTextStyle = isRusak
        ? docPhotoPageStyles.photoBadgeTextRusak
        : isBaik
        ? docPhotoPageStyles.photoBadgeTextBaik
        : docPhotoPageStyles.photoBadgeTextNeutral;

    const showBadge = label !== "-";

    return React.createElement(
        View,
        { key: tile.key, style: docPhotoPageStyles.photoTile },
        React.createElement(
            View,
            { style: { position: "relative" } },
            React.createElement(Image, {
                src: tile.url,
                style: docPhotoPageStyles.photoImage,
            }),
            showBadge
                ? React.createElement(
                      View,
                      { style: docPhotoPageStyles.photoBadgeContainer },
                      React.createElement(Text, { style: badgeTextStyle }, label),
                  )
                : null,
        ),
        React.createElement(
            Text,
            { style: docPhotoPageStyles.photoCaption },
            `${tile.itemId} - ${truncatePdfText(tile.itemName, 22)}`,
        ),
    );
}
```

- [ ] **Step 3: Test and Commit**
```bash
npm run test -- lib/pdf/generate-report-pdf-gallery.spec.ts
```

```bash
git add lib/pdf/generate-report-pdf.ts
git commit -m "feat(pdf): render condition overlay badges on gallery photos"
```
