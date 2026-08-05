# Add Store Code 4-Character Validation

## Scope

- Menambahkan validasi kode toko wajib 4 karakter alfanumerik saat penambahan toko.
- Validasi dilakukan di dua lapis:
  1. **Server-Side**: Zod validation di `adminCreateStore` dan `createStore` (BMC).
  2. **Client-Side**: Real-time UX inline error rendering tanpa HTML5 `pattern` popup, untuk memberikan UX yang lebih baik (user bisa mengetik lalu diberi tahu lewat teks merah di bawah form jika ada error).

## Context and Sources

- Sesuai permintaan user untuk mencegah *typo* dan standarisasi kode toko (Store Code) yang selalu persis 4 karakter.
- Diskusi UX: menggunakan teks inline *real-time* error jauh lebih intuitif ketimbang *hard limit* HTML yang membungkam input *user*.

## Changed Files

- `app/admin/database/actions.ts`: Add zod validation layer before DB insert.
- `app/bmc/database/actions.ts`: Add zod validation layer before DB insert.
- `app/admin/database/_components/store-form-dialog.tsx`: Real-time state check `isCodeValid` dan blok submit jika invalid.
- `app/bmc/database/_components/store-form-dialog.tsx`: Real-time state check `isCodeValid` dan blok submit jika invalid.

## Decisions

- Tidak menggunakan library eksternal lain di form (seperti React Hook Form) karena Zod sudah diinstall di `package.json` dan bisa dipadukan dengan standar React `useState`.

## Verification

- Kompilasi (`tsc`) berhasil dilewati.
- Form akan menolak submission untuk kode selain `/^[A-Za-z0-9]{4}$/`.

## Remaining Work and Risks

None.
