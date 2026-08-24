import dotenv from "dotenv";
import prisma from "../lib/prisma";

dotenv.config();

async function main() {
  console.log("Seeding hanging reports for Head Office...");

  // 1. Get a BMC in Head Office
  const bmcUser = await prisma.user.findFirst({
    where: {
      role: "BMC",
      branchNames: {
        has: "HEAD OFFICE"
      }
    },
  });

  if (!bmcUser) {
    console.error("No BMC user found in Head Office. Please ensure there is at least one BMC user in Head Office.");
    return;
  }

  console.log(`Found BMC User: ${bmcUser.name} (${bmcUser.NIK})`);

  // 2. Get an active BMS in Head Office to assign the report to
  const bmsUser = await prisma.user.findFirst({
    where: {
      role: "BMS",
      branchNames: {
        has: "HEAD OFFICE"
      }
    },
  });

  if (!bmsUser) {
    console.error("No BMS user found in Head Office. Please ensure there is at least one BMS user in Head Office.");
    return;
  }
  
  console.log(`Found BMS User: ${bmsUser.name} (${bmsUser.NIK})`);

  // Periode lama yang sudah ditutup (tempat laporan gantung tertinggal)
  let closedPeriod = await prisma.bmsBalancePeriod.findFirst({
    where: { bmsNIK: bmsUser.NIK, status: "CLOSED" }
  });

  if (!closedPeriod) {
    closedPeriod = await prisma.bmsBalancePeriod.create({
      data: {
        bmsNIK: bmsUser.NIK,
        status: "CLOSED",
        initialBalance: 5000000,
      }
    });
  }

  // Periode saat ini yang aktif
  let activePeriod = await prisma.bmsBalancePeriod.findFirst({
    where: { bmsNIK: bmsUser.NIK, status: "ACTIVE" }
  });

  if (!activePeriod) {
    activePeriod = await prisma.bmsBalancePeriod.create({
      data: {
        bmsNIK: bmsUser.NIK,
        status: "ACTIVE",
        initialBalance: 5000000,
      }
    });
  }

  const fourteenDaysAgo = new Date();
  fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);

  const hangingReport1 = await prisma.report.create({
    data: {
      reportNumber: `PR-HO-HANG-${Date.now()}-1`,
      storeCode: "HO1",
      storeName: "Toko Dummy HO 1",
      branchName: "HEAD OFFICE",
      totalEstimation: 500000,
      totalReal: 500000,
      items: [],
      estimations: [],
      status: "COMPLETED",
      createdByNIK: bmcUser.NIK, 
      balancePeriodId: closedPeriod.id,
      pjumExportedAt: null,
      finishedAt: fourteenDaysAgo,
    },
  });

  const hangingReport2 = await prisma.report.create({
    data: {
      reportNumber: `PR-HO-HANG-${Date.now()}-2`,
      storeCode: "HO2",
      storeName: "Toko Dummy HO 2",
      branchName: "HEAD OFFICE",
      totalEstimation: 750000,
      totalReal: 750000,
      items: [],
      estimations: [],
      status: "COMPLETED",
      createdByNIK: bmsUser.NIK,
      balancePeriodId: closedPeriod.id,
      pjumExportedAt: null,
      finishedAt: fourteenDaysAgo,
    },
  });

  await prisma.report.update({
    where: { reportNumber: hangingReport1.reportNumber },
    data: { createdByNIK: bmsUser.NIK }
  });

  console.log("Successfully created 2 hanging reports for Head Office:");
  console.log(`- ${hangingReport1.reportNumber} (Finished at: ${hangingReport1.finishedAt?.toISOString()})`);
  console.log(`- ${hangingReport2.reportNumber} (Finished at: ${hangingReport2.finishedAt?.toISOString()})`);
  console.log("\nYou can now test the PJUM creation in Head Office using these reports. Make sure to select a date range (Dari/Sampai) that is AFTER the 'Finished at' dates above so they become hanging reports.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
