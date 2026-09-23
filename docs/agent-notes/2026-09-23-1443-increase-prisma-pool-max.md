# Increase Prisma Connection Pool Max

## Scope

Increase the default connection pool maximum for Prisma from 3 to 15 to prevent `timeout exceeded when trying to connect` errors in production under high load. Modifies `lib/prisma.ts` and `.env.example`.

## Context and Sources

Production environment reported Prisma connection timeouts. The Next.js app on Dokploy queued database requests behind a small connection pool (3 connections) for Server Components/Actions fetching data concurrently, exceeding the 10-second wait limit.

## Changed Files

- `lib/prisma.ts`: increased `defaultPoolMax` from 3 to 15.
- `.env.example`: updated `DATABASE_POOL_MAX` to 15.

## Decisions

Increased default pool size to 15 to allow more parallel connections during Next.js rendering, avoiding connection starvation.

## Verification

Locally checked the code changes. Prisma will now default to 15 connections if `DATABASE_POOL_MAX` is omitted.

## Remaining Work and Risks

None.
