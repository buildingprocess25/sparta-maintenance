# PJUM Public Validator Page

## Scope

Adds Task 2 of the PJUM QR validator plan: public validator data lookup,
data-shaping helper, focused mapping spec, and responsive public validation
page at `/v/pjum/[token]`.

Outside scope: QR generation, PDF stamping, approval-flow wiring, and canonical
workflow/route documentation for the full QR validator rollout.

## Context and Sources

- Reviewed `AI_RULES.md`.
- Reviewed `.superpowers/sdd/task-2-brief.md`.
- Reviewed `docs/superpowers/plans/2026-09-15-pjum-qr-validator.md`.
- Reviewed `docs/agent-notes/2026-09-15-1159-pjum-qr-validator-plan.md`.
- Reviewed `docs/agent-notes/2026-09-15-1220-pjum-verification-fields.md`.
- Reviewed `docs/project/04-workflows.md` and `docs/project/05-routes-and-ui.md`.
- Reviewed `lib/pjum-verification.ts`, `lib/realisasi.ts`, `proxy.ts`, and
  existing `components/ui/*` exports.

## Changed Files

- `app/v/pjum/[token]/validator-data.spec.ts`: adds focused mapping coverage
  for public PJUM validator metadata.
- `app/v/pjum/[token]/validator-data.ts`: adds public token lookup, separate
  BMS/approver `User` lookups by NIK, report total calculation using
  `resolveReportTotalRealisasi(totalReal, items)`, and mapping to public
  validator result data.
- `app/v/pjum/[token]/validator-content.tsx`: adds compact responsive
  shadcn-based validator UI with status, validation code, report numbers, and
  official PDF link.
- `app/v/pjum/[token]/page.tsx`: adds public server-rendered route using async
  Next.js 16 `params`.
- `.superpowers/sdd/task-2-report.md`: records the SDD task report.

## Decisions

- Kept `/v/pjum/[token]` outside auth by not adding it to `proxy.ts`; source
  check confirms protected prefixes remain `/dashboard`, `/reports`,
  `/approval`, and `/admin`.
- Used flat `bmsName` and `approverName` mapper input instead of stale relation
  fields because `PjumExport` has no Prisma relation fields for those users.
- Omitted `import "server-only"` from `validator-data.ts` because the local
  focused spec imports the pure mapper directly and `server-only` throws under
  the standalone `tsx` runner. The page remains server-rendered and the query
  path imports Prisma.
- Used existing shadcn `Alert`, `Badge`, `Button`, `Card`, and `Separator`
  components instead of raw card/button containers.

## Verification

- `node_modules\.bin\tsx.cmd "app\v\pjum\[token]\validator-data.spec.ts"`:
  failed before loading the test with `uv_os_get_passwd returned ENOMEM`, which
  matches the known local `tsx` issue.
- `node --require C:\Users\Rendi Elang\.codex\visualizations\2026\09\15\01a0a325-09a6-7383-b066-e21ab576250d\os-userinfo-patch.cjs --import tsx "app\v\pjum\[token]\validator-data.spec.ts"`:
  failed during RED with `Cannot find module './validator-data'`.
- Same preload test command after implementation: passed and printed
  `pjum validator data mapping passed`.
- `rg -n "protectedPrefixes|/v/pjum|/dashboard|/reports|/approval|/admin" proxy.ts`:
  confirmed `protectedPrefixes = ["/dashboard", "/reports", "/approval", "/admin"]`
  and no `/v/pjum` protection.
- `node_modules\.bin\tsc.cmd --noEmit --pretty false --incremental false`:
  failed with Node heap out of memory.
- `node_modules\.bin\prisma.cmd generate`: passed and regenerated Prisma Client
  so Task 1 verification fields were available to TypeScript.
- `$env:NODE_OPTIONS='--max-old-space-size=4096'; node_modules\.bin\tsc.cmd --noEmit --pretty false --incremental false`:
  passed with exit code 0.

## Remaining Work and Risks

- Later plan tasks still need to generate QR images, stamp PDFs, wire approval,
  reserve PDF footer room, and update canonical docs for the full QR validator
  behavior.
