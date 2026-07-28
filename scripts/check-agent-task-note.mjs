import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const isTaskNote = (path) =>
    /^docs\/agent-notes\/\d{4}-\d{2}-\d{2}-\d{4}-.+\.md$/.test(path);

const isExempt = (path) =>
    path.startsWith("docs/agent-notes/") ||
    path.startsWith("docs/superpowers/") ||
    path.startsWith(".githooks/") ||
    path === "AGENTS.md" ||
    path === "AI_RULES.md";

export function checkAgentTaskNote(paths) {
    const changedPaths = paths.filter(Boolean);

    if (!changedPaths.some((path) => !isExempt(path))) return 0;
    if (changedPaths.some(isTaskNote)) return 0;

    return 1;
}

function getStagedPaths() {
    return execFileSync(
        "git",
        ["diff", "--cached", "--name-only", "--diff-filter=ACMR"],
        { encoding: "utf8" },
    )
        .trim()
        .split("\n")
        .filter(Boolean);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
    const result = checkAgentTaskNote(getStagedPaths());

    if (result) {
        console.error(
            "Task note required: add docs/agent-notes/YYYY-MM-DD-HHMM-<task>.md before committing substantive changes.",
        );
    }

    process.exitCode = result;
}
