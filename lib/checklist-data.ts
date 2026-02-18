// Data checklist berdasarkan FCKT BnM Menu Ceklist
export type ChecklistCondition = "baik" | "rusak" | "tidak-ada" | "";

export interface ChecklistItem {
    id: string;
    name: string;
    condition: ChecklistCondition;
    photo?: File;
    handler?: "BMS" | "Rekanan" | "";
}

export interface ChecklistCategory {
    id: string;
    title: string;
    isPreventive?: boolean; // true = Category I (OK/Not OK + foto wajib jika OK)
    items: Omit<ChecklistItem, "condition" | "photo" | "handler">[];
}

export const checklistCategories: ChecklistCategory[] = [
    {
        id: "A",
        title: "A. Bagian Depan Bangunan",
        items: [
            { id: "A1", name: "Bahu Jalan" },
            { id: "A2", name: "Dekker/Grill Drainase" },
            { id: "A3", name: "Pagar/Rantai Besi" },
            { id: "A4", name: "Halaman Parkir" },
            { id: "A5", name: "Dinding Pembatas Halaman" },
            { id: "A6", name: "Tiang Lampu Parkir" },
            { id: "A7", name: "Auwning/Canopy + Talang" },
            { id: "A8", name: "Foldinggate/Pintu Besi Lipat/Rolling Door" },
            { id: "A9", name: "Lantai Keramik Teras" },
            { id: "A10", name: "Dinding Teras" },
            { id: "A11", name: "Angkur Genset" },
            { id: "A12", name: "Stop Kontak Tenan" },
            { id: "A13", name: "Panel Listrik" },
            { id: "A14", name: "Ohm Saklar/COS" },
            { id: "A15", name: "Stabilizer" },
            { id: "A16", name: "Saklar" },
            { id: "A17", name: "Segel KWh Listrik / MCB PLN" },
            { id: "A18", name: "Plafon Teras" },
            { id: "A19", name: "Lampu Teras" },
            { id: "A20", name: "Lampu Parkir" },
            { id: "A21", name: "Lampu Pole Sign" },
            { id: "A22", name: "Lampu Shop Sign" },
            { id: "A23", name: "Lampu Listplank" },
            { id: "A24", name: "Pintu Aluminium + Kaca Single/Double Swing" },
            { id: "A25", name: "Floor Hinge" },
            { id: "A26", name: "Kusen Aluminium & Kaca" },
        ],
    },
    {
        id: "B",
        title: "B. Ruangan Area Sales",
        items: [
            { id: "B1", name: "Lampu Area Sales" },
            { id: "B2", name: "Plafon Area Sales" },
            { id: "B3", name: "Dinding Area Sales" },
            { id: "B4", name: "Lantai Keramik Sales" },
            { id: "B5", name: "Tiang/Kolom" },
            { id: "B6", name: "Instalasi Listrik Area Kasir" },
            { id: "B7", name: "Stop Kontak Area Kasir" },
            { id: "B8", name: "Stop Kontak Chiller" },
            { id: "B9", name: "Exhaust Fan" },
            { id: "B10", name: "Stop Kontak Freezer" },
            { id: "B11", name: "Kusen + Daun Pintu P1" },
        ],
    },
    {
        id: "C",
        title: "C. Selasar",
        items: [
            { id: "C1", name: "Lampu Selasar" },
            { id: "C2", name: "Plafon Selasar" },
            { id: "C3", name: "Dinding Selasar" },
            { id: "C4", name: "Panel Listrik" },
            { id: "C5", name: "Ohm Saklar/COS" },
            { id: "C6", name: "Stabilizer" },
            { id: "C7", name: "Lantai Keramik Selasar" },
            { id: "C8", name: "Saklar" },
            { id: "C9", name: "Janitor" },
            { id: "C10", name: "Kran Janitor" },
            { id: "C11", name: "Kitchen Zinc" },
            { id: "C12", name: "Kran Kitchen Zinc" },
            { id: "C13", name: "Saluran Air Bersih" },
            { id: "C14", name: "Saluran Air Kotor" },
        ],
    },
    {
        id: "D",
        title: "D. Kamar Mandi",
        items: [
            { id: "D1", name: "Pintu Kamar Mandi" },
            { id: "D2", name: "Lampu Kamar Mandi" },
            { id: "D3", name: "Plafon Kamar Mandi" },
            { id: "D4", name: "Dinding Kamar Mandi" },
            { id: "D5", name: "Lantai Kamar Mandi" },
            { id: "D6", name: "Kran Air" },
            { id: "D7", name: "Kloset" },
            { id: "D8", name: "Septictank" },
            { id: "D9", name: "Saluran Air Bersih" },
            { id: "D10", name: "Saluran Air Kotor" },
        ],
    },
    {
        id: "E",
        title: "E. Gudang + Kantor",
        items: [
            { id: "E1", name: "Kusen + Daun Pintu P2" },
            { id: "E2", name: "Lampu Gudang" },
            { id: "E3", name: "Plafon Gudang" },
            { id: "E4", name: "Dinding Gudang" },
            { id: "E5", name: "Partisi Kantor T120" },
            { id: "E6", name: "Panel Listrik" },
            { id: "E7", name: "Ohm Saklar/COS" },
            { id: "E8", name: "Stabilizer" },
            { id: "E9", name: "Saklar" },
            { id: "E10", name: "Stop Kontak" },
            { id: "E11", name: "Lantai Keramik Gudang + Kantor" },
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
            { id: "H5", name: "Saluran Air/Drainase" },
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
                name: "Folding Gate (Pemberian pelumas pada masing-masing pertemuan besi/silangan dan roda/rel)",
            },
            {
                id: "I2",
                name: "Genset (Pembersihan dan pemanasan genset selama 5 menit)",
            },
            {
                id: "I3",
                name: "Panel Listrik (Pembersihan panel, pengencangan baut MCB dan perapihan instalasi)",
            },
            {
                id: "I4",
                name: "Emergency Lamp UPS (Sistem emergency lamp berfungsi)",
            },
            { id: "I5", name: "Air Curtain (Pembersihan cover dan fan)" },
            {
                id: "I6",
                name: "Air Conditioner (Pembersihan filter udara dan cover indoor)",
            },
            {
                id: "I7",
                name: "Chiller Milik SAT (Memastikan suhu tersetting 5°C - 7°C)",
            },
            { id: "I8", name: "Exhaust Fan (Pembersihan cover dan fan blade)" },
            {
                id: "I9",
                name: "Talang & Duct (Memastikan kebersihan, ketersediaan dan posisi tutup floor drain sesuai pada tempatnya)",
            },
            {
                id: "I10",
                name: "Brankas (Pemberian pelumas pada sendi-sendi dan sistem mekanik)",
            },
        ],
    },
];
