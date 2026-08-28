import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const sharedHook = readFileSync("lib/hooks/use-photo-upload.ts", "utf8");
const checklistHook = readFileSync(
  "app/reports/(bms)/create/hooks/use-photo-upload.ts",
  "utf8",
);
const startWorkClient = readFileSync(
  "app/reports/[reportNumber]/start/start-work-client.tsx",
  "utf8",
);
const completionHook = readFileSync(
  "app/reports/[reportNumber]/completion/use-completion-work-form.ts",
  "utf8",
);

assert.match(
  sharedHook,
  /formData\.append\("context", JSON\.stringify\(context\)\)/,
);
assert.doesNotMatch(sharedHook, /branchName/);
assert.match(checklistHook, /kind:\s*"CHECKLIST"/);
assert.match(checklistHook, /reportNumber/);
assert.match(startWorkClient, /kind:\s*"START_SELFIE"/);
assert.match(startWorkClient, /kind:\s*"START_RECEIPT"/);
assert.match(startWorkClient, /kind:\s*"START_MATERIAL_STORE"/);
assert.match(completionHook, /kind:\s*"COMPLETION_RESULT"/);
assert.match(completionHook, /kind:\s*"COMPLETION_RECEIPT"/);
assert.match(completionHook, /kind:\s*"COMPLETION_ADDITIONAL"/);
assert.match(completionHook, /kind:\s*"START_SELFIE"/);
