# Plan Fix PJUM PDF Renderer

## Scope

Created an implementation plan to fix the production PJUM approval failure where React PDF crashes with `Cannot read properties of undefined (reading 'S')`.

## Context and Sources

- User reported BNM cannot approve PJUM.
- Dokploy logs showed repeated `approvePjumExport` failures with the same React PDF reconciler stack.
- Reviewed `next.config.ts`, `app/reports/pjum/approval-actions.ts`, `lib/pdf/generate-pjum-package-pdf.ts`, and React PDF package versions in `package-lock.json`.

## Changed Files

- `docs/superpowers/plans/2026-09-14-fix-pjum-approval-pdf-renderer.md`: added task-by-task implementation plan.
- `docs/agent-notes/2026-09-14-1023-plan-fix-pjum-pdf-renderer.md`: recorded this planning task.

## Decisions

- The plan focuses on removing `@react-pdf/renderer` from Next.js optimized package imports and externalizing it for server runtime.
- The plan keeps PJUM approval strict: approval should still fail if PDF generation fails.
- The plan includes config guard and smoke PDF renderer checks before deployment.

## Verification

- Documentation-only planning change; no application test suite was run.

## Remaining Work and Risks

- Implementation and Dokploy verification remain pending.
