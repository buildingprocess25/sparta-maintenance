/**
 * create-user.ts
 *
 * Script interaktif CLI untuk membuat atau update user di database SPARTA.
 * Jalankan dengan: npm run create-user
 *
 * Mendukung semua role: BMS, BMC, BNM_MANAGER, BRANCH_ADMIN, ADMIN
 * - Role ADMIN: tidak perlu branch (branchNames diset [])
 * - Role lain: wajib isi minimal 1 branch
 */

import readline from "readline";
import { hash } from "bcryptjs";
import prisma from "../lib/prisma";

// ─── Types ────────────────────────────────────────────────────────────────────

type Role = "BMS" | "BMC" | "BNM_MANAGER" | "BRANCH_ADMIN" | "ADMIN";

const ALL_ROLES: Role[] = ["BMS", "BMC", "BNM_MANAGER", "BRANCH_ADMIN", "ADMIN"];

/** Role yang TIDAK memerlukan branch */
const ROLES_WITHOUT_BRANCH: Role[] = ["ADMIN"];

const SALT_ROUNDS = 12;

// ─── Readline instance ────────────────────────────────────────────────────────
// Satu instance untuk seluruh script — hindari konflik dua reader.

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    terminal: true,
});

// ─── Helpers ──────────────────────────────────────────────────────────────────

function ask(question: string): Promise<string> {
    return new Promise((resolve) => {
        rl.question(question, (answer) => resolve(answer.trim()));
    });
}

/** Minta input dan ulangi jika kosong */
async function askRequired(question: string, fallback?: string): Promise<string> {
    while (true) {
        const answer = await ask(question);
        const result = answer || fallback || "";
        if (result) return result;
        process.stdout.write("  ⚠  Input tidak boleh kosong. Coba lagi.\n\n");
    }
}

/**
 * Minta password tanpa menampilkan karakter di layar.
 * Menggunakan _writeToOutput override pada instance rl yang sama
 * untuk menghindari konflik dua reader.
 */
function askPasswordSilent(question: string): Promise<string> {
    return new Promise((resolve) => {
        // Simpan fungsi asli
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const rlAny = rl as any;
        const originalWrite = rlAny._writeToOutput?.bind(rl) as (str: string) => void;
        let muted = false;

        // Override: saat muted, tampilkan bintang per karakter (bukan echo asli)
        rlAny._writeToOutput = (str: string) => {
            if (!muted) {
                originalWrite?.(str);
                return;
            }
            // Hanya tampilkan bintang untuk input karakter nyata (bukan cursor codes dll)
            // readline mengirim karakter satu per satu ke _writeToOutput
            if (str && str !== "\r" && str !== "\n" && !/^\x1b/.test(str)) {
                process.stdout.write("*");
            }
        };

        process.stdout.write(question);
        muted = true;

        rl.question("", (answer) => {
            muted = false;
            rlAny._writeToOutput = originalWrite;
            process.stdout.write("\n");
            resolve(answer);
        });
    });
}

