/**
 * Seed script — menambahkan data dummy Store untuk development.
 *
 * Cara menjalankan:
 *   npx tsx prisma/seed.ts
 *   atau
 *   npm run db:seed
 */

import dotenv from "dotenv";
import prisma from "../lib/prisma";

dotenv.config();

const stores = [
    {
        code: "CKOL",
        name: "Alfamart Cikokol Raya",
        address:
            "Jl. Moh Toha No. 36, Cikokol, Kec. Tangerang, Kota Tangerang, Banten 15117",
        branchName: "HEAD OFFICE",
    },
    {
        code: "HSYM",
        name: "Alfamart Hasyim Ashari",
        address:
            "Jl. KH. Hasyim Ashari No. 120, Cipondoh, Kota Tangerang, Banten 15148",
        branchName: "HEAD OFFICE",
    },
    {
        code: "SRPG",
        name: "Alfamart Serpong Utara",
        address:
            "Jl. BSD Raya No. 88, Serpong Utara, Kota Tangerang Selatan, Banten 15310",
        branchName: "HEAD OFFICE",
    },
    {
        code: "KLDU",
        name: "Alfamart Kelapa Dua",
        address:
            "Jl. Kelapa Dua Raya No. 15, Kelapa Dua, Kab. Tangerang, Banten 15810",
        branchName: "HEAD OFFICE",
    },
    {
        code: "ALMS",
        name: "Alfamart Alam Sutera",
        address:
            "Jl. Alam Sutera Boulevard No. 27, Kota Tangerang Selatan, Banten 15325",
        branchName: "HEAD OFFICE",
    },
];

const users = [
    {
        NIK: "12345",
        email: "bms@admin.com",
        name: "BMS User",
        role: "BMS" as const,
        branchName: "HEAD OFFICE",
    },
    {
        NIK: "67890",
        email: "bmc@admin.com",
        name: "BMC User",
        role: "BMC" as const,
        branchName: "HEAD OFFICE",
    },
];

const mockItems = [
    {
        itemId: "A1",
        itemName: "AC Split 1 PK",
        categoryName: "AC & Pendingin",
        condition: "RUSAK",
        preventiveCondition: null,
        handler: "REKANAN",
        photoUrl: null,
    },
    {
        itemId: "A2",
        itemName: "AC Cassette 2 PK",
        categoryName: "AC & Pendingin",
        condition: "BAIK",
        preventiveCondition: null,
        handler: "BMS",
        photoUrl: null,
    },
    {
        itemId: "B1",
        itemName: "Panel Listrik Utama",
        categoryName: "Kelistrikan",
        condition: "BAIK",
        preventiveCondition: null,
        handler: "BMS",
        photoUrl: null,
    },
    {
        itemId: "B2",
        itemName: "Lampu LED Area Kasir",
        categoryName: "Kelistrikan",
        condition: "RUSAK",
        preventiveCondition: null,
        handler: "BMS",
        photoUrl: null,
    },
    {
        itemId: "D1",
        itemName: "Genset",
        categoryName: "Preventive Maintenance",
        condition: null,
        preventiveCondition: "OK",
        handler: "BMS",
        photoUrl: null,
    },
];

const mockEstimations = [
    {
        itemId: "A1",
        materialName: "Kompresor AC 1 PK",
        quantity: 1,
        unit: "unit",
        price: 2500000,
        totalPrice: 2500000,
    },
    {
        itemId: "B2",
        materialName: "Lampu LED 18W",
        quantity: 3,
        unit: "pcs",
        price: 85000,
        totalPrice: 255000,
    },
];

async function seed() {
    console.log("🌱 Seeding users...");

    for (const user of users) {
        await prisma.user.upsert({
            where: { email: user.email },
            update: {
                name: user.name,
                role: user.role,
                branchName: user.branchName,
            },
            create: user,
        });
        console.log(`   ✅ ${user.email} — ${user.role}`);
    }

    console.log(`\n🌱 Seeding stores...`);

    const seededStores: { code: string }[] = [];
    for (const store of stores) {
        const s = await prisma.store.upsert({
            where: { code: store.code },
            update: store,
            create: store,
        });
        seededStores.push({ code: s.code });
        console.log(`   ✅ ${store.code} — ${store.name}`);
    }

    // Get BMS user
    const bmsUser = await prisma.user.findUnique({
        where: { email: "bms@admin.com" },
    });
    if (!bmsUser) {
        console.error("❌ BMS user not found, skipping report seed");
        return;
    }

    console.log(`\n🌱 Seeding reports...`);

    // Helper: extract 4-char store code
    const extractCode = (code: string) =>
        code
            .replace(/[^a-zA-Z0-9]/g, "")
            .toUpperCase()
            .slice(0, 4)
            .padEnd(4, "X");

    const now = new Date();
    const yy = now.getFullYear().toString().slice(-2);
    const mm = (now.getMonth() + 1).toString().padStart(2, "0");

    const reportSeeds = [
        {
            reportNumber: `${extractCode(seededStores[0].code)}-${yy}${mm}-001`,
            storeCode: seededStores[0].code,
            storeName: stores[0].name,
            status: "PENDING_APPROVAL" as const,
            totalEstimation: 2755000,
        },
        {
            reportNumber: `${extractCode(seededStores[1].code)}-${yy}${mm}-002`,
            storeCode: seededStores[1].code,
            storeName: stores[1].name,
            status: "APPROVED" as const,
            totalEstimation: 1200000,
        },
        {
            reportNumber: `${extractCode(seededStores[2].code)}-${yy}${mm}-003`,
            storeCode: seededStores[2].code,
            storeName: stores[2].name,
            status: "REJECTED" as const,
            totalEstimation: 500000,
        },
        {
            reportNumber: `${extractCode(seededStores[3].code)}-${yy}${mm}-004`,
            storeCode: seededStores[3].code,
            storeName: stores[3].name,
            status: "DRAFT" as const,
            totalEstimation: 0,
        },
        {
            reportNumber: `${extractCode(seededStores[4].code)}-${yy}${mm}-005`,
            storeCode: seededStores[4].code,
            storeName: stores[4].name,
            status: "COMPLETED" as const,
            totalEstimation: 3000000,
        },
    ];

    for (const r of reportSeeds) {
        await prisma.report.upsert({
            where: { reportNumber: r.reportNumber },
            update: {},
            create: {
                reportNumber: r.reportNumber,
                storeCode: r.storeCode,
                storeName: r.storeName,
                branchName: "HEAD OFFICE",
                status: r.status,
                totalEstimation: r.totalEstimation,
                createdByNIK: bmsUser.NIK,
                items: mockItems,
                estimations: r.status === "DRAFT" ? [] : mockEstimations,
            },
        });
        console.log(`   ✅ ${r.reportNumber} — ${r.status}`);
    }

    console.log(
        `\n✅ Seeding selesai! ${users.length} users + ${stores.length} toko + ${reportSeeds.length} laporan.`,
    );
}

seed()
    .catch((error) => {
        console.error("❌ Error saat seeding:", error);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
