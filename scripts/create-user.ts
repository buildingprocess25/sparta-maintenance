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
        const branchName = getArg("branch") || "Head Office";
        const NIK = getArg("nik") || "ADMIN001";

        console.log("Creating user with branchName as password...");

        // Cek apakah user sudah ada
        const existingUser = await prisma.user.findUnique({
            where: { email },
        });

        if (existingUser) {
            console.log(`User dengan email ${email} sudah ada!`);

            // Update branchName jika user sudah ada
            await prisma.user.update({
                where: { email },
                data: { branchName },
            });

            console.log(`✅ Branch name untuk ${email} berhasil diupdate!`);
            return;
        }

        // Buat user baru (password akan divalidasi dengan branchName)
        const user = await prisma.user.create({
            data: {
                NIK,
                email,
                name,
                role,
                branchName,
            },
        });

        console.log("\n✅ User berhasil dibuat!");
        console.log("=".repeat(50));
        console.log("🆔 NIK:", user.NIK);
        console.log("📧 Email:", user.email);
        console.log("👤 Nama:", user.name);
        console.log("🔑 Role:", user.role);
        console.log("🏢 Cabang:", user.branchName);
        console.log("=".repeat(50));
        console.log("\n💡 Gunakan kredensial ini untuk login:");
        console.log(`   Email: ${email}`);
        console.log(
            `   Password: ${branchName.toUpperCase()} (Nama Cabang dalam huruf kapital)`,
        );
    } catch (error) {
        console.error("❌ Error:", error);
        throw error;
    } finally {
        await prisma.$disconnect();
    }
}

createUser();
