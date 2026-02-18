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
        code: "ALF-TNG-001",
        name: "Alfamart Cikokol Raya",
        address:
            "Jl. Moh Toha No. 36, Cikokol, Kec. Tangerang, Kota Tangerang, Banten 15117",
        branchName: "HEAD OFFICE",
    },
    {
        code: "ALF-TNG-002",
        name: "Alfamart Hasyim Ashari",
        address:
            "Jl. KH. Hasyim Ashari No. 120, Cipondoh, Kota Tangerang, Banten 15148",
        branchName: "HEAD OFFICE",
    },
    {
        code: "ALF-TNG-003",
        name: "Alfamart Serpong Utara",
        address:
            "Jl. BSD Raya No. 88, Serpong Utara, Kota Tangerang Selatan, Banten 15310",
        branchName: "HEAD OFFICE",
    },
    {
        code: "ALF-TNG-004",
        name: "Alfamart Kelapa Dua",
        address:
            "Jl. Kelapa Dua Raya No. 15, Kelapa Dua, Kab. Tangerang, Banten 15810",
        branchName: "HEAD OFFICE",
    },
    {
        code: "ALF-TNG-005",
        name: "Alfamart Alam Sutera",
        address:
            "Jl. Alam Sutera Boulevard No. 27, Kota Tangerang Selatan, Banten 15325",
        branchName: "HEAD OFFICE",
    },
];

const users = [
    {
        email: "bms@admin.com",
        name: "BMS User",
        role: "BMS" as const,
        branchName: "HEAD OFFICE",
        nik: "12345678",
    },
    {
        email: "bmc@admin.com",
        name: "BMC User",
        role: "BMC" as const,
        branchName: "HEAD OFFICE",
        nik: "98765432",
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
                nik: user.nik,
            },
            create: user,
        });
        console.log(`   ✅ ${user.email} — ${user.role}`);
    }

    console.log(`\n🌱 Seeding stores...`);

    for (const store of stores) {
        await prisma.store.upsert({
            where: { code: store.code },
            update: store,
            create: store,
        });
        console.log(`   ✅ ${store.code} — ${store.name}`);
    }

    console.log(
        `\n✅ Seeding selesai! ${users.length} users + ${stores.length} toko.`,
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
