# Agent Task Notes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Require durable, safe task notes from every AI agent or developer when work changes files or project decisions.

**Architecture:** A root `AGENTS.md` supplies the universal entry-point rule. `docs/agent-notes/` supplies the reusable note template and concise operating guide; no runtime or CI mechanism is added.

**Tech Stack:** Markdown, Git.

## Global Constraints

- Trigger a note only for tasks that change files or make project decisions.
- Use Asia/Jakarta timestamp names: `YYYY-MM-DD-HHMM-<task>.md`.
- Do not include secrets, credentials, raw SQL output, personal data, or production records.
- Do not modify runtime code, schema, migrations, or deployment configuration.

---

### Task 1: Add universal task-note instructions

**Files:**
- Create: `AGENTS.md`
- Create: `docs/agent-notes/TEMPLATE.md`
- Create: `docs/agent-notes/README.md`

**Interfaces:**
- Consumes: `AI_RULES.md` as the existing project-wide AI rule source.
- Produces: one documented workflow that every agent/developer can follow.

- [x] **Step 1: Create the root instruction file**

Write `AGENTS.md` with these requirements:

```markdown
## Required Project Context

Before starting work, read `AI_RULES.md`, canonical documents relevant to the
task, and recent related notes in `docs/agent-notes/`. Verify current code and
schema before relying on an older note.

## Required Task Note

Before finishing a task that changes files or project decisions, update
canonical documentation when permanent behavior changed and create one note
from `docs/agent-notes/TEMPLATE.md`. Name it with Asia/Jakarta time as
`YYYY-MM-DD-HHMM-<task>.md`. Never include secrets, credentials, raw SQL
output, personal data, or production records.
```

- [x] **Step 2: Create the reusable template**

Write `docs/agent-notes/TEMPLATE.md` with these headings:

```markdown
# <Task title>

## Scope
## Context and Sources
## Changed Files
## Decisions
## Verification
## Remaining Work and Risks
```

- [x] **Step 3: Create the usage guide**

Write `docs/agent-notes/README.md` stating that a note is required only when a
task changes files or project decisions; read-only exploration, status checks,
and unchanged investigations do not require one. Repeat the naming format,
template requirement, and prohibited content exactly.

- [x] **Step 4: Verify the documentation contract**

Run:

```powershell
rg -n "changes files|project decisions|Asia/Jakarta|secrets|raw SQL" AGENTS.md docs/agent-notes
git diff --check
```

Expected: every required trigger and safety restriction appears in the three
new files; `git diff --check` exits 0.

- [x] **Step 5: Commit**

```powershell
git add AGENTS.md docs/agent-notes
git commit -m "docs: require agent task notes"
```

### Task 2: Record the policy rollout

**Files:**
- Create: `docs/agent-notes/YYYY-MM-DD-HHMM-add-agent-task-notes.md`

**Interfaces:**
- Consumes: `docs/agent-notes/TEMPLATE.md` from Task 1.
- Produces: the first compliant task note, demonstrating the policy.

- [x] **Step 1: Create the task note**

Use the exact template. Record the three created documentation files, the
decision to require notes only for file/decision-changing work, the no-secret
rule, and the verification commands from Task 1.

- [x] **Step 2: Verify the note is compliant**

Run:

```powershell
Get-Content docs/agent-notes/YYYY-MM-DD-HHMM-add-agent-task-notes.md
git diff --check
```

Expected: all six template headings exist and `git diff --check` exits 0.

- [x] **Step 3: Commit**

```powershell
git add docs/agent-notes/YYYY-MM-DD-HHMM-add-agent-task-notes.md
git commit -m "docs: record agent note policy"
```

## Plan Self-Review

- Spec coverage: Task 1 implements the root rule, reusable template, and usage
  guide; Task 2 demonstrates the policy with its required rollout note.
- Placeholder scan: no TBD, TODO, or deferred implementation text remains.
- Scope: no runtime, schema, migration, deployment, or CI changes are planned.
