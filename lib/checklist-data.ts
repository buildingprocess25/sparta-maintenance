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
    items: Omit<ChecklistItem, "condition" | "photo" | "handler">[];
}

export const checklistCategories: ChecklistCategory[] = [
    {
        id: "A",
        title: "A. Bagian Depan Bangunan",
        items: [
            { id: "A1", name: "Bahu Jalan" },
            { id: "A2", name: "Teras Depan" },
            { id: "A3", name: "Papan Nama" },
            { id: "A4", name: "Lampu Papan Nama" },
            { id: "A5", name: "Kaca Etalase + Pintu Kaca" },
            { id: "A6", name: "Plafond Teras" },
            { id: "A7", name: "Cat tembok luar" },
        ],
    },
    {
        id: "B",
        title: "B. Ruangan Area Sales",
        items: [
            { id: "B1", name: "Lampu Area Sales" },
            { id: "B2", name: "Lampu TL" },
            { id: "B3", name: "Stop Kontak" },
            { id: "B4", name: "Saklar" },
            { id: "B5", name: "Plafond" },
            { id: "B6", name: "Dinding" },
            { id: "B7", name: "Lantai" },
            { id: "B8", name: "Kusen + Daun Pintu + Jendela" },
        ],
    },
    {
        id: "C",
        title: "C. Selasar",
        items: [
            { id: "C1", name: "Lampu Selasar" },
            { id: "C2", name: "Dinding Selasar" },
            { id: "C3", name: "Lantai Selasar" },
            { id: "C4", name: "Plafond Selasar" },
            { id: "C5", name: "Pintu Jeruji" },
        ],
    },
    {
        id: "D",
        title: "D. Kamar Mandi",
        items: [
            { id: "D1", name: "Pintu Kamar Mandi" },
            { id: "D2", name: "Kloset" },
            { id: "D3", name: "Wastafel" },
            { id: "D4", name: "Keran Air" },
            { id: "D5", name: "Dinding Kamar Mandi" },
            { id: "D6", name: "Lantai Kamar Mandi" },
            { id: "D7", name: "Lampu Kamar Mandi" },
            { id: "D8", name: "Shower" },
        ],
    },
    {
        id: "E",
        title: "E. Gudang + Kantor",
        items: [
            { id: "E1", name: "Kusen + Daun Pintu P2" },
            { id: "E2", name: "Lampu Gudang" },
            { id: "E3", name: "Stop Kontak Gudang" },
            { id: "E4", name: "Dinding Gudang" },
            { id: "E5", name: "Lantai Gudang" },
            { id: "E6", name: "Plafond Gudang" },
            { id: "E7", name: "Meja Kerja" },
        ],
    },
    {
        id: "F",
        title: "F. Mess/ R.Kantor",
        items: [
            { id: "F1", name: "Kusen + Daun Pintu + Jendela" },
            { id: "F2", name: "Lampu Mess" },
            { id: "F3", name: "Stop Kontak Mess" },
            { id: "F4", name: "Dinding Mess" },
            { id: "F5", name: "Lantai Mess" },
            { id: "F6", name: "Plafond Mess" },
            { id: "F7", name: "Tempat Tidur" },
        ],
    },
    {
        id: "G",
        title: "G. Ruang Atas/Lt.2",
        items: [
            { id: "G1", name: "Trap Anak Tangga" },
            { id: "G2", name: "Pegangan Tangga" },
            { id: "G3", name: "Lampu Lantai 2" },
            { id: "G4", name: "Dinding Lantai 2" },
            { id: "G5", name: "Lantai 2" },
            { id: "G6", name: "Plafond Lantai 2" },
        ],
    },
    {
        id: "H",
        title: "H. Bagian Atap",
        items: [
            { id: "H1", name: "Rangka Atap" },
            { id: "H2", name: "Genteng" },
            { id: "H3", name: "Talang Air" },
            { id: "H4", name: "Atap Asbes/Spandek" },
            { id: "H5", name: "Lisplank" },
        ],
    },
    // {
    //     id: "I",
    //     title: "I. Preventif Equipment Toko",
    //     items: [
    //         {
    //             id: "I1",
    //             name: "Folding Gate (Pemberian pelumas pada masing-masing pertemuan besi/silangan dan roda/rel)",
    //         },
    //         { id: "I2", name: "AC (Pembersihan filter secara berkala)" },
    //         {
    //             id: "I3",
    //             name: "Dispenser (Pembersihan dispenser secara berkala)",
    //         },
    //         {
    //             id: "I4",
    //             name: "Kipas Angin (Pembersihan dan pelumasan kipas secara berkala)",
    //         },
    //         { id: "I5", name: "Kulkas (Pembersihan kulkas secara berkala)" },
    //         {
    //             id: "I6",
    //             name: "MCB/ Breaker Listrik (Pengecekan kondisi MCB secara berkala)",
    //         },
    //         {
    //             id: "I7",
    //             name: "CCTV (Pengecekan dan pembersihan lensa kamera secara berkala)",
    //         },
    //     ],
    // },
];
