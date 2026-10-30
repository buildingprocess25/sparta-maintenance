// Data checklist berdasarkan FCKT BnM Menu Ceklist
export type ChecklistCondition = "baik" | "rusak" | "tidak_ada" | "";
export type SignageCondition = "baik" | "kotor" | "pudar" | "rusak";
export type AhoTicketGroup = "signage";
export type PhotoGuideKey = "kwh" | "panel";

export interface SignageConfig {
    materials: readonly string[];
    allowNotAvailable?: boolean;
}

export interface ChecklistItem {
    id: string;
    name: string;
    desc?: string;
    condition: ChecklistCondition;
    photo?: File;
    photoUrl?: string;
    photoKey?: string;
    handler?: "BMS" | "Rekanan" | "";
    notes?: string;
    ahoTicketNumber?: string;
    /** Item signage: material terpilih, atau "TIDAK_ADA". */
    signageMaterial?: string;
    /** Item signage: kondisi asli sebelum diturunkan ke `condition`. */
    signageCondition?: SignageCondition | "";
}

export interface ChecklistCatalogItem {
    id: string;
    name: string;
    desc?: string;
    /** Item dengan alur Material → Kondisi (Baik/Kotor/Pudar/Rusak). */
    signage?: SignageConfig;
    /** Item dalam grup yang sama berbagi satu nomor tiket AHO. */
    ahoTicketGroup?: AhoTicketGroup;
    /** Contoh foto benar yang wajib dilihat sebelum memfoto item ini. */
    photoGuide?: PhotoGuideKey;
    /** Standar kondisi baik dari form FCKT (SAT/FRM/MED/001), kategori A–H. */
    standard?: string;
}

export interface ChecklistCategory {
    id: string;
    title: string;
    isPreventive?: boolean; // true = Category I (OK/Not OK + foto wajib jika OK)
    items: ChecklistCatalogItem[];
}

