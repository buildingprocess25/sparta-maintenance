"use client";

import { Ban, Check, Lock, Undo2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { cn } from "@/lib/utils";
import type {
  ChecklistCatalogItem,
  ChecklistItem,
  SignageCondition,
  SignageConfig,
} from "@/lib/checklist-data";
import {
  SIGNAGE_CONDITIONS,
  SIGNAGE_CONDITION_LABELS,
  SIGNAGE_NOT_AVAILABLE,
  getSignageNotePlaceholder,
  isSignageDamaged,
} from "@/lib/signage";
import type { SignageChange } from "../hooks/signage-checklist";
import { ChecklistPhotoField } from "./checklist-photo-field";
import {
  ChecklistAhoField,
  ChecklistNotesField,
} from "./checklist-damage-fields";

const OPTION_CLASS =
  "relative flex h-10 cursor-pointer items-center justify-center gap-0 rounded-lg text-center text-sm leading-none font-semibold transition-colors";
const SECTION_LABEL_CLASS =
  "text-xs font-bold tracking-[0.12em] text-muted-foreground uppercase";

// "ACP/Alucopan" cukup panjang untuk kolom ketiga di layar HP; beri titik
// patah setelah "/" agar tidak keluar dari kotak.
function renderMaterialLabel(value: string) {
  const [head, ...rest] = value.split("/");
  if (rest.length === 0) return value;
  return (
    <>
      {head}/<wbr />
      {rest.join("/")}
    </>
  );
}

function showLockedHandlerInfo(itemId: string) {
  toast.info("Handler ditentukan otomatis", {
    id: `signage-handler-${itemId}`,
    description:
      "Signage dengan kondisi Pudar atau Rusak selalu ditangani Rekanan dan tidak dapat diganti.",
  });
}

export function SignageChecklistItem({
  item,
  itemData,
  storeCode,
  lockedAhoTickets,
  signageAhoRequired,
  onSignageChange,
  onNotesChange,
  onAhoTicketNumberChange,
  onOpenCamera,
  onPreviewPhoto,
  onRemovePhoto,
}: {
  item: ChecklistCatalogItem & { signage: SignageConfig };
  itemData?: ChecklistItem;
  storeCode?: string;
  lockedAhoTickets: Set<string>;
  /** Flag env SIGNAGE_AHO_REQUIRED: No Tiket AHO wajib untuk Pudar/Rusak. */
  signageAhoRequired: boolean;
  onSignageChange: (
    itemId: string,
    itemName: string,
    change: SignageChange,
  ) => void;
  onNotesChange: (itemId: string, itemName: string, value: string) => void;
  onAhoTicketNumberChange: (
    itemId: string,
    itemName: string,
    value: string,
  ) => void;
  onOpenCamera: (itemId: string) => void;
  onPreviewPhoto: (photo: File | string) => void;
  onRemovePhoto: (itemId: string) => void;
}) {
  const material = itemData?.signageMaterial ?? "";
  const condition = itemData?.signageCondition ?? "";
  const isNotAvailable = material === SIGNAGE_NOT_AVAILABLE;
  const isDamaged = isSignageDamaged(condition);
  const hasPhoto = !!itemData?.photo || !!itemData?.photoUrl;
  const materialOptions = item.signage.materials;

  const handleMaterialChange = (value: string) => {
    if (value === SIGNAGE_NOT_AVAILABLE && hasPhoto) onRemovePhoto(item.id);
    onSignageChange(item.id, item.name, { field: "material", value });
  };

  return (
    <Card
      id={`item-${item.id}`}
      size="sm"
      className={cn(
        "bg-card/95 shadow-sm ring-1 ring-border/60",
        isDamaged && "ring-destructive/45",
        isNotAvailable && "bg-muted/40",
      )}
    >
      <CardContent>
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-3">
            <h4 className="text-base font-semibold">{item.name}</h4>

            {!isNotAvailable ? (
              <div className="flex flex-col gap-2">
                <p className={SECTION_LABEL_CLASS}>
                  Material <span className="text-destructive">*</span>
                </p>
                <RadioGroup
                  value={material}
                  onValueChange={handleMaterialChange}
                  className={cn(
                    "grid gap-1 rounded-xl bg-muted",
                    materialOptions.length > 2 ? "grid-cols-3" : "grid-cols-2",
                  )}
                >
                  {materialOptions.map((value) => {
                    const isSelected = material === value;
                    return (
                      <Label
                        key={value}
                        htmlFor={`${item.id}-material-${value}`}
                        className={cn(
                          OPTION_CLASS,
                          isSelected
                            ? "bg-primary text-primary-foreground shadow-sm"
                            : "text-muted-foreground",
                        )}
                      >
                        <RadioGroupItem
                          id={`${item.id}-material-${value}`}
                          value={value}
                          className="pointer-events-none absolute opacity-0"
                        />
                        <span className="min-w-0 leading-tight break-words">
                          {renderMaterialLabel(value)}
                        </span>
                      </Label>
                    );
                  })}
                </RadioGroup>
              </div>
            ) : null}

            {item.signage.allowNotAvailable ? (
              <Button
                type="button"
                variant={isNotAvailable ? "secondary" : "outline"}
                size="sm"
                aria-pressed={isNotAvailable}
                className="w-full"
                onClick={() =>
                  handleMaterialChange(
                    isNotAvailable ? "" : SIGNAGE_NOT_AVAILABLE,
                  )
                }
              >
                {isNotAvailable ? (
                  <>
                    <Undo2 data-icon="inline-start" />
                    Tidak ada di toko · Batalkan
                  </>
                ) : (
                  <>
                    <Ban data-icon="inline-start" />
                    Tidak ada di toko
                  </>
                )}
              </Button>
            ) : null}

            {material && !isNotAvailable ? (
              <div className="flex flex-col gap-2">
                <p className={SECTION_LABEL_CLASS}>
                  Kondisi <span className="text-destructive">*</span>
                </p>
                <RadioGroup
                  value={condition}
                  onValueChange={(value) =>
                    onSignageChange(item.id, item.name, {
                      field: "condition",
                      value: value as SignageCondition,
                    })
                  }
                  className="grid grid-cols-2 gap-2"
                >
                  {SIGNAGE_CONDITIONS.map((value) => (
                    <Label
                      key={value}
                      htmlFor={`${item.id}-signage-${value}`}
                      onClick={(e) => {
                        if (condition === value) {
                          e.preventDefault();
                          onSignageChange(item.id, item.name, {
                            field: "condition",
                            value: "",
                          });
                        }
                      }}
                      className={cn(
                        OPTION_CLASS,
                        condition === value
                          ? isSignageDamaged(value)
                            ? "bg-destructive text-white shadow-sm ring-1 ring-destructive"
                            : "bg-primary text-primary-foreground shadow-sm ring-1 ring-primary"
                          : "bg-muted/60 text-muted-foreground ring-1 ring-border hover:bg-muted",
                      )}
                    >
                      <RadioGroupItem
                        id={`${item.id}-signage-${value}`}
                        value={value}
                        className="pointer-events-none absolute opacity-0"
                      />
                      <span className="leading-none">
                        {SIGNAGE_CONDITION_LABELS[value]}
                      </span>
                    </Label>
                  ))}
                </RadioGroup>
              </div>
            ) : null}
          </div>

          {condition ? (
            <div className="flex flex-col gap-4 border-t border-border/70 pt-4">
              {isDamaged ? (
                <div className="flex flex-col gap-2">
                  <p className={SECTION_LABEL_CLASS}>akan dihandle</p>
                  <div
                    role="radiogroup"
                    aria-label="Handler"
                    className="grid grid-cols-2 gap-1 rounded-xl bg-muted"
                  >
                    <button
                      type="button"
                      role="radio"
                      aria-checked={false}
                      aria-disabled="true"
                      onClick={() => showLockedHandlerInfo(item.id)}
                      className={cn(
                        OPTION_CLASS,
                        "gap-1.5 cursor-not-allowed text-muted-foreground/50",
                      )}
                    >
                      <Lock className="size-3.5" />
                      BMS
                    </button>
                    <button
                      type="button"
                      role="radio"
                      aria-checked={true}
                      onClick={() => showLockedHandlerInfo(item.id)}
                      className={cn(
                        OPTION_CLASS,
                        "gap-1.5 bg-primary text-primary-foreground shadow-sm",
                      )}
                    >
                      <Check className="size-4" />
                      Rekanan
                    </button>
                  </div>
                  <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Lock className="size-3 shrink-0" />
                    Ditetapkan otomatis oleh sistem untuk kondisi Pudar/Rusak.
                  </p>
                </div>
              ) : null}

              <ChecklistPhotoField
                itemId={item.id}
                photo={itemData?.photo}
                photoUrl={itemData?.photoUrl}
                onOpenCamera={onOpenCamera}
                onPreviewPhoto={onPreviewPhoto}
                onRemovePhoto={onRemovePhoto}
              />

              {isDamaged || condition === "kotor" ? (
                <div className="flex flex-col gap-2">
                  <ChecklistNotesField
                    itemId={item.id}
                    itemName={item.name}
                    notes={itemData?.notes}
                    required
                    alwaysOpen
                    placeholder={getSignageNotePlaceholder(condition)}
                    onNotesChange={onNotesChange}
                  />
                  {isDamaged ? (
                    <ChecklistAhoField
                      itemId={item.id}
                      itemName={item.name}
                      storeCode={storeCode}
                      ahoTicketNumber={itemData?.ahoTicketNumber}
                      lockedAhoTickets={lockedAhoTickets}
                      required={signageAhoRequired}
                      onAhoTicketNumberChange={onAhoTicketNumberChange}
                    />
                  ) : null}
                </div>
              ) : null}
            </div>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}
