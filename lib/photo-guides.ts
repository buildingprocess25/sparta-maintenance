import {
    REPORT_CHECKLIST_ITEMS,
    type PhotoGuideKey,
} from "@/lib/checklist-data";

export const PHOTO_GUIDE_COUNTDOWN_SECONDS = 5;

export type PhotoGuide = {
    key: PhotoGuideKey;
    title: string;
    src: string;
    alt: string;
};

export const PHOTO_GUIDES: Record<PhotoGuideKey, PhotoGuide> = {
    kwh: {
        key: "kwh",
        title: "Contoh Foto KwH yang Benar",
        src: "/assets/photo-guides/kwh.png",
        alt: "Dua contoh foto KwH meter dengan segel terlihat jelas, ditandai lingkaran merah, agar segel KwH terlihat jelas",
    },
    panel: {
        key: "panel",
        title: "Contoh Foto Panel Listrik yang Benar",
        src: "/assets/photo-guides/panel-listrik.png",
        alt: "Dua contoh foto panel listrik terbuka agar kondisi MCB dan wiring terlihat jelas",
    },
};

const guideKeyByItemId = new Map(
    REPORT_CHECKLIST_ITEMS.flatMap((item) =>
        item.photoGuide ? [[item.id, item.photoGuide] as const] : [],
    ),
);

export function getPhotoGuideForItem(itemId: string): PhotoGuide | undefined {
    const key = guideKeyByItemId.get(itemId);
    return key ? PHOTO_GUIDES[key] : undefined;
}

/** Popup terkunci hanya sekali per item per halaman. */
export function shouldGateCamera(
    itemId: string,
    seenItemIds: ReadonlySet<string>,
): boolean {
    return Boolean(getPhotoGuideForItem(itemId)) && !seenItemIds.has(itemId);
}
