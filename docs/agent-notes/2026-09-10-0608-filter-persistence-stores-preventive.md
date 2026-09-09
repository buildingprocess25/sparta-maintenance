# Filter Persistence via URL for Preventive and Stores

## Scope

Synchronizing client-side filter states with the URL's query parameters for the Preventive (`/dashboard/preventive`) and Stores (`/dashboard/stores`) dashboard pages.

## Context and Sources

- Plan: `docs/superpowers/plans/2026-09-08-filter-persistence-url.md`
- Previous Note: `docs/agent-notes/2026-09-08-1600-filter-persistence-url.md`

## Changed Files

- `app/dashboard/preventive/_components/admin-preventive-table.tsx`: added pushFilterToUrl.
- `app/dashboard/stores/_components/admin-stores-table.tsx`: added pushFilterToUrl.
- `app/dashboard/stores/page.tsx`: read filters from searchParams.

## Decisions

- Next.js built-in `next/navigation` was used.
- The `search` input text is debounced directly via a 300ms timeout in `pushFilterToUrl`.
- Applied `{ scroll: false }` to avoid cluttering browser history and preserve the user's scroll position.

## Verification

- Tested locally and build succeeds.

## Remaining Work and Risks

None.
