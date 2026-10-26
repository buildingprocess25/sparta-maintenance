# Aturan grup tiket AHO (signage I11-I13)

## Scope

Menambahkan helper murni `lib/aho-ticket-groups.ts` beserta spec. Item signage
I11-I13 berbagi satu tiket AHO; tiket itu tidak boleh dipakai item non-signage.
Tidak ada perubahan UI, server action, atau schema.

## Context and Sources

- `.superpowers/sdd/signage-task-3-brief.md` (kode dan nilai diikuti verbatim).
- `lib/checklist-data.ts`: `AhoTicketGroup`, `ahoTicketGroup: "signage"` pada I11-I13.

## Changed Files

- `lib/aho-ticket-groups.ts`: helper grup tiket (lookup grup, tiket terkunci, tiket grup, deteksi konflik).
- `lib/aho-ticket-groups.spec.ts`: spec yang diakhiri `aho ticket group tests passed`.

## Decisions

- Mengikuti brief apa adanya; pemanggil wajib hanya mengirim holder item rusak/NOT_OK.

## Verification

- `npx tsx lib/aho-ticket-groups.spec.ts`: gagal (module belum ada) sebelum implementasi, lolos sesudahnya.
- `npx tsc --noEmit`: tidak ada error di luar `.next/dev/types/routes.d.ts`.
- `npx eslint` pada kedua file: bersih.

## Remaining Work and Risks

None
