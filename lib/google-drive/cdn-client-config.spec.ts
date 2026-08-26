import assert from "node:assert/strict";
import { resolveDriveCdnRoot } from "./cdn-client";

assert.equal(
  resolveDriveCdnRoot({
    GOOGLE_DRIVE_ROOT_FOLDER_ID: "canonical",
    DRIVE_CDN_ROOT_FOLDER_ID: "legacy",
  }),
  "canonical",
);
assert.equal(
  resolveDriveCdnRoot({ DRIVE_CDN_ROOT_FOLDER_ID: "legacy" }),
  "legacy",
);
assert.throws(() => resolveDriveCdnRoot({}), /GOOGLE_DRIVE_ROOT_FOLDER_ID/);
