"use client";

import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
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
import { Users, Pencil } from "lucide-react";
import { UserFormDialog } from "./user-form-dialog";
import { DeleteDialog } from "./delete-dialog";
import { deleteUser } from "../actions";

const ROLE_LABELS: Record<string, string> = {
    BMS: "BMS",
    BRANCH_ADMIN: "Branch Admin",
};

type UserRow = {
    NIK: string;
    name: string;
    email: string;
    role: string;
    branchNames: string[];
};

type Props = {
    users: UserRow[];
    branchNames: string[];
    totalCount: number;
    currentPage: number;
    totalPages: number;
};

export function UserTable({
    users,
    branchNames,
    totalCount,
    currentPage,
    totalPages,
}: Props) {
    const createHref = (page: number) =>
        `/bmc/database?tab=users&userPage=${page}`;

    return (
        <div className="space-y-4">
            {/* Action bar */}
            <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">
                    {totalCount} user ditemukan
                </p>
                <UserFormDialog branchNames={branchNames} />
            </div>

            {users.length === 0 ? (
                <Empty>
                    <EmptyHeader>
                        <EmptyMedia variant="icon">
                            <Users />
                        </EmptyMedia>
                        <EmptyTitle>Belum ada data user</EmptyTitle>
                        <EmptyDescription>
                            Tidak ditemukan user BMS / Branch Admin untuk cabang
                            Anda. Klik &quot;Tambah User&quot; untuk
                            menambahkan.
                        </EmptyDescription>
                    </EmptyHeader>
                </Empty>
            ) : (
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>NIK</TableHead>
                            <TableHead>Nama</TableHead>
                            <TableHead className="hidden sm:table-cell">
                                Email
                            </TableHead>
                            <TableHead>Role</TableHead>
                            <TableHead className="hidden md:table-cell">
                                Cabang
                            </TableHead>
                            <TableHead className="w-20 text-right">
                                Aksi
                            </TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {users.map((user) => (
                            <TableRow key={user.NIK}>
                                <TableCell className="font-mono">
                                    {user.NIK}
                                </TableCell>
                                <TableCell className="font-medium">
                                    {user.name}
                                </TableCell>
                                <TableCell className="hidden sm:table-cell text-muted-foreground">
                                    {user.email}
                                </TableCell>
                                <TableCell>
                                    <Badge variant="secondary">
                                        {ROLE_LABELS[user.role] ?? user.role}
                                    </Badge>
                                </TableCell>
                                <TableCell className="hidden md:table-cell text-muted-foreground">
                                    {user.branchNames.join(", ")}
                                </TableCell>
                                <TableCell className="text-right">
                                    <div className="flex items-center justify-end gap-1">
                                        <UserFormDialog
                                            branchNames={branchNames}
                                            editUser={user}
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
                                            itemLabel={`user ${user.name}`}
                                            onDelete={() =>
                                                deleteUser(user.NIK)
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
