# Preventive skip verification

## Scope

Pre-migration verification of the preventive skip feature, the canonical note in `CLAUDE.md`, and the Prisma steps the developer runs personally.

## Context and Sources

- `docs/superpowers/specs/2026-10-29-skip-preventive-first-month-design.md`
- `docs/superpowers/plans/2026-10-29-skip-preventive-first-month.md` (Task 7)
- Notes `2026-10-29-1405` through `2026-10-29-1450` (preventive-skip-*)

## Changed Files

- `CLAUDE.md`: Notes entry for the first-month preventive skip rule.

## Decisions

- The agent does not run Prisma commands (user decision); the migration is created by the developer.

## Verification

- Unit tests pass: `lib/preventive-skip.spec.ts`, `lib/preventive-cooldown.spec.ts`, `app/reports/actions/types.spec.ts`, `app/reports/(bms)/create/hooks/preventive-visibility.spec.ts`, `app/dashboard/reports/[reportNumber]/_lib/detail-data.spec.ts`.
- `npx tsc --noEmit` → only errors caused by the stale Prisma Client (`preventiveSkipped` unknown, plus cascading select types in `app/dashboard/reports/[reportNumber]/queries.ts` and `DraftRecord` arguments in `app/reports/actions/draft.ts`).
- After the developer ran the migration (`20261029072234_add_report_preventive_skipped`) and `npm run db:generate`: `npx tsc --noEmit` → no errors outside `.next/`; `npm run build` → success.
- Browser (local DB, dev quick login BMS, store AHO2 "Belum Preventif", 29 Oct = first month of Q4):
  - Checklist step shows "Mode Checklist Wajib" with the "Lewati Preventif" button.
  - Confirmation dialog shows the limits text; confirming switches to "Mode Perbaikan · Preventif dilewati", hides "Preventif Equipment Toko" (category I), A–H remain.
  - "Batalkan, isi checklist lengkap" restores Mode Checklist Wajib with category I.
  - Skip persists: localStorage draft has `skipPreventive: true`; server draft row for AHO2 has `preventiveSkipped = true`; reload → "Lanjutkan Draft" restores the skipped mode.
- Not run in the browser: submit, quota after submit, reviewer badge, revision flow, server rejection. Submitting dispatches in-app and web push notifications to recipients in the local DB, which appears to hold imported user data, so this was left for the developer's decision.

## Remaining Work and Risks

1. Submit-path checks from plan Task 7 Step 7 (items 5–10) still need a run.
2. The local DB keeps the test draft `AHO2-2610-001` (status DRAFT, skip on); discard it from the form if unwanted.
3. Production: `npx prisma migrate deploy` before or with the deploy.
