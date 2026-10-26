"use client";

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
  isSignageDamaged,
} from "@/lib/signage";
import type { SignageChange } from "../hooks/signage-checklist";
import { ChecklistPhotoField } from "./checklist-photo-field";
import { ChecklistDamageFields } from "./checklist-damage-fields";

const OPTION_CLASS =
  "relative flex h-10 cursor-pointer items-center justify-center gap-0 rounded-lg text-center text-sm leading-none font-semibold transition-colors";
const SECTION_LABEL_CLASS =
  "text-xs font-bold tracking-[0.12em] text-muted-foreground uppercase";

export function SignageChecklistItem({
  item,
  itemData,
  storeCode,
  lockedAhoTickets,
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
  const materialOptions = item.signage.allowNotAvailable
    ? [...item.signage.materials, SIGNAGE_NOT_AVAILABLE]
    : [...item.signage.materials];

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
        isNotAvailable && "opacity-75",
      )}
    >
      <CardContent>
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-3">
            <h4 className="text-base font-semibold">{item.name}</h4>

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
                          ? value === SIGNAGE_NOT_AVAILABLE
                            ? "bg-neutral-400 text-foreground shadow-sm dark:bg-neutral-700 dark:text-white"
                            : "bg-primary text-primary-foreground shadow-sm"
                          : "text-muted-foreground",
                      )}
                    >
                      <RadioGroupItem
                        id={`${item.id}-material-${value}`}
                        value={value}
                        className="pointer-events-none absolute opacity-0"
                      />
                      <span className="leading-none">
                        {value === SIGNAGE_NOT_AVAILABLE ? "Tidak Ada" : value}
                      </span>
                    </Label>
                  );
                })}
              </RadioGroup>
            </div>

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
                  className="grid grid-cols-2 gap-1 rounded-xl bg-muted"
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
                            ? "bg-destructive text-white shadow-sm"
                            : "bg-primary text-primary-foreground shadow-sm"
                          : "text-muted-foreground",
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
                  <p className="flex h-10 items-center justify-center rounded-xl bg-muted text-sm font-semibold">
                    Ditangani Rekanan
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

              {isDamaged ? (
                <ChecklistDamageFields
                  itemId={item.id}
                  itemName={item.name}
                  storeCode={storeCode}
                  notes={itemData?.notes}
                  ahoTicketNumber={itemData?.ahoTicketNumber}
                  lockedAhoTickets={lockedAhoTickets}
                  onNotesChange={onNotesChange}
                  onAhoTicketNumberChange={onAhoTicketNumberChange}
                />
              ) : null}
            </div>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}
