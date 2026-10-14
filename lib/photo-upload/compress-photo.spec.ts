import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (path: string) => readFileSync(path, "utf8");

const compressModule = read("lib/photo-upload/compress-photo.ts");
const startWorkClient = read("app/reports/[reportNumber]/start/start-work-client.tsx");
const completionHook = read("app/reports/[reportNumber]/completion/use-completion-work-form.ts");

assert.match(compressModule, /useWebWorker: false/);
assert.match(compressModule, /maxSizeMB: 0\.07/);
assert.match(compressModule, /maxWidthOrHeight: 1280/);
assert.match(startWorkClient, /compressGalleryPhoto\(file\)/);
assert.doesNotMatch(startWorkClient, /from "browser-image-compression"/);
assert.match(completionHook, /compressGalleryPhoto\(file\)/);

console.log("gallery compression wiring assertions passed");
