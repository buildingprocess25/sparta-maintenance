import assert from "node:assert/strict";
import { isSignageAhoRequired } from "./signage-aho-flag";

assert.equal(isSignageAhoRequired({}), false);
assert.equal(isSignageAhoRequired({ SIGNAGE_AHO_REQUIRED: "" }), false);
assert.equal(isSignageAhoRequired({ SIGNAGE_AHO_REQUIRED: "false" }), false);
assert.equal(isSignageAhoRequired({ SIGNAGE_AHO_REQUIRED: "1" }), false);
assert.equal(isSignageAhoRequired({ SIGNAGE_AHO_REQUIRED: "true" }), true);
assert.equal(isSignageAhoRequired({ SIGNAGE_AHO_REQUIRED: " TRUE " }), true);

console.log("signage aho flag tests passed");
