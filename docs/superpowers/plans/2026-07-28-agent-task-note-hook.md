# Agent Task Note Hook Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Block normal local commits that change substantive files without a dated task note.

**Architecture:** A dependency-free Node validator reads staged paths from Git. A versioned pre-commit hook calls it, while one explicit setup command configures Git to use `.githooks` for every local branch.

**Tech Stack:** Node.js, Git hooks, PowerShell.

## Global Constraints

- Do not add dependencies.
- Require notes only for staged substantive changes.
- Allow documentation/process-only commits without a new note.
- Do not alter runtime code, database schema, migrations, or deployment.
- Document that `git commit --no-verify` bypasses local hooks.

---

### Task 1: Add the staged-file validator and hook

**Files:**
- Create: `scripts/check-agent-task-note.mjs`
- Create: `.githooks/pre-commit`
- Modify: `package.json`

**Interfaces:**
- Consumes: `git diff --cached --name-only --diff-filter=ACMR`.
- Produces: exit `0` for compliant/exempt staged changes and exit `1` with a
  task-note instruction otherwise.

- [x] **Step 1: Write the failing staged-file checks**

Add a `scripts/check-agent-task-note.spec.mjs` script that runs the validator
with explicit path lists and asserts:

```js
assert.equal(check(["app/login/page.tsx"]), 1);
assert.equal(check([
  "app/login/page.tsx",
  "docs/agent-notes/2026-07-28-0910-login.md",
]), 0);
assert.equal(check(["docs/superpowers/plans/example.md"]), 0);
```

- [x] **Step 2: Run the check before implementation**

Run:

```powershell
node scripts/check-agent-task-note.spec.mjs
```

Expected: fail because the validator does not exist yet.

- [x] **Step 3: Implement the smallest validator**

Export a `checkAgentTaskNote(paths)` function that:

```js
const isNote = (path) =>
  /^docs\/agent-notes\/\d{4}-\d{2}-\d{2}-\d{4}-.+\.md$/.test(path);
const isExempt = (path) =>
  path.startsWith("docs/agent-notes/") ||
  path.startsWith("docs/superpowers/") ||
  path.startsWith(".githooks/") ||
  path === "AGENTS.md" ||
  path === "AI_RULES.md";
```

If at least one staged path is not exempt and no `isNote` path exists, print
an actionable error and return `1`; otherwise return `0`. When executed as a
script, obtain staged paths with Git and set `process.exitCode` to the result.

Create `.githooks/pre-commit`:

```sh
#!/bin/sh
node scripts/check-agent-task-note.mjs
```

Add scripts to `package.json`:

```json
"check:agent-note": "node scripts/check-agent-task-note.mjs",
"test:agent-note": "node scripts/check-agent-task-note.spec.mjs",
"setup:git-hooks": "git config core.hooksPath .githooks"
```

- [x] **Step 4: Run the regression checks**

Run:

```powershell
npm run test:agent-note
git diff --check
```

Expected: all three assertions pass and the diff has no whitespace errors.

- [ ] **Step 5: Commit**

```powershell
git add scripts/check-agent-task-note.mjs scripts/check-agent-task-note.spec.mjs .githooks/pre-commit package.json
git update-index --chmod=+x .githooks/pre-commit
git commit -m "chore: enforce agent task notes"
```

### Task 2: Document and activate the local hook

**Files:**
- Modify: `AGENTS.md`
- Modify: `docs/agent-notes/README.md`
- Create: `docs/agent-notes/YYYY-MM-DD-HHMM-enforce-agent-task-notes.md`

**Interfaces:**
- Consumes: `npm run setup:git-hooks` and the validator from Task 1.
- Produces: discoverable setup instructions and a rollout note.

- [x] **Step 1: Document setup and limits**

Add this command to both documentation files:

```powershell
npm run setup:git-hooks
```

State that it configures `.githooks/pre-commit`, blocks substantive commits
without a dated note, applies to every local branch, and can be deliberately
bypassed only with `git commit --no-verify`.

- [x] **Step 2: Create the rollout note**

Use `TEMPLATE.md`. Record the validator, hook, setup command, exempt paths,
the three regression cases, and the deliberate bypass limit.

- [x] **Step 3: Activate and test the hook**

Run:

```powershell
npm run setup:git-hooks
git config --get core.hooksPath
npm run test:agent-note
git diff --check
```

Expected: `core.hooksPath` is `.githooks`, all regression assertions pass,
and the diff has no whitespace errors.

- [ ] **Step 4: Commit**

```powershell
git add AGENTS.md docs/agent-notes
git commit -m "docs: explain task note hook"
```

## Plan Self-Review

- Spec coverage: Task 1 provides a versioned hook and validator; Task 2 makes
  setup, scope, and bypass behavior discoverable and activates the hook.
- Placeholder scan: no implementation placeholder remains.
- Scope: enforcement runs locally on normal commits; it does not claim to
  detect decision-only work or prevent deliberate hook bypasses.
