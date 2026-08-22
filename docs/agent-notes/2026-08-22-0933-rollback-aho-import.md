# Emergency Rollback: AHO Import Background Job

## Scope

Restore the dashboard AHO XLSX import entry points to the known production baseline at commit `b45b5a6792e6bb85e047ba583f39ab227164f247`.

## Context and Sources

- The production upload remained in the submitting state for approximately ten minutes.
- No new row was created in `AhoImportJob`, so no background import job was active at rollback time.
- The previous Dokploy deployment did not have a registry rollback image available.
- Git history confirms the background-job improvement starts after the selected baseline.

## Changed Files

- `app/dashboard/aho-tickets/actions.ts`: restore the synchronous import implementation from the baseline.
- `app/dashboard/aho-tickets/_components/import-aho-tickets-dialog.tsx`: restore the matching synchronous import UI from the baseline.

## Decisions

- Preserve `AhoImportJob`, `AhoImportStatus`, and the applied migration because the database change is additive and already deployed.
- Keep the unused background-job support files temporarily to minimize the emergency corrective diff.
- Treat this as an operational rollback, not the final solution for the Traefik timeout.

## Verification

- Baseline equality check passed for both restored files (`git diff --exit-code`, exit 0).
- `git diff --check` passed.
- Next.js production build passed, including TypeScript and generation of 49 static pages.
- Prisma schema and migration files were not modified.

## Remaining Work and Risks

- The previous Traefik timeout behavior can return because the synchronous request waits for the complete import.
- Design a durable and resource-bounded background import flow after production is stable.
