import prisma from './lib/prisma';
import fs from 'fs';

async function main() {
    console.log("Starting patch...");
    const codesRaw = fs.readFileSync('lawson_code.csv', 'utf-8');
    const lawsonCodes = codesRaw.split('\n').map(c => c.trim()).filter(Boolean);
    
    await prisma.store.updateMany({
        where: { code: { notIn: lawsonCodes } },
        data: { brand: '' }
    });
    console.log(`Reset all other stores to empty brand`);

    const res = await prisma.store.updateMany({
        where: { code: { in: lawsonCodes } },
        data: { brand: 'LAWSON' }
    });
    console.log(`Updated ${res.count} stores to LAWSON out of ${lawsonCodes.length} codes`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
