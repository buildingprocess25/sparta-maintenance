/**
 * Custom role label overrides per NIK.
 *
 * Jika NIK pengguna terdapat di sini, label jabatan yang ditampilkan
 * (PDF stamp, UI, dll) akan menggunakan nilai ini — apapun role sistem mereka.
 *
 * Format: { [NIK]: "Label Jabatan Kustom" }
 */
export const ROLE_LABEL_OVERRIDES: Record<string, string> = {
    "12095865": "Building Coordinator",
};
