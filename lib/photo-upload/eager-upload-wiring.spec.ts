import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (path: string) => readFileSync(path, "utf8");

const hook = read("lib/hooks/use-eager-photo-uploads.ts");
const statusUi = read("components/photo-upload-status.tsx");
const completionStrip = read("app/reports/[reportNumber]/completion/components/photo-strip.tsx");
const startWorkClient = read("app/reports/[reportNumber]/start/start-work-client.tsx");

assert.match(hook, /useSyncExternalStore\(/);
assert.match(hook, /sparta-eager-uploads-\$\{reportNumber\}/);
assert.match(hook, /uploadPhotoRequest\(file, context\)/);
assert.match(statusUi, /export function PhotoUploadStatusProvider/);
assert.match(statusUi, /export function PhotoUploadStatusOverlay/);
assert.match(statusUi, /from "@\/components\/ui\/button"/);
assert.match(completionStrip, /<PhotoUploadStatusOverlay photoId=\{photo\.id\} \/>/);
assert.match(startWorkClient, /<PhotoUploadStatusOverlay photoId=\{photo\.id\} \/>/);

console.log("eager upload wiring assertions passed");
