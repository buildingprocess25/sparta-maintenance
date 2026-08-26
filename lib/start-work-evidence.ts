type MaterialStoreInput = {
    name: string;
    city: string;
    photoCount?: number;
};

type StartWorkEvidenceInput = {
    isZeroCost: boolean;
    skipPhotos: boolean;
    selfieCount: number;
    materialStorePhotoCount: number;
    receiptCount: number;
    materialStores: MaterialStoreInput[];
};

export function getStartWorkEvidenceError({
    isZeroCost,
    skipPhotos,
    selfieCount,
    materialStorePhotoCount,
    receiptCount,
    materialStores,
}: StartWorkEvidenceInput) {
    if (skipPhotos) {
        return isZeroCost
            ? null
            : "Lewati foto hanya diperbolehkan jika total estimasi adalah Rp 0";
    }

    if (selfieCount === 0) {
        return "Foto selfie bersama pejabat toko wajib diunggah";
    }

    if (materialStorePhotoCount === 0) {
        return "Setiap toko material wajib melampirkan foto";
    }

    if (receiptCount === 0) {
        return "Foto nota/struk wajib diunggah";
    }

    if (
        materialStores.length === 0 ||
        materialStores.some((store) => !store.name.trim() || !store.city.trim())
    ) {
        return "Semua toko material harus memiliki nama dan alamat";
    }

    if (materialStores.some((store) => store.photoCount === 0)) {
        return "Setiap toko material wajib melampirkan foto";
    }

    return null;
}
