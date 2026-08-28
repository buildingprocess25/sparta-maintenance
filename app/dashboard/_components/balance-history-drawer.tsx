"use client";

import { useState } from "react";
import { formatRelativeDate } from "@/components/bms-mobile/bms-activity-item";
import { BmsBalanceHistoryItem, BmsBalanceInfo } from "@/lib/balance";
import { fetchBalanceHistoryAction } from "../actions";
import { Drawer, DrawerContent, DrawerDescription, DrawerHeader, DrawerTitle, DrawerTrigger } from "@/components/ui/drawer";
import { Loader2, AlertTriangle, TrendingDown, Clock, History, ChevronRight, FileText } from "lucide-react";
import { cn } from "@/lib/utils";

type BalanceHistoryDrawerProps = {
  balanceInfo: BmsBalanceInfo;
};

export function BalanceHistoryDrawer({ balanceInfo }: BalanceHistoryDrawerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [history, setHistory] = useState<BmsBalanceHistoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasFetched, setHasFetched] = useState(false);

  async function handleOpenChange(open: boolean) {
    setIsOpen(open);
    if (open && !hasFetched) {
      setIsLoading(true);
      try {
        const data = await fetchBalanceHistoryAction();
        setHistory(data);
        setHasFetched(true);
      } catch (e) {
        console.error("Failed to fetch balance history", e);
      } finally {
        setIsLoading(false);
      }
    }
  }

  function formatCurrency(amount: number) {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  }

  return (
    <Drawer open={isOpen} onOpenChange={handleOpenChange}>
      <DrawerTrigger asChild>
        <button className="mt-1 self-start flex items-center gap-1 text-[11px] font-medium text-white/80 hover:text-white transition-colors bg-white/10 hover:bg-white/20 rounded-full pl-3 pr-2 py-1 backdrop-blur-sm">
          Lihat Detail Riwayat
          <ChevronRight className="size-3" />
        </button>
      </DrawerTrigger>
      <DrawerContent className="max-h-[90vh]">
        <div className="mx-auto w-full max-w-md">
          <DrawerHeader className="text-left pb-2 pt-6">
            <DrawerTitle className="text-lg font-bold">Riwayat Penggunaan Saldo</DrawerTitle>
            <DrawerDescription className="text-xs">Rincian laporan yang memotong saldo minggu ini.</DrawerDescription>
            
            {/* Summary Metrics */}
            <div className="grid grid-cols-3 gap-2 mt-5">
              <div className="flex flex-col justify-center rounded-xl bg-red-50 dark:bg-red-950/20 p-2.5 text-center border border-red-100 dark:border-red-900/30">
                <div className="flex items-center justify-center gap-1">
                  <AlertTriangle className="size-3 text-red-500" />
                  <p className="text-[10px] font-bold uppercase tracking-wider text-red-600 dark:text-red-400">Gantung</p>
                </div>
                <p className="mt-1 text-sm font-extrabold tracking-tight text-red-700 dark:text-red-300">{formatCurrency(balanceInfo.hangingDeduction)}</p>
              </div>
              <div className="flex flex-col justify-center rounded-xl bg-emerald-50 dark:bg-emerald-950/20 p-2.5 text-center border border-emerald-100 dark:border-emerald-900/30">
                <div className="flex items-center justify-center gap-1">
                  <TrendingDown className="size-3 text-emerald-500" />
                  <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">Realisasi</p>
                </div>
                <p className="mt-1 text-sm font-extrabold tracking-tight text-emerald-700 dark:text-emerald-300">{formatCurrency(balanceInfo.currentPeriodRealized)}</p>
              </div>
              <div className="flex flex-col justify-center rounded-xl bg-amber-50 dark:bg-amber-950/20 p-2.5 text-center border border-amber-100 dark:border-amber-900/30">
                <div className="flex items-center justify-center gap-1">
                  <Clock className="size-3 text-amber-500" />
                  <p className="text-[10px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">Estimasi</p>
                </div>
                <p className="mt-1 text-sm font-extrabold tracking-tight text-amber-700 dark:text-amber-300">{formatCurrency(balanceInfo.totalEstimated)}</p>
              </div>
            </div>
          </DrawerHeader>

          <div className="overflow-y-auto px-4 pb-8 max-h-[50vh]">
            {isLoading ? (
              <div className="flex flex-col items-center justify-center py-10 text-muted-foreground">
                <Loader2 className="size-6 animate-spin mb-3 text-primary/40" />
                <p className="text-xs font-medium">Memuat riwayat...</p>
              </div>
            ) : history.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-muted-foreground">
                <div className="size-10 rounded-full bg-muted/50 flex items-center justify-center mb-3">
                  <History className="size-5 opacity-40" />
                </div>
                <p className="text-sm font-semibold text-foreground/70">Belum ada riwayat</p>
                <p className="text-xs opacity-60 text-center mt-0.5">Laporan akan muncul di sini saat diproses.</p>
              </div>
            ) : (
              <div className="flex flex-col gap-3 pt-2">
                {history.map((item) => (
                  <div key={item.reportNumber} className="flex items-start gap-3 rounded-xl border border-border/50 bg-card p-3 shadow-sm">
                    <div
                      className={cn(
                        "size-10 shrink-0 rounded-full flex items-center justify-center",
                        item.isHanging ? "bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400" : item.type === "REALIZED" ? "bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400" : "bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400",
                      )}
                    >
                      <FileText className="size-4" />
                    </div>
                    <div className="flex flex-1 flex-col justify-center min-w-0 py-0.5">
                      <div className="flex items-center justify-between gap-2 mb-0.5">
                        <p className="text-sm font-bold truncate">{item.reportNumber}</p>
                        <p className="text-sm font-extrabold whitespace-nowrap">{formatCurrency(item.consumedAmount)}</p>
                      </div>
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-[11px] text-muted-foreground truncate font-medium">
                          {item.storeCode} - {item.storeName}
                        </p>
                      </div>
                      <div className="flex items-center justify-between mt-1.5">
                        <span className={cn("px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider", item.isHanging ? "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300" : item.type === "REALIZED" ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300" : "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300")}>
                          {item.isHanging ? "Gantung" : item.type === "REALIZED" ? "Realisasi" : "Estimasi"}
                        </span>
                        <p className="text-[10px] text-muted-foreground/60 font-medium">{formatRelativeDate(item.createdAt)}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </DrawerContent>
    </Drawer>
  );
}
