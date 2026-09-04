import type { ChecklistItemWithPhotos } from "@/lib/pdf/generate-report-pdf";

export type ChecklistPhotoTile = {
    key: string;
    itemId: string;
    itemName: string;
    categoryName: string;
    url: string;
    photoIndex: number;
};

export const CHECKLIST_PHOTO_COLS = 5;
export const CHECKLIST_PHOTO_ROWS_PER_PAGE = 6;
export const CHECKLIST_PHOTOS_PER_PAGE =
    CHECKLIST_PHOTO_COLS * CHECKLIST_PHOTO_ROWS_PER_PAGE;

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
    const limitedTiles = tiles.slice(0, CHECKLIST_PHOTOS_PER_PAGE * maxPages);

    for (let i = 0; i < limitedTiles.length; i += CHECKLIST_PHOTOS_PER_PAGE) {
        pages.push(limitedTiles.slice(i, i + CHECKLIST_PHOTOS_PER_PAGE));
    }

    return pages;
}
