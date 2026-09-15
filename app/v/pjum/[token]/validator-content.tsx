import { AlertTriangle, CheckCircle2, ExternalLink, FileText, ShieldCheck, XCircle } from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { BrandLogo } from "@/components/brand-logo";

import type { PublicPjumVerificationResult } from "./validator-data";

function formatCurrency(value: number) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(value);
}

function formatDate(value: Date | null) {
  if (!value) return "-";

  return value.toLocaleDateString("id-ID", {
    timeZone: "Asia/Jakarta",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

const statusView = {
  VALID: {
    label: "Valid",
    title: "Dokumen PJUM valid",
    description: "Data ini berasal dari PJUM yang sudah disetujui di SPARTA.",
    icon: CheckCircle2,
    badgeClass: "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-300",
    alertClass: "border-emerald-200 bg-emerald-50 text-emerald-950 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-50",
    iconClass: "text-emerald-600 dark:text-emerald-300",
  },
  NEEDS_REVIEW: {
    label: "Perlu Dicek",
    title: "Dokumen perlu dicek",
    description: "PJUM ditemukan, tetapi metadata persetujuan atau PDF final belum lengkap.",
    icon: AlertTriangle,
    badgeClass: "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-300",
    alertClass: "border-amber-200 bg-amber-50 text-amber-950 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-50",
    iconClass: "text-amber-600 dark:text-amber-300",
  },
  INVALID: {
    label: "Tidak Valid",
    title: "Dokumen tidak valid",
    description: "PJUM ditemukan, tetapi statusnya tidak memenuhi syarat dokumen final.",
    icon: XCircle,
    badgeClass: "",
    alertClass: "",
    iconClass: "text-destructive",
  },
};

export function ValidatorContent({ result }: { result: PublicPjumVerificationResult }) {
  if (result.kind === "not-found") {
    return (
      <main className="flex min-h-dvh flex-col bg-muted/30 text-foreground">
        <div className="flex w-full justify-center bg-[#005ea6] p-4 shadow-sm">
          <BrandLogo className="w-auto border-none bg-transparent shadow-none" />
        </div>
        <div className="flex flex-1 flex-col items-center justify-center p-4 sm:p-6">
          <div className="w-full max-w-3xl">
            <Alert variant="destructive">
              <XCircle aria-hidden="true" />
              <AlertTitle>Dokumen PJUM tidak dapat diverifikasi</AlertTitle>
              <AlertDescription>Kode QR tidak terdaftar di SPARTA atau format link validasi tidak sesuai.</AlertDescription>
            </Alert>
          </div>
        </div>
      </main>
    );
  }

  const view = statusView[result.status];
  const StatusIcon = view.icon;

  return (
    <main className="min-h-dvh bg-muted/30 text-foreground">
      <div className="mb-6 flex w-full justify-center bg-[#005ea6] p-4 shadow-sm">
        <BrandLogo className="w-auto border-none bg-transparent shadow-none" />
      </div>
      <div className="mx-auto grid max-w-5xl gap-4 px-4 pb-8 sm:px-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        {/* <Alert className={view.alertClass}>
                    <StatusIcon
                        className={view.iconClass}
                        aria-hidden="true"
                    />
                    <AlertTitle>{view.title}</AlertTitle>
                    <AlertDescription>{view.description}</AlertDescription>
                </Alert> */}

        <Card size="sm" className="lg:row-span-2">
          <CardHeader>
            <CardTitle>
              <span className="inline-flex items-center gap-2">
                <ShieldCheck className="size-4 text-primary" aria-hidden="true" />
                Kode Validasi
              </span>
            </CardTitle>
            <CardDescription>Cocokkan dengan kode yang tercetak di PDF.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col gap-3">
              <div className="break-all rounded-md border bg-muted/30 px-3 py-2 font-mono text-sm font-semibold">{result.displayCode}</div>
              <Badge variant={result.status === "INVALID" ? "destructive" : "outline"} className={view.badgeClass}>
                {view.label}
              </Badge>
              {result.pjumFinalDriveUrl ? (
                <Button asChild size="sm">
                  <a href={result.pjumFinalDriveUrl} target="_blank" rel="noreferrer">
                    Buka PDF Resmi
                    <ExternalLink aria-hidden="true" />
                  </a>
                </Button>
              ) : null}
            </div>
          </CardContent>
        </Card>

        <Card size="sm">
          <CardHeader>
            <CardTitle>Metadata PJUM</CardTitle>
            <CardDescription>Gunakan data ini untuk mencocokkan dokumen cetak.</CardDescription>
          </CardHeader>
          <CardContent>
            <dl className="grid gap-2 sm:grid-cols-2">
              <Meta label="Cabang" value={result.branchName} />
              <Meta label="BMS" value={`${result.bmsName} (${result.bmsNIK})`} />
              <Meta label="Periode" value={`${formatDate(result.fromDate)} - ${formatDate(result.toDate)}`} />
              <Meta label="Minggu/Bulan" value={`Minggu ke-${result.weekNumber}${result.monthName ? `, ${result.monthName}` : ""}`} />
              <Meta label="Total Pengeluaran" value={formatCurrency(result.totalExpenditure)} />
              <Meta label="Jumlah Laporan" value={`${result.reportCount} laporan`} />
              <Meta label="Disetujui Oleh" value={result.approverName ? (result.approverNIK ? `${result.approverName} (${result.approverNIK})` : result.approverName) : "-"} />
              <Meta label="Tanggal Approval" value={formatDate(result.approvedAt)} />
            </dl>

            <div className="py-4">
              <Separator />
            </div>

            <div className="flex items-center gap-2 text-sm font-medium">
              <FileText className="size-4 text-muted-foreground" aria-hidden="true" />
              Nomor Laporan
            </div>
            <div className="mt-2 flex flex-wrap gap-2">
              {result.reportNumbers.map((reportNumber) => (
                <Badge key={reportNumber} variant="outline" className="font-mono">
                  {reportNumber}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 rounded-md border bg-muted/20 px-3 py-2">
      <dt className="text-xs font-medium text-muted-foreground">{label}</dt>
      <dd className="mt-0.5 break-words text-sm font-medium">{value}</dd>
    </div>
  );
}
