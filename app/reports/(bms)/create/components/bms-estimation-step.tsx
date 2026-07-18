"use client";

import { Fragment, useState } from "react";
import {
  FileCheck2,
  PlusCircle,
  Trash2,
  Edit2,
  MoreVertical,
} from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { ESTIMATE_UNITS, type ChecklistItem } from "@/lib/checklist-data";
import type { BmsItemGroup } from "./types";
import { formatCurrency } from "@/lib/utils";

interface BmsEstimationStepProps {
  bmsItems: Map<string, BmsItemGroup>;
  bmsItemsList: ChecklistItem[];
  grandTotalBms: number;
  onAddBmsEntryWithDetails: (
    itemId: string,
    details: {
      itemName: string;
      quantity: number;
      unit: string;
      price: number;
    },
  ) => void;
  onUpdateBmsEntryWithDetails: (
    itemId: string,
    entryId: string,
    details: {
      itemName: string;
      quantity: number;
      unit: string;
      price: number;
    },
  ) => void;
  onRemoveBmsEntry: (itemId: string, entryId: string) => void;
  onDevAutofill?: () => void;
}

export function BmsEstimationStep({
  bmsItems,
  bmsItemsList,
  grandTotalBms,
  onAddBmsEntryWithDetails,
  onUpdateBmsEntryWithDetails,
  onRemoveBmsEntry,
  onDevAutofill,
}: BmsEstimationStepProps) {
  const [isEstimateDialogOpen, setIsEstimateDialogOpen] = useState(false);
  const [estimateDraft, setEstimateDraft] = useState<{
    entryId?: string;
    checklistItemId: string;
    itemName: string;
    quantity: string;
    unit: string;
    unitPrice: string;
  }>({
    checklistItemId: "",
    itemName: "",
    quantity: "1",
    unit: "pcs",
    unitPrice: "0",
  });

  // Count how many total entries (children) exist across all broken items
  const totalEntriesCount = Array.from(bmsItems.values()).reduce(
    (acc, group) => acc + group.entries.length,
    0,
  );

  const handleEstimateDialogOpen = () => {
    setEstimateDraft({
      entryId: undefined,
      checklistItemId: bmsItemsList[0]?.id || "",
      itemName: "",
      quantity: "1",
      unit: "pcs",
      unitPrice: "0",
    });
    setIsEstimateDialogOpen(true);
  };

  const handleEditEstimateDialogOpen = (
    itemId: string,
    entry: {
      id: string;
      itemName: string;
      quantity: number;
      unit: string;
      price: number;
    },
  ) => {
    setEstimateDraft({
      entryId: entry.id,
      checklistItemId: itemId,
      itemName: entry.itemName,
      quantity: entry.quantity.toString(),
      unit: entry.unit,
      unitPrice: entry.price.toString(),
    });
    setIsEstimateDialogOpen(true);
  };

  const quantityNum = parseFloat(estimateDraft.quantity);
  const priceNum = parseInt(estimateDraft.unitPrice, 10);
  const canSaveEstimateItem =
    !!estimateDraft.checklistItemId &&
    !!estimateDraft.itemName.trim() &&
    !isNaN(quantityNum) &&
    quantityNum > 0 &&
    !isNaN(priceNum) &&
    priceNum >= 0;

  const handleEstimateItemSave = () => {
    if (!canSaveEstimateItem) return;

    const details = {
      itemName: estimateDraft.itemName.trim(),
      quantity: quantityNum,
      unit: estimateDraft.unit,
      price: priceNum,
    };

    if (estimateDraft.entryId) {
      onUpdateBmsEntryWithDetails(
        estimateDraft.checklistItemId,
        estimateDraft.entryId,
        details,
      );
    } else {
      onAddBmsEntryWithDetails(estimateDraft.checklistItemId, details);
    }

    setIsEstimateDialogOpen(false);
  };

  return (
    <>
      {bmsItemsList.length === 0 ? (
        <Card
          size="sm"
          className="bg-primary/5 shadow-sm ring-1 ring-primary/15"
        >
          <CardContent>
            <div className="flex flex-col items-center gap-4 text-center">
              <div className="flex size-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                <FileCheck2 className="size-6" />
              </div>

              <div className="flex flex-col gap-1">
                <h2 className="font-heading text-base font-bold">
                  Tidak Ada Estimasi BMS
                </h2>
                <p className="text-xs text-muted-foreground">
                  Input anda pada laporan ini hanya berupa checklist item. Tidak
                  ada item rusak yang perlu ditangani oleh BMS.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="flex flex-col gap-4">
            {process.env.NODE_ENV === "development" && onDevAutofill && (
              <Button
                type="button"
                variant="outline"
                className="w-full bg-primary/10 text-primary hover:bg-primary/20 border-primary/20"
                onClick={onDevAutofill}
              >
                Autofill (Dev Mode)
              </Button>
            )}
            <section className="rounded-2xl bg-primary/10 p-5 text-primary shadow-sm ring-1 ring-primary/20">
              <div className="flex flex-col gap-4">
                <div>
                  <h4 className="text-xs font-bold tracking-[0.12em] text-primary/75 uppercase">
                    Grand Total
                  </h4>
                  <p className="text-sm text-primary/70">
                    Total akumulasi estimasi biaya material
                  </p>
                </div>

                <p className="font-heading text-4xl leading-none font-black tracking-tight text-primary">
                  {formatCurrency(grandTotalBms)}
                </p>
              </div>
            </section>

            <Card
              size="sm"
              className="bg-primary/5 shadow-sm ring-1 ring-primary/15"
            >
              <CardContent>
                <div className="flex flex-col gap-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="font-heading text-lg font-bold">
                        Estimasi Harga BMS
                      </h3>
                      <p className="text-xs text-muted-foreground">
                        Lengkapi rincian estimasi biaya untuk item rusak yang
                        dihandle BMS.
                      </p>
                    </div>

                    <Badge variant="secondary" className="shrink-0">
                      {totalEntriesCount} Item
                    </Badge>
                  </div>

                  <div className="overflow-hidden rounded-xl bg-card ring-1 ring-border/60">
                    <Table className="table-fixed">
                      <TableHeader>
                        <TableRow>
                          <TableHead className="h-9 w-[40%] px-3 text-[10px] uppercase">
                            Item / Barang
                          </TableHead>
                          <TableHead className="h-9 w-[25%] px-2 text-right text-[10px] uppercase">
                            Qty
                          </TableHead>
                          <TableHead className="h-9 w-[25%] px-2 text-right text-[10px] uppercase">
                            Subtotal
                          </TableHead>
                          <TableHead className="h-9 w-[10%] px-1" />
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {bmsItemsList.map((checklistItem) => {
                          const group = bmsItems.get(checklistItem.id);
                          if (!group) return null;

                          const childItems = group.entries;
                          const checklistSubtotal = childItems.reduce(
                            (total, item) => total + item.total,
                            0,
                          );

                          return (
                            <Fragment key={checklistItem.id}>
                              <TableRow
                                id={`bms-item-${checklistItem.id}`}
                                className="bg-muted/60 hover:bg-muted/60"
                              >
                                <TableCell className="px-3 py-2" colSpan={2}>
                                  <div className="flex min-w-0 items-center gap-2">
                                    <span className="text-xs font-bold">
                                      {checklistItem.id}. {checklistItem.name}
                                    </span>
                                  </div>
                                </TableCell>
                                <TableCell className="px-2 py-2 text-right text-xs font-bold">
                                  {formatCurrency(checklistSubtotal)}
                                </TableCell>
                                <TableCell className="px-1 py-2" />
                              </TableRow>

                              {childItems.length === 0 ? (
                                <TableRow>
                                  <TableCell
                                    colSpan={4}
                                    className="px-3 py-2 text-[10px] text-muted-foreground"
                                  >
                                    Belum ada barang dibeli untuk item ini.
                                  </TableCell>
                                </TableRow>
                              ) : (
                                childItems.map((item) => {
                                  return (
                                    <TableRow key={item.id}>
                                      <TableCell className="px-3 py-2 pl-4">
                                        <div className="flex min-w-0 flex-col gap-1">
                                          <span className="truncate text-xs font-semibold">
                                            {item.itemName}
                                          </span>
                                          <p className="truncate text-[10px] text-muted-foreground">
                                            {formatCurrency(item.price)} /{" "}
                                            {item.unit}
                                          </p>
                                        </div>
                                      </TableCell>
                                      <TableCell className="px-2 py-2 text-right text-xs text-muted-foreground">
                                        {item.quantity} {item.unit}
                                      </TableCell>
                                      <TableCell className="px-2 py-2 text-right text-xs font-bold">
                                        {formatCurrency(item.total)}
                                      </TableCell>
                                      <TableCell className="px-1 py-2 text-right">
                                        <DropdownMenu>
                                          <DropdownMenuTrigger asChild>
                                            <Button
                                              type="button"
                                              variant="ghost"
                                              size="icon-xs"
                                              aria-label="Menu aksi"
                                              className="h-7 w-7"
                                            >
                                              <MoreVertical className="h-4 w-4" />
                                            </Button>
                                          </DropdownMenuTrigger>
                                          <DropdownMenuContent
                                            align="end"
                                            className="w-[120px]"
                                          >
                                            <DropdownMenuItem
                                              onClick={() =>
                                                handleEditEstimateDialogOpen(
                                                  checklistItem.id,
                                                  item,
                                                )
                                              }
                                            >
                                              <Edit2 className="mr-2 h-3.5 w-3.5" />
                                              Edit
                                            </DropdownMenuItem>
                                            <DropdownMenuItem
                                              className="text-destructive focus:bg-destructive/10 focus:text-destructive"
                                              onClick={() =>
                                                onRemoveBmsEntry(
                                                  checklistItem.id,
                                                  item.id,
                                                )
                                              }
                                            >
                                              <Trash2 className="mr-2 h-3.5 w-3.5" />
                                              Hapus
                                            </DropdownMenuItem>
                                          </DropdownMenuContent>
                                        </DropdownMenu>
                                      </TableCell>
                                    </TableRow>
                                  );
                                })
                              )}
                            </Fragment>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>

                  <Button
                    type="button"
                    variant="outline"
                    className="h-12 bg-background"
                    onClick={handleEstimateDialogOpen}
                    disabled={bmsItemsList.length === 0}
                  >
                    <PlusCircle
                      data-icon="inline-start"
                      className="mr-2 h-4 w-4"
                    />
                    Tambah Barang
                  </Button>

                  {bmsItemsList.length === 0 ? (
                    <p className="text-center text-xs text-muted-foreground">
                      Pilih status Rusak dan handler BMS di checklist untuk
                      menambahkan estimasi barang.
                    </p>
                  ) : null}
                </div>
              </CardContent>
            </Card>
          </div>
        </>
      )}

      <Dialog
        open={isEstimateDialogOpen}
        onOpenChange={setIsEstimateDialogOpen}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {estimateDraft.entryId
                ? "Edit Estimasi Barang"
                : "Tambah Estimasi Barang"}
            </DialogTitle>
            <DialogDescription>
              Isi rincian material untuk item rusak yang akan ditangani BMS.
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-4 py-2">
            <div className="flex flex-col gap-2">
              <Label
                htmlFor="estimate-checklist-item"
                className="text-xs font-bold tracking-[0.12em] text-muted-foreground uppercase"
              >
                Pilih Item Rusak
              </Label>
              <Select
                value={estimateDraft.checklistItemId}
                onValueChange={(value) =>
                  setEstimateDraft((current) => ({
                    ...current,
                    checklistItemId: value,
                  }))
                }
              >
                <SelectTrigger
                  id="estimate-checklist-item"
                  className="h-11 min-h-11 w-full rounded-xl bg-muted/60 py-0"
                >
                  <SelectValue placeholder="Pilih asset" />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    {bmsItemsList.map((item) => (
                      <SelectItem key={item.id} value={item.id}>
                        {item.id} - {item.name}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-col gap-2">
              <Label
                htmlFor="estimate-item-name"
                className="text-xs font-bold tracking-[0.12em] text-muted-foreground uppercase"
              >
                Nama Barang yang Dibeli
              </Label>
              <Input
                id="estimate-item-name"
                value={estimateDraft.itemName}
                onChange={(event) =>
                  setEstimateDraft((current) => ({
                    ...current,
                    itemName: event.target.value,
                  }))
                }
                className="h-11 rounded-xl bg-muted/60"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-2">
                <Label
                  htmlFor="estimate-quantity"
                  className="text-xs font-bold tracking-[0.12em] text-muted-foreground uppercase"
                >
                  Jumlah
                </Label>
                <Input
                  id="estimate-quantity"
                  type="number"
                  min={0}
                  step="any"
                  value={estimateDraft.quantity}
                  onChange={(event) =>
                    setEstimateDraft((current) => ({
                      ...current,
                      quantity: event.target.value,
                    }))
                  }
                  className="h-11 rounded-xl bg-muted/60"
                />
              </div>

              <div className="flex flex-col gap-2">
                <Label
                  htmlFor="estimate-unit"
                  className="text-xs font-bold tracking-[0.12em] text-muted-foreground uppercase"
                >
                  Satuan
                </Label>
                <Select
                  value={estimateDraft.unit}
                  onValueChange={(value) =>
                    setEstimateDraft((current) => ({
                      ...current,
                      unit: value,
                    }))
                  }
                >
                  <SelectTrigger
                    id="estimate-unit"
                    className="h-11 min-h-11 w-full rounded-xl bg-muted/60 py-0"
                  >
                    <SelectValue placeholder="Satuan" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      {ESTIMATE_UNITS.map((unit) => (
                        <SelectItem key={unit} value={unit}>
                          {unit}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <Label
                htmlFor="estimate-unit-price"
                className="text-xs font-bold tracking-[0.12em] text-muted-foreground uppercase"
              >
                Harga per Satuan
              </Label>
              <div className="relative">
                <span className="pointer-events-none absolute top-1/2 left-4 -translate-y-1/2 text-sm font-bold text-muted-foreground">
                  Rp
                </span>
                <Input
                  id="estimate-unit-price"
                  type="number"
                  min={0}
                  value={estimateDraft.unitPrice}
                  onChange={(event) =>
                    setEstimateDraft((current) => ({
                      ...current,
                      unitPrice: event.target.value,
                    }))
                  }
                  className="h-11 rounded-xl bg-muted/60 pl-11"
                />
              </div>
              <p className="text-[10px] text-muted-foreground">
                *Masukkan Rp 0 untuk item yang tidak menggunakan dana taktis.
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsEstimateDialogOpen(false)}
            >
              Batal
            </Button>
            <Button
              type="button"
              onClick={handleEstimateItemSave}
              disabled={!canSaveEstimateItem}
            >
              Simpan Item
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
