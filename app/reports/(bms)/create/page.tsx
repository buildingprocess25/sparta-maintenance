import Link from "next/link";
import { AlertTriangle, Eye } from "lucide-react";

import { requireRole } from "@/lib/authorization";
import {
  getDraft,
  getDraftByReportNumber,
  getStoresByBranch,
} from "@/app/reports/actions";
import { calculateBmsBalance, getBmsActiveReportBlocker } from "@/lib/balance";
import { formatBmsActiveReportBlockerMessage } from "@/lib/bms-active-report-blocker";
import { loadMaterialNames } from "@/lib/material-master.server";
import { BmsMobilePage } from "@/components/bms-mobile/bms-mobile-page";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import CreateReportForm from "./create-form";

export default async function CreateReportPage({ searchParams }: { searchParams: Promise<{ restore?: string; storeCode?: string; draft?: string; }> }) {
  const user = await requireRole("BMS");
  const { restore, storeCode, draft } = await searchParams;
  const autoRestoreOnMount = restore === "1";
  const forceServerDraftRestore = autoRestoreOnMount && !!draft;

  const [stores, materialNames, balanceInfo, activeReportBlocker, existingDraft] = await Promise.all([
    getStoresByBranch(user.branchNames[0] || ""),
    loadMaterialNames(),
    calculateBmsBalance(user.NIK),
    getBmsActiveReportBlocker(user.NIK),
    autoRestoreOnMount && draft
        ? getDraftByReportNumber(draft)
        : autoRestoreOnMount
          ? getDraft()
          : Promise.resolve(null),
  ]);

  const userInitials = user.name
    .split(" ")
    .slice(0, 2)
    .map((word) => word[0]?.toUpperCase() ?? "")
    .join("");

  if (activeReportBlocker) {
    return (
      <BmsMobilePage
        navItem="reports"
        title="Buat Laporan"
        showBackButton
        backHref="/reports"
        userInitials={userInitials}
      >
        <Alert className="border-amber-200 bg-amber-50 text-amber-900">
          <AlertTriangle className="h-4 w-4 text-amber-700" />
          <AlertTitle>Laporan aktif belum selesai</AlertTitle>
          <AlertDescription>
            {formatBmsActiveReportBlockerMessage(activeReportBlocker)}
          </AlertDescription>
        </Alert>
        <Button asChild>
          <Link href={`/reports/${activeReportBlocker.reportNumber}`}>
            <Eye data-icon="inline-start" />
            Lihat laporan aktif
          </Link>
        </Button>
      </BmsMobilePage>
    );
  }

  return (
    <CreateReportForm
      stores={stores}
      materialNames={materialNames}
      userBranchName={user.branchNames[0] || ""}
      userInfo={{
        name: user.name,
        nik: user.NIK,
        role: user.role,
        branch: user.branchNames[0] || "",
      }}
      existingDraft={existingDraft}
      autoRestoreOnMount={autoRestoreOnMount}
      forceServerDraftRestore={forceServerDraftRestore}
      initialStoreCode={storeCode}
      balanceInfo={balanceInfo}
    />
  );
}
