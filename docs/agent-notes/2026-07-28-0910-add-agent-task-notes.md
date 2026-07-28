# Add agent task notes

## Scope

Add a durable task-note workflow for every AI agent and developer. Runtime
code, schema, migrations, and deployment configuration are unchanged.

## Context and Sources

- `docs/superpowers/specs/2026-07-28-agent-task-notes-design.md`
- `docs/superpowers/plans/2026-07-28-agent-task-notes.md`
- `E:\APROJECT\chatbot-arta\AGENTS.md`
- `E:\APROJECT\chatbot-arta\docs\agent-notes\TEMPLATE.md`

## Changed Files

- `AGENTS.md`: universal context and task-note requirements.
- `docs/agent-notes/TEMPLATE.md`: reusable note structure.
- `docs/agent-notes/README.md`: trigger, naming, and safety guidance.
- `docs/superpowers/plans/2026-07-28-agent-task-notes.md`: implementation
  plan for this rollout.

## Decisions

- Require a note only when a task changes files or project decisions.
- Use Asia/Jakarta timestamps and one template for all agents and developers.
- Exclude secrets, credentials, raw SQL output, personal data, and production
  records from notes.

## Verification

- Documentation contract and whitespace checks passed.

## Remaining Work and Risks

None.
