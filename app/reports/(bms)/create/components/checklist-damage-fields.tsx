"use client";

import { Label } from "@/components/ui/label";
import { LocalNotesTextarea } from "./local-notes-textarea";
import { LocalAhoInput } from "./local-aho-input";

const FIELD_LABEL_CLASS =
  "text-xs font-bold tracking-[0.12em] text-muted-foreground uppercase";

function RequiredMarker({ required }: { required: boolean }) {
  return required ? (
    <span className="text-destructive">*</span>
  ) : (
    <span className="font-medium normal-case tracking-normal">(opsional)</span>
  );
}

export function ChecklistNotesField({
  itemId,
  itemName,
  notes,
  required,
  placeholder,
  alwaysOpen,
  onNotesChange,
}: {
  itemId: string;
  itemName: string;
  notes?: string;
  required: boolean;
  placeholder?: string;
  alwaysOpen?: boolean;
  onNotesChange: (itemId: string, itemName: string, value: string) => void;
}) {
  return (
    <div className="flex flex-col gap-2" data-tour="bms-checklist-notes">
      <Label htmlFor={`${itemId}-note`} className={FIELD_LABEL_CLASS}>
        Catatan <RequiredMarker required={required} />
      </Label>
      <LocalNotesTextarea
        required={required}
        placeholder={placeholder}
        alwaysOpen={alwaysOpen}
        initialValue={notes || ""}
        onCommit={(val) => onNotesChange(itemId, itemName, val)}
      />
    </div>
  );
}

export function ChecklistAhoField({
  itemId,
  itemName,
  storeCode,
  ahoTicketNumber,
  lockedAhoTickets,
  required,
  onAhoTicketNumberChange,
}: {
  itemId: string;
  itemName: string;
  storeCode?: string;
  ahoTicketNumber?: string;
  lockedAhoTickets: Set<string>;
  required: boolean;
  onAhoTicketNumberChange: (
    itemId: string,
    itemName: string,
    value: string,
  ) => void;
}) {
  return (
    <div className="flex flex-col gap-2" data-tour="bms-checklist-aho">
      <Label htmlFor={`${itemId}-aho`} className={FIELD_LABEL_CLASS}>
        No Tiket AHO <RequiredMarker required={required} />
      </Label>
      <LocalAhoInput
        id={`${itemId}-aho`}
        storeCode={storeCode}
        initialValue={ahoTicketNumber || ""}
        selectedTickets={lockedAhoTickets}
        onCommit={(val) => onAhoTicketNumberChange(itemId, itemName, val)}
        required={required}
      />
    </div>
  );
}

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
      <ChecklistNotesField
        itemId={itemId}
        itemName={itemName}
        notes={notes}
        required
        onNotesChange={onNotesChange}
      />
      <ChecklistAhoField
        itemId={itemId}
        itemName={itemName}
        storeCode={storeCode}
        ahoTicketNumber={ahoTicketNumber}
        lockedAhoTickets={lockedAhoTickets}
        required
        onAhoTicketNumberChange={onAhoTicketNumberChange}
      />
    </div>
  );
}
