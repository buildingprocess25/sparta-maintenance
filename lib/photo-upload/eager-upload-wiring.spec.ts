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

const completionHook = read("app/reports/[reportNumber]/completion/use-completion-work-form.ts");
const completionAutosave = read("app/reports/[reportNumber]/completion/hooks/use-completion-autosave.ts");
const completionClient = read("app/reports/[reportNumber]/completion/completion-client.tsx");

assert.match(completionHook, /useEagerPhotoUploads\(reportNumber\)/);
assert.match(completionHook, /kind: "COMPLETION_RESULT", reportNumber, itemId/);
assert.match(completionHook, /kind: "COMPLETION_ADDITIONAL", reportNumber/);
assert.match(completionHook, /eager\.registry\.ensureUploaded\(/);
assert.match(completionHook, /eager\.registry\.forget\(/);
assert.match(completionHook, /eager\.registry\.clear\(\)/);
assert.doesNotMatch(completionHook, /usePhotoUpload\(/);
assert.match(completionAutosave, /getUploadedUrl\?\.\(id\)/);
assert.match(completionClient, /<PhotoUploadStatusProvider value=\{photoUploadStatus\}>/);

console.log("eager upload wiring assertions passed");
