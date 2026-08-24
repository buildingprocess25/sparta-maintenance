# Update Hanging Report Seed Script

## Scope

Updates `prisma/seed-hanging.ts` to properly create `CLOSED` and `ACTIVE` `BmsBalancePeriod` records to accurately simulate the new hybrid logic for hanging reports locally.

## Context and Sources

- `docs/superpowers/plans/2026-08-24-hanging-report-logic-plan.md`

## Changed Files

- `prisma/seed-hanging.ts`: Updated seeding logic for BmsBalancePeriod.

## Decisions

Created both a CLOSED period (to host the hanging reports) and an ACTIVE period to replicate the exact state of a BMS user who has left-behind reports from a previous cycle.

## Verification

Ran `npx tsx prisma/seed-hanging.ts` successfully.

## Remaining Work and Risks

None
