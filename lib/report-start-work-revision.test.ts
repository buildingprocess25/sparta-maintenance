import assert from "node:assert/strict";
import {
    parseStartWorkPhotoUrls,
    serializeStartWorkSelfieUrls,
} from "./report-start-work-revision";

assert.deepEqual(parseStartWorkPhotoUrls(null), []);
assert.deepEqual(parseStartWorkPhotoUrls(""), []);
assert.deepEqual(parseStartWorkPhotoUrls("https://example.com/selfie.jpg"), [
    "https://example.com/selfie.jpg",
]);
assert.deepEqual(
    parseStartWorkPhotoUrls(
        '["https://example.com/1.jpg"," ","https://example.com/2.jpg"]',
    ),
    ["https://example.com/1.jpg", "https://example.com/2.jpg"],
);
assert.deepEqual(parseStartWorkPhotoUrls(["a", "", 42, "b"]), ["a", "b"]);

assert.equal(serializeStartWorkSelfieUrls([]), null);
assert.equal(serializeStartWorkSelfieUrls(["https://example.com/1.jpg"]), "https://example.com/1.jpg");
assert.equal(
    serializeStartWorkSelfieUrls([
        "https://example.com/1.jpg",
        "https://example.com/2.jpg",
    ]),
    '["https://example.com/1.jpg","https://example.com/2.jpg"]',
);

console.log("report-start-work-revision tests passed");
