/**
 * One-time migration: APPROVED_BMC → COMPLETED
 * Run with: npx tsx scripts/migrate-approved-bmc.ts
 */
import prisma from "@/lib/prisma";

async function main() {
    const result = await prisma.report.updateMany({
        where: { status: "APPROVED_BMC" } as never,
        data: { status: "COMPLETED" } as never,
    });

    console.log(
        `✅ Migrated ${result.count} report(s) from APPROVED_BMC → COMPLETED`,
    );
}

main()
    .then(() => prisma.$disconnect())
    .catch((e) => {
        console.error(e);
        process.exit(1);
    });
