"use client";

import { Wallet, Lock, TrendingDown, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";
import type { BmsBalanceInfo } from "@/lib/balance";

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

type BmsBalanceCardProps = {
  balance: BmsBalanceInfo;
  className?: string;
  /** Compact mode for inline use (e.g. in report list/header) */
  compact?: boolean;
};

export function BmsBalanceCard({ balance, className, compact = false }: BmsBalanceCardProps) {
  const usedAmount = balance.totalRealized + balance.totalEstimated;
  const usagePercent = balance.initialBalance > 0 ? Math.min(100, Math.round((usedAmount / balance.initialBalance) * 100)) : 0;

  const isWarning = usagePercent >= 75 && usagePercent < 100;
  const isDanger = usagePercent >= 100;
  const isLocked = balance.isLocked;

  if (compact) {
    return (
      <div
        className={cn(
          "flex items-center gap-2 rounded-lg border px-3 py-2 text-sm",
          isLocked
            ? "border-red-300 bg-red-50 text-red-700 dark:border-red-700/50 dark:bg-red-950/30 dark:text-red-400"
            : isDanger
              ? "border-red-300 bg-red-50 text-red-700 dark:border-red-700/50 dark:bg-red-950/30 dark:text-red-400"
              : isWarning
                ? "border-amber-300 bg-amber-50 text-amber-700 dark:border-amber-700/50 dark:bg-amber-950/30 dark:text-amber-400"
                : "border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-700/50 dark:bg-emerald-950/30 dark:text-emerald-400",
          className,
        )}
      >
        {isLocked ? <Lock className="size-4 shrink-0" /> : <Wallet className="size-4 shrink-0" />}
        <span className="font-medium">{isLocked ? "Saldo Terkunci (PJUM)" : `Sisa Saldo: ${formatCurrency(balance.availableBalance)}`}</span>
      </div>
    );
  }

  return (
    <div className={cn("rounded-xl border p-4 shadow-sm transition-colors", isLocked ? "border-red-300 bg-red-50 dark:border-red-700/50 dark:bg-red-950/20" : "border-border bg-card", className)}>
      {/* Header */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          {isLocked ? <Lock className="size-4 text-red-500" /> : <Wallet className="size-4 text-muted-foreground" />}
          <span className="text-sm font-semibold text-foreground">Saldo Operasional Mingguan</span>
        </div>

        {/* Status Badge */}
        {isLocked ? (
          <span className="rounded-full text-center py-1 bg-red-100 px-2 text-[10px] font-semibold text-red-700 dark:bg-red-900/30 dark:text-red-400">TERKUNCI PJUM</span>
        ) : isDanger ? (
          <span className="rounded-full text-center py-1 bg-red-100 px-2 text-[10px] font-semibold text-red-700 dark:bg-red-900/30 dark:text-red-400">HABIS</span>
        ) : isWarning ? (
          <span className="rounded-full text-center py-1 bg-amber-100 px-2 text-[10px] font-semibold text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">HAMPIR HABIS</span>
        ) : (
          <span className="rounded-full text-center py-1 bg-emerald-100 px-2 text-[10px] font-semibold text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">AKTIF</span>
        )}
      </div>

      {/* Lock Warning */}
      {isLocked && (
        <p className="mt-2 text-xs leading-relaxed text-red-600 dark:text-red-400">Saldo Anda sedang terkunci karena ada PJUM yang menunggu persetujuan BNM Manager. Anda tidak dapat memulai pekerjaan baru hingga PJUM diproses.</p>
      )}

      {/* Metrics Grid */}
      <div className="mt-3 grid grid-cols-3 gap-1.5 sm:gap-2">
        <div className="flex flex-col justify-center rounded-lg bg-muted/50 p-1.5 text-center sm:p-2.5 py-1.5">
          <p className="text-[9px] font-medium uppercase tracking-wider text-muted-foreground sm:text-[10px]">Saldo Awal</p>
          <p className="mt-0.5 text-xs font-bold tracking-tight text-foreground sm:text-sm">{formatCurrency(balance.initialBalance)}</p>
        </div>
        <div className="flex flex-col justify-center rounded-lg bg-muted/50 p-1.5 text-center sm:p-2.5 py-1.5">
          <div className="flex items-center justify-center gap-0.5 sm:gap-1">
            <TrendingDown className="size-2.5 text-muted-foreground sm:size-3" />
            <p className="text-[9px] font-medium uppercase tracking-wider text-muted-foreground sm:text-[10px]">Terpakai</p>
          </div>
          <p className="mt-0.5 text-xs font-bold tracking-tight text-foreground sm:text-sm">{formatCurrency(usedAmount)}</p>
        </div>
        <div
          className={cn("flex flex-col justify-center rounded-lg p-1.5 text-center sm:p-2.5 py-1.5", isDanger ? "bg-red-100 dark:bg-red-950/40" : isWarning ? "bg-amber-100 dark:bg-amber-950/40" : "bg-emerald-100 dark:bg-emerald-950/40")}
        >
          <div className="flex items-center justify-center gap-0.5 sm:gap-1">
            <TrendingUp className={cn("size-2.5 sm:size-3", isDanger ? "text-red-500" : isWarning ? "text-amber-500" : "text-emerald-600")} />
            <p className={cn("text-[9px] font-medium uppercase tracking-wider sm:text-[10px]", isDanger ? "text-red-600 dark:text-red-400" : isWarning ? "text-amber-600 dark:text-amber-400" : "text-emerald-600 dark:text-emerald-400")}>
              Sisa
            </p>
          </div>
          <p className={cn("mt-0.5 text-xs font-bold tracking-tight sm:text-sm", isDanger ? "text-red-700 dark:text-red-400" : isWarning ? "text-amber-700 dark:text-amber-400" : "text-emerald-700 dark:text-emerald-400")}>
            {formatCurrency(balance.availableBalance)}
          </p>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="mt-3">
        <div className="flex justify-between text-[10px] text-muted-foreground mb-1">
          <span>Penggunaan Saldo</span>
          <span>{usagePercent}%</span>
        </div>
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
          <div className={cn("h-full rounded-full transition-all duration-500", isDanger ? "bg-red-500" : isWarning ? "bg-amber-400" : "bg-emerald-500")} style={{ width: `${Math.min(usagePercent, 100)}%` }} />
        </div>
      </div>
    </div>
  );
}