export const checklistCategories: ChecklistCategory[] = [
    {
        id: "A",
        title: "A. Bagian Depan Bangunan",
        items: [
            { id: "A1", name: "Bahu Jalan", standard: "Tidak berlubang, tidak bergelombang" },
            { id: "A2", name: "Dekker/Grill Drainase", standard: "Tidak pecah, tidak retak, tidak patah" },
            { id: "A3", name: "Pagar/Rantai Besi", standard: "Tidak keropos, tidak patah" },
            { id: "A4", name: "Lampu Pole Sign", standard: "Tidak kusam, tidak mati" },
            { id: "A5", name: "Lampu Shop Sign", standard: "Tidak kusam, tidak mati" },
            { id: "A6", name: "Lampu Listplank", standard: "Tidak kusam, tidak mati" },
            { id: "A7", name: "Halaman Parkir", standard: "Tidak berlubang, tidak bergelombang" },
            { id: "A8", name: "Pompa air + Instalasi", standard: "Pompa hidup, mengeluarkan air, tidak bocor" },
            { id: "A9", name: "PDAM + Instalasi", standard: "Meter air tersegel, tidak bocor, mengeluarkan air" },
            { id: "A10", name: "Dinding Pembatas Halaman", standard: "Tidak kusam, tidak retak/pecah" },
            { id: "A11", name: "Tiang Lampu Parkir", standard: "Tidak patah, tidak keropos" },
            { id: "A12", name: "Lampu Parkir (LED Tube/LED Sorot)*", standard: "Hidup dan bersih" },
            { id: "A13", name: "Awning/kanopi + talang", standard: "Tidak bocor, tidak keropos" },
            { id: "A14", name: "Lampu Awning/kanopi & lampu tutup toko", standard: "Hidup dan bersih" },
            { id: "A15", name: "Folding Gate/Pintu Besi Lipat/Rolling Door", standard: "Tidak macet, tidak patah" },
            { id: "A16", name: "Lantai Keramik Teras", standard: "Tidak kusam, tidak retak/pecah" },
            { id: "A17", name: "Dinding Teras", standard: "Tidak kusam, tidak retak/pecah" },
            { id: "A18", name: "Panel Listrik", photoGuide: "panel", standard: "Bersih, kabel & MCB tertata rapih serta berfungsi" },
            { id: "A19", name: "Ohm Saklar/COS", standard: "Berfungsi dan terkoneksi baik" },
            { id: "A20", name: "Stabilizer", standard: "Berfungsi, kapasitas terpenuhi, dan berpengaman" },
            { id: "A21", name: "Saklar", standard: "Berfungsi, tidak lepas/tidak pecah, terkoneksi baik" },
            { id: "A22", name: "Segel Kwh meter listrik / MCB PLN", photoGuide: "kwh", standard: "Terpasang dan tidak putus" },
            { id: "A23", name: "Angkur Genset", standard: "Menempel kokoh di dinding" },
            { id: "A24", name: "Stop Kontak Genset + Kabel", standard: "Tidak lepas, tidak pecah, ada arus listrik" },
            { id: "A25", name: "Stop kontak Tenan", standard: "Tidak lepas, tidak pecah, ada arus listrik" },
            { id: "A26", name: "Plafon Teras", standard: "Tidak kusam, tidak berlubang" },
            { id: "A27", name: "Manhole dalam (plafon teras)", standard: "Tidak kusam, tidak berlubang" },
            { id: "A28", name: "Lampu Teras", standard: "Hidup dan bersih" },
            { id: "A29", name: "Rangka/Dudukan sarana promo", standard: "Tidak keropos, tidak patah, tidak korosi/karat" },
            { id: "A30", name: "Pintu Alumunium + Kaca Single/Double Swing", standard: "Tidak bergesekan, tidak ngebanting, tidak pecah" },
            { id: "A31", name: "Floor Hinge", standard: "Bersih, tidak bocor" },
            { id: "A32", name: "Kusen Alumunium & Kaca", standard: "Tidak pecah, tidak retak, tidak patah" },
        ],
    },
    {
        id: "B",
        title: "B. Ruangan Area Sales",
        items: [
            { id: "B1", name: "Lampu Sales", standard: "Hidup dan bersih" },
            { id: "B2", name: "Plafon Sales", standard: "Tidak kusam, tidak berlubang" },
            { id: "B3", name: "Dinding Sales", standard: "Tidak kusam, tidak retak/pecah" },
            { id: "B4", name: "Lantai Keramik Sales", standard: "Tidak kusam, tidak retak/pecah" },
            { id: "B5", name: "Tiang/Kolom", standard: "Tidak kusam, tidak retak/pecah" },
            { id: "B6", name: "Instalasi Listrik Area Kasir", standard: "Tertata rapih, berpengaman" },
            { id: "B7", name: "Stop Kontak Area Kasir", standard: "Tidak lepas, tidak pecah, ada arus listrik" },
            { id: "B8", name: "Meja Kasir + Aksesoris", standard: "Tidak patah, tidak lepas, kunci laci berfungsi" },
            { id: "B9", name: "Stop Kontak Chiller", standard: "Tidak lepas, tidak pecah, ada arus listrik" },
            { id: "B10", name: "Exhaust Fan Ruang Chiller", standard: "Berfungsi dan bersih" },
            { id: "B11", name: "Stop Kontak Freezer", standard: "Tidak lepas, tidak pecah, ada arus listrik" },
            { id: "B12", name: "Kusen + Daun Pintu P1", standard: "Tidak keropos, bisa terkunci" },
        ],
    },
    {
        id: "C",
        title: "C. Selasar",
        items: [
            { id: "C1", name: "Lampu selasar", standard: "Hidup dan bersih" },
            { id: "C2", name: "Plafon Selasar", standard: "Tidak kusam, tidak berlubang" },
            { id: "C3", name: "Manhole dalam (plafon selasar)", standard: "Tidak kusam, tidak berlubang" },
            { id: "C4", name: "Manhole luar (dak toren air)", standard: "Tidak keropos, tidak korosi/karat, terkunci gembok" },
            { id: "C5", name: "Dinding Selasar", standard: "Tidak kusam, tidak retak/pecah" },
            { id: "C6", name: "Panel Listrik", photoGuide: "panel", standard: "Bersih, kabel & MCB tertata rapih serta berfungsi" },
            { id: "C7", name: "Ohm Saklar/COS", standard: "Berfungsi dan terkoneksi baik" },
            { id: "C8", name: "Stabilizer", standard: "Berfungsi, kapasitas terpenuhi, dan berpengaman" },
            { id: "C9", name: "Saklar", standard: "Berfungsi, tidak lepas/tidak pecah, terkoneksi baik" },
            { id: "C10", name: "Lantai Keramik Selasar", standard: "Tidak retak/pecah, tidak kusam" },
            { id: "C11", name: "Janitor", standard: "Bersih, tidak tersumbat" },
            { id: "C12", name: "Kran Janitor", standard: "Berfungsi, tidak bocor, tidak patah" },
            { id: "C13", name: "Floor Drain Janitor", standard: "Tidak tersumbat, tutup drain terpasang" },
            { id: "C14", name: "Kitchen Sink", standard: "Tidak bocor/keropos, bersih" },
            { id: "C15", name: "Kran Kitchen Sink", standard: "Berfungsi, tidak bocor, tidak patah" },
            { id: "C16", name: "Saluran Air Bersih", standard: "Tidak bocor, tidak pecah/patah, tidak tersumbat" },
            { id: "C17", name: "Saluran Air Kotor", standard: "Tidak bocor, tidak pecah/patah, tidak tersumbat" },
            { id: "C18", name: "Pompa air + Instalasi", standard: "Pompa hidup, mengeluarkan air, tidak bocor" },
        ],
    },
    {
        id: "D",
        title: "D. Kamar Mandi",
        items: [
            { id: "D1", name: "Pintu Kamar Mandi", standard: "Tidak macet, tidak keropos, bisa terkunci" },
            { id: "D2", name: "Lampu Kamar Mandi", standard: "Hidup dan bersih" },
            { id: "D3", name: "Exhaust Fan", standard: "Tidak kotor, tidak mati" },
            { id: "D4", name: "Plafon Kamar Mandi", standard: "Tidak kusam, tidak berlubang" },
            { id: "D5", name: "Dinding Kamar Mandi", standard: "Tidak kusam, tidak retak/pecah" },
            { id: "D6", name: "Lantai Kamar Mandi", standard: "Tidak kusam, tidak retak/pecah" },
            { id: "D7", name: "Floor Drain Kamar Mandi", standard: "Tidak tersumbat, tutup drain terpasang" },
            { id: "D8", name: "Kran Air", standard: "Berfungsi, tidak bocor, tidak patah" },
            { id: "D9", name: "Kloset", standard: "Bersih, tidak tersumbat, tidak retak/pecah" },
            { id: "D10", name: "Septictank", standard: "Tidak penuh, tidak mampet/tersumbat" },
            { id: "D11", name: "Saluran Air Bersih", standard: "Tidak bocor, tidak pecah/patah, tidak tersumbat" },
            { id: "D12", name: "Saluran Air Kotor", standard: "Tidak bocor, tidak pecah/patah, tidak tersumbat" },
        ],
    },
    {
        id: "E",
        title: "E. Gudang + Kantor",
        items: [
            { id: "E1", name: "Kusen + daun pintu P2", standard: "Tidak keropos, bisa terkunci" },
            { id: "E2", name: "Lampu Gudang", standard: "Hidup dan bersih" },
            { id: "E3", name: "Plafon Gudang", standard: "Tidak kusam, tidak berlubang" },
            { id: "E4", name: "Exhaust Fan", standard: "Tidak kotor, tidak mati" },
            { id: "E5", name: "Dinding Gudang", standard: "Tidak kusam, tidak retak/pecah" },
            { id: "E6", name: "Partisi ruang kepala toko (T120)", standard: "Tidak kusam, tidak retak/pecah" },
            { id: "E7", name: "Panel Listrik", photoGuide: "panel", standard: "Bersih, kabel & MCB tertata rapih serta berfungsi" },
            { id: "E8", name: "Ohm Saklar/COS", standard: "Berfungsi dan terkoneksi baik" },
            { id: "E9", name: "Stabilizer", standard: "Berfungsi, kapasitas terpenuhi, dan berpengaman" },
            { id: "E10", name: "Saklar", standard: "Berfungsi, tidak lepas/tidak pecah, terkoneksi baik" },
            { id: "E11", name: "Stop kontak", standard: "Tidak lepas, tidak pecah, ada arus listrik" },
            { id: "E12", name: "Lantai keramik Gudang + kantor", standard: "Tidak kusam, tidak retak/pecah" },
            { id: "E13", name: "Rooster", standard: "Tidak pecah" },
            { id: "E14", name: "Glasblok", standard: "Tidak pecah, tidak kusam" },
            { id: "E15", name: "Teralis (jendela/pintu)", standard: "Tidak korosi/karat, tidak patah" },
        ],
    },
    {
        id: "F",
        title: "F. Mess / R. Kantor",
        items: [
            { id: "F1", name: "Kusen + Daun Pintu + Jendela", standard: "Tidak keropos, bisa terkunci" },
            { id: "F2", name: "Lampu Mess/R. Kantor", standard: "Hidup dan bersih" },
            { id: "F3", name: "Exhaust Fan Mess/R. Kantor", standard: "Tidak kotor, tidak mati" },
            { id: "F4", name: "Plafon Mess/R. Kantor", standard: "Tidak kusam, tidak berlubang" },
            { id: "F5", name: "Dinding Mess/R. Kantor", standard: "Tidak kusam, tidak retak/pecah" },
            { id: "F6", name: "Saklar Lampu Mess/R. Kantor", standard: "Berfungsi, tidak lepas/tidak pecah, terkoneksi baik" },
            { id: "F7", name: "Stop Kontak Mess/R. Kantor", standard: "Tidak lepas, tidak pecah, ada arus listrik" },
            { id: "F8", name: "Lantai Keramik Mess/R. Kantor", standard: "Tidak kusam, tidak retak/pecah" },
            { id: "F9", name: "Teralis (jendela/pintu)", standard: "Tidak korosi/karat, tidak patah" },
        ],
    },
    {
        id: "G",
        title: "G. Ruang Atas / Lt. 2",
        items: [
            { id: "G1", name: "Trap Anak Tangga", standard: "Tidak retak/pecah, tidak patah" },
            { id: "G2", name: "Railing Tangga", standard: "Tidak retak/pecah, tidak patah" },
            { id: "G3", name: "Kusen + Daun Pintu + Jendela", standard: "Tidak keropos" },
            { id: "G4", name: "Lampu Ruang Atas/Lt. 2", standard: "Hidup dan bersih" },
            { id: "G5", name: "Exhaust Fan Ruang Atas/Lt. 2", standard: "Berfungsi dan bersih" },
            { id: "G6", name: "Plafon Ruang Atas/Lt. 2", standard: "Tidak kusam, tidak berlubang" },
            { id: "G7", name: "Dinding Ruang Atas/Lt. 2", standard: "Tidak kusam, tidak retak/pecah" },
            { id: "G8", name: "Saklar Lampu Ruang Atas/Lt. 2", standard: "Berfungsi, tidak lepas/tidak pecah, terkoneksi baik" },
            { id: "G9", name: "Stop Kontak Ruang Atas/Lt. 2", standard: "Tidak lepas, tidak pecah, ada arus listrik" },
            { id: "G10", name: "Lantai Keramik Ruang Atas/Lt. 2", standard: "Tidak kusam, tidak retak/pecah" },
            { id: "G11", name: "Teralis (jendela/pintu)", standard: "Tidak korosi/karat, tidak patah" },
        ],
    },
    {
        id: "H",
        title: "H. Bagian Atap",
        items: [
            { id: "H1", name: "Rangka Atap", standard: "Tidak keropos, tidak patah" },
            { id: "H2", name: "Talang", standard: "Tidak retak/pecah, tidak ada sampah" },
            { id: "H3", name: "Atap Asbes/Zingalum/Genteng", standard: "Tidak retak/pecah, tidak berlubang, tidak sobek" },
            { id: "H4", name: "Listplank", standard: "Tidak patah/lepas" },
            { id: "H5", name: "Roof Drain", standard: "Tidak tersumbat, tutup drain terpasang (jika ada)" },
            { id: "H6", name: "Pipa Instalasi Air Hujan", standard: "Tidak pecah/bocor, tidak tersumbat" },
        ],
    },
    {
        id: "I",
        title: "I. Preventif Equipment Toko",
        isPreventive: true,
        items: [
            {
                id: "I1",
                name: "Folding gate",
                desc: "Pembersihan pada bagian rel dan pelumasan persilangan",
            },
            {
                id: "I2",
                name: "Genset",
                desc: "Pembersihan dan pemanasan genset selama 5 menit",
            },
            {
                id: "I3",
                name: "Panel Listrik",
                desc: "Pembersihan Panel, Pengencangan baut MCB dan Perapihan Instalasi",
                photoGuide: "panel",
            },
            {
                id: "I4",
                name: "Emergency lamp UPS",
                desc: "Sistem Emergency lamp berfungsi (tes hidupkan)",
            },
            {
                id: "I5",
                name: "Air Curtain",
                desc: "Pembersihan cover dan fan",
            },
            {
                id: "I6",
                name: "Air Conditioner",
                desc: "Pembersihan filter udara dan cover indoor",
            },
            {
                id: "I7",
                name: "Chiller & Freezer (milik SAT)",
                desc: "Memastikan unit hidup dan berfungsi, lampu menyala",
            },
            {
                id: "I8",
                name: "Exhaust Fan",
                desc: "Pembersihan cover dan fan blade",
            },
            {
                id: "I9",
                name: "Talang & Dak",
                desc: "Memastikan kebersihan, ketersediaan dan posisi tutup Floor Drain sesuai pada tempatnya",
            },
            {
                id: "I10",
                name: "Lift Barang",
                desc: "Pembersihan unit dari sampah/kotoran (posisi keranjang barang wajib di bawah dan power listrik posisi OFF); memastikan kelengkapan rambu-rambu/petunjuk terpasang serta terlihat; memastikan rangka keranjang dan tiang tidak korosi/karat dan tidak bengkok/melengkung; memastikan pintu keranjang dan pintu utama berfungsi baik dan berpengaman; memastikan kawat seling tidak korosi/karat dan tidak putus (dilumasi grease/gemuk pelumas); memastikan roller/roda pembatas dalam kondisi & fungsi baik; memastikan tombol On/Off, motor listrik/electric hoist, sensor/limit switch, serta instalasi kabel dalam kondisi dan fungsi yang baik (tes fungsi unit naik/turun)",
            },
            {
                id: "I11",
                name: "Kondisi Fisik Shop Sign",
                signage: {
                    materials: ["Embos", "Acrylic"],
                    allowNotAvailable: true,
                },
                ahoTicketGroup: "signage",
            },
            {
                id: "I12",
                name: "Kondisi Fisik List Plank",
                signage: {
                    materials: ["Embos", "Acrylic", "ACP/Alucopan"],
                    allowNotAvailable: true,
                },
                ahoTicketGroup: "signage",
            },
            {
                id: "I13",
                name: "Kondisi Fisik Pole Sign",
                signage: {
                    materials: ["Acrylic", "Vynil"],
                    allowNotAvailable: true,
                },
                ahoTicketGroup: "signage",
            },
        ],
    },
];

