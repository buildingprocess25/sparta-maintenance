import assert from "node:assert/strict";
import { checkAgentTaskNote } from "./check-agent-task-note.mjs";

assert.equal(
    checkAgentTaskNote(["app/login/page.tsx"]),
    1,
    "substantive changes require a dated task note",
);

assert.equal(
    checkAgentTaskNote([
        "app/login/page.tsx",
        "docs/agent-notes/2026-07-28-0910-login.md",
    ]),
    0,
    "a dated task note allows substantive changes",
);

assert.equal(
    checkAgentTaskNote(["docs/superpowers/plans/example.md"]),
    0,
    "process documentation is exempt",
);

console.log("agent task note assertions passed");
