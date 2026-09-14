# CSRF Proxy Origin

## Scope

Fix production CSRF validation so mutating server actions can pass behind Dokploy or another reverse proxy when the browser origin is the configured public app URL. Outside scope: changing session/auth behavior or disabling CSRF.

## Context and Sources

- `lib/authorization.ts`
- `docs/project/07-integrations-and-env.md`
- Production log showed `saveServerDraft` failing with `CSRF validation failed: origin mismatch`.
- Production env already includes `APP_BASE_URL` and `NEXT_PUBLIC_APP_URL` for `https://maintenance.sparta-alfamart.web.id`.

## Changed Files

- `lib/authorization.ts`: allowed CSRF origin matching via configured app URLs, optional `CSRF_ALLOWED_ORIGINS`, direct `Host`, and `X-Forwarded-Host`; added failure logging without cookies/session data.
- `docs/project/07-integrations-and-env.md`: documented CSRF origin behavior and proxy expectations.
- `docs/agent-notes/2026-09-15-0035-csrf-proxy-origin.md`: task note.

## Decisions

- Keep CSRF enabled in production.
- Reuse existing `APP_BASE_URL` and `NEXT_PUBLIC_APP_URL` before requiring a new env.
- Support `CSRF_ALLOWED_ORIGINS` as an optional comma-separated escape hatch for additional production domains.
- Trust only origin host equality against configured public origins, `Host`, or `X-Forwarded-Host`.

## Verification

- `node scripts/check-agent-task-note.mjs`
- `.\node_modules\.bin\eslint.cmd lib/authorization.ts`
- `node --max-old-space-size=8192 node_modules/typescript/bin/tsc --noEmit --incremental false`

## Remaining Work and Risks

- Redeploy/restart production so runtime env is available.
- If failures continue, inspect the new warning log fields: `origin`, `host`, `forwardedHost`, and `allowedOrigins`.
- The `.cmd` TypeScript wrapper crashed once with Windows exit code `-1073741819` after clearing stale `.next` output; the direct `node` TypeScript command passed.