export const unitOptions = [
    "Batang",
    "Box",
    "Buah",
    "Galon",
    "Kaleng",
    "Karung",
    "Kg",
    "Lembar",
    "Liter",
    "m²",
    "m³",
    "Meter",
    "Pack",
    "Pail",
    "Pcs",
    "Roll",
    "Set",
    "Ton",
    "Tube",
    "Unit",
    "Zak",
];

export const ESTIMATE_UNITS = unitOptions;

// ID dan label checklist menjadi referensi data laporan historis. Jangan mengubah
// ID atau label yang sudah dipakai tanpa migrasi/versioning katalog.
export const REPORT_CHECKLIST_ITEMS = checklistCategories.flatMap((c) =>
    c.items.map((i) => ({ ...i, categoryId: c.id, categoryTitle: c.title }))
);

const checklistOrderById = new Map(
    REPORT_CHECKLIST_ITEMS.map((item, index) => [item.id, index]),
);

export function compareChecklistItemIds(a: string, b: string): number {
    const rankA = checklistOrderById.get(a);
    const rankB = checklistOrderById.get(b);

    if (rankA !== undefined && rankB !== undefined) {
        return rankA - rankB;
    }
    if (rankA !== undefined) return -1;
    if (rankB !== undefined) return 1;

    const parsedA = parseChecklistItemId(a);
    const parsedB = parseChecklistItemId(b);
    if (parsedA.prefix !== parsedB.prefix) {
        return parsedA.prefix.localeCompare(parsedB.prefix);
    }
    if (parsedA.number !== parsedB.number) {
        return parsedA.number - parsedB.number;
    }
    return a.localeCompare(b, "id-ID", {
        numeric: true,
        sensitivity: "base",
    });
}

