import { Clock3 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { REPORT_STATUS_LABELS } from "@/lib/report-status";

export const SLA_STATUS_GUIDE = [
  {
    status: "PENDING_ESTIMATION",
    days: 1,
    note: "BMC harus mulai review estimasi.",
  },
  {
    status: "PENDING_CHECKLIST_REVIEW",
    days: 1,
    note: "BMC mereview kelengkapan checklist dari surveyor.",
  },
  {
    status: "ESTIMATION_APPROVED",
    days: 3,
    note: "BMS mulai kerja setelah estimasi disetujui.",
  },
  {
    status: "ESTIMATION_REJECTED_REVISION",
    days: 2,
    note: "BMS memperbaiki estimasi yang dikembalikan.",
  },
  {
    status: "IN_PROGRESS",
    days: 7,
    note: "BMS menyelesaikan pekerjaan.",
  },
  {
    status: "PENDING_REVIEW",
    days: 1,
    note: "BMC review hasil pekerjaan.",
  },
  {
    status: "APPROVED_BMC",
    days: 1,
    note: "BNM melakukan approval final.",
  },
  {
    status: "REVIEW_REJECTED_REVISION",
    days: 2,
    note: "BMS memperbaiki hasil pekerjaan.",
  },
] as const;

export function getStatusSegmentClass(status: string) {
  const map: Record<string, string> = {
    PENDING_ESTIMATION: "bg-yellow-400",
    PENDING_CHECKLIST_REVIEW: "bg-teal-400",
    ESTIMATION_APPROVED: "bg-emerald-500",
    ESTIMATION_REJECTED_REVISION: "bg-orange-500",
    IN_PROGRESS: "bg-blue-500",
    PENDING_REVIEW: "bg-violet-500",
    APPROVED_BMC: "bg-cyan-500",
    REVIEW_REJECTED_REVISION: "bg-orange-600",
  };

  return map[status] ?? "bg-slate-400";
}

export function SlaStatusGuide() {
  return (
    <aside className="rounded-lg border bg-background p-3">
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="text-sm font-semibold">Batas SLA per status</div>
          <p className="text-xs text-muted-foreground">
            Patokan ini membantu user melihat siapa yang perlu follow up.
          </p>
        </div>
        <Clock3 className="h-4 w-4 text-primary" />
      </div>

      <div className="mt-3 space-y-2">
        {SLA_STATUS_GUIDE.map((guide) => {
          return (
            <div
              key={guide.status}
              className="rounded-md border bg-muted/20 p-2"
            >
              <div className="flex items-center justify-between gap-3">
                <div className="flex min-w-0 items-center gap-2">
                  <span
                    className={`h-2.5 w-2.5 shrink-0 rounded-full ${getStatusSegmentClass(
                      guide.status,
                    )}`}
                  />
                  <span className="truncate text-xs font-medium">
                    {
                      REPORT_STATUS_LABELS[
                        guide.status as keyof typeof REPORT_STATUS_LABELS
                      ]
                    }
                  </span>
                </div>
                <Badge variant="outline" className="shrink-0 bg-background">
                  {guide.days} hari
                </Badge>
              </div>
              <div className="mt-1 flex items-center justify-between gap-3 text-[11px] text-muted-foreground">
                <span className="line-clamp-1">{guide.note}</span>
              </div>
            </div>
          );
        })}
      </div>
    </aside>
  );
}
