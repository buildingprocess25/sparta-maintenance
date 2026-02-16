import fs from "fs";
import path from "path";
import prisma from "../lib/prisma";

async function main() {
    const csvPath = path.join(process.cwd(), "user.csv");
    const fileContent = fs.readFileSync(csvPath, "utf-8");

    // Split by newline and remove header
    const lines = fileContent.split(/\r?\n/).slice(1);

    console.log(`Found ${lines.length} lines in CSV.`);

    let successCount = 0;
    let failCount = 0;

    for (const line of lines) {
        if (!line.trim()) continue; // Skip empty lines

        const parts = line.split(";");
        if (parts.length < 4) {
            console.warn(`Skipping invalid line: ${line}`);
            failCount++;
            continue;
        }

        const branchName = parts[0].trim();
        const nik = parts[1].trim();
        const name = parts[2].trim();
        let email = parts[3].trim();

        // Clean email (remove quotes and extra spaces)
        email = email.replace(/['"]+/g, "").trim();

        if (!email) {
            console.warn(`Skipping user ${name} (NIK: ${nik}) - No Email`);
            failCount++;
            continue;
        }

        try {
            await prisma.user.upsert({
                where: { email: email },
                update: {
                    nik: nik,
                    name: name,
                    branchName: branchName,
                    role: "BMS", // Default role
                },
                create: {
                    email: email,
                    nik: nik,
                    name: name,
                    branchName: branchName,
                    role: "BMS",
                },
            });
            // console.log(`Imported: ${name} (${email})`);
            process.stdout.write(".");
            successCount++;
        } catch (error) {
            console.error(`\nFailed to import ${name} (${email}):`, error);
            failCount++;
        }
    }

    console.log(`\n\nImport complete.`);
    console.log(`Success: ${successCount}`);
    console.log(`Failed: ${failCount}`);
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
