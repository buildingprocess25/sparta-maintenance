"use client";

import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import {
    Empty,
    EmptyHeader,
    EmptyMedia,
    EmptyTitle,
    EmptyDescription,
} from "@/components/ui/empty";
import {
    Pagination,
    PaginationContent,
    PaginationItem,
    PaginationLink,
    PaginationNext,
    PaginationPrevious,
} from "@/components/ui/pagination";
import { Store, Pencil } from "lucide-react";
import { StoreFormDialog } from "./store-form-dialog";
import { DeleteDialog } from "./delete-dialog";
import { deleteStore } from "../actions";

type StoreRow = {
    code: string;
    name: string;
    branchName: string;
};

type Props = {
    stores: StoreRow[];
    branchNames: string[];
    totalCount: number;
    currentPage: number;
    totalPages: number;
};

export function StoreTable({
    stores,
    branchNames,
    totalCount,
    currentPage,
    totalPages,
}: Props) {
    const createHref = (page: number) =>
        `/bmc/database?tab=stores&storePage=${page}`;

    return (
        <div className="space-y-4">
            {/* Action bar */}
            <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">
                    {totalCount} toko ditemukan
                </p>
                <StoreFormDialog branchNames={branchNames} />
            </div>

            {stores.length === 0 ? (
                <Empty>
                    <EmptyHeader>
                        <EmptyMedia variant="icon">
                            <Store />
                        </EmptyMedia>
                        <EmptyTitle>Belum ada data toko</EmptyTitle>
                        <EmptyDescription>
                            Tidak ditemukan toko untuk cabang Anda. Klik
                            &quot;Tambah Toko&quot; untuk menambahkan.
                        </EmptyDescription>
                    </EmptyHeader>
                </Empty>
            ) : (
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Kode Toko</TableHead>
                            <TableHead>Nama Toko</TableHead>
                            <TableHead className="w-20 text-right">
                                Aksi
                            </TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {stores.map((store) => (
                            <TableRow key={store.code}>
                                <TableCell className="font-mono text-xs">
                                    {store.code}
                                </TableCell>
                                <TableCell className="font-medium">
                                    {store.name}
                                </TableCell>
                                <TableCell className="text-right">
                                    <div className="flex items-center justify-end gap-1">
                                        <StoreFormDialog
                                            branchNames={branchNames}
                                            editStore={store}
                                            trigger={
                                                <Button
                                                    size="icon"
                                                    variant="ghost"
                                                    className="h-8 w-8 text-muted-foreground hover:text-foreground"
                                                >
                                                    <Pencil className="h-4 w-4" />
                                                </Button>
                                            }
                                        />
                                        <DeleteDialog
                                            itemLabel={`toko ${store.name}`}
                                            onDelete={() =>
                                                deleteStore(store.code)
                                            }
                                        />
                                    </div>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            )}

            {totalPages > 1 && (
                <Pagination>
                    <PaginationContent>
                        <PaginationItem>
                            <PaginationPrevious
                                href={createHref(Math.max(1, currentPage - 1))}
                                className={
                                    currentPage <= 1
                                        ? "pointer-events-none opacity-50"
                                        : undefined
                                }
                            />
                        </PaginationItem>
                        <PaginationItem>
                            <PaginationLink
                                href={createHref(currentPage)}
                                isActive
                            >
                                {currentPage}
                            </PaginationLink>
                        </PaginationItem>
                        <PaginationItem>
                            <PaginationNext
                                href={createHref(
                                    Math.min(totalPages, currentPage + 1),
                                )}
                                className={
                                    currentPage >= totalPages
                                        ? "pointer-events-none opacity-50"
                                        : undefined
                                }
                            />
                        </PaginationItem>
                    </PaginationContent>
                </Pagination>
            )}
        </div>
    );
}