export function compareChecklistItemsById<T extends { itemId: string }>(
    a: T,
    b: T,
): number {
    return compareChecklistItemIds(a.itemId, b.itemId);
}

function parseChecklistItemId(itemId: string): {
    prefix: string;
    number: number;
} {
    const match = itemId.trim().match(/^([A-Za-z]+)\s*0*(\d+)/);
    if (!match) return { prefix: itemId.trim().toUpperCase(), number: 0 };
    return {
        prefix: match[1].toUpperCase(),
        number: Number(match[2]),
    };
}

/**
 * Helper to get the canonical itemName and categoryName by itemId.
 * Used as a fallback for existing JSON records that might not have these fields,
 * and allows us to omit them from future JSON payloads to save space.
 */
export function getChecklistItemMeta(itemId: string): { itemName: string; categoryName: string } | undefined {
    const item = REPORT_CHECKLIST_ITEMS.find((i) => i.id === itemId);
    if (!item) return undefined;
    return {
        itemName: item.name,
        categoryName: item.categoryTitle,
    };
}
export function resolveChecklistItemMeta(item: {
    itemId: string;
    itemName?: string | null;
    categoryName?: string | null;
}): { itemName: string; categoryName: string } {
    const canonical = getChecklistItemMeta(item.itemId);
    return {
        itemName: item.itemName?.trim() || canonical?.itemName || item.itemId,
        categoryName:
            item.categoryName?.trim() ||
            canonical?.categoryName ||
            "Tanpa kategori",
    };
}
