Status: DONE

Commits created:

- `feat(pjum): add public validator page`

Summary:

- Added public server-rendered `/v/pjum/[token]` route.
- Added `getPublicPjumVerification(token)` with token format guard,
  `PjumExport` scalar lookup, separate `User` lookups by `bmsNIK` and
  `approvedByNIK`, report lookup by report numbers, and total expenditure
  calculation via `resolveReportTotalRealisasi(totalReal, items)`.
- Added `mapPjumVerificationRecord()` and focused TDD mapping spec.
- Added compact responsive validator UI using existing shadcn `Alert`, `Badge`,
  `Button`, `Card`, and `Separator` components.
- Left `proxy.ts` unchanged because `/v/pjum` is not in the protected prefixes.

Verification:

- Direct command
  `node_modules\.bin\tsx.cmd "app\v\pjum\[token]\validator-data.spec.ts"`
  failed before test load with `uv_os_get_passwd returned ENOMEM`.
- Workaround RED command
  `node --require C:\Users\Rendi Elang\.codex\visualizations\2026\09\15\01a0a325-09a6-7383-b066-e21ab576250d\os-userinfo-patch.cjs --import tsx "app\v\pjum\[token]\validator-data.spec.ts"`
  failed with `Cannot find module './validator-data'`.
- Workaround final focused test command passed:
  `pjum validator data mapping passed`.
- Proxy public-route source check passed:
  `protectedPrefixes = ["/dashboard", "/reports", "/approval", "/admin"]`;
  `/v/pjum` is not protected.
- Initial TypeScript check without heap option failed with Node out of memory.
- `node_modules\.bin\prisma.cmd generate` passed.
- `$env:NODE_OPTIONS='--max-old-space-size=4096'; node_modules\.bin\tsc.cmd --noEmit --pretty false --incremental false`
  passed with exit code 0.

Concerns:

- `validator-data.ts` does not import `server-only` because that package throws
  when the focused standalone `tsx` spec imports the pure mapper. The route is
  still server-rendered and the query path imports Prisma.
- Remaining QR/PDF/approval/documentation work is intentionally deferred to
  later plan tasks.
