# Remove Branch Count Badge from Coverage BMS Tab

## Scope

Menghapus badge counter angka cabang dari trigger tab "Coverage BMS" di halaman Checklist Preventif (`/dashboard/preventive`), menyisakan icon dan label judul "Coverage BMS".

## Context and Sources

- Permintaan user untuk membersihkan tampilan tab header Coverage BMS agar lebih minimalis dan bersih.
- Komponen: `app/dashboard/preventive/_components/admin-preventive-table.tsx`

## Changed Files

- `app/dashboard/preventive/_components/admin-preventive-table.tsx`: Menghapus komponen `<Badge>` berisi `coverageHierarchyData.length` dari `TabsTrigger value="coverage-bms"`.

## Decisions

- **Minimalist Tab Header:** Menghilangkan badge count di tab Coverage BMS agar header tab terlihat rapi, bersih, dan konsisten tanpa clutter.

## Verification

- Visual tab header terverifikasi tanpa badge count.
- Hot-reload Next.js dev server berjalan normal tanpa error.

## Remaining Work and Risks

None.
