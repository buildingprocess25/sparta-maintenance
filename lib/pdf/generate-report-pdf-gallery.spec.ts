import assert from "node:assert/strict";
import type { ChecklistItemWithPhotos } from "./generate-report-pdf";
import {
    flattenChecklistPhotoTiles,
    paginateChecklistPhotoTiles,
} from "./checklist-photo-gallery";

const items: ChecklistItemWithPhotos[] = [
    {
        itemId: "E15",
        itemName: "Teralis (jendela/pintu)",
        categoryName: "E. Gudang",
        photoUrls: ["https://example.com/e15-a.jpg"],
    },
    {
        itemId: "E12",
        itemName: "Lantai keramik Gudang + kantor",
        categoryName: "E. Gudang",
        photoUrls: [
            "https://example.com/e12-a.jpg",
            "https://example.com/e12-b.jpg",
        ],
    },
    {
        itemId: "E5",
        itemName: "Dinding Gudang",
        categoryName: "E. Gudang",
        photoUrls: ["https://example.com/e5-a.jpg"],
    },
];

const tiles = flattenChecklistPhotoTiles(items);

assert.equal(tiles.length, 4);
assert.deepEqual(
    tiles.map((tile) => tile.url),
    [
        "https://example.com/e15-a.jpg",
        "https://example.com/e12-a.jpg",
        "https://example.com/e12-b.jpg",
        "https://example.com/e5-a.jpg",
    ],
);
assert.deepEqual(
    tiles.map((tile) => `${tile.itemId}:${tile.photoIndex}`),
    ["E15:1", "E12:1", "E12:2", "E5:1"],
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
