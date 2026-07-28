# Agent Task Notes Design

## Goal

Make project knowledge durable across AI agents and developers by requiring a
concise task note whenever work changes files or project decisions.

## Scope

Add a root `AGENTS.md` plus `docs/agent-notes/` documentation. This is a
project-process change only; it does not change runtime behavior, schema, or
deployment.

## Required Workflow

Before starting work, an agent or developer must read:

1. `AI_RULES.md`;
2. the canonical documents relevant to the task; and
3. recent related notes in `docs/agent-notes/`.

Before finishing a task that changes files or makes a project decision, it
must:

1. update canonical documentation when the decision or behavior is permanent;
2. create one task note using `docs/agent-notes/TEMPLATE.md`; and
3. name it `YYYY-MM-DD-HHMM-<task>.md` in Asia/Jakarta time.

Read-only exploration, status checks, and unchanged investigations do not
require a note.

## Task Note Contract

Each note records:

- scope and intent;
- sources/context reviewed;
- changed files;
- decisions and rationale;
- verification performed; and
- remaining work, risks, or explicitly deferred steps.

Notes must not contain credentials, secrets, raw SQL output, personal data, or
production records.

## Files

- `AGENTS.md`: universal entry-point instructions for every agent/developer.
- `docs/agent-notes/TEMPLATE.md`: required concise note structure.
- `docs/agent-notes/README.md`: naming, trigger, and safety guidance.

## Verification

Review the instructions for consistency: the trigger is identical in all three
files, the template covers every required field, and no task note is mandated
for read-only work.
