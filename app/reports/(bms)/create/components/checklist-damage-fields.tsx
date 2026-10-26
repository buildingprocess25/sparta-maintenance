"use client";

import { Label } from "@/components/ui/label";
import { LocalNotesTextarea } from "./local-notes-textarea";
import { LocalAhoInput } from "./local-aho-input";

export function ChecklistDamageFields({
  itemId,
  itemName,
  storeCode,
  notes,
  ahoTicketNumber,
  lockedAhoTickets,
  onNotesChange,
  onAhoTicketNumberChange,
}: {
  itemId: string;
  itemName: string;
  storeCode?: string;
  notes?: string;
  ahoTicketNumber?: string;
  lockedAhoTickets: Set<string>;
  onNotesChange: (itemId: string, itemName: string, value: string) => void;
  onAhoTicketNumberChange: (
    itemId: string,
    itemName: string,
    value: string,
  ) => void;
}) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-col gap-2" data-tour="bms-checklist-notes">
        <Label
          htmlFor={`${itemId}-note`}
          className="text-xs font-bold tracking-[0.12em] text-muted-foreground uppercase"
        >
          Catatan <span className="text-destructive">*</span>
        </Label>
        <LocalNotesTextarea
          required={true}
          initialValue={notes || ""}
          onCommit={(val) => onNotesChange(itemId, itemName, val)}
        />
      </div>
      <div className="flex flex-col gap-2" data-tour="bms-checklist-aho">
        <Label
          htmlFor={`${itemId}-aho`}
          className="text-xs font-bold tracking-[0.12em] text-muted-foreground uppercase"
        >
          No Tiket AHO <span className="text-destructive">*</span>
        </Label>
        <LocalAhoInput
          id={`${itemId}-aho`}
          storeCode={storeCode}
          initialValue={ahoTicketNumber || ""}
          selectedTickets={lockedAhoTickets}
          onCommit={(val) => onAhoTicketNumberChange(itemId, itemName, val)}
          required
        />
      </div>
    </div>
  );
}
