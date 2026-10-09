# Minify Cron Log Output

## Scope

Reduced the verbosity of the `sync-bms-coverage` API JSON response to prevent log flooding in deployment environments.

## Context and Sources

- `app/api/cron/sync-bms-coverage/route.ts`
- User feedback regarding unreadable long JSON logs in Dokploy.

## Changed Files

- `app/api/cron/sync-bms-coverage/route.ts`: Modified the response and logger payload to only return/log the `summary` properties, omitting massive arrays like `sheetNames`, `skippedMissingStores`, and `resolvedLogs`.

## Decisions

- **Minified Response**: Production cron jobs only need to know the summary metrics. Omitted array details which are only useful during manual dry runs in the terminal.

## Verification

- Code reviewed to ensure summary matches the expected `SyncBmsCoverageResult` metric fields.

## Remaining Work and Risks

None.
