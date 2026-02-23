/**
 * Script untuk membuat user baru dengan password yang di-hash
 *
 * Cara menggunakan:
 * npx tsx scripts/create-user.ts
 *
 * Atau dengan parameter:
 * npx tsx scripts/create-user.ts --email="user@example.com" --password="password123" --name="John Doe" --role="BMS" --branch="Cabang Jakarta"
 */

import { UserRole } from "@prisma/client";
import dotenv from "dotenv";
import prisma from "../lib/prisma";

// Load environment variables
dotenv.config();

async function createUser() {
    try {
        // Parse arguments dari command line
        const args = process.argv.slice(2);
        const getArg = (name: string) => {
            const arg = args.find((a) => a.startsWith(`--${name}=`));
            return arg ? arg.split("=")[1].replace(/"/g, "") : null;
        };

        const email = getArg("email") || "admin@sparta.com";
        const name = getArg("name") || "Admin";
        const role = (getArg("role") || "ADMIN") as UserRole;
        // Parse branches as comma-separated list → array
        const branchArg = getArg("branch") || "Head Office";
        const branchNames = branchArg
            .split(",")
            .map((b) => b.trim())
            .filter(Boolean);
        const NIK = getArg("nik") || "ADMIN001";

        console.log("Creating user with branchName as password...");

        // Cek apakah user sudah ada
        const existingUser = await prisma.user.findUnique({
            where: { email },
        });

        if (existingUser) {
            console.log(`User dengan email ${email} sudah ada!`);

            // Update branchNames jika user sudah ada
            await prisma.user.update({
                where: { email },
                data: { branchNames },
            });

            console.log(`✅ Branch names untuk ${email} berhasil diupdate!`);
            return;
        }

        // Buat user baru (password akan divalidasi dengan salah satu branchNames)
        const user = await prisma.user.create({
            data: {
                NIK,
                email,
                name,
                role,
                branchNames,
            },
        });

        console.log("\n✅ User berhasil dibuat!");
        console.log("=".repeat(50));
        console.log("🆔 NIK:", user.NIK);
        console.log("📧 Email:", user.email);
        console.log("👤 Nama:", user.name);
        console.log("🔑 Role:", user.role);
        console.log("🏢 Cabang:", user.branchNames.join(", "));
        console.log("=".repeat(50));
        console.log("\n💡 Gunakan kredensial ini untuk login:");
        console.log(`   Email: ${email}`);
        console.log(
            `   Password: salah satu dari [${branchNames.map((b) => b.toUpperCase()).join(", ")}]`,
        );
    } catch (error) {
        console.error("❌ Error:", error);
        throw error;
    } finally {
        await prisma.$disconnect();
    }
}

createUser();