function isValidEmail(email: string): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function isValidRole(input: string): input is Role {
    return (ALL_ROLES as string[]).includes(input.toUpperCase());
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
    process.stdout.write("\n╔════════════════════════════════════╗\n");
    process.stdout.write("║     SPARTA — Create / Update User  ║\n");
    process.stdout.write("╚════════════════════════════════════╝\n\n");

    // ── 1. NIK ────────────────────────────────────────────────────────────────
    const nik = await askRequired("NIK          : ");

    // Cek apakah user sudah ada
    const existing = await prisma.user.findUnique({
        where: { NIK: nik },
        select: { NIK: true, name: true, email: true, role: true, branchNames: true },
    });

    if (existing) {
        process.stdout.write(`\n  ℹ  User dengan NIK ${nik} sudah ada:\n`);
        process.stdout.write(`     Nama  : ${existing.name}\n`);
        process.stdout.write(`     Email : ${existing.email}\n`);
        process.stdout.write(`     Role  : ${existing.role}\n`);
        process.stdout.write(`     Branch: ${existing.branchNames.join(", ") || "(tidak ada)"}\n`);

        const overwrite = await ask("\n  Update user ini? (y/N): ");
        if (overwrite.toLowerCase() !== "y") {
            process.stdout.write("\n  Dibatalkan.\n\n");
            return;
        }
        process.stdout.write("\n");
    }

    // ── 2. Nama ───────────────────────────────────────────────────────────────
    const name = await askRequired(
        existing ? `Nama         [${existing.name}]: ` : "Nama         : ",
        existing?.name,
    );

    // ── 3. Email ──────────────────────────────────────────────────────────────
    let email = "";
    while (true) {
        const input = await ask(
            existing ? `Email        [${existing.email}]: ` : "Email        : ",
        );
        email = input || existing?.email || "";
        if (isValidEmail(email)) break;
        process.stdout.write("  ⚠  Format email tidak valid. Coba lagi.\n\n");
    }

    // ── 4. Role ───────────────────────────────────────────────────────────────
    process.stdout.write(`\n  Role yang tersedia: ${ALL_ROLES.join(" | ")}\n`);

    let role: Role = (existing?.role as Role) ?? "BMS";
    while (true) {
        const input = await ask(
            existing ? `Role         [${existing.role}]: ` : "Role         : ",
        );
        const candidate = (input || existing?.role || "BMS").toUpperCase();
        if (isValidRole(candidate)) {
            role = candidate as Role;
            break;
        }
        process.stdout.write(`  ⚠  Role tidak valid. Pilih: ${ALL_ROLES.join(", ")}\n\n`);
    }

    // ── 5. Branch names (skip untuk role tanpa branch) ────────────────────────
    let branchNames: string[] = [];
    if (!ROLES_WITHOUT_BRANCH.includes(role)) {
        process.stdout.write("\n  Nama branch (pisahkan dengan koma jika lebih dari satu).\n");
        const defaultBranches = existing?.branchNames.join(", ") || "";
        while (true) {
            const input = await ask(
                defaultBranches ? `Branch       [${defaultBranches}]: ` : "Branch       : ",
            );
            const raw = input || defaultBranches;
            branchNames = raw
                .split(",")
                .map((b) => b.trim())
                .filter(Boolean);
            if (branchNames.length > 0) break;
            process.stdout.write("  ⚠  Minimal satu branch harus diisi.\n\n");
        }
    } else {
        process.stdout.write(`\n  ℹ  Role ${role} tidak memerlukan branch.\n`);
    }

    // ── 6. Password ───────────────────────────────────────────────────────────
    process.stdout.write("\n");

    let passwordHash: string | undefined;
    const changePass = existing
        ? (await ask("  Ubah password? (y/N): ")).toLowerCase() === "y"
        : true;

    if (changePass) {
        process.stdout.write("\n");
        let password = "";
        while (true) {
            password = await askPasswordSilent("Password     : ");
            if (password.length < 8) {
                process.stdout.write("  ⚠  Password minimal 8 karakter.\n\n");
                continue;
            }
            const confirm = await askPasswordSilent("Konfirmasi   : ");
            if (password === confirm) break;
            process.stdout.write("  ⚠  Password tidak cocok. Coba lagi.\n\n");
        }
        process.stdout.write("  ⏳ Hashing password...\n");
        passwordHash = await hash(password, SALT_ROUNDS);
    }

    // ── 7. Konfirmasi ─────────────────────────────────────────────────────────
    process.stdout.write("\n─────────────────────────────────────\n");
    process.stdout.write("  Ringkasan:\n");
    process.stdout.write(`  NIK    : ${nik}\n`);
    process.stdout.write(`  Nama   : ${name}\n`);
    process.stdout.write(`  Email  : ${email}\n`);
    process.stdout.write(`  Role   : ${role}\n`);
    process.stdout.write(`  Branch : ${branchNames.length > 0 ? branchNames.join(", ") : "(tidak ada)"}\n`);
    process.stdout.write(`  Pass   : ${passwordHash ? "Diperbarui" : "Tidak diubah"}\n`);
    process.stdout.write("─────────────────────────────────────\n\n");

    const confirm = await ask("  Simpan ke database? (y/N): ");
    if (confirm.toLowerCase() !== "y") {
        process.stdout.write("\n  Dibatalkan.\n\n");
        return;
    }

    // ── 8. Upsert ke database ─────────────────────────────────────────────────
    const updateData: Record<string, unknown> = {
        name,
        email,
        role,
        branchNames,
        mustChangePassword: false,
    };
    if (passwordHash) {
        updateData.passwordHash = passwordHash;
    }

    await prisma.user.upsert({
        where: { NIK: nik },
        update: updateData,
        create: {
            NIK: nik,
            name,
            email,
            role,
            branchNames,
            passwordHash: passwordHash ?? null,
            // Jika dibuat tanpa password, paksa ganti saat login pertama
            mustChangePassword: !passwordHash,
        },
    });

    process.stdout.write(
        `\n  ✅ User ${name} (${role}) berhasil ${existing ? "diupdate" : "dibuat"}!\n\n`,
    );
}

// ─── Entry point ──────────────────────────────────────────────────────────────

main()
    .catch((err) => {
        process.stdout.write(
            `\n  ❌ Error: ${err instanceof Error ? err.message : String(err)}\n\n`,
        );
        process.exit(1);
    })
    .finally(async () => {
        rl.close();
        await prisma.$disconnect();
    });
