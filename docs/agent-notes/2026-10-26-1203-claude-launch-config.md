# Track Claude Code dev launch config

## Scope

Menambahkan `.claude/launch.json` (sebelumnya untracked) ke repo agar working
tree bersih. Tidak ada perubahan perilaku aplikasi.

## Context and Sources

- `.claude/launch.json`: konfigurasi `dev` yang menjalankan `npm run dev` di port 3001.

## Changed Files

- `.claude/launch.json`: konfigurasi launch `dev` untuk Claude Code.

## Decisions

- Di-commit terpisah dari perbaikan import AHO agar riwayat tetap rapi.

## Verification

- `git status` bersih setelah commit.

## Remaining Work and Risks

None
