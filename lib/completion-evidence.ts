export type CompletionEvidenceEntry = {
    materialName: string;
    quantity: number | "";
    price: number | null;
};

export type CompletionEvidenceItem = {
    itemId: string;
    itemName: string;
    afterPhotoCount: number;
    realisasiEntries: CompletionEvidenceEntry[];
    discountAmount?: number;
};

export type CompletionEvidenceError = {
    itemId: string;
    message: string;
    description: string;
};

export function getCompletionEvidenceErrors(
    items: CompletionEvidenceItem[],
): CompletionEvidenceError[] {
    const errors: CompletionEvidenceError[] = [];

    for (const item of items) {
        const description = `Item: ${item.itemName}`;

        if (item.afterPhotoCount === 0) {
            errors.push({
                itemId: item.itemId,
                message: "Foto sesudah wajib diisi",
                description,
            });
        }

        if (item.realisasiEntries.length === 0) {
            errors.push({
                itemId: item.itemId,
                message: "Realisasi biaya wajib diisi",
                description,
            });
        }

        if (
            item.realisasiEntries.some(
                (entry) =>
                    entry.materialName.trim().length === 0 ||
                    entry.price === null ||
                    entry.quantity === "" ||
                    entry.quantity <= 0,
            )
        ) {
            errors.push({
                itemId: item.itemId,
                message:
                    "Semua baris realisasi harus memiliki nama barang, jumlah > 0, dan harga aktual",
                description,
            });
        }

        if (
            item.realisasiEntries.some(
                (entry) => entry.price !== null && entry.price < 0,
            )
        ) {
            errors.push({
                itemId: item.itemId,
                message: "Harga aktual/real tidak boleh minus",
                description,
            });
        }

        const discountAmount = item.discountAmount ?? 0;
        if (discountAmount < 0) {
            errors.push({
                itemId: item.itemId,
                message: "Potongan harga tidak boleh minus",
                description,
            });
        }

        const subtotal = item.realisasiEntries.reduce(
            (sum, entry) => sum + (typeof entry.quantity === "number" ? entry.quantity : 0) * (entry.price ?? 0),
            0,
        );
        if (discountAmount > subtotal) {
            errors.push({
                itemId: item.itemId,
                message: "Potongan harga tidak boleh lebih besar dari total item",
                description,
            });
        }
    }

    return errors;
}
