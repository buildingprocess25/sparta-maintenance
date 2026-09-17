# Server Draft Autosave Delay

## Scope

Records the manual change that shortens BMS server draft autosave idle delay from 17 seconds to 10 seconds and updates its contract test.

## Context and Sources

- User noted two files were manually edited before the PJUM QR validator implementation.
- Reviewed `app/reports/(bms)/create/hooks/use-server-draft-autosave.ts` and `app/reports/(bms)/create/hooks/use-server-draft-autosave.spec.ts`.

## Changed Files

- `app/reports/(bms)/create/hooks/use-server-draft-autosave.ts`: idle autosave constant changed to 10 seconds.
- `app/reports/(bms)/create/hooks/use-server-draft-autosave.spec.ts`: assertion updated to match the 10-second contract.

## Decisions

- Preserve the user-authored implementation and commit it before branching for PJUM QR validator work.

## Verification

- `node --require $env:TEMP\codex-os-userinfo-patch.cjs --import tsx 'app/reports/(bms)/create/hooks/use-server-draft-autosave.spec.ts'`: PASS.
- Direct `node_modules\.bin\tsx.cmd 'app\reports\(bms)\create\hooks\use-server-draft-autosave.spec.ts'` was blocked by local Node/tsx environment error `uv_os_get_passwd returned ENOMEM`.

## Remaining Work and Risks

None.
