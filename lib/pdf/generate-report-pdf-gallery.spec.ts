import assert from "node:assert/strict";
import type { ChecklistItemWithPhotos } from "./generate-report-pdf";
import {
    flattenChecklistPhotoTiles,
    paginateChecklistPhotoTiles,
} from "./checklist-photo-gallery";

const items: ChecklistItemWithPhotos[] = [
    {
        itemId: "A2",
        itemName: "Dekker/Grill Drainase",
        categoryName: "A. Bagian Depan Bangunan",
        photoUrls: ["https://example.com/a2-a.jpg"],
    },
    {
        itemId: "A10",
        itemName: "Dinding Pembatas Halaman",
        categoryName: "A. Bagian Depan Bangunan",
        photoUrls: [
            "https://example.com/a10-a.jpg",
            "https://example.com/a10-b.jpg",
        ],
    },
    {
        itemId: "A1",
        itemName: "Bahu Jalan",
        categoryName: "A. Bagian Depan Bangunan",
        photoUrls: ["https://example.com/a1-a.jpg"],
    },
    {
        itemId: "A4",
        itemName: "Lampu Pole Sign",
        categoryName: "A. Bagian Depan Bangunan",
        photoUrls: ["https://example.com/a4-a.jpg"],
    },
];

const tiles = flattenChecklistPhotoTiles(items);

assert.equal(tiles.length, 5);
assert.deepEqual(
    tiles.map((tile) => tile.url),
    [
        "https://example.com/a1-a.jpg",
        "https://example.com/a2-a.jpg",
        "https://example.com/a4-a.jpg",
        "https://example.com/a10-a.jpg",
        "https://example.com/a10-b.jpg",
    ],
);
assert.deepEqual(
    tiles.map((tile) => `${tile.itemId}:${tile.photoIndex}`),
    ["A1:1", "A2:1", "A4:1", "A10:1", "A10:2"],
);

const manyTiles = Array.from({ length: 95 }, (_, index) => ({
    key: `A1-${index}`,
    itemId: "A1",
    itemName: "Sample item",
    categoryName: "A. Sample",
    url: `https://example.com/${index}.jpg`,
    photoIndex: index + 1,
}));
const pages = paginateChecklistPhotoTiles(manyTiles, 3);

assert.equal(pages.length, 3);
assert.equal(pages[0].length, 30);
assert.equal(pages[1].length, 30);
assert.equal(pages[2].length, 30);
assert.equal(pages[2][29].url, "https://example.com/89.jpg");

console.log("generate-report-pdf gallery tests passed");
