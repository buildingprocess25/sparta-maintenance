# Fix BMS Balance UI Hydration and Database Sync

## Scope

Fixing React hydration errors in the BMS Welcome Card dashboard, fixing a Prisma query issue in `lib/balance.ts`, and synchronizing the local development database with Prisma migrations.

## Context and Sources

- Error: Hydration failed because the server rendered HTML didn't match the client. (Caused by `asChild` wrapping inside Radix UI elements over Server Components).
- Error: Invalid `id` field in `Report.findMany()` in `lib/balance.ts`.
- Error: Database migration drift on local development server.

## Changed Files

- `components/ui/drawer.tsx`: Added shadcn Drawer component for the balance history UI.
- `package.json` & `package-lock.json`: Added `vaul` dependency.
- `app/dashboard/_components/bms-welcome-card.tsx`: Removed direct `DrawerTrigger` from Server Component to prevent hydration mismatch.
- `app/dashboard/_components/balance-history-drawer.tsx`: Moved `DrawerTrigger` directly into the Client Component and implemented proper state handling.
- `app/dashboard/actions.ts`: Created Server Action for fetching balance history.
- `lib/balance.ts`: Removed `id` field which no longer exists in `Report` schema.

## Decisions

- Moved the drawer trigger logic entirely into the Client Component (`balance-history-drawer.tsx`) because interleaving Radix UI's `asChild` prop over Server Components with complex DOM elements caused strict hydration mismatch on the client.
- Handled database synchronization via `npx prisma db push` combined with `npx prisma migrate resolve --applied` to safely fix the drift without data loss, rather than `migrate dev` which would have demanded a database reset.

## Verification

- `npx prisma db push` succeeded cleanly.
- `npx prisma migrate status` reports `Database schema is up to date!`.
- Manually verified UI flow architecture avoids React hydration mismatch.

## Remaining Work and Risks

None.
