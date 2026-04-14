// Data checklist berdasarkan FCKT BnM Menu Ceklist
export type ChecklistCondition = "baik" | "rusak" | "tidak-ada" | "";

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
}

export interface ChecklistCategory {
    id: string;
    title: string;
    isPreventive?: boolean; // true = Category I (OK/Not OK + foto wajib jika OK)
    items: Omit<
        ChecklistItem,
        "condition" | "photo" | "handler" | "photoUrl" | "notes"
    >[];
}

export const checklistCategories: ChecklistCategory[] = [
    {
        id: "A",
        title: "A. Bagian Depan Bangunan",
        items: [
            { id: "A1", name: "Bahu Jalan" },
            { id: "A2", name: "Dekker/Grill Drainase" },
            { id: "A3", name: "Pagar/Rantai Besi" },
            { id: "A4", name: "Lampu Pole Sign" },
            { id: "A5", name: "Lampu Shop Sign" },
            { id: "A6", name: "Lampu Listplank" },
            { id: "A7", name: "Halaman Parkir" },
            { id: "A8", name: "Pompa air + Instalasi" },
            { id: "A9", name: "PDAM + Instalasi" },
            { id: "A10", name: "Dinding Pembatas Halaman" },
            { id: "A11", name: "Tiang Lampu Parkir" },
            { id: "A12", name: "Lampu Parkir (LED Tube/LED Sorot)*" },
            { id: "A13", name: "Awning/kanopi + talang" },
            { id: "A14", name: "Lampu Awning/kanopi & lampu tutup toko" },
            { id: "A15", name: "Folding Gate/Pintu Besi Lipat/Rolling Door" },
            { id: "A16", name: "Lantai Keramik Teras" },
            { id: "A17", name: "Dinding Teras" },
            { id: "A18", name: "Panel Listrik" },
            { id: "A19", name: "Ohm Saklar/COS" },
            { id: "A20", name: "Stabilizer" },
            { id: "A21", name: "Saklar" },
            { id: "A22", name: "Segel Kwh meter listrik / MCB PLN" },
            { id: "A23", name: "Angkur Genset" },
            { id: "A24", name: "Stop Kontak Genset + Kabel" },
            { id: "A25", name: "Stop kontak Tenan" },
            { id: "A26", name: "Plafon Teras" },
            { id: "A27", name: "Manhole dalam (plafon teras)" },
            { id: "A28", name: "Lampu Teras" },
            { id: "A29", name: "Rangka/Dudukan sarana promo" },
            { id: "A30", name: "Pintu Alumunium + Kaca Single/Double Swing" },
            { id: "A31", name: "Floor Hinge" },
            { id: "A32", name: "Kusen Alumunium & Kaca" },
        ],
    },
    {
        id: "B",
        title: "B. Ruangan Area Sales",
        items: [
            { id: "B1", name: "Lampu Sales" },
            { id: "B2", name: "Plafon Sales" },
            { id: "B3", name: "Dinding Sales" },
            { id: "B4", name: "Lantai Keramik Sales" },
            { id: "B5", name: "Tiang/Kolom" },
            { id: "B6", name: "Instalasi Listrik Area Kasir" },
            { id: "B7", name: "Stop Kontak Area Kasir" },
            { id: "B8", name: "Meja Kasir + Aksesoris" },
            { id: "B9", name: "Stop Kontak Chiller" },
            { id: "B10", name: "Exhaust Fan Ruang Chiller" },
            { id: "B11", name: "Stop Kontak Freezer" },
            { id: "B12", name: "Kusen + Daun Pintu P1" },
        ],
    },
    {
        id: "C",
        title: "C. Selasar",
        items: [
            { id: "C1", name: "Lampu selasar" },
            { id: "C2", name: "Plafon Selasar" },
            { id: "C3", name: "Manhole dalam (plafon selasar)" },
            { id: "C4", name: "Manhole luar (dak toren air)" },
            { id: "C5", name: "Dinding Selasar" },
            { id: "C6", name: "Panel Listrik" },
            { id: "C7", name: "Ohm Saklar/COS" },
            { id: "C8", name: "Stabilizer" },
            { id: "C9", name: "Saklar" },
            { id: "C10", name: "Lantai Keramik Selasar" },
            { id: "C11", name: "Janitor" },
            { id: "C12", name: "Kran Janitor" },
            { id: "C13", name: "Floor Drain Janitor" },
            { id: "C14", name: "Kitchen Sink" },
            { id: "C15", name: "Kran Kitchen Sink" },
            { id: "C16", name: "Saluran Air Bersih" },
            { id: "C17", name: "Saluran Air Kotor" },
            { id: "C18", name: "Pompa air + Instalasi" },
        ],
    },
    {
        id: "D",
        title: "D. Kamar Mandi",
        items: [
            { id: "D1", name: "Pintu Kamar Mandi" },
            { id: "D2", name: "Lampu Kamar Mandi" },
            { id: "D3", name: "Exhaust Fan" },
            { id: "D4", name: "Plafon Kamar Mandi" },
            { id: "D5", name: "Dinding Kamar Mandi" },
            { id: "D6", name: "Lantai Kamar Mandi" },
            { id: "D7", name: "Floor Drain Kamar Mandi" },
            { id: "D8", name: "Kran Air" },
            { id: "D9", name: "Kloset" },
            { id: "D10", name: "Septictank" },
            { id: "D11", name: "Saluran Air Bersih" },
            { id: "D12", name: "Saluran Air Kotor" },
        ],
    },
    {
        id: "E",
        title: "E. Gudang + Kantor",
        items: [
            { id: "E1", name: "Kusen + daun pintu P2" },
            { id: "E2", name: "Lampu Gudang" },
            { id: "E3", name: "Plafon Gudang" },
            { id: "E4", name: "Exhaust Fan" },
            { id: "E5", name: "Dinding Gudang" },
            { id: "E6", name: "Partisi ruang kepala toko (T120)" },
            { id: "E7", name: "Panel Listrik" },
            { id: "E8", name: "Ohm Saklar/COS" },
            { id: "E9", name: "Stabilizer" },
            { id: "E10", name: "Saklar" },
            { id: "E11", name: "Stop kontak" },
            { id: "E12", name: "Lantai keramik Gudang + kantor" },
            { id: "E13", name: "Rooster" },
            { id: "E14", name: "Glasblok" },
            { id: "E15", name: "Teralis (jendela/pintu)" },
        ],
    },
    {
        id: "F",
        title: "F. Mess / R. Kantor",
        items: [
            { id: "F1", name: "Kusen + Daun Pintu + Jendela" },
            { id: "F2", name: "Lampu Mess/R. Kantor" },
            { id: "F3", name: "Exhaust Fan Mess/R. Kantor" },
            { id: "F4", name: "Plafon Mess/R. Kantor" },
            { id: "F5", name: "Dinding Mess/R. Kantor" },
            { id: "F6", name: "Saklar Lampu Mess/R. Kantor" },
            { id: "F7", name: "Stop Kontak Mess/R. Kantor" },
            { id: "F8", name: "Lantai Keramik Mess/R. Kantor" },
            { id: "F9", name: "Teralis (jendela/pintu)" },
        ],
    },
    {
        id: "G",
        title: "G. Ruang Atas / Lt. 2",
        items: [
            { id: "G1", name: "Trap Anak Tangga" },
            { id: "G2", name: "Railing Tangga" },
            { id: "G3", name: "Kusen + Daun Pintu + Jendela" },
            { id: "G4", name: "Lampu Ruang Atas/Lt. 2" },
            { id: "G5", name: "Exhaust Fan Ruang Atas/Lt. 2" },
            { id: "G6", name: "Plafon Ruang Atas/Lt. 2" },
            { id: "G7", name: "Dinding Ruang Atas/Lt. 2" },
            { id: "G8", name: "Saklar Lampu Ruang Atas/Lt. 2" },
            { id: "G9", name: "Stop Kontak Ruang Atas/Lt. 2" },
            { id: "G10", name: "Lantai Keramik Ruang Atas/Lt. 2" },
            { id: "G11", name: "Teralis (jendela/pintu)" },
        ],
    },
    {
        id: "H",
        title: "H. Bagian Atap",
        items: [
            { id: "H1", name: "Rangka Atap" },
            { id: "H2", name: "Talang" },
            { id: "H3", name: "Atap Asbes/Zingalum/Genteng" },
            { id: "H4", name: "Listplank" },
            { id: "H5", name: "Roof Drain" },
            { id: "H6", name: "Pipa Instalasi Air Hujan" },
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
    "Pail",
    "Pcs",
    "Roll",
    "Set",
    "Ton",
    "Tube",
    "Unit",
    "Zak",
];
